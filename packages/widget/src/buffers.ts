/**
 * Ring buffers for diagnostic capture.
 *
 * Installed at widget load. Wraps console, fetch, XHR, window.onerror,
 * unhandledrejection, and performance observers. Bounded to keep memory tame
 * on long-lived pages.
 */
import type { ConsoleEntry, NetworkEntry, ErrorEntry, PerfSummary } from './types';

const CONSOLE_MAX = 100;
const NETWORK_MAX = 50;
const ERRORS_MAX  = 20;
const LONGTASKS_MAX = 10;

export interface Buffers {
  console: ConsoleEntry[];
  network: NetworkEntry[];
  errors:  ErrorEntry[];
  perf:    PerfSummary;
}

const SAFE_HEADERS = new Set(['content-type', 'content-length', 'cache-control', 'server', 'date']);

function stringify(arg: unknown): string {
  if (typeof arg === 'string') return arg;
  if (arg instanceof Error)    return `${arg.name}: ${arg.message}`;
  try {
    return JSON.stringify(arg, (_k, v) => {
      if (typeof v === 'function') return `[Function ${v.name || 'anon'}]`;
      if (v instanceof HTMLElement) return `<${v.tagName.toLowerCase()}>`;
      return v;
    }).slice(0, 1000);
  } catch {
    return String(arg);
  }
}

function push<T>(buf: T[], item: T, max: number) {
  buf.push(item);
  if (buf.length > max) buf.splice(0, buf.length - max);
}

export function installTaps(): Buffers {
  const buffers: Buffers = {
    console: [],
    network: [],
    errors:  [],
    perf:    { longTasks: [] },
  };

  // -- console --
  const levels: ConsoleEntry['level'][] = ['log', 'info', 'warn', 'error', 'debug'];
  for (const level of levels) {
    const orig = console[level];
    console[level] = function (...args: unknown[]) {
      push(buffers.console, { level, ts: Date.now(), args: args.map(stringify) }, CONSOLE_MAX);
      return orig.apply(this, args as []);
    };
  }

  // -- fetch --
  if (typeof window.fetch === 'function') {
    const origFetch = window.fetch.bind(window);
    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const start = performance.now();
      const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
      const url = typeof input === 'string' ? input
                : input instanceof URL ? input.href
                : input.url;
      try {
        const res = await origFetch(input as RequestInfo, init);
        if (res.status >= 400) {
          push(buffers.network, {
            url, method, status: res.status,
            ms: Math.round(performance.now() - start), ts: Date.now()
          }, NETWORK_MAX);
        }
        return res;
      } catch (err) {
        push(buffers.network, {
          url, method, status: 0,
          ms: Math.round(performance.now() - start), ts: Date.now()
        }, NETWORK_MAX);
        throw err;
      }
    };
  }

  // -- XHR --
  const XHRProto = XMLHttpRequest.prototype;
  const origOpen = XHRProto.open;
  const origSend = XHRProto.send;
  XHRProto.open = function (this: XMLHttpRequest & { __vy?: { method: string; url: string; start: number } }, method: string, url: string | URL, ...rest: unknown[]) {
    this.__vy = { method: method.toUpperCase(), url: String(url), start: 0 };
    return origOpen.call(this, method, url, ...(rest as [boolean]));
  };
  XHRProto.send = function (this: XMLHttpRequest & { __vy?: { method: string; url: string; start: number } }, body?: Document | XMLHttpRequestBodyInit | null) {
    if (this.__vy) this.__vy.start = performance.now();
    this.addEventListener('loadend', () => {
      if (!this.__vy) return;
      if (this.status >= 400 || this.status === 0) {
        push(buffers.network, {
          url: this.__vy.url,
          method: this.__vy.method,
          status: this.status,
          ms: Math.round(performance.now() - this.__vy.start),
          ts: Date.now(),
        }, NETWORK_MAX);
      }
    });
    return origSend.call(this, body as Document);
  };

  // -- window.onerror --
  window.addEventListener('error', (ev: ErrorEvent) => {
    push(buffers.errors, {
      msg: ev.message ?? 'unknown error',
      stack: ev.error?.stack,
      ts: Date.now(),
      source: 'window.onerror',
    }, ERRORS_MAX);
  });

  // -- unhandledrejection --
  window.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
    const r = ev.reason;
    push(buffers.errors, {
      msg: r instanceof Error ? `${r.name}: ${r.message}` : stringify(r),
      stack: r instanceof Error ? r.stack : undefined,
      ts: Date.now(),
      source: 'unhandledrejection',
    }, ERRORS_MAX);
  });

  // -- performance --
  if ('PerformanceObserver' in window) {
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') buffers.perf.fcp = Math.round(entry.startTime);
        }
      }).observe({ type: 'paint', buffered: true });
    } catch {}
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) buffers.perf.lcp = Math.round(last.startTime);
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {}
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          push(buffers.perf.longTasks, { ms: Math.round(entry.duration), ts: Math.round(entry.startTime) }, LONGTASKS_MAX);
        }
      }).observe({ type: 'longtask', buffered: true });
    } catch {}
  }

  return buffers;
}
