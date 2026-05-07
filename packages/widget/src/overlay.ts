/**
 * Annotation overlay — lazy-loaded on first bubble click.
 *
 * Flow:
 *   1. Apply redact-blur to matched selectors (if any)
 *   2. Capture viewport (or target element) → static PNG
 *   3. Mount fullscreen overlay in Shadow DOM with the PNG as backdrop
 *   4. User drags rectangles on a canvas; types comment; clicks Send
 *   5. Bake rect borders into the PNG
 *   6. Build envelope from buffers + DOM measurements
 *   7. POST to each configured webhook (fire-and-forget)
 */
import domtoimage from 'dom-to-image-more';
import type { Buffers } from './buffers';
import type { Config, Envelope, Rect, Target } from './types';
import { capture, undoRedact } from './capture';
import { buildEnvelope, sendEnvelope } from './send';

interface OpenArgs {
  config: Config;
  buffers: Buffers;
  host: HTMLElement;
}

export async function openOverlay({ config, buffers, host }: OpenArgs): Promise<void> {
  // Hide the bubble while overlay is open
  const bubbleVisible = host.style.display;
  host.style.display = 'none';

  let pngDataUrl: string;
  let captureRect: { x: number; y: number; w: number; h: number };
  try {
    const captured = await capture(config);
    pngDataUrl = captured.dataUrl;
    captureRect = captured.rect;
  } catch (e) {
    console.warn('[annotator] capture failed', e);
    host.style.display = bubbleVisible;
    return;
  }

  await new Promise<void>((resolve) => {
    mountOverlay({ config, buffers, host, pngDataUrl, captureRect, onClose: () => {
      host.style.display = bubbleVisible;
      undoRedact();
      resolve();
    }});
  });
}

interface MountArgs extends OpenArgs {
  pngDataUrl: string;
  captureRect: { x: number; y: number; w: number; h: number };
  onClose: () => void;
}

