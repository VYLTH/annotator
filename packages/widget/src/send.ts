/**
 * Envelope construction + multi-destination dispatch.
 */
import type { Buffers } from './buffers';
import type { Config, Envelope, Rect, Target } from './types';

interface BuildArgs {
  config: Config;
  buffers: Buffers;
  comment: string;
  rects: Rect[];
  pngBase64: string;
}

export function buildEnvelope({ config, buffers, comment, rects, pngBase64 }: BuildArgs): Envelope {
  return {
    project: config.project,
    comment,
    image: pngBase64,
    rects,
    url: {
      href:     location.href,
      pathname: location.pathname,
      search:   location.search,
      hash:     location.hash,
    },
    viewport: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio },
    document: {
      scrollW: document.documentElement.scrollWidth,
      scrollH: document.documentElement.scrollHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    },
    targets: rects.map((r) => describeTargetUnder(r)).filter(Boolean) as Target[],
    env: {
      ua:       navigator.userAgent,
      platform: navigator.platform,
      lang:     navigator.language,
      tz:       Intl.DateTimeFormat().resolvedOptions().timeZone,
      online:   navigator.onLine,
      theme:    matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    },
    console: buffers.console.slice(),
    network: buffers.network.slice(),
    errors:  buffers.errors.slice(),
    perf: {
      fcp: buffers.perf.fcp,
      lcp: buffers.perf.lcp,
      longTasks: buffers.perf.longTasks.slice(),
    },
    metadata: (window as unknown as { __vylth_annotator_react_metadata__?: Record<string, unknown> })
      .__vylth_annotator_react_metadata__,
  };
}

function describeTargetUnder(r: Rect): Target | null {
  // The overlay covers the viewport during annotation. To find what's on the
  // live page underneath the rect, toggle pointer-events:none on our hosts so
  // elementFromPoint sees through them, then restore.
  const overlay = document.getElementById('__vylth_annotator_overlay__') as HTMLElement | null;
  const bubble  = document.getElementById('__vylth_annotator__') as HTMLElement | null;
  const prevOv  = overlay?.style.pointerEvents;
  const prevBu  = bubble?.style.pointerEvents;
  if (overlay) overlay.style.pointerEvents = 'none';
  if (bubble)  bubble.style.pointerEvents  = 'none';

  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  let el = document.elementFromPoint(cx, cy) as HTMLElement | null;

  if (overlay) overlay.style.pointerEvents = prevOv ?? '';
  if (bubble)  bubble.style.pointerEvents  = prevBu ?? '';

  if (!el) return null;
  // Defensive: walk up out of any annotator element if it still hit one.
  while (el && (el.id === '__vylth_annotator__' || el.id === '__vylth_annotator_overlay__')) {
    el = el.parentElement;
  }
  if (!el || el === document.documentElement || el === document.body) return null;

  const rect = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const computed: Record<string, string> = {};
  for (const k of ['display','position','fontSize','color','backgroundColor','width','height','margin','padding','border']) {
    computed[k] = cs.getPropertyValue(k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()));
  }
  return {
    selector: cssPath(el),
    rect: { x: Math.round(rect.left), y: Math.round(rect.top), w: Math.round(rect.width), h: Math.round(rect.height) },
    text: (el.innerText ?? '').slice(0, 200),
    computed,
  };
}

function cssPath(el: HTMLElement): string {
  const parts: string[] = [];
  let node: HTMLElement | null = el;
  let depth = 0;
  while (node && node.nodeType === 1 && depth < 6) {
    let part = node.tagName.toLowerCase();
    if (node.id) {
      parts.unshift(`${part}#${node.id}`);
      break;
    }
    if (node.classList.length) {
      part += '.' + Array.from(node.classList).slice(0, 2).join('.');
    }
    // nth-of-type for disambiguation
    const parent = node.parentElement;
    if (parent) {
      const same = Array.from(parent.children).filter((c) => c.tagName === node!.tagName);
      if (same.length > 1) {
        part += `:nth-of-type(${same.indexOf(node) + 1})`;
      }
    }
    parts.unshift(part);
    node = parent;
    depth++;
  }
  return parts.join(' > ');
}

export async function sendEnvelope(config: Config, envelope: Envelope): Promise<void> {
  if (!config.webhooks.length && !config.alsoLog) {
    throw new Error('no webhook configured (set data-webhook or data-also-log="console")');
  }

  // Fire-and-forget to all webhooks in parallel; require at least one success.
  const results = await Promise.allSettled(
    config.webhooks.map((url) =>
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.token ? { 'X-Annot-Token': config.token } : {}),
        },
        body: JSON.stringify(envelope),
        keepalive: true,
      }).then((r) => {
        if (!r.ok) throw new Error(`${url} → ${r.status}`);
        return r;
      })
    )
  );

  const ok = results.some((r) => r.status === 'fulfilled');
  if (!ok && config.webhooks.length > 0 && !config.alsoLog) {
    const errs = results.filter((r) => r.status === 'rejected').map((r) => (r as PromiseRejectedResult).reason);
    throw new Error(`all webhooks failed: ${errs.join(', ')}`);
  }
}
