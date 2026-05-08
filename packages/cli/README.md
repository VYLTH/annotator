# vylth-annotator (npm)

```bash
npm i -g vylth-annotator
annotator setup
```

That's it.

## What `npm install` actually does

1. Downloads the JS shim (~3 KB).
2. **Postinstall hook**: if `pipx` is on your PATH, runs `pipx install vylth-annotator` automatically — that pulls down the Python service (FastAPI + SQLite + the dashboard UI) and all its dependencies.
3. If `pipx` isn't there, prints a one-line install hint for your platform (`brew install pipx`, `sudo apt install pipx`, etc.) and exits clean. **Never fails the npm install.**

The CLI then forwards every `annotator <cmd>` to the Python service:

| You ran | Shim resolves to |
|---|---|
| `annotator <cmd>` (after pipx install) | the installed `annotator` binary on PATH |
| `annotator <cmd>` (no pipx, has uvx) | `uvx vylth-annotator <cmd>` |
| `annotator <cmd>` (nothing Python) | error with platform-specific install commands |

## Why a Node shim at all?

JS developers reach for `npm` / `npx` first. The shim gives them a one-command path to the Python tool without making them learn pipx. The actual implementation stays in Python (where the FastAPI service lives), but the user never has to know that.

## Optional extras

The base install handles SQLite + local mode. For hosted Postgres or R2-backed image storage, install with extras:

```bash
pipx install 'vylth-annotator[postgres,storage]'
```

You can also do this manually after the npm install — it's idempotent.

## Skipping the postinstall

CI / sandboxes / deterministic builds:

```bash
VYLTH_ANNOTATOR_SKIP_POSTINSTALL=1 npm i -g vylth-annotator
# or
npm i -g vylth-annotator --ignore-scripts
```

The shim works without the postinstall — every command goes through `pipx run vylth-annotator` instead, which is slower-on-first-use but functionally identical.

## Quickstart

```bash
npm i -g vylth-annotator         # postinstall pipx-installs the Python service
annotator setup                  # detects your project (Vite/Next.js/HTML), wires the widget
annotator run                    # OR: spin up your own local server with dashboard at :8092
```

The widget POSTs to whichever API base you point it at — `https://annot.vylth.com` by default for the Vylth team, or `http://localhost:8092` if you're self-hosting via `annotator run`.

See the [main repo](https://github.com/VYLTH/annotator) for full docs.
