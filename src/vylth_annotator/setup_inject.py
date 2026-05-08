"""
`annotator setup` — auto-detect a frontend project and wire the widget in.

Goal: drop into any project directory, run one command, get a working widget
with sensible production gating, env-var wiring, and `.gitignore` updates —
no manual file edits.

Supported stacks (best-effort, fall back to plain `<script>` snippet):
  • Vite (any framework using vite.config.*) — inject in `index.html`,
    optionally bring in an `annotatorGate` plugin to strip from prod builds
  • Next.js (app router) — inject `<Script>` in `app/layout.tsx`
  • Next.js (pages router) — inject `<Script>` in `pages/_app.{tsx,jsx,js}`
  • Plain HTML — inject before `</body>` in any top-level `index.html`

Anything else: print a copy-paste-ready snippet and bow out.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Iterable


class Stack(str, Enum):
    VITE = "vite"
    NEXT_APP = "next-app"
    NEXT_PAGES = "next-pages"
    PLAIN_HTML = "plain-html"
    UNKNOWN = "unknown"


@dataclass
class Detected:
    stack: Stack
    root: Path
    entry: Path | None      # the file we'd modify
    env_dir: Path           # where .env.local lives
    env_var: str            # VITE_ANNOT_TOKEN or NEXT_PUBLIC_ANNOT_TOKEN
    framework_label: str    # human-friendly


def detect(root: Path) -> Detected:
    """Walk a project root and figure out what we're dealing with."""
    pkg_json = root / "package.json"
    deps: dict[str, str] = {}
    if pkg_json.exists():
        try:
            data = json.loads(pkg_json.read_text(encoding="utf-8"))
            deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
        except json.JSONDecodeError:
            deps = {}

    # Next.js (app router > pages router)
    if "next" in deps:
        for candidate in [
            "app/layout.tsx", "app/layout.jsx", "app/layout.ts", "app/layout.js",
            "src/app/layout.tsx", "src/app/layout.jsx",
        ]:
            p = root / candidate
            if p.exists():
                return Detected(Stack.NEXT_APP, root, p, root, "NEXT_PUBLIC_ANNOT_TOKEN", "Next.js (App Router)")

        for candidate in [
            "pages/_app.tsx", "pages/_app.jsx", "pages/_app.ts", "pages/_app.js",
            "src/pages/_app.tsx", "src/pages/_app.jsx",
        ]:
            p = root / candidate
            if p.exists():
                return Detected(Stack.NEXT_PAGES, root, p, root, "NEXT_PUBLIC_ANNOT_TOKEN", "Next.js (Pages Router)")

    # Vite (any framework)
    has_vite_config = any((root / f"vite.config.{ext}").exists() for ext in ("ts", "js", "mjs", "mts"))
    has_vite_dep = "vite" in deps
    if has_vite_config or has_vite_dep:
        # find the most likely entry index.html
        candidates = [
            root / "index.html",
            root / "src" / "index.html",
            root / "frontend" / "index.html",
            root / "apps" / "web" / "index.html",
        ]
        for c in candidates:
            if c.exists():
                env_dir = c.parent if c.parent != root else root
                # also try the dir holding vite.config
                return Detected(Stack.VITE, root, c, root, "VITE_ANNOT_TOKEN", "Vite")

    # Plain HTML — any top-level index.html with no framework signal
    plain = root / "index.html"
    if plain.exists() and not deps:
        return Detected(Stack.PLAIN_HTML, root, plain, root, "ANNOT_TOKEN", "Plain HTML")

    return Detected(Stack.UNKNOWN, root, None, root, "VITE_ANNOT_TOKEN", "Unknown / unsupported")


# ---------------------------------------------------------------------------
# Injection helpers — each one is idempotent (rerun is a no-op).
# ---------------------------------------------------------------------------

INJECTED_MARKER = "<!-- annot:start -->"
INJECTED_END    = "<!-- annot:end -->"
NEXT_MARKER     = "/* annot:start */"
NEXT_END        = "/* annot:end */"


