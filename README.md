# annotator

**Drop-in design-feedback widget for any web app.**

Click the bubble → page freezes → drag a rectangle → type one sentence → an annotation drops onto the engineer's filesystem with the screenshot, the URL, the clicked element selector, console logs, network errors, and JS exceptions captured at the moment of the click.

Self-hostable on localhost. Zero infrastructure.

```bash
pipx install vylth-annotator   # or: npm i -g vylth-annotator
annotator run                  # opens dashboard at http://localhost:8092
```

Drop this into your dev site:

```html
<script src="http://localhost:8092/w.js"
        data-project="local"
        data-token="local"
        data-webhook="http://localhost:8092/v1/feedback"></script>
```

Done. Submitted annotations appear as a `.png` + `.md` pair under `./.annot/local/` and on the dashboard. Run `annotator skill install` once and Claude Code / Codex / Cursor will pick them up automatically.

## How it works

```
[bubble click]
   ↓
1. dom-to-image → static PNG of the viewport (≈80ms)        ← page freezes
2. PNG becomes the backdrop, you draw rects on a <canvas>
3. Comment + Send → POST diagnostic envelope to the API
   ↓
4. Server writes:
   - SQLite row (queryable)
   - .annot/<project>/<id8>-<slug>.png   (screenshot with rects baked in)
   - .annot/<project>/<id8>-<slug>.md    (frontmatter + readable envelope)
   - dashboard updates live
   - optional: webhook fanout (Slack / Discord / Linear / custom HTTP)
```

The diagnostic envelope is collected automatically — the user only types the comment. `console.log/warn/error`, `fetch`, `XHR`, `window.onerror`, and `unhandledrejection` are tapped the moment `w.js` loads, ring-buffered, dumped at submit time.

## Three install modes for the widget

| Mode | When to use |
|------|------------|
| `<script>` tag | Any web app you control. One line, ≤30KB, vanilla, Shadow DOM isolated. |
| Browser extension | Annotate any third-party site (competitor analysis, design refs). |
| `@vylth/annotator-react` | React app that wants the widget visible only in dev/staging. |

Mode 1 is shipped. Mode 2 + 3 are scaffolded — see `/mnt/vylth/labs/directives/annotator/DIR-0073-productize-annotator.md`.

## Layout

```
src/vylth_annotator/      — pip-installable Python service
  cli.py                  — `annotator run | list | pull | resolve | init | skill`
  main.py                 — FastAPI app
  models.py               — SQLAlchemy (SQLite locally, Postgres for hosted)
  sink.py                 — disk writer (PNG + Markdown per annotation)
  fanout.py               — Slack / Discord / Linear / HTTP webhook dispatch
  templates/dashboard.html
  static/w.js             — built widget bundle
  skill/SKILL.md          — agent instructions

packages/
  widget/                 — TypeScript widget source (Vite single-file)
  cli/                    — npm shim that forwards to the Python CLI

pyproject.toml            — vylth-annotator on PyPI
LICENSE                   — MIT
```

## Agent integration

```bash
annotator skill install --target auto
```

Drops `SKILL.md` into the right place for the agents present in your project — `.claude/skills/annotator/`, `AGENTS.md`, `.cursor/rules/`. Now the agent knows how to find new `.md` files in `.annot/`, read the diagnostic envelope, fix the underlying issue, and mark the annotation resolved.

## License

MIT. Built by [Vylth Labs](https://vylth.com).
