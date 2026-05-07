export interface Config {
  project: string;
  token: string;
  webhooks: string[];
  target?: string;            // CSS selector — capture this element instead of viewport
  redact?: string;             // comma-separated CSS selectors to blur before capture
  capture: 'viewport' | 'page' | 'target';
  alsoLog: boolean;            // if true, console.log() the envelope too (dev mode)
}

export interface ConsoleEntry {
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  ts: number;
  args: string[];
}

export interface NetworkEntry {
  url: string;
  method: string;
  status: number;
  ms: number;
  ts: number;
}

export interface ErrorEntry {
  msg: string;
  stack?: string;
  ts: number;
  source: 'window.onerror' | 'unhandledrejection';
}

export interface PerfSummary {
  fcp?: number;
  lcp?: number;
  longTasks: { ms: number; ts: number }[];
}

export interface Rect { x: number; y: number; w: number; h: number; n: number; }

export interface Target {
  selector: string;
  rect: { x: number; y: number; w: number; h: number };
  text: string;
  computed: Record<string, string>;
}

export interface Envelope {
  project: string;
  comment: string;
  image: string;              // base64 data URL
  rects: Rect[];
  url: { href: string; pathname: string; search: string; hash: string };
  viewport: { w: number; h: number; dpr: number };
  document: { scrollW: number; scrollH: number; scrollX: number; scrollY: number };
  targets: Target[];
  env: { ua: string; platform: string; lang: string; tz: string; online: boolean; theme: 'light' | 'dark' };
  console: ConsoleEntry[];
  network: NetworkEntry[];
  errors: ErrorEntry[];
  perf: PerfSummary;
  metadata?: Record<string, unknown> | null;
}
