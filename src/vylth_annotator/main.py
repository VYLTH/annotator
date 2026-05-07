"""
Annotator API — multi-tenant feedback queue with webhook fanout.

Routes:
  POST   /v1/feedback              create (X-Annot-Token → project)
  GET    /v1/feedback?status=open  list scoped to caller's project
  POST   /v1/feedback/{id}/resolve mark resolved
  GET    /v1/feedback/{id}/image   serve PNG bytes
  GET    /healthz
"""
from __future__ import annotations

import base64
import logging
import re
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from importlib.resources import files as pkg_files
from pathlib import Path
from uuid import UUID

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Query, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .auth import project_from_token
from .config import settings
from .db import get_session, init_db
from .fanout import dispatch
from .models import Feedback, Project
from .schemas import FeedbackCreate, FeedbackList, FeedbackOut
from .storage import presigned_url, r2_configured, store

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Annotator API", version="0.0.1", lifespan=lifespan)

origins = [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["X-Annot-Token", "Content-Type"],
    allow_credentials=False,
)


_DATA_URL_RE = re.compile(r"^data:image/png;base64,(.+)$")


@app.get("/healthz")
async def healthz() -> dict:
    return {"ok": True}


@app.post("/v1/feedback", status_code=201)
async def create_feedback(
    payload: FeedbackCreate,
    background: BackgroundTasks,
    project: Project = Depends(project_from_token),
    session: AsyncSession = Depends(get_session),
) -> dict:
    m = _DATA_URL_RE.match(payload.image)
    if not m:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "image must be a data:image/png;base64 URL")
    raw = base64.b64decode(m.group(1))

    # Hard cap: 25MB. Anything larger is almost certainly an accident.
    if len(raw) > 25_000_000:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "image > 25MB")

    # Pre-mint the UUID so we can use it as the R2 key.
    import uuid as _uuid
    fb_uuid = _uuid.uuid4()

    image_bytes, image_r2_key = store(raw, str(fb_uuid))
    if image_bytes is None and image_r2_key is None:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            "image > 500KB and R2 not configured — set ANNOTATOR_R2_ACCOUNT_ID/_ACCESS_KEY/_SECRET_KEY/_BUCKET",
        )

    fb = Feedback(
        id=fb_uuid,
        project_id=project.id,
        comment=payload.comment,
        rects=[r.model_dump() for r in payload.rects],
        image=image_bytes,
        image_r2_key=image_r2_key,
        url=payload.url.get("href", ""),
        pathname=payload.url.get("pathname", ""),
        viewport=payload.viewport,
        document=payload.document,
        targets=payload.targets,
        env=payload.env,
        console_buf=payload.console,
        network_buf=payload.network,
        errors_buf=payload.errors,
        perf=payload.perf,
        metadata_=payload.metadata,
    )
    session.add(fb)
    await session.commit()
    await session.refresh(fb)

    envelope_for_export = {
        "project": project.id,
        "comment": payload.comment,
        "rects": [r.model_dump() for r in payload.rects],
        "url": payload.url,
        "viewport": payload.viewport,
        "targets": payload.targets,
        "env": payload.env,
        "console": payload.console,
        "network": payload.network,
        "errors": payload.errors,
        "perf": payload.perf,
        "metadata": payload.metadata,
    }

    # filesystem sink — write PNG + .md so any agent can read without API access
    if settings.sink_dir:
        background.add_task(_write_sink, settings.sink_dir, project.id, fb.id, image_bytes, envelope_for_export)

    # fanout to per-project destinations (Slack/Discord/Linear/http) — best effort
    background.add_task(dispatch, project.destinations or [], _envelope_for_dispatch(fb))

    return {"id": str(fb.id), "status": fb.status}


def _write_sink(sink_dir: str, project_id: str, fb_id, image_bytes: bytes | None, envelope: dict) -> None:
    from .sink import write_pair
    try:
        write_pair(Path(sink_dir), project_id, fb_id, image_bytes, envelope)
    except Exception as e:
        logger.warning("sink write failed: %s", e)


def _envelope_for_dispatch(fb: Feedback) -> dict:
    return {
        "id": str(fb.id),
        "project": fb.project_id,
        "comment": fb.comment,
        "url": {"href": fb.url, "pathname": fb.pathname},
        "viewport": fb.viewport,
        "rects": fb.rects,
        "errors": fb.errors_buf,
        "network": fb.network_buf,
        "console": fb.console_buf,
        "perf": fb.perf,
    }


@app.get("/v1/feedback", response_model=FeedbackList)
async def list_feedback(
    project: Project = Depends(project_from_token),
    session: AsyncSession = Depends(get_session),
    status_filter: str | None = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
) -> FeedbackList:
    stmt = select(Feedback).where(Feedback.project_id == project.id).order_by(Feedback.created_at.desc())
    if status_filter:
        stmt = stmt.where(Feedback.status == status_filter)
    stmt = stmt.limit(limit)
    result = await session.execute(stmt)
    rows = result.scalars().all()
    return FeedbackList(
        items=[FeedbackOut.model_validate(r, from_attributes=True) for r in rows],
        count=len(rows),
    )


@app.post("/v1/feedback/{fb_id}/resolve")
async def resolve_feedback(
    fb_id: UUID,
    project: Project = Depends(project_from_token),
    session: AsyncSession = Depends(get_session),
) -> dict:
    fb = await session.get(Feedback, fb_id)
    if not fb or fb.project_id != project.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "not found")
    fb.status = "resolved"
    fb.resolved_at = datetime.now(timezone.utc)
    await session.commit()
    return {"id": str(fb.id), "status": fb.status}


@app.get("/v1/feedback/{fb_id}/image")
async def get_image(
    fb_id: UUID,
    project: Project = Depends(project_from_token),
    session: AsyncSession = Depends(get_session),
) -> Response:
    fb = await session.get(Feedback, fb_id)
    if not fb or fb.project_id != project.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "not found")
    if fb.image:
        return Response(content=fb.image, media_type="image/png")
    if fb.image_r2_key:
        if not r2_configured():
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "image stored in R2 but R2 not configured")
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=presigned_url(fb.image_r2_key), status_code=status.HTTP_307_TEMPORARY_REDIRECT)
    raise HTTPException(status.HTTP_404_NOT_FOUND, "no image")


# -- Local dashboard + widget bundle --------------------------------------------------
# In local mode we serve a built-in dashboard at / and the widget bundle at /w.js so
# `annotator run` is a complete self-contained loop with no extra hosting.

_PKG_ROOT = Path(str(pkg_files("vylth_annotator")))
_STATIC = _PKG_ROOT / "static"
_TEMPLATES = _PKG_ROOT / "templates"

if _STATIC.exists():
    app.mount("/static", StaticFiles(directory=_STATIC), name="static")


@app.get("/w.js", include_in_schema=False)
async def widget_bundle() -> Response:
    bundle = _STATIC / "w.js"
    if not bundle.exists():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "widget bundle missing — run `pnpm -F @vylth/annotator-widget build` and copy dist/w.js into the package")
    return Response(content=bundle.read_bytes(), media_type="application/javascript")


@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def dashboard() -> HTMLResponse:
    tpl = _TEMPLATES / "dashboard.html"
    if not tpl.exists():
        return HTMLResponse("<h1>annotator</h1><p>dashboard template missing</p>")
    return HTMLResponse(tpl.read_text(encoding="utf-8"))
