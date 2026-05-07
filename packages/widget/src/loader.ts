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

const ICON = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="22" height="22">
  <path d="M4 4h16v12h-6l-5 4v-4H4V4z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/>
  <circle cx="8" cy="10" r="1.25" fill="currentColor"/>
  <circle cx="12" cy="10" r="1.25" fill="currentColor"/>
  <circle cx="16" cy="10" r="1.25" fill="currentColor"/>
</svg>`;

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

function mountButton(config: Config, buffers: Buffers) {
  const host = document.createElement('div');
  host.id = '__vylth_annotator__';
  host.style.cssText = 'all:initial;position:fixed;bottom:24px;right:24px;z-index:2147483647;';
  document.documentElement.appendChild(host);

  const root = host.attachShadow({ mode: 'closed' });
  root.innerHTML = `
    <style>
      :host { all: initial; }
      button {
        all: unset; box-sizing: border-box; cursor: pointer;
        width: 44px; height: 44px; border-radius: 50%;
        background: rgba(20, 20, 24, 0.92);
        backdrop-filter: blur(8px);
        color: #fff;
        display: grid; place-items: center;
        box-shadow: 0 4px 14px rgba(0,0,0,0.32), 0 0 0 1px rgba(255,255,255,0.06) inset;
        transition: transform 120ms ease, box-shadow 120ms ease;
      }
      button:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 18px rgba(0,0,0,0.4), 0 0 0 2px rgba(255, 80, 80, 0.5);
        color: #ff8888;
      }
      button:active { transform: translateY(0); }
    </style>
    <button type="button" aria-label="Send feedback">${ICON}</button>
  `;

  const btn = root.querySelector('button')!;
  let opening = false;
  btn.addEventListener('click', async () => {
    if (opening) return;
    opening = true;
    try {
      const { openOverlay } = await import('./overlay');
      await openOverlay({ config, buffers, host });
    } finally {
      opening = false;
    }
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
