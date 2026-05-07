/**
 * @vylth/annotator-react
 *
 * Drop <Annotator … /> into your app (typically gated to dev/staging only).
 * Loads the widget bundle from the configured base URL and configures it
 * via window globals — under the hood, the widget code is identical to the
 * <script>-tag drop-in. The React wrapper buys you:
 *
 *   1. SPA-friendly mounting/unmounting (rolls back the floating bubble cleanly)
 *   2. Pass app-state metadata via the `metadata` prop
 *   3. Strict-mode safe (idempotent loader)
 *
 * Usage:
 *
 *   import { Annotator } from "@vylth/annotator-react";
 *   <Annotator
 *     project="cricket"
 *     token={import.meta.env.VITE_ANNOT_TOKEN}
 *     apiBase="http://localhost:8092"
 *     metadata={{ user_id: user.id, route: location.pathname }}
 *   />
 */
import * as React from "react";

export interface AnnotatorProps {
  /** Project slug for the annotator API (e.g. "cricket"). */
  project: string;
  /** Token configured for that project. Use "local" with `annotator run`. */
  token: string;
  /** API base URL. Defaults to http://localhost:8092 (matches `annotator run`). */
  apiBase?: string;
  /** Webhook URLs (pipe-separated under the hood). Defaults to apiBase + /v1/feedback. */
  webhooks?: string[];
  /** CSS selectors to blur before capture. */
  redact?: string;
  /** Element to capture instead of the viewport. */
  target?: string | HTMLElement;
  /** "viewport" (default) | "page" | "target". */
  capture?: "viewport" | "page" | "target";
  /** Also dump the envelope to console (helpful in dev). */
  alsoLog?: boolean;
  /** Per-submission metadata — passed through to the engineer. */
  metadata?: Record<string, unknown>;
  /** When false, don't mount. Useful for env gating. Default true. */
  enabled?: boolean;
}

const SCRIPT_ID = "__vylth_annotator_widget_script__";
const GLOBAL_KEY = "__vylth_annotator_loaded__";

declare global {
  interface Window {
    __vylth_annotator_react_metadata__?: Record<string, unknown>;
  }
}

export function Annotator(props: AnnotatorProps): null {
  const { enabled = true } = props;

  React.useEffect(() => {
    if (!enabled) return;
    if (typeof document === "undefined") return; // SSR guard

    const apiBase = props.apiBase ?? "http://localhost:8092";
    const webhooks = props.webhooks?.length
      ? props.webhooks.join("|")
      : `${apiBase}/v1/feedback`;

    // Stash metadata so the widget can pick it up at submit time.
    if (props.metadata) {
      window.__vylth_annotator_react_metadata__ = props.metadata;
    }

    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = `${apiBase}/w.js`;
      script.dataset.project = props.project;
      script.dataset.token = props.token;
      script.dataset.webhook = webhooks;
      if (props.redact)  script.dataset.redact = props.redact;
      if (props.alsoLog) script.dataset.alsoLog = "console";
      if (props.capture) script.dataset.capture = props.capture;
      if (typeof props.target === "string") script.dataset.target = props.target;
      script.async = true;
      document.head.appendChild(script);
    }

    return () => {
      // Tear down on unmount: remove bubble host + reset the loader guard so
      // a remount can re-bootstrap. We don't remove the script tag itself —
      // browsers won't re-execute it anyway, and the buffers are useful even
      // when the bubble is hidden.
      const host = document.getElementById("__vylth_annotator__");
      host?.remove();
      delete (window as any)[GLOBAL_KEY];
      delete window.__vylth_annotator_react_metadata__;
    };
  }, [
    enabled,
    props.project,
    props.token,
    props.apiBase,
    props.webhooks?.join("|"),
    props.redact,
    props.alsoLog,
    props.capture,
    typeof props.target === "string" ? props.target : undefined,
  ]);

  // Update metadata without a full remount when only metadata changes.
  React.useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    window.__vylth_annotator_react_metadata__ = props.metadata;
  }, [props.metadata, enabled]);

  return null;
}

export default Annotator;
