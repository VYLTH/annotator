# Browser-extension store submission kit

Everything you need to submit `annotator-extension-0.0.1.zip` to the Chrome Web Store, Firefox AMO, and Edge Add-ons. Hand each store the same zip from the GitHub release; only the listing copy and screenshots vary.

The build itself is finished — `packages/extension/releases/annotator-extension-0.0.1.zip` (≈12KB).

---

## What you (the human) need

| Store | Account / fee | Where |
|---|---|---|
| Chrome Web Store | $5 one-time developer fee, Google account | https://chrome.google.com/webstore/devconsole |
| Firefox Add-ons (AMO) | Free, Mozilla account | https://addons.mozilla.org/developers/addon/submit/distribution |
| Edge Add-ons | Free, Microsoft Partner Center account | https://partner.microsoft.com/dashboard/microsoftedge |

Privacy policy (required by Chrome + Edge for any extension touching user content) is at `/PRIVACY.md` in this repo. Host it at `https://vylth.com/annotator/privacy` (or paste a copy into a public Gist) and link to that URL in each store form.

---

## Listing copy (use verbatim across all three stores)

### Name
`Annotator`

### Short description (max ~132 chars)
`Click the toolbar icon, drag a rectangle on any page, leave a note. Lands in your local annotator queue. Self-hostable, MIT.`

### Full description

```
Annotator is a one-click design-feedback bubble for any web page.

Click the toolbar icon. Page freezes. Drag a rectangle over what's wrong. Type one sentence. Send. The screenshot, the page URL, your viewport size, and your comment land in your local annotator server's queue — where you (or the engineer or AI agent you've pointed it at) can read them as PNG + Markdown files on disk.

Because the server runs on your laptop, nothing about this extension touches Vylth's infrastructure. There's no signup, no telemetry, no central database. The extension is a client; you own the destination.

QUICK START

1. Install the local server (one of these):
     pipx install vylth-annotator
     npm install -g vylth-annotator
     uv tool install vylth-annotator

2. Run it:
     annotator run

3. Install this extension. The defaults (project: local, token: local, apiBase: http://localhost:8092) match the local server out of the box. Click "Annotate this page" and submit.

WHAT GETS COLLECTED

Per submission: a single PNG of the visible tab, the page URL, your viewport size, basic browser info (user-agent, language, timezone), and your typed comment. That's it. No DOM contents are scraped, no cookies are read, no third-party services are contacted.

Also useful for:
- Annotating competitor sites for design references
- Capturing rendering bugs on third-party tools (Notion, Figma, your own deployed app)
- Feeding feedback directly into a Claude Code / Codex / Cursor session — the local server writes Markdown that agents read natively

OPEN SOURCE

MIT-licensed at https://github.com/VYLTH/annotator. The store build is byte-identical to the GitHub release zip.

PRIVACY

https://vylth.com/annotator/privacy (or wherever you host the PRIVACY.md from the repo)
```

### Category
- Chrome: **Developer Tools**
- Firefox: **Web Development**
- Edge: **Productivity**

### Search keywords / tags
`annotation, feedback, screenshot, developer-tools, design-review, claude-code, agents, self-hosted, localhost, open-source`

### Single-purpose justification (Chrome only — required for any non-trivial permissions)

```
Annotator captures one screenshot of the visible browser tab when the user clicks the extension's toolbar icon, lets the user draw rectangles and write a short comment on it, and POSTs that single envelope to a URL the user configured. That is the extension's only purpose. There are no background scripts on third-party sites, no auto-capture, and no continuous data collection.
```

### Permission justifications (Chrome — required for each declared permission)

| Permission | Justification |
|---|---|
| `activeTab` | Required for `chrome.tabs.captureVisibleTab()` to capture the tab the user clicked from. Bound to the active tab and a user gesture; doesn't grant access to other tabs. |
| `scripting` | Required to inject the annotation overlay UI into the current page on user click. Injection only happens after the user clicks the toolbar action's "Annotate this page" button. |
| `storage` | Stores the user-configured `apiBase`, `project`, and `token` in `chrome.storage.local`. Nothing else is persisted. |
| `host_permissions: http://localhost/*, http://127.0.0.1/*` | Required to POST captured annotations to the local server the user runs (`annotator run`). |
| `optional_host_permissions: https://*/*, http://*/*` | Granted only if the user changes `apiBase` to a non-local URL. Optional permissions trigger a Chrome prompt the first time. |

---

## Screenshots (required: 1280×800 or 640×400)

You need at least one, ideally three. Capture these against your `annotator run` dashboard + a real site:

1. **Toolbar popup open** — `Annotator` panel showing the API base / project / token inputs and the red "Annotate this page" button. Helpful caption text: *"Configure once. Defaults match the local annotator server."*
2. **Annotation overlay in action** — a real site (or `https://vylth.com`) frozen with two red rectangles drawn on it and the right-side sidebar visible with a comment typed in. Caption: *"Click. Page freezes. Drag a rectangle. Type one sentence."*
3. **Local dashboard at `localhost:8092`** — the dark dashboard showing 2-3 annotation cards with screenshots, comment, and pill counts. Caption: *"Annotations land instantly on your laptop. Open in Claude Code or Cursor and the agent picks them up."*

How to capture: install the extension locally, capture each panel, save as PNG. macOS: `Cmd+Shift+4` → space → click. Linux: `gnome-screenshot -i` or KDE Spectacle. Crop to 1280×800.

---

## Per-store submission steps

### Chrome Web Store

1. Sign in at https://chrome.google.com/webstore/devconsole (one-time $5 fee if first time).
2. **New item** → upload `annotator-extension-0.0.1.zip`.
3. **Privacy practices** tab:
   - Single-purpose statement: paste the block above.
   - Permission justifications: paste each row from the table above.
   - Data usage: tick **does not collect user data** (the server destination is user-controlled and outside Chrome's purview).
   - Privacy policy URL: your hosted privacy policy URL.
4. **Store listing** tab:
   - Title, short description, full description, category, screenshots — all from this doc.
   - Promotional images: optional for first release.
5. **Distribution**: Public, all regions.
6. Submit for review. New extensions: 1–3 business days typically.

### Firefox Add-ons (AMO)

1. Sign in at https://addons.mozilla.org/developers/.
2. **Submit a new add-on** → "On this site" (listed) → upload the same zip.
3. AMO does an automated review (compatibility check) — usually returns minutes later.
4. Listing form mirrors Chrome's. Privacy policy URL is required.
5. The same zip works as-is for Firefox — MV3 is supported.

### Edge Add-ons

1. Sign in at https://partner.microsoft.com/dashboard/microsoftedge.
2. **Submit an extension** → upload the zip.
3. Same listing copy.
4. Edge accepts Chrome MV3 zips byte-identically. Review is usually 1–7 days.

---

## Tracking

Once submitted, watch:

- Chrome dashboard for "In review" → "Published". Public URL becomes `https://chromewebstore.google.com/detail/annotator/<id>`.
- AMO dashboard for the listing URL `https://addons.mozilla.org/firefox/addon/annotator/`.
- Edge dashboard for the marketplace URL `https://microsoftedge.microsoft.com/addons/detail/<id>`.

Update `README.md`'s install section once the public URLs exist — replace the "download zip from Releases" instructions with proper "Add to Chrome / Firefox / Edge" buttons.

---

## Future releases

After v0.0.1, bump `packages/extension/package.json` and `manifest.json` versions in lockstep, rebuild (`pnpm build`), and re-upload the new zip in the same dashboards. Each store has an "Upload new version" flow that keeps the same listing.
