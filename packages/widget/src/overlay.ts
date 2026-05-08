/**
 * Annotation overlay — Lightshot-style flow.
 *
 *   1. Bubble click → mount a TRANSPARENT overlay over the live page (no freeze).
 *      A canvas covers the viewport for rect-drawing; a floating panel holds
 *      the comment + send controls.
 *   2. User drags rects + types comment — page stays interactive-looking,
 *      pointer events are absorbed by the canvas.
 *   3. On Send → the panel switches to "Capturing → Sending" progress UI,
 *      then we run the actual screenshot capture (the slow bit), bake rects,
 *      build the envelope, POST, and close.
 *
 * Why deferred capture: dom-to-image walks the entire DOM and inlines
 * computed styles for every node — on a complex Vue/React app this can take
 * 2–10 s synchronously, long enough that Chrome offers to terminate the page.
 * By the time the user has dragged a rect and typed a comment, the wait is
 * perceptually folded into the post-send "sending..." moment, and the
 * widget has time to yield to the event loop between work chunks.
 */
import type { Buffers } from './buffers';
import type { Config, Rect } from './types';
import { capture, undoRedact } from './capture';
import { buildEnvelope, sendEnvelope } from './send';

interface OpenArgs {
  config: Config;
  buffers: Buffers;
  host: HTMLElement;
}

export async function openOverlay({ config, buffers, host }: OpenArgs): Promise<void> {
  const bubbleVisible = host.style.display;
  host.style.display = 'none';

  await new Promise<void>((resolve) => {
    mountOverlay({ config, buffers, host, onClose: () => {
      host.style.display = bubbleVisible;
      undoRedact();
      resolve();
    }});
  });
}

interface MountArgs extends OpenArgs {
  onClose: () => void;
}

function mountOverlay(args: MountArgs) {
  const { config, buffers, onClose } = args;

  const root = document.createElement('div');
  root.id = '__vylth_annotator_overlay__';
  root.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483646;';
  document.documentElement.appendChild(root);
  const sd = root.attachShadow({ mode: 'closed' });

  const rects: Rect[] = [];
  let dragStart: { x: number; y: number } | null = null;
  let comment = '';
  let sending = false;

  sd.innerHTML = STYLE + TEMPLATE();
  const canvas      = sd.querySelector<HTMLCanvasElement>('#draw')!;
  const panel       = sd.querySelector<HTMLDivElement>('.panel')!;
  const rectsList   = sd.querySelector<HTMLUListElement>('#rects')!;
  const textarea    = sd.querySelector<HTMLTextAreaElement>('#comment')!;
  const sendBtn     = sd.querySelector<HTMLButtonElement>('#send')!;
  const closeBtn    = sd.querySelector<HTMLButtonElement>('#close')!;
  const toast       = sd.querySelector<HTMLDivElement>('#toast')!;
  const urlEl       = sd.querySelector<HTMLDivElement>('#url')!;
  const progress    = sd.querySelector<HTMLDivElement>('.progress')!;
  const progressMsg = sd.querySelector<HTMLDivElement>('#progress-msg')!;
  urlEl.textContent = location.pathname || '/';

  const sizeCanvas = () => {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    redraw();
  };
  sizeCanvas();
  window.addEventListener('resize', sizeCanvas);

  function redraw() {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.textBaseline = 'top';
    rects.forEach((r) => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      const badge = String(r.n);
      const padX = 6, padY = 3;
      const tw = ctx.measureText(badge).width;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(r.x, r.y, tw + padX * 2, 18);
      ctx.fillStyle = '#fff';
      ctx.fillText(badge, r.x + padX, r.y + padY);
    });
  }

  function refreshRectsList() {
    rectsList.innerHTML = rects.map((r) => `
      <li><span>#${r.n}</span><code>${Math.round(r.w)}×${Math.round(r.h)}</code><button data-rm="${r.n}" aria-label="Remove">×</button></li>
    `).join('');
    rectsList.querySelectorAll<HTMLButtonElement>('button[data-rm]').forEach((b) => {
      b.addEventListener('click', () => {
        const n = Number(b.dataset.rm);
        const idx = rects.findIndex((r) => r.n === n);
        if (idx >= 0) {
          rects.splice(idx, 1);
          rects.forEach((r, i) => (r.n = i + 1));
          refreshRectsList();
          redraw();
        }
      });
    });
  }

  canvas.addEventListener('pointerdown', (e: PointerEvent) => {
    if (sending) return;
    canvas.setPointerCapture(e.pointerId);
    dragStart = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('pointermove', (e: PointerEvent) => {
    if (!dragStart) return;
    redraw();
    const ctx = canvas.getContext('2d')!;
    const x = Math.min(dragStart.x, e.clientX);
    const y = Math.min(dragStart.y, e.clientY);
    const w = Math.abs(e.clientX - dragStart.x);
    const h = Math.abs(e.clientY - dragStart.y);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
  });
  canvas.addEventListener('pointerup', (e: PointerEvent) => {
    if (!dragStart) return;
    const x = Math.min(dragStart.x, e.clientX);
    const y = Math.min(dragStart.y, e.clientY);
    const w = Math.abs(e.clientX - dragStart.x);
    const h = Math.abs(e.clientY - dragStart.y);
    dragStart = null;
    if (w < 6 || h < 6) { redraw(); return; }
    rects.push({ x, y, w, h, n: rects.length + 1 });
    refreshRectsList();
    redraw();
  });

  textarea.addEventListener('input', () => { comment = textarea.value; });

  const close = () => {
    if (sending) return;  // disable close mid-send
    window.removeEventListener('resize', sizeCanvas);
    window.removeEventListener('keydown', onKey);
    root.remove();
    onClose();
  };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
  window.addEventListener('keydown', onKey);
  closeBtn.addEventListener('click', close);

  function showProgress(msg: string) {
    progressMsg.textContent = msg;
    progress.classList.add('show');
    panel.classList.add('busy');
  }
  function hideProgress() {
    progress.classList.remove('show');
    panel.classList.remove('busy');
  }

  sendBtn.addEventListener('click', async () => {
    if (sending) return;
    if (!comment.trim()) {
      textarea.focus();
      textarea.style.outline = '2px solid #ff4d4d';
      setTimeout(() => (textarea.style.outline = ''), 800);
      return;
    }
    sending = true;
    sendBtn.disabled = true;
    canvas.style.cursor = 'wait';

    try {
      // Hide the overlay's draw canvas + panel briefly so the capture is clean.
      // The capture filter already excludes our IDs — but doubly-hide for safety.
      showProgress('Capturing screenshot…');
      // Yield to the browser so the spinner paints before the (potentially long) capture begins.
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);

      const captured = await capture(config);

      showProgress('Sending…');
      const bakedPng = await bakeRectsIntoImage(captured.dataUrl, rects, captured.rect);
      const envelope = buildEnvelope({
        config, buffers, comment, rects, pngBase64: bakedPng,
      });

      if (config.alsoLog) console.log('[annotator] envelope', envelope);
      await sendEnvelope(config, envelope);

      hideProgress();
      toast.textContent = 'Sent · Claude will pick it up next session';
      toast.classList.add('show');
      setTimeout(() => {
        sending = false;
        close();
      }, 1200);
    } catch (e) {
      console.error('[annotator] send failed', e);
      hideProgress();
      sending = false;
      sendBtn.disabled = false;
      canvas.style.cursor = 'crosshair';
      toast.textContent = `Failed: ${(e as Error)?.message || 'unknown error'}`;
      toast.classList.add('show', 'err');
      setTimeout(() => toast.classList.remove('show', 'err'), 3500);
    }
  });
}

