# Privacy policy

**Vylth Annotator Browser Extension** · last updated 2026-05-07

## What this extension does

When you click the extension's toolbar icon and press **Annotate this page**, the extension:

1. Captures a single screenshot of the visible browser tab using `chrome.tabs.captureVisibleTab()`.
2. Lets you draw rectangles and type a comment on top of that screenshot.
3. Sends the screenshot, your comment, the page URL, your viewport size, and basic browser info (user-agent, language, timezone) to **the API endpoint you configured in the extension popup**.

By default, that API endpoint is `http://localhost:8092` — the local server you run on your own machine via `pipx install vylth-annotator && annotator run`. **Nothing leaves your computer in this default configuration.**

## What we collect

**We don't.** Vylth Labs operates no central server that receives extension traffic. The extension is a client; the destination is whatever URL you typed into the popup's "API base" field.

If you point the extension at a third-party server (your own self-hosted annotator instance, a teammate's, or a public hosted version), data flows to that server under that operator's policy — not ours.

## What gets stored locally

The extension stores three values in `chrome.storage.local`:

- `apiBase` — the URL you configured (default `http://localhost:8092`)
- `project` — a project slug (default `local`)
- `token` — the auth token you configured (default `local`)

Nothing else is persisted by the extension. There is no telemetry, no analytics, no remote logging.

## Permissions

| Permission | Why |
|---|---|
| `activeTab` | Capture the visible tab when you click the toolbar action. Limited to the tab you're actively looking at. |
| `scripting` | Inject the annotation overlay UI into the current page when you click "Annotate". |
| `storage`   | Save your `apiBase` / `project` / `token` config. |
| `host_permissions: http://localhost/*` and `127.0.0.1/*` | Send annotations to your local annotator server. |
| `optional_host_permissions: https://*/*, http://*/*` | Granted only if you point `apiBase` at a non-local server. The extension prompts before sending to a new origin. |

The extension does **not** read or modify pages you visit unless you actively click the toolbar action. There are no background content scripts running on every site.

## Network behavior

| Origin | When | What |
|---|---|---|
| `apiBase` (your config) | Only when you submit an annotation | A single `POST` containing the screenshot + your comment + page URL + viewport + UA |
| Anywhere else | Never | – |

The extension does not phone home. It does not contact `vylth.com`, GitHub, Cloudflare, Google, or any other third party. The only outbound network call is the submission `POST` you trigger by clicking Send.

## Open source

Source code is published under the MIT license at https://github.com/VYLTH/annotator. You can audit, fork, or self-build the extension. The Chrome Web Store / Firefox AMO build is byte-identical to the GitHub release.

## Contact

Questions, requests, or to report a vulnerability:
- Open an issue: https://github.com/VYLTH/annotator/issues
- Email: labs@vylth.com
