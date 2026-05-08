<div align="center">

<img src="packages/extension/icons/icon-128.png" alt="Annotator" width="96" />

# annotator

**Click bubble · drag rectangle · type one sentence · screenshot + diagnostics land on the engineer's filesystem.**

Drop-in design-feedback widget for any web app. Self-hostable on localhost. MIT.

[![PyPI](https://img.shields.io/pypi/v/vylth-annotator?label=PyPI&color=ffffff&labelColor=0a0a0c&logo=pypi&logoColor=white)](https://pypi.org/project/vylth-annotator/)
[![npm](https://img.shields.io/npm/v/vylth-annotator?label=npm&color=ffffff&labelColor=0a0a0c&logo=npm)](https://www.npmjs.com/package/vylth-annotator)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Made by Vylth Labs](https://img.shields.io/badge/Made%20by-Vylth%20Labs-0a0a0c)](https://vylth.com)

</div>

---

```bash
npm i -g vylth-annotator        # auto-installs the Python service via pipx if available
annotator setup                 # detects your project, injects the widget, generates a token
```

…or in any project:

```bash
pipx install vylth-annotator
annotator run                   # local server + dashboard at http://localhost:8092
```

Drop this into your dev site (or skip — `annotator setup` does it for you):

```html
<script src="http://localhost:8092/w.js"
        data-project="local"
        data-token="local"
        data-webhook="http://localhost:8092/v1/feedback"></script>
```

Done. Click the bubble. Drag a rectangle on whatever's wrong. Type one sentence. Send. The screenshot, the page URL, the clicked element selector, the console logs, the network errors, and the JS exceptions captured at the moment of the click all land on your filesystem as a `.png` + `.md` pair under `./.annot/local/`.

**Capture happens at send time, not click time** — the page never freezes, never gets the "this page is loading slowly" termination prompt. Drag the bubble to wherever you want it; position persists.

---

## Why this exists

Every product team has the same review loop:

> Founder: *"Something's off here."* — screenshots → uploads → describes in text → engineer finds the pixel → fixes → screenshots back. Slow, lossy, repetitive.

Annotator collapses it: **the founder is already pointing at the screen. Just let them.** And because the engineer (or the AI agent helping them) gets a structured envelope with every piece of context — selector, console errors, network failures, viewport — they don't have to guess. The fix is faster *and* more accurate than what the screenshot-and-describe loop ever produced.

This used to live inside one specific Vylth product as a per-app feature. The loop was so good we extracted it.

## How it works

```
[bubble click]
   ↓
1. Transparent overlay mounts over the live page (no freeze) — drag rectangles
2. Type a sentence in the floating panel · click Send
   ↓
3. dom-to-image captures the page (with a "Capturing → Sending" spinner)
4. Rectangles get baked into the PNG · diagnostic envelope assembled
5. POST to your annotator API
   ↓
6. Server writes:
   • SQLite row (queryable, resolvable)
   • .annot/<project>/<id8>-<slug>.png  (with rectangles baked in)
   • .annot/<project>/<id8>-<slug>.md   (frontmatter + readable envelope)
   • dashboard updates live at :8092
   • optional: webhook fanout — Slack / Discord / Linear / custom HTTP
```

The diagnostic envelope is collected automatically — the user only types the comment. `console.log/warn/error`, `fetch`, `XHR`, `window.onerror`, and `unhandledrejection` are tapped the moment `w.js` loads, ring-buffered, dumped at submit time. So when the user says *"this button does nothing"*, the engineer also sees the silent 500 the click triggered.

## Three install modes

| | What | When to use |
|---|---|---|
| **`<script>` tag** | Drop one line into your dev/staging HTML. ≤30KB, vanilla, Shadow DOM isolated. | Any site you control. |
| **Browser extension** | Click the toolbar icon on any tab. Captures via `chrome.tabs.captureVisibleTab()`. | Annotate competitor sites, Figma, Notion, your own deployed prod app — anything you didn't ship the script tag on. [Sideload zip on the latest release](https://github.com/VYLTH/annotator/releases). |
| **`@vylth/annotator-react`** | `<Annotator project token metadata />` component. | React app where you want feedback gated to dev/staging via env, with app-state metadata attached. |

For **production-safe gating** — keeping the widget URL strings out of `dist/` rather than soft-failing on auth — see [docs/INSTALL-PATTERNS.md](docs/INSTALL-PATTERNS.md). Custodial / PHI / financial products should combine a build-time strip with a runtime guard.

## Agent integration

```bash
annotator skill install --target auto
```

Drops `SKILL.md` into the right place for the agents present in your project — `.claude/skills/annotator/`, `AGENTS.md` (Codex / OpenCode), `.cursor/rules/`. The agent sees new `.md` files in `.annot/`, reads the diagnostic envelope (selector, console, network, screenshot), fixes the underlying issue, and resolves the annotation by editing the frontmatter or running `annotator resolve <id>`.

This makes annotator the cleanest possible interface between human design feedback and AI-assisted code edits: the human points at the pixel, the agent reads the same context the engineer would, the fix lands.

## Self-hosting

Default mode is fully local — SQLite under `~/.vylth-annotator/annotator.db`, no Postgres needed, no signup, no account.

For a shared team instance, set `ANNOTATOR_DATABASE_URL` to a Postgres URL and `ANNOTATOR_LOCAL_MODE=false`. Optional R2 / S3-compatible image storage for shots over 500KB:

```bash
export ANNOTATOR_DATABASE_URL=postgresql+asyncpg://user:pw@host/annotator
export ANNOTATOR_R2_ACCOUNT_ID=...
export ANNOTATOR_R2_ACCESS_KEY=...
export ANNOTATOR_R2_SECRET_KEY=...
export ANNOTATOR_R2_BUCKET=annotator
pip install 'vylth-annotator[postgres,storage]'
annotator run --host 0.0.0.0 --port 8092
```

Per-project webhook fanout (Slack / Discord / Linear / custom HTTP) is configured on the `annotator_projects.destinations` row. See `src/vylth_annotator/fanout.py`.

## Repo layout

```
src/vylth_annotator/      The pip-installable Python service
  cli.py                  ─ annotator run | list | pull | resolve | init | skill
  main.py                 ─ FastAPI app
  models.py               ─ SQLAlchemy (SQLite local, Postgres hosted)
  sink.py                 ─ disk writer: PNG + Markdown per annotation
  fanout.py               ─ Slack / Discord / Linear / HTTP webhook dispatch
  storage.py              ─ R2 / S3-compatible large-image storage
  templates/dashboard.html
  static/w.js             ─ built widget bundle, served at /w.js
  skill/SKILL.md          ─ agent instructions

packages/
  widget/                 TypeScript source for the <script>-tag widget
  extension/              Chrome MV3 / Firefox extension
  react/                  @vylth/annotator-react
  cli/                    npm shim that forwards to the Python CLI

PRIVACY.md                Privacy policy (linked from store listings)
STORE-SUBMISSION.md       Per-store submission kit
LICENSE                   MIT
```

## Building from source

```bash
git clone https://github.com/VYLTH/annotator.git
cd annotator

# widget bundle (≤30KB)
pnpm install
pnpm -F @vylth/annotator-widget build

# extension zip
pnpm -F @vylth/annotator-extension build
# → packages/extension/releases/annotator-extension-<v>.zip

# python service
python -m venv .venv && source .venv/bin/activate
pip install -e .
annotator run
```

## Contributing

Issues and PRs welcome. Things we'd love help on:

- Vue / Svelte wrappers for mode 3
- A "Linear native" destination (auto-create issue, attach screenshot)
- Multiplayer cursors on the frozen frame
- Translations for the popup + dashboard
- Replacing `dom-to-image-more` with something even smaller for the same fidelity

Tag issues with `good first issue` if you're starting out.

## Status

v0.0.3 — security hardening + zero-friction setup. Already shipping in real Vylth product loops; APIs may shift before 1.0. Pin minor versions in production for now.

---

## Maintenance & contact

Annotator is built and maintained by **[Vylth Labs](https://vylth.com)**.

| | |
|---|---|
| **Curious about Vylth and our products** | [labs@vylth.com](mailto:labs@vylth.com) |
| **Want to build cool tools with us** | [careers@vylth.com](mailto:careers@vylth.com) |
| **See what we're about** | [vylth.com](https://vylth.com) |
| **Bugs / questions on this repo** | [open an issue](https://github.com/VYLTH/annotator/issues) |
| **Security disclosures** | [labs@vylth.com](mailto:labs@vylth.com) — see [SECURITY.md](SECURITY.md) |

### Follow along

| | Vylth | The dev |
|---|---|---|
| GitHub | [@VYLTH](https://github.com/VYLTH) | [@iamdecatalyst](https://github.com/iamdecatalyst) |
| X (Twitter) | [@Vylthofficial](https://x.com/Vylthofficial) | [@iamdecatalyst](https://x.com/iamdecatalyst) |

## License

[MIT](LICENSE) © Vylth Labs.

You can use it, fork it, ship it inside your product, host it for your team, sell consulting around it. We just ask: tell us what you're building. We love seeing it.
