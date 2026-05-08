/**
 * Annotator widget — loader stub.
 *
 * Runs at script load. Mounts the floating bubble in a Shadow DOM and installs
 * ring-buffer taps on console / network / errors so that by the time the user
 * clicks the bubble we already have rich diagnostic context to ship.
 *
 * The annotation overlay UI is lazy-loaded via dynamic import on first click.
 */
import { installTaps, type Buffers } from './buffers';
import type { Config } from './types';

const ICON = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="22" height="22"><g fill="none" fill-rule="evenodd"><path d="m18.7104 4 1.293 1.293.793-.793-1.293-1.293zm-12.483 9.517 4.259 4.259 9.826-10.76-3.325-3.325zm-1.517 4.483 1.293 1.293 1.146-1.147c.094-.093.221-.146.354-.146h1.793l-3.293-3.293v1.793c0 .133-.053.26-.147.354zm-.707.707-1.292 1.292 2.585.001zm-1.293 2.293c-.406 0-.769-.242-.924-.617s-.07-.804.218-1.091l2.999-2.999v-2.791c-.001-.127.047-.254.143-.352l.022-.022 11.498-10.497c.197-.18.501-.174.69.015l.647.647 1.146-1.147c.196-.195.512-.195.707 0l2 2c.196.196.196.512 0 .708l-1.146 1.146.646.646c.19.19.197.494.016.691l-10.497 11.498-.014.014-.01.01c-.099.095-.239.116-.35.141h-2.791l-1.854 1.854c-.093.093-.22.146-.353.146z" fill="currentColor"/></g></svg>`;

function readConfig(): Config {
  const tag = (document.currentScript as HTMLScriptElement | null)
    ?? document.querySelector<HTMLScriptElement>('script[data-project][src*="w.js"]');
  if (!tag) throw new Error('[annotator] script tag not found');
  return {
    project:    tag.dataset.project ?? 'default',
    token:      tag.dataset.token ?? '',
    webhooks:   (tag.dataset.webhook ?? '').split('|').filter(Boolean),
    target:     tag.dataset.target,
    redact:     tag.dataset.redact,
    capture:    (tag.dataset.capture as Config['capture']) ?? 'viewport',
    alsoLog:    tag.dataset.alsoLog === 'console',
  };
}

const POS_KEY = 'vylth.annot.bubble.pos';
type BubblePos = { x: number; y: number };  // px from top-left

function loadBubblePos(): BubblePos | null {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p?.x === 'number' && typeof p?.y === 'number') return p;
    return null;
  } catch { return null; }
}

function saveBubblePos(p: BubblePos) {
  try { localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch {}
}

function clampToViewport(p: BubblePos, size = 44, margin = 8): BubblePos {
  const maxX = Math.max(margin, window.innerWidth  - size - margin);
  const maxY = Math.max(margin, window.innerHeight - size - margin);
  return {
    x: Math.min(Math.max(margin, p.x), maxX),
    y: Math.min(Math.max(margin, p.y), maxY),
  };
}

function mountButton(config: Config, buffers: Buffers) {
  const host = document.createElement('div');
  host.id = '__vylth_annotator__';

  const saved = loadBubblePos();
  const initial = saved
    ? clampToViewport(saved)
    : { x: window.innerWidth - 44 - 24, y: window.innerHeight - 44 - 24 };
  host.style.cssText = `all:initial;position:fixed;left:${initial.x}px;top:${initial.y}px;z-index:2147483647;`;
  document.documentElement.appendChild(host);

  const root = host.attachShadow({ mode: 'closed' });
  root.innerHTML = `
    <style>
      :host { all: initial; }
      button {
        all: unset; box-sizing: border-box; cursor: grab;
        touch-action: none;
        width: 44px; height: 44px; border-radius: 50%;
        background: linear-gradient(180deg, #1a1b1f 0%, #0a0b0d 100%);
        color: #f0f0f2;
        display: grid; place-items: center;
        box-shadow:
          0 6px 16px rgba(0, 0, 0, 0.55),
          0 0 0 1px rgba(255, 255, 255, 0.06) inset,
          0 1px 0 0 rgba(255, 255, 255, 0.08) inset;
        transition: transform 120ms ease, box-shadow 180ms ease, color 180ms ease;
      }
      button:hover {
        transform: translateY(-1px);
        box-shadow:
          0 10px 22px rgba(0, 0, 0, 0.6),
          0 0 0 1px rgba(255, 255, 255, 0.18) inset,
          0 0 0 2px rgba(255, 255, 255, 0.18),
          0 1px 0 0 rgba(255, 255, 255, 0.12) inset;
        color: #ffffff;
      }
      button:active {
        transform: translateY(0);
        box-shadow:
          0 4px 10px rgba(0, 0, 0, 0.5),
          0 0 0 1px rgba(255, 255, 255, 0.12) inset;
      }
    </style>
    <button type="button" aria-label="Send feedback">${ICON}</button>
  `;

  const btn = root.querySelector('button')!;
  let opening = false;

  // Drag-vs-click: if pointer moves more than DRAG_PX or is held longer than
  // DRAG_MS while moving, treat as a drag — never fire the click.
  const DRAG_PX = 4;
  const DRAG_MS = 220;

  let dragState: {
    pid: number;
    startX: number; startY: number;
    hostStartX: number; hostStartY: number;
    startedAt: number;
    moved: boolean;
  } | null = null;

  btn.addEventListener('pointerdown', (e: PointerEvent) => {
    if (opening) return;
    btn.setPointerCapture(e.pointerId);
    const rect = host.getBoundingClientRect();
    dragState = {
      pid: e.pointerId,
      startX: e.clientX, startY: e.clientY,
      hostStartX: rect.left, hostStartY: rect.top,
      startedAt: Date.now(),
      moved: false,
    };
  });

  btn.addEventListener('pointermove', (e: PointerEvent) => {
    if (!dragState || dragState.pid !== e.pointerId) return;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    if (!dragState.moved && Math.hypot(dx, dy) < DRAG_PX) return;
    dragState.moved = true;
    const next = clampToViewport({ x: dragState.hostStartX + dx, y: dragState.hostStartY + dy });
    host.style.left = `${next.x}px`;
    host.style.top  = `${next.y}px`;
    btn.style.cursor = 'grabbing';
  });

  btn.addEventListener('pointerup', async (e: PointerEvent) => {
    if (!dragState || dragState.pid !== e.pointerId) return;
    const wasDrag = dragState.moved;
    const heldMs = Date.now() - dragState.startedAt;
    dragState = null;
    btn.style.cursor = '';

    if (wasDrag || heldMs > DRAG_MS) {
      // Persist new position
      const rect = host.getBoundingClientRect();
      saveBubblePos({ x: rect.left, y: rect.top });
      return;
    }
    // Treat as click
    if (opening) return;
    opening = true;
    try {
      const { openOverlay } = await import('./overlay');
      await openOverlay({ config, buffers, host });
    } finally {
      opening = false;
    }
  });

  // Keep the bubble inside the viewport on resize
  window.addEventListener('resize', () => {
    const rect = host.getBoundingClientRect();
    const clamped = clampToViewport({ x: rect.left, y: rect.top });
    host.style.left = `${clamped.x}px`;
    host.style.top  = `${clamped.y}px`;
  });
}

function boot() {
  if ((window as any).__vylth_annotator_loaded__) return;
  (window as any).__vylth_annotator_loaded__ = true;

  let config: Config;
  try {
    config = readConfig();
  } catch (e) {
    console.warn('[annotator]', e);
    return;
  }

  const buffers = installTaps();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => mountButton(config, buffers), { once: true });
  } else {
    mountButton(config, buffers);
  }
}

boot();