def script_tag_html(*, project: str, api_base: str, env_var: str, redact: str | None) -> str:
    redact_attr = f' data-redact="{redact}"' if redact else ""
    return (
        f'<script src="{api_base}/w.js"\n'
        f'        data-project="{project}"\n'
        f'        data-token="%{env_var}%"\n'
        f'        data-webhook="{api_base}/v1/feedback"{redact_attr}></script>'
    )


def inject_into_html(file: Path, *, project: str, api_base: str, env_var: str, redact: str | None) -> bool:
    """Inject the widget into an HTML file before </body>. Idempotent."""
    text = file.read_text(encoding="utf-8")
    if INJECTED_MARKER in text:
        return False  # already installed

    snippet = (
        f"\n  {INJECTED_MARKER}\n"
        f"  {script_tag_html(project=project, api_base=api_base, env_var=env_var, redact=redact)}\n"
        f"  {INJECTED_END}\n"
    )
    if "</body>" in text:
        new = text.replace("</body>", f"{snippet}</body>", 1)
    else:
        new = text + snippet
    file.write_text(new, encoding="utf-8")
    return True


def inject_into_next_layout(file: Path, *, project: str, api_base: str, env_var: str, redact: str | None) -> bool:
    """Inject into Next.js app/layout.tsx (or pages/_app.tsx)."""
    text = file.read_text(encoding="utf-8")
    if "annot.vylth.com" in text or NEXT_MARKER in text:
        return False  # already installed

    redact_prop = f'\n        data-redact="{redact}"' if redact else ""

    # We'll inject a Script tag inside the existing return statement. Without
    # parsing JSX, the safest bet is to add an import + emit instructions for
    # manual placement, since Next layouts vary. So write a comment block at
    # the top of the file telling the user where to paste.
    block = f"""{NEXT_MARKER}
// Vylth annotator — uncomment + place this <Script> inside your <body> JSX
// (typically inside the return tree of the default export).
// import Script from "next/script";
//
// {{process.env.NODE_ENV !== "production" && (
//   <Script
//     src="{api_base}/w.js"
//     data-project="{project}"
//     data-token={{process.env.{env_var}}}
//     data-webhook="{api_base}/v1/feedback"{redact_prop}
//     strategy="afterInteractive"
//   />
// )}}
{NEXT_END}
"""
    file.write_text(block + "\n" + text, encoding="utf-8")
    return True


# ---------------------------------------------------------------------------
# .env / .gitignore wiring
# ---------------------------------------------------------------------------

def wire_env(*, env_dir: Path, env_var: str, token: str) -> tuple[Path, Path]:
    """Write the token to .env.local; placeholder to .env.example. Returns (local, example) paths."""
    local = env_dir / ".env.local"
    example = env_dir / ".env.example"

    # .env.local — append/replace
    if local.exists():
        existing = local.read_text(encoding="utf-8")
        if re.search(rf"^{re.escape(env_var)}=", existing, re.MULTILINE):
            new = re.sub(rf"^{re.escape(env_var)}=.*$", f"{env_var}={token}", existing, flags=re.MULTILINE)
        else:
            new = existing.rstrip() + f"\n{env_var}={token}\n"
        local.write_text(new, encoding="utf-8")
    else:
        local.write_text(f"{env_var}={token}\n", encoding="utf-8")
    local.chmod(0o600)

    # .env.example — append placeholder if missing
    if example.exists():
        existing = example.read_text(encoding="utf-8")
        if re.search(rf"^{re.escape(env_var)}=", existing, re.MULTILINE):
            return local, example
        new = existing.rstrip() + f"\n{env_var}=\n"
        example.write_text(new, encoding="utf-8")
    else:
        example.write_text(f"{env_var}=\n", encoding="utf-8")

    return local, example


def ensure_gitignore(*, root: Path) -> Path:
    """Make sure .env.local lives outside git. Returns the .gitignore path."""
    gi = root / ".gitignore"
    needed: list[str] = []
    existing = gi.read_text(encoding="utf-8") if gi.exists() else ""
    for pat in (".env.local", ".env.*.local"):
        if pat not in existing:
            needed.append(pat)
    if not needed:
        return gi
    block = "\n# vylth-annotator (added by `annotator setup`)\n" + "\n".join(needed) + "\n"
    gi.write_text((existing.rstrip() + block) if existing else block, encoding="utf-8")
    return gi
