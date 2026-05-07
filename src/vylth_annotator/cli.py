"""
`annotator` CLI entry point.

Subcommands:
  run       Start the API + dashboard locally (SQLite, zero config).
  list      Show open feedback (your project, scoped by token).
  pull      Download feedback envelopes + images to ./.annot/<project>/.
  resolve   Mark a feedback item resolved.
  init      Print the <script> snippet to embed into your dev site.
"""
from __future__ import annotations

import json
import os
import sys
import webbrowser
from pathlib import Path
from typing import Optional

import click
import httpx

from .config import settings


def _set_local_mode() -> None:
    """Force local mode for this process (the CLI default)."""
    os.environ.setdefault("ANNOTATOR_LOCAL_MODE", "true")
    settings.local_mode = True


def _api_base(host: str | None = None, port: int | None = None) -> str:
    h = host or settings.host or "127.0.0.1"
    p = port or settings.port
    return f"http://{h}:{p}"


@click.group(help="Annotator — drop-in design-feedback widget. Self-hostable on localhost.")
@click.version_option(package_name="vylth-annotator")
def cli() -> None:
    pass


@cli.command(help="Run the annotator API + dashboard locally on http://localhost:8092.")
@click.option("--host", default=None, help="Bind host (default 127.0.0.1).")
@click.option("--port", default=None, type=int, help="Bind port (default 8092).")
@click.option("--open/--no-open", "open_browser", default=True, help="Open dashboard in browser.")
@click.option("--db", default=None, help="Override SQLite path or sqlalchemy URL.")
@click.option("--sink", "sink_dir", default=".annot",
              help="Write PNG + Markdown per annotation under this dir (default ./.annot). Pass '' to disable.")
def run(host: Optional[str], port: Optional[int], open_browser: bool, db: Optional[str], sink_dir: str) -> None:
    import uvicorn

    _set_local_mode()
    if db:
        os.environ["ANNOTATOR_DATABASE_URL"] = (
            db if "://" in db else f"sqlite+aiosqlite:///{Path(db).resolve()}"
        )
    if host:
        os.environ["ANNOTATOR_HOST"] = host
    if port:
        os.environ["ANNOTATOR_PORT"] = str(port)

    abs_sink = str(Path(sink_dir).resolve()) if sink_dir else ""
    os.environ["ANNOTATOR_SINK_DIR"] = abs_sink

    # Re-import settings so env overrides take effect.
    from .config import settings as fresh
    fresh.local_mode = True
    fresh.sink_dir = abs_sink

    base = _api_base(host=host or fresh.host, port=port or fresh.port)
    click.echo(f"\n  annotator → {base}")
    if abs_sink:
        click.echo(f"  sink     → {abs_sink}/<project>/  (png + md per annotation)")
    click.echo(f"\n  embed this in your dev site:")
    click.echo(f"    <script src=\"{base}/w.js\" data-project=\"local\" data-token=\"local\" data-webhook=\"{base}/v1/feedback\"></script>\n")

    if open_browser:
        try:
            webbrowser.open(base)
        except Exception:
            pass

    uvicorn.run(
        "vylth_annotator.main:app",
        host=host or fresh.host,
        port=port or fresh.port,
        log_level="info",
        reload=False,
    )


@cli.command("list", help="List open feedback for your token's project.")
@click.option("--api", default=None, help=f"API base URL (default {_api_base()}).")
@click.option("--token", default=None, help="Token (default $ANNOTATOR_TOKEN or 'local').")
@click.option("--status", "status_filter", default="open", help="Filter by status.")
@click.option("--limit", default=20, type=int)
def list_cmd(api: Optional[str], token: Optional[str], status_filter: str, limit: int) -> None:
    base = api or _api_base()
    tok = token or os.environ.get("ANNOTATOR_TOKEN") or "local"
    r = httpx.get(f"{base}/v1/feedback", params={"status": status_filter, "limit": limit}, headers={"X-Annot-Token": tok}, timeout=10)
    if r.status_code != 200:
        click.echo(f"error: {r.status_code} {r.text}", err=True)
        sys.exit(1)
    items = r.json().get("items", [])
    if not items:
        click.echo("no open feedback")
        return
    for fb in items:
        click.echo(f"  {fb['id'][:8]}  {fb['pathname']:<32}  {fb['comment'][:80]}")


