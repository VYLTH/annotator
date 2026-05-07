"""
Token auth: X-Annot-Token header → project_id.

Tokens are stored hashed (SHA-256). The widget supplies the raw token; we hash
+ compare. No JWTs, no rotation logic in v0 — single shared token per project.

Local mode (CLI): a single project + token is auto-provisioned on first request,
so the user can `annotator run` and immediately point a widget at localhost
without any setup.
"""
import hashlib

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .db import get_session
from .models import Project


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


async def _ensure_local_project(session: AsyncSession) -> Project:
    result = await session.execute(select(Project).where(Project.id == settings.local_project))
    proj = result.scalar_one_or_none()
    if proj is None:
        proj = Project(
            id=settings.local_project,
            name="Local",
            token_hash=hash_token(settings.local_token),
            destinations=[],
        )
        session.add(proj)
        await session.commit()
        await session.refresh(proj)
    return proj


async def project_from_token(
    x_annot_token: str | None = Header(None, alias="X-Annot-Token"),
    session: AsyncSession = Depends(get_session),
) -> Project:
    if settings.local_mode:
        return await _ensure_local_project(session)

    if not x_annot_token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "missing X-Annot-Token")
    token_hash = hash_token(x_annot_token)
    result = await session.execute(select(Project).where(Project.token_hash == token_hash))
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid token")
    return project
