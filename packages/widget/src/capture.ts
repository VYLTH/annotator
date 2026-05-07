/**
 * Freeze-frame capture.
 *
 * Renders the current viewport (or a specified target element) into a static
 * PNG before the user starts annotating. Optionally applies CSS blur to PII
 * elements first, undoes after capture.
 */
import domtoimage from 'dom-to-image-more';
import type { Config } from './types';

let _undo: (() => void) | null = null;

export interface Captured {
  dataUrl: string;
  rect: { x: number; y: number; w: number; h: number };  // viewport-coordinate bounds of the capture
}

export async function capture(config: Config): Promise<Captured> {
  applyRedact(config.redact);

  let node: HTMLElement;
  let rect: { x: number; y: number; w: number; h: number };

  if (config.capture === 'target' && config.target) {
    const el = document.querySelector<HTMLElement>(config.target);
    if (!el) throw new Error(`target not found: ${config.target}`);
    node = el;
    const r = el.getBoundingClientRect();
    rect = { x: r.left, y: r.top, w: r.width, h: r.height };
  } else if (config.capture === 'page') {
    node = document.documentElement;
    rect = { x: 0, y: 0, w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight };
  } else {
    // viewport (default)
    node = document.documentElement;
    rect = { x: window.scrollX, y: window.scrollY, w: window.innerWidth, h: window.innerHeight };
  }

  const dataUrl = await domtoimage.toPng(node, {
    width: rect.w,
    height: rect.h,
    style: config.capture === 'viewport'
      ? { transform: `translate(-${rect.x}px, -${rect.y}px)`, transformOrigin: '0 0' }
      : undefined,
    cacheBust: true,
    filter: (n: Node) => {
      // skip the annotator's own DOM
      if (n instanceof HTMLElement) {
        if (n.id === '__vylth_annotator__' || n.id === '__vylth_annotator_overlay__') return false;
      }
      return true;
    },
  });

  return { dataUrl, rect };
}

function applyRedact(selectors?: string) {
  if (!selectors) return;
  const els = document.querySelectorAll<HTMLElement>(selectors);
  const restores: Array<() => void> = [];
  els.forEach((el) => {
    const prev = el.style.filter;
    el.style.filter = 'blur(8px)';
    restores.push(() => { el.style.filter = prev; });
  });
  _undo = () => { restores.forEach((fn) => fn()); _undo = null; };
}

export function undoRedact() {
  _undo?.();
}