@cli.command(help="Download feedback (envelope JSON + image) to ./.annot/<project>/.")
@click.option("--api", default=None)
@click.option("--token", default=None)
@click.option("--out", default=".annot", help="Output directory.")
def pull(api: Optional[str], token: Optional[str], out: str) -> None:
    base = api or _api_base()
    tok = token or os.environ.get("ANNOTATOR_TOKEN") or "local"
    headers = {"X-Annot-Token": tok}
    r = httpx.get(f"{base}/v1/feedback", params={"status": "open", "limit": 100}, headers=headers, timeout=10)
    r.raise_for_status()
    items = r.json().get("items", [])

    if not items:
        click.echo("no open feedback to pull")
        return

    out_dir = Path(out)
    for fb in items:
        proj_dir = out_dir / fb["project_id"]
        proj_dir.mkdir(parents=True, exist_ok=True)
        slug = fb["id"][:8]
        env_path = proj_dir / f"{slug}.json"
        img_path = proj_dir / f"{slug}.png"
        env_path.write_text(json.dumps(fb, indent=2, default=str))
        img = httpx.get(f"{base}/v1/feedback/{fb['id']}/image", headers=headers, timeout=15)
        if img.status_code == 200:
            img_path.write_bytes(img.content)
        click.echo(f"  pulled {slug} → {env_path}")


@cli.command(help="Mark a feedback item resolved.")
@click.argument("fb_id")
@click.option("--api", default=None)
@click.option("--token", default=None)
def resolve(fb_id: str, api: Optional[str], token: Optional[str]) -> None:
    base = api or _api_base()
    tok = token or os.environ.get("ANNOTATOR_TOKEN") or "local"
    r = httpx.post(f"{base}/v1/feedback/{fb_id}/resolve", headers={"X-Annot-Token": tok}, timeout=10)
    if r.status_code != 200:
        click.echo(f"error: {r.status_code} {r.text}", err=True)
        sys.exit(1)
    click.echo(f"resolved {fb_id}")


@cli.command(help="Print the <script> snippet to embed in your dev site.")
@click.option("--host", default="localhost")
@click.option("--port", default=8092, type=int)
@click.option("--project", default="local")
@click.option("--token", default="local")
def init(host: str, port: int, project: str, token: str) -> None:
    base = f"http://{host}:{port}"
    snippet = (
        f'<script src="{base}/w.js"\n'
        f'        data-project="{project}"\n'
        f'        data-token="{token}"\n'
        f'        data-webhook="{base}/v1/feedback"></script>'
    )
    click.echo(snippet)


@cli.group(help="Install the annotator skill so agents (Claude Code, Codex, Cursor, …) read .annot/ automatically.")
def skill() -> None:
    pass


def _skill_text() -> str:
    """Read the bundled SKILL.md."""
    from importlib.resources import files
    return (files("vylth_annotator") / "skill" / "SKILL.md").read_text(encoding="utf-8")


@skill.command("install", help="Drop SKILL.md into the right place for the detected agent(s). Defaults to all that apply.")
@click.option("--target", type=click.Choice(["auto", "claude", "codex", "cursor", "all"]), default="auto",
              help="Which agent flavor(s) to install for.")
@click.option("--cwd", default=".", help="Project root (default current dir).")
def skill_install(target: str, cwd: str) -> None:
    root = Path(cwd).resolve()
    text = _skill_text()
    written: list[Path] = []

    targets: list[str]
    if target == "auto":
        targets = []
        if (root / ".claude").exists() or (root / "CLAUDE.md").exists(): targets.append("claude")
        if (root / "AGENTS.md").exists() or any(root.glob("*.codex*")):  targets.append("codex")
        if (root / ".cursor").exists() or (root / ".cursorrules").exists(): targets.append("cursor")
        if not targets:
            targets = ["claude", "codex"]  # safe defaults
    elif target == "all":
        targets = ["claude", "codex", "cursor"]
    else:
        targets = [target]

    for t in targets:
        if t == "claude":
            dst = root / ".claude" / "skills" / "annotator" / "SKILL.md"
            dst.parent.mkdir(parents=True, exist_ok=True)
            dst.write_text(text, encoding="utf-8")
            written.append(dst)
        elif t == "codex":
            # AGENTS.md convention — append a section if the file already has unrelated content.
            dst = root / "AGENTS.md"
            section = "\n\n## annotator\n\n" + text
            if dst.exists():
                existing = dst.read_text(encoding="utf-8")
                if "## annotator" in existing:
                    # rewrite the annotator section
                    head, _, _ = existing.partition("## annotator")
                    dst.write_text(head.rstrip() + section, encoding="utf-8")
                else:
                    dst.write_text(existing.rstrip() + section, encoding="utf-8")
            else:
                dst.write_text("# AGENTS\n" + section, encoding="utf-8")
            written.append(dst)
        elif t == "cursor":
            dst = root / ".cursor" / "rules" / "annotator.md"
            dst.parent.mkdir(parents=True, exist_ok=True)
            dst.write_text(text, encoding="utf-8")
            written.append(dst)

    click.echo("Installed:")
    for p in written:
        click.echo(f"  {p.relative_to(root)}")
    click.echo()
    click.echo("Now any time you submit an annotation, the agent will see new files appear in .annot/")
    click.echo("and know how to read + resolve them. Run `annotator run` to start collecting.")


@skill.command("show", help="Print the SKILL.md content to stdout (for piping into custom locations).")
def skill_show() -> None:
    click.echo(_skill_text())


def main() -> None:  # entry point for pyproject.toml
    cli()


if __name__ == "__main__":
    main()