async function bakeRectsIntoImage(
  pngDataUrl: string,
  rects: Rect[],
  captureRect: { x: number; y: number; w: number; h: number },
): Promise<string> {
  const img = await loadImage(pngDataUrl);
  const c = document.createElement('canvas');
  c.width  = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const sx = c.width  / captureRect.w;
  const sy = c.height / captureRect.h;
  ctx.lineWidth   = 2;
  ctx.strokeStyle = '#ffffff';
  ctx.font        = '600 14px ui-sans-serif, system-ui, sans-serif';
  ctx.textBaseline = 'top';

  for (const r of rects) {
    const x = (r.x - captureRect.x) * sx;
    const y = (r.y - captureRect.y) * sy;
    const w = r.w * sx;
    const h = r.h * sy;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    const badge = String(r.n);
    const tw = ctx.measureText(badge).width + 12;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, tw, 22);
    ctx.fillStyle = '#fff';
    ctx.fillText(badge, x + 6, y + 4);
  }

  return c.toDataURL('image/png');
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

const STYLE = `<style>
  :host, * { box-sizing: border-box; }

  /* No backdrop dim — page stays visible. A tiny vignette signals annotation mode. */
  .root {
    position: fixed; inset: 0;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    color: #ededed;
    pointer-events: none;  /* children re-enable individually */
  }

  /* Crosshair canvas catches all pointer events on the visible page */
  canvas#draw {
    position: absolute; inset: 0;
    width: 100vw; height: 100vh;
    cursor: crosshair; touch-action: none;
    pointer-events: auto;
    /* Subtle inner border to indicate annotation mode is active */
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.22);
  }

  /* Top hint banner */
  .banner {
    position: absolute; top: 16px; left: 50%; transform: translateX(-50%);
    background: rgba(20, 20, 24, 0.92);
    backdrop-filter: blur(8px);
    color: #ededed; font-size: 12px; font-weight: 500;
    padding: 6px 14px; border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.08);
    box-shadow: 0 4px 14px rgba(0,0,0,0.4);
    pointer-events: none;
    user-select: none;
  }
  .banner b { color: #ffffff; font-weight: 600; }

  /* Floating panel bottom-right — neumorphic dark surface */
  .panel {
    position: absolute;
    bottom: 16px; right: 16px;
    width: 340px; max-height: calc(100vh - 32px);
    display: flex; flex-direction: column; gap: 10px;
    background: linear-gradient(180deg, #161718 0%, #0a0b0c 100%);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 14px;
    padding: 14px;
    box-shadow:
      0 18px 40px rgba(0, 0, 0, 0.55),
      0 0 0 1px rgba(255, 255, 255, 0.03) inset,
      0 1px 0 0 rgba(255, 255, 255, 0.06) inset;
    pointer-events: auto;
    overflow: auto;
    transition: opacity 200ms;
  }
  .panel.busy { opacity: 0.6; }

  .panel header {
    display: flex; align-items: center; justify-content: space-between;
  }
  .kicker {
    text-transform: uppercase; letter-spacing: 0.10em; font-size: 10px;
    color: rgba(255, 255, 255, 0.85); font-weight: 600;
  }
  #close {
    all: unset; cursor: pointer; padding: 3px 7px;
    color: #888; font-size: 11px; border-radius: 4px;
  }
  #close:hover { color: #fff; background: #1a1c21; }
  #url { font-size: 10px; color: #6a6e76; word-break: break-all; }
  .hint { font-size: 11px; color: #6a6e76; }
  ul#rects {
    list-style: none; margin: 0; padding: 0;
    display: flex; flex-direction: column; gap: 4px;
    max-height: 120px; overflow: auto;
  }
  ul#rects:empty { display: none; }
  ul#rects li {
    display: flex; align-items: center; gap: 8px;
    padding: 5px 8px; background: rgba(22,24,29,0.7); border-radius: 6px;
    font-size: 12px;
  }
  ul#rects span { color: #ffffff; font-weight: 600; }
  ul#rects code { color: #888; font-size: 10px; margin-left: auto; }
  ul#rects button {
    all: unset; cursor: pointer;
    width: 18px; height: 18px; line-height: 18px; text-align: center;
    border-radius: 4px; color: #888;
  }
  ul#rects button:hover { background: #2a2d34; color: #fff; }
  textarea#comment {
    width: 100%; min-height: 70px; resize: vertical;
    background: rgba(22,24,29,0.7); border: 1px solid #232730; color: #ededed;
    border-radius: 6px; padding: 8px 10px;
    font-family: inherit; font-size: 13px; line-height: 1.45;
  }
  textarea#comment:focus { outline: 1px solid rgba(255, 255, 255, 0.45); border-color: transparent; }
  textarea#comment:disabled { opacity: 0.5; }

  /* Send: white pill, dark text — premium primary */
  button#send {
    all: unset; cursor: pointer;
    background: linear-gradient(180deg, #ffffff 0%, #e8e8ea 100%);
    color: #0a0a0c;
    padding: 10px 14px; border-radius: 8px; text-align: center;
    font-weight: 600; font-size: 13px; letter-spacing: 0.01em;
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.35),
      0 0 0 1px rgba(255, 255, 255, 0.20) inset;
    transition: transform 80ms ease, box-shadow 180ms ease, background 180ms ease;
  }
  button#send:hover {
    background: linear-gradient(180deg, #ffffff 0%, #f4f4f6 100%);
    box-shadow:
      0 6px 16px rgba(0, 0, 0, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.30) inset;
  }
  button#send:active { transform: translateY(1px); }
  button#send:disabled {
    opacity: 0.45; cursor: default; transform: none;
    background: linear-gradient(180deg, #2a2b2d 0%, #1a1b1d 100%); color: #888;
  }

  /* Progress overlay inside the panel */
  .progress {
    position: absolute; inset: 0;
    display: none; align-items: center; justify-content: center;
    background: rgba(14, 15, 18, 0.92);
    border-radius: 12px;
    flex-direction: column; gap: 12px;
    font-size: 13px;
    pointer-events: auto;
  }
  .progress.show { display: flex; }
  .spinner {
    width: 22px; height: 22px;
    border: 2px solid rgba(255, 255, 255, 0.18);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: vy-spin 0.7s linear infinite;
  }
  @keyframes vy-spin { to { transform: rotate(360deg); } }

  #toast {
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: #1a1c21; color: #ededed; padding: 10px 14px;
    border-radius: 8px; font-size: 13px;
    box-shadow: 0 4px 14px rgba(0,0,0,0.4);
    opacity: 0; pointer-events: none; transition: opacity 200ms;
    z-index: 10;
  }
  #toast.show { opacity: 1; }
  #toast.err { background: #2a1316; color: #ffb4b4; }
</style>`;

const TEMPLATE = () => `
<div class="root">
  <canvas id="draw"></canvas>

  <div class="banner">
    Drag to mark · type one sentence · <b>Send</b> · Esc to close
  </div>

  <div class="panel">
    <header>
      <span class="kicker">Annotate</span>
      <button id="close" type="button">Close · Esc</button>
    </header>
    <div id="url"></div>
    <ul id="rects"></ul>
    <textarea id="comment" placeholder="What's wrong? One sentence is enough."></textarea>
    <button id="send" type="button">Send</button>

    <div class="progress">
      <div class="spinner"></div>
      <div id="progress-msg">Working…</div>
    </div>
  </div>

  <div id="toast"></div>
</div>
`;
