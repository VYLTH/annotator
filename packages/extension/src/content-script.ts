/**
 * Content script — injected on demand by the service worker.
 *
 * The SW has already captured the visible tab into a PNG and sends it via
 * runtime.sendMessage. We mount a Shadow DOM overlay on the host page,
 * show the PNG as a frozen backdrop, let the user draw rects + comment,
 * then ship the envelope back to the SW for POSTing.
 *
 * Idempotent — re-injection is a no-op (the overlay either replaces itself
 * or, if already mounted, just brings itself forward).
 */
declare global {
  interface Window {
    __vylth_annotator_ext_loaded__?: boolean;
  }
}

if (window.__vylth_annotator_ext_loaded__) {
  // Already loaded — listener below will receive the new OVERLAY_OPEN.
} else {
  window.__vylth_annotator_ext_loaded__ = true;

  const ICON = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
    <path d="M4 4h16v12h-6l-5 4v-4H4V4z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/>
    <circle cx="8" cy="10" r="1.25" fill="currentColor"/>
    <circle cx="12" cy="10" r="1.25" fill="currentColor"/>
    <circle cx="16" cy="10" r="1.25" fill="currentColor"/>
  </svg>`;

  interface Rect { x: number; y: number; w: number; h: number; n: number; }

  let host: HTMLDivElement | null = null;

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type !== "OVERLAY_OPEN") return;
    open(msg.payload);
  });

  function open(payload: { png: string; url: string; title: string }) {
    if (host) host.remove();

    host = document.createElement("div");
    host.id = "__vylth_annotator_ext__";
    host.style.cssText = "all:initial;position:fixed;inset:0;z-index:2147483647;";
    document.documentElement.appendChild(host);

    const sd = host.attachShadow({ mode: "closed" });
    sd.innerHTML = STYLE + render(payload.png, payload.url);

    const canvas = sd.querySelector<HTMLCanvasElement>("#draw")!;
    const closeBtn = sd.querySelector<HTMLButtonElement>("#close")!;
    const sendBtn = sd.querySelector<HTMLButtonElement>("#send")!;
    const textarea = sd.querySelector<HTMLTextAreaElement>("#comment")!;
    const rectsList = sd.querySelector<HTMLUListElement>("#rects")!;
    const toast = sd.querySelector<HTMLDivElement>("#toast")!;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext("2d")!;
    const rects: Rect[] = [];
    let dragStart: { x: number; y: number } | null = null;
    let comment = "";

    function redraw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ff4d4d";
      ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
      ctx.textBaseline = "top";
      for (const r of rects) {
        ctx.fillStyle = "rgba(255, 77, 77, 0.10)";
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeRect(r.x, r.y, r.w, r.h);
        const tw = ctx.measureText(String(r.n)).width + 12;
        ctx.fillStyle = "#ff4d4d";
        ctx.fillRect(r.x, r.y, tw, 18);
        ctx.fillStyle = "#fff";
        ctx.fillText(String(r.n), r.x + 6, r.y + 3);
      }
    }

    function refreshList() {
      rectsList.innerHTML = rects.map((r) => `
        <li><span>#${r.n}</span><code>${Math.round(r.w)}×${Math.round(r.h)}</code><button data-rm="${r.n}">×</button></li>
      `).join("");
      rectsList.querySelectorAll<HTMLButtonElement>("button[data-rm]").forEach((b) => {
        b.onclick = () => {
          const n = Number(b.dataset.rm);
          const i = rects.findIndex((x) => x.n === n);
          if (i >= 0) {
            rects.splice(i, 1);
            rects.forEach((r, idx) => (r.n = idx + 1));
            refreshList();
            redraw();
          }
        };
      });
    }

    canvas.onpointerdown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      dragStart = { x: e.clientX, y: e.clientY };
    };
    canvas.onpointermove = (e: PointerEvent) => {
      if (!dragStart) return;
      redraw();
      const x = Math.min(dragStart.x, e.clientX);
      const y = Math.min(dragStart.y, e.clientY);
      const w = Math.abs(e.clientX - dragStart.x);
      const h = Math.abs(e.clientY - dragStart.y);
      ctx.fillStyle = "rgba(255, 77, 77, 0.10)";
      ctx.strokeStyle = "#ff4d4d";
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
    };
    canvas.onpointerup = (e: PointerEvent) => {
      if (!dragStart) return;
      const x = Math.min(dragStart.x, e.clientX);
      const y = Math.min(dragStart.y, e.clientY);
      const w = Math.abs(e.clientX - dragStart.x);
      const h = Math.abs(e.clientY - dragStart.y);
      dragStart = null;
      if (w < 6 || h < 6) { redraw(); return; }
      rects.push({ x, y, w, h, n: rects.length + 1 });
      refreshList();
      redraw();
    };

    textarea.oninput = () => { comment = textarea.value; };

    function close() {
      host?.remove();
      host = null;
      window.removeEventListener("keydown", onKey);
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    closeBtn.onclick = close;

    sendBtn.onclick = async () => {
      if (!comment.trim()) {
        textarea.focus();
        textarea.style.outline = "2px solid #ff4d4d";
        setTimeout(() => (textarea.style.outline = ""), 800);
        return;
      }
      sendBtn.disabled = true;
      sendBtn.textContent = "Sending…";

      const baked = await bakeRects(payload.png, rects);
      const envelope = {
        comment,
        image: baked,
        rects,
        url: { href: payload.url, pathname: new URL(payload.url).pathname, search: new URL(payload.url).search, hash: new URL(payload.url).hash },
        viewport: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio },
        document: {
          scrollW: document.documentElement.scrollWidth,
          scrollH: document.documentElement.scrollHeight,
          scrollX: window.scrollX,
          scrollY: window.scrollY,
        },
        targets: [], // extension mode: no DOM access, so no target inference (could be added — see optional perms)
        env: {
          ua: navigator.userAgent,
          platform: navigator.platform,
          lang: navigator.language,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
          online: navigator.onLine,
          theme: matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
        },
        console: [],
        network: [],
        errors:  [],
        perf:    {},
        metadata: { source: "extension", page_title: payload.title },
      };

      try {
        const res = await chrome.runtime.sendMessage({ type: "SUBMIT", envelope });
        if (!res?.ok) throw new Error(res?.error ?? "submit failed");
        toast.textContent = `Sent · ${res.id?.slice(0, 8) ?? "ok"}`;
        toast.classList.add("show");
        setTimeout(close, 1200);
      } catch (e: any) {
        toast.textContent = "Send failed: " + e.message;
        toast.classList.add("show", "err");
        sendBtn.disabled = false;
        sendBtn.textContent = "Retry";
      }
    };
  }

  async function bakeRects(pngDataUrl: string, rects: Rect[]): Promise<string> {
    const img = new Image();
    img.src = pngDataUrl;
    await img.decode();

    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);

    // viewport rects → image pixels via the dpr scaling captureVisibleTab uses.
    const sx = c.width / window.innerWidth;
    const sy = c.height / window.innerHeight;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ff4d4d";
    ctx.font = "600 14px sans-serif";
    ctx.textBaseline = "top";
    for (const r of rects) {
      const x = r.x * sx, y = r.y * sy, w = r.w * sx, h = r.h * sy;
      ctx.fillStyle = "rgba(255, 77, 77, 0.10)";
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      const tw = ctx.measureText(String(r.n)).width + 12;
      ctx.fillStyle = "#ff4d4d";
      ctx.fillRect(x, y, tw, 22);
      ctx.fillStyle = "#fff";
      ctx.fillText(String(r.n), x + 6, y + 4);
    }
    return c.toDataURL("image/png");
  }

  const STYLE = `<style>
    :host, * { box-sizing: border-box; }
    .root {
      position: fixed; inset: 0; display: grid;
      grid-template-columns: 1fr 380px;
      font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
      color: #ededed;
    }
    .stage { position: relative; overflow: hidden; background: #000; }
    .stage img.frozen {
      position: absolute; inset: 0; width: 100%; height: 100%;
      object-fit: cover; user-select: none; pointer-events: none;
    }
    canvas#draw {
      position: absolute; inset: 0; width: 100%; height: 100%;
      cursor: crosshair; touch-action: none;
    }
    .sidebar {
      background: #0e0f12; border-left: 1px solid #1f2127;
      padding: 18px; height: 100vh; overflow: auto;
      display: flex; flex-direction: column; gap: 12px;
    }
    .kicker { text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px; color: #ff4d4d; font-weight: 600; }
    header { display: flex; align-items: center; justify-content: space-between; }
    #close { all: unset; cursor: pointer; padding: 4px 8px; color: #888; font-size: 13px; border-radius: 4px; }
    #close:hover { color: #fff; background: #1a1c21; }
    #url { font-size: 11px; color: #6a6e76; word-break: break-all; }
    .hint { font-size: 11px; color: #6a6e76; }
    ul#rects { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
    ul#rects li { display: flex; align-items: center; gap: 8px; padding: 6px 8px; background: #16181d; border-radius: 6px; font-size: 12px; }
    ul#rects span { color: #ff4d4d; font-weight: 600; }
    ul#rects code { color: #888; font-size: 11px; margin-left: auto; }
    ul#rects button { all: unset; cursor: pointer; width: 18px; height: 18px; line-height: 18px; text-align: center; border-radius: 4px; color: #888; }
    ul#rects button:hover { background: #2a2d34; color: #fff; }
    textarea#comment {
      width: 100%; min-height: 110px; resize: vertical;
      background: #16181d; border: 1px solid #232730; color: #ededed;
      border-radius: 6px; padding: 10px;
      font-family: inherit; font-size: 13px; line-height: 1.5;
    }
    textarea#comment:focus { outline: 2px solid rgba(255, 77, 77, 0.5); border-color: transparent; }
    button#send {
      all: unset; cursor: pointer;
      background: #ff4d4d; color: #fff;
      padding: 10px 16px; border-radius: 6px; text-align: center;
      font-weight: 600; font-size: 13px; margin-top: auto;
    }
    button#send:hover { background: #ff6464; }
    button#send:disabled { opacity: 0.5; cursor: default; }
    #toast {
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      background: #1a1c21; color: #ededed; padding: 10px 14px;
      border-radius: 8px; font-size: 13px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.4);
      opacity: 0; pointer-events: none; transition: opacity 200ms;
    }
    #toast.show { opacity: 1; }
    #toast.err { background: #2a1316; color: #ffb4b4; }
  </style>`;

  function render(png: string, url: string) {
    return `
      <div class="root">
        <div class="stage">
          <img class="frozen" src="${png}" alt="" draggable="false" />
          <canvas id="draw"></canvas>
        </div>
        <aside class="sidebar">
          <header>
            <span class="kicker">${ICON_INLINE} Annotate</span>
            <button id="close" type="button">Close · Esc</button>
          </header>
          <div id="url">${escape(url)}</div>
          <div class="hint">Click and drag on the frozen frame to mark what's wrong.</div>
          <ul id="rects"></ul>
          <textarea id="comment" placeholder="What's wrong? One sentence."></textarea>
          <button id="send" type="button">Send</button>
          <div id="toast"></div>
        </aside>
      </div>`;
  }

  const ICON_INLINE = `<span style="display:inline-block;vertical-align:-3px;margin-right:6px">${ICON}</span>`;

  function escape(s: string) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
  }
}