function mountOverlay(args: MountArgs) {
  const { config, buffers, pngDataUrl, captureRect, onClose } = args;

  const root = document.createElement('div');
  root.id = '__vylth_annotator_overlay__';
  root.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483646;';
  document.documentElement.appendChild(root);
  const sd = root.attachShadow({ mode: 'closed' });

  const rects: Rect[] = [];
  let dragStart: { x: number; y: number } | null = null;
  let comment = '';
  let sending = false;

  sd.innerHTML = STYLE + TEMPLATE(pngDataUrl);
  const canvas      = sd.querySelector<HTMLCanvasElement>('#draw')!;
  const sidebar     = sd.querySelector<HTMLDivElement>('.sidebar')!;
  const rectsList   = sd.querySelector<HTMLUListElement>('#rects')!;
  const textarea    = sd.querySelector<HTMLTextAreaElement>('#comment')!;
  const sendBtn     = sd.querySelector<HTMLButtonElement>('#send')!;
  const closeBtn    = sd.querySelector<HTMLButtonElement>('#close')!;
  const toast       = sd.querySelector<HTMLDivElement>('#toast')!;
  const urlEl       = sd.querySelector<HTMLDivElement>('#url')!;
  urlEl.textContent = location.href;

  // size canvas to viewport
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
    ctx.strokeStyle = '#ff4d4d';
    ctx.fillStyle = 'rgba(255, 77, 77, 0.10)';
    ctx.font = '600 12px ui-sans-serif, system-ui, -apple-system, sans-serif';
    ctx.textBaseline = 'top';
    rects.forEach((r) => {
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      // numbered badge top-left
      const badge = String(r.n);
      const padX = 6, padY = 3;
      const tw = ctx.measureText(badge).width;
      ctx.fillStyle = '#ff4d4d';
      ctx.fillRect(r.x, r.y, tw + padX * 2, 18);
      ctx.fillStyle = '#fff';
      ctx.fillText(badge, r.x + padX, r.y + padY);
      ctx.fillStyle = 'rgba(255, 77, 77, 0.10)';
    });
  }

  function refreshRectsList() {
    rectsList.innerHTML = rects.map((r) => `
      <li><span>#${r.n}</span><code>${r.w}×${r.h}</code><button data-rm="${r.n}" aria-label="Remove">×</button></li>
    `).join('');
    rectsList.querySelectorAll<HTMLButtonElement>('button[data-rm]').forEach((b) => {
      b.addEventListener('click', () => {
        const n = Number(b.dataset.rm);
        const idx = rects.findIndex((r) => r.n === n);
        if (idx >= 0) {
          rects.splice(idx, 1);
          // renumber
          rects.forEach((r, i) => (r.n = i + 1));
          refreshRectsList();
          redraw();
        }
      });
    });
  }

  // canvas drag-to-draw
  canvas.addEventListener('pointerdown', (e: PointerEvent) => {
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
    ctx.fillStyle = 'rgba(255, 77, 77, 0.10)';
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

  // close
  const close = () => {
    window.removeEventListener('resize', sizeCanvas);
    window.removeEventListener('keydown', onKey);
    root.remove();
    onClose();
  };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
  window.addEventListener('keydown', onKey);
  closeBtn.addEventListener('click', close);

  // send
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
    sendBtn.textContent = 'Sending…';

    try {
      const bakedPng = await bakeRectsIntoImage(pngDataUrl, rects, captureRect);
      const envelope: Envelope = buildEnvelope({
        config, buffers, comment, rects, pngBase64: bakedPng,
      });

      if (config.alsoLog) console.log('[annotator] envelope', envelope);
      await sendEnvelope(config, envelope);

      toast.textContent = 'Sent · Claude will pick it up next session';
      toast.classList.add('show');
      setTimeout(close, 1400);
    } catch (e) {
      console.error('[annotator] send failed', e);
      sendBtn.disabled = false;
      sendBtn.textContent = 'Retry';
      toast.textContent = 'Send failed — try again';
      toast.classList.add('show', 'err');
      setTimeout(() => toast.classList.remove('show', 'err'), 2000);
      sending = false;
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

  // rects are in viewport coordinates. The PNG was captured from captureRect.
  // Translate viewport→image pixel coords.
  const sx = c.width  / captureRect.w;
  const sy = c.height / captureRect.h;
  ctx.lineWidth   = 2;
  ctx.strokeStyle = '#ff4d4d';
  ctx.font        = '600 14px ui-sans-serif, system-ui, sans-serif';
  ctx.textBaseline = 'top';

  for (const r of rects) {
    const x = (r.x - captureRect.x) * sx;
    const y = (r.y - captureRect.y) * sy;
    const w = r.w * sx;
    const h = r.h * sy;
    ctx.fillStyle = 'rgba(255, 77, 77, 0.10)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    const badge = String(r.n);
    const tw = ctx.measureText(badge).width + 12;
    ctx.fillStyle = '#ff4d4d';
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
  .root {
    position: fixed; inset: 0; display: grid;
    grid-template-columns: 1fr 380px;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
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
    padding: 18px 18px 14px;
    display: flex; flex-direction: column; gap: 12px;
    height: 100vh; overflow: auto;
  }
  .sidebar header { display: flex; align-items: center; justify-content: space-between; }
  .kicker {
    text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px;
    color: #ff4d4d; font-weight: 600;
  }
  #close {
    all: unset; cursor: pointer; padding: 4px 8px;
    color: #888; font-size: 13px; border-radius: 4px;
  }
  #close:hover { color: #fff; background: #1a1c21; }
  #url { font-size: 11px; color: #6a6e76; word-break: break-all; }
  ul#rects { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
  ul#rects li {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 8px; background: #16181d; border-radius: 6px;
    font-size: 12px;
  }
  ul#rects span { color: #ff4d4d; font-weight: 600; }
  ul#rects code { color: #888; font-size: 11px; margin-left: auto; }
  ul#rects button {
    all: unset; cursor: pointer;
    width: 18px; height: 18px; line-height: 18px; text-align: center;
    border-radius: 4px; color: #888;
  }
  ul#rects button:hover { background: #2a2d34; color: #fff; }
  textarea#comment {
    width: 100%; min-height: 110px; resize: vertical;
    background: #16181d; border: 1px solid #232730; color: #ededed;
    border-radius: 6px; padding: 10px;
    font-family: inherit; font-size: 13px; line-height: 1.5;
  }
  textarea#comment:focus { outline: 2px solid rgba(255, 77, 77, 0.5); border-color: transparent; }
  .actions { display: flex; gap: 8px; margin-top: auto; }
  button#send {
    all: unset; cursor: pointer; flex: 1;
    background: #ff4d4d; color: #fff;
    padding: 10px 16px; border-radius: 6px; text-align: center;
    font-weight: 600; font-size: 13px;
  }
  button#send:hover { background: #ff6464; }
  button#send:disabled { opacity: 0.5; cursor: default; }
  .hint { font-size: 11px; color: #6a6e76; }
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

const TEMPLATE = (pngDataUrl: string) => `
<div class="root">
  <div class="stage">
    <img class="frozen" src="${pngDataUrl}" alt="" draggable="false" />
    <canvas id="draw"></canvas>
  </div>
  <aside class="sidebar">
    <header>
      <span class="kicker">Annotate</span>
      <button id="close" type="button">Close · Esc</button>
    </header>
    <div id="url"></div>
    <div class="hint">Click and drag on the frozen frame to mark what's wrong.</div>
    <ul id="rects"></ul>
    <textarea id="comment" placeholder="What's wrong? One sentence is enough."></textarea>
    <div class="actions">
      <button id="send" type="button">Send</button>
    </div>
    <div id="toast"></div>
  </aside>
</div>
`;
