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

// Patterns that look like secrets — replace with [REDACTED] before storing in
// console/network ring buffers. Defence in depth: the user's app may log JWTs
// or session tokens to console, and we don't want to ship those in envelopes.
const SECRET_PATTERNS: RegExp[] = [
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/g,                  // Bearer <token>
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}(?:\.[A-Za-z0-9_-]+)?\b/g, // JWT
  /\bsk_(live|test)_[A-Za-z0-9]{16,}\b/g,             // Stripe-style secret keys
  /\bpk_(live|test)_[A-Za-z0-9]{16,}\b/g,             // ditto public-but-uniquely-shaped
  /\b[A-Za-z0-9-_]{32,}\.[A-Za-z0-9-_]{32,}\b/g,       // generic long token-shaped
  /\bAKIA[0-9A-Z]{16}\b/g,                             // AWS access key id
  /\bgh[ps]_[A-Za-z0-9]{36,}\b/g,                      // GitHub PATs
];

function redactSecrets(s: string): string {
  let out = s;
  for (const re of SECRET_PATTERNS) out = out.replace(re, '[REDACTED]');
  return out;
}

// URL secret-stripping: drop query-string params whose name implies sensitivity.
const SENSITIVE_QS = new Set([
  'token', 'access_token', 'refresh_token', 'id_token', 'auth_token',
  'api_key', 'apikey', 'key', 'password', 'sig', 'signature', 'jwt',
  'session', 'session_id', 'sessionid',
]);
function sanitizeUrl(raw: string): string {
  try {
    const u = new URL(raw, location.origin);
    let touched = false;
    u.searchParams.forEach((_v, k) => {
      if (SENSITIVE_QS.has(k.toLowerCase())) { u.searchParams.set(k, '[REDACTED]'); touched = true; }
    });
    return touched ? u.toString() : raw;
  } catch {
    return raw;
  }
}

function stringify(arg: unknown): string {
  if (typeof arg === 'string') return redactSecrets(arg);
  if (arg instanceof Error)    return redactSecrets(`${arg.name}: ${arg.message}`);
  try {
    const s = JSON.stringify(arg, (_k, v) => {
      if (typeof v === 'function') return `[Function ${v.name || 'anon'}]`;
      if (v instanceof HTMLElement) return `<${v.tagName.toLowerCase()}>`;
      return v;
    }).slice(0, 1000);
    return redactSecrets(s);
  } catch {
    return redactSecrets(String(arg));
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
            url: sanitizeUrl(url), method, status: res.status,
            ms: Math.round(performance.now() - start), ts: Date.now()
          }, NETWORK_MAX);
        }
        return res;
      } catch (err) {
        push(buffers.network, {
          url: sanitizeUrl(url), method, status: 0,
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
          url: sanitizeUrl(this.__vy.url),
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
