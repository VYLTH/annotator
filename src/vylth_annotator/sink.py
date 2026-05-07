"""
Filesystem sink — writes each accepted annotation to disk as a PNG + Markdown
pair so any agent (Claude Code, Codex, Cursor, raw LLMs) can consume them
without API access.

Layout:
  <root>/<project>/<id8>-<slug>.png
  <root>/<project>/<id8>-<slug>.md

The .md uses YAML frontmatter for machine-readable fields and a human-readable
body with the comment, target element, console/network/error excerpts, and an
embedded image reference.
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import UUID


def _slugify(text: str, max_len: int = 40) -> str:
    s = re.sub(r"[^a-zA-Z0-9\s-]", "", text or "").strip().lower()
    s = re.sub(r"\s+", "-", s)
    s = re.sub(r"-+", "-", s)
    return s[:max_len].strip("-") or "annotation"


def write_pair(
    root: Path,
    project_id: str,
    fb_id: UUID,
    image_bytes: bytes | None,
    envelope: dict[str, Any],
) -> tuple[Path, Path]:
    """Write the .png + .md pair. Returns (png_path, md_path)."""
    proj_dir = root / project_id
    proj_dir.mkdir(parents=True, exist_ok=True)

    short = str(fb_id).replace("-", "")[:8]
    slug = _slugify(envelope.get("comment", ""))
    base = f"{short}-{slug}"

    png_path = proj_dir / f"{base}.png"
    md_path  = proj_dir / f"{base}.md"

    if image_bytes:
        png_path.write_bytes(image_bytes)

    md_path.write_text(_render_md(fb_id, envelope, png_path.name), encoding="utf-8")
    return png_path, md_path


def _render_md(fb_id: UUID, envelope: dict[str, Any], image_filename: str) -> str:
    url = envelope.get("url", {})
    href = url.get("href", "") if isinstance(url, dict) else (url or "")
    pathname = url.get("pathname", "") if isinstance(url, dict) else ""
    viewport = envelope.get("viewport") or {}
    targets = envelope.get("targets") or []
    console_buf = envelope.get("console") or []
    network_buf = envelope.get("network") or []
    errors_buf  = envelope.get("errors")  or []
    perf = envelope.get("perf") or {}

    primary_target = targets[0] if targets else None
    title = (envelope.get("comment") or "annotation").splitlines()[0][:80]

    fm: dict[str, Any] = {
        "id":       str(fb_id),
        "project":  envelope.get("project", ""),
        "status":   "open",
        "created":  datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "url":      href,
        "pathname": pathname,
        "viewport": viewport,
        "image":    image_filename,
        "rects":    envelope.get("rects", []),
    }
    if primary_target:
        fm["target_selector"] = primary_target.get("selector", "")
    fm["counts"] = {
        "errors":  len(errors_buf),
        "network": len(network_buf),
        "console": len(console_buf),
    }

    parts: list[str] = []
    parts.append("---")
    parts.append(_yaml_dump(fm))
    parts.append("---\n")
    parts.append(f"# {title}\n")
    parts.append(f"> {envelope.get('comment','').strip()}\n")

    if primary_target:
        parts.append("## Target\n")
        parts.append(f"- **Selector:** `{primary_target.get('selector','')}`")
        if primary_target.get("text"):
            parts.append(f"- **Text:** {primary_target['text']!r}")
        rect = primary_target.get("rect") or {}
        if rect:
            parts.append(f"- **Rect:** {rect.get('x',0)},{rect.get('y',0)} {rect.get('w',0)}×{rect.get('h',0)}")
        parts.append("")

    parts.append("## Diagnostics\n")
    if errors_buf:
        parts.append("### JS errors")
        parts.append("```")
        for e in errors_buf[:8]:
            parts.append(f"[{e.get('source','?')}] {e.get('msg','')}")
        parts.append("```\n")
    if network_buf:
        parts.append("### Network errors")
        parts.append("```")
        for n in network_buf[:8]:
            parts.append(f"{n.get('method','GET'):<6} {n.get('status','?')}  {n.get('url','')}")
        parts.append("```\n")
    if console_buf:
        parts.append("### Console (last 10)")
        parts.append("```")
        for c in console_buf[-10:]:
            args = " ".join(c.get("args", []))[:200]
            parts.append(f"[{c.get('level','log')}] {args}")
        parts.append("```\n")
    if perf:
        parts.append("### Perf")
        parts.append("```")
        if "fcp" in perf: parts.append(f"FCP: {perf['fcp']}ms")
        if "lcp" in perf: parts.append(f"LCP: {perf['lcp']}ms")
        long_tasks = perf.get("longTasks") or []
        if long_tasks:
            parts.append(f"Long tasks: {len(long_tasks)} (worst {max(t.get('ms',0) for t in long_tasks)}ms)")
        parts.append("```\n")

    parts.append("## Screenshot\n")
    parts.append(f"![screenshot]({image_filename})\n")
    parts.append("---\n")
    parts.append("**Resolve:** delete this file, OR change `status: open` → `status: resolved` in the frontmatter, OR run `annotator resolve " + str(fb_id) + "`.")
    return "\n".join(parts)


def _yaml_dump(d: dict[str, Any]) -> str:
    """Tiny YAML dumper (avoid PyYAML dep). Keys are strings; values are scalars,
    flow-style lists/dicts, or JSON for nested structures."""
    out: list[str] = []
    for k, v in d.items():
        if isinstance(v, str):
            if any(c in v for c in [':', '#', '\n', '"']):
                out.append(f"{k}: {json.dumps(v)}")
            else:
                out.append(f"{k}: {v}")
        elif isinstance(v, bool):
            out.append(f"{k}: {'true' if v else 'false'}")
        elif isinstance(v, (int, float)):
            out.append(f"{k}: {v}")
        elif v is None:
            out.append(f"{k}: null")
        else:
            out.append(f"{k}: {json.dumps(v, default=str)}")
    return "\n".join(out)
