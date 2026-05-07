# Install patterns

Four ways to install the annotator widget on a host site, ranked by how cleanly they keep the widget out of production builds. Pick based on your stack and risk tolerance.

When we rolled the widget across the Vylth fleet (15 sites, 2026-05-07), independent agent runs converged on these four patterns. Documenting them here so you don't have to rediscover.

## TL;DR

| Pattern | Where the widget lives in production | Right when |
|---|---|---|
| **A. `annotatorGate` Vite plugin** *(recommended default)* | URL strings absent from `dist/` (regex strip at build) | You control `vite.config.ts`; want zero-cost prod safety |
| **B. Dynamic injection in entry script** | URL strings absent (Rollup dead-code-elimination) | You don't want plugins; have `main.tsx` / `main.ts` |
| **C. `transformIndexHtml` returning empty** | URL strings absent (handler returns nothing in prod) | Vite-only; want plugin-style API without regex |
| **D. Token-substitution-fail (soft)** | Script tag IS in `dist/`; auth fails server-side | You can't modify build config and accept a network round-trip |

For custodial / PHI / financial products, **never use D alone** — combine two of A/B/C and add a runtime guard.

---

## A. `annotatorGate` Vite plugin (recommended)

Strips the entire annotator block from `index.html` at production build time. Zero traces in `dist/`. One plugin, one regex, no runtime cost.

```ts
// vite.config.ts
import { defineConfig } from 'vite';

function annotatorGate() {
  return {
    name: 'annotator-gate',
    transformIndexHtml: {
      order: 'pre' as const,
      handler(html: string, ctx: { server?: unknown }) {
        // ctx.server is defined during dev. Production build → strip the block.
        if (ctx.server) return html;
        return html.replace(/<!--\s*annot:start\s*-->[\s\S]*?<!--\s*annot:end\s*-->/g, '');
      },
    },
  };
}

export default defineConfig({
  plugins: [annotatorGate()],
});
```

```html
<!-- index.html -->
<!-- annot:start -->
<script src="https://annot.vylth.com/w.js"
        data-project="<your-project>"
        data-token="%VITE_ANNOT_TOKEN%"
        data-webhook="https://annot.vylth.com/v1/feedback"
        data-redact=".your,.redact,.selectors"></script>
<!-- annot:end -->
```

Verify:
```bash
pnpm build && grep -r 'annot.vylth.com' dist/ && echo FAIL || echo CLEAN
```

Used by: Alpha, PV.

---

## B. Dynamic injection in the entry script

Inject the script tag at runtime from `main.tsx`/`main.ts`, gated on `import.meta.env.MODE !== 'production'` (or `!import.meta.env.PROD`). Vite/Rollup performs dead-code elimination on the entire block when the gate evaluates to `false` at build time, so the URL literals are structurally absent from production output.

```ts
// src/main.tsx
if (import.meta.env.MODE !== 'production') {
  const s = document.createElement('script');
  s.src = 'https://annot.vylth.com/w.js';
  s.dataset.project = 'your-project';
  s.dataset.token = import.meta.env.VITE_ANNOT_TOKEN ?? '';
  s.dataset.webhook = 'https://annot.vylth.com/v1/feedback';
  s.dataset.redact = '.your,.redact,.selectors';
  document.body.appendChild(s);
}
```

Verify the same way (`grep dist/` should be clean).

Used by: Cricket, Hummingbird, Mint (via `@vylth/annotator-react`), decatalyst.com.

When to prefer over A: you don't want to add a custom Vite plugin, OR you're using `@vylth/annotator-react` and gating happens via the `enabled` prop / env-conditional rendering naturally.

---

## C. `transformIndexHtml` returning empty in prod

Functionally equivalent to A but without the marker comments — the plugin owns the entire injection.

```ts
// vite.config.ts
function annotatorInject(opts: { project: string; tokenEnv: string; redact?: string }) {
  return {
    name: 'annotator-inject',
    transformIndexHtml(_html: string, ctx: { server?: unknown }) {
      if (!ctx.server) return [];   // production build: inject nothing
      return [{
        tag: 'script',
        attrs: {
          src: 'https://annot.vylth.com/w.js',
          'data-project': opts.project,
          'data-token': `%${opts.tokenEnv}%`,
          'data-webhook': 'https://annot.vylth.com/v1/feedback',
          ...(opts.redact ? { 'data-redact': opts.redact } : {}),
        },
        injectTo: 'body',
      }];
    },
  };
}
```

Used by: Northstar.

When to prefer: clean in `vite.config.ts`, no markup pollution in `index.html`.

---

## D. Token-substitution-fail (soft gate, NOT recommended alone)

Vite leaves `%VITE_ANNOT_TOKEN%` literal when the env var isn't defined. The widget loads in production, posts with the literal placeholder as token, and the server returns 401. No annotation goes through, but the script tag and URL are present in `dist/`.

```html
<script src="https://annot.vylth.com/w.js" data-token="%VITE_ANNOT_TOKEN%" ...></script>
```

Trade-offs:
- ✅ Zero build-config changes
- ❌ Widget code loads in production browsers (one extra network request, ~12KB gzipped)
- ❌ `dist/` contains `annot.vylth.com` URL strings (visible in source-view, security review)
- ❌ A misconfigured CI step that *does* inject `VITE_ANNOT_TOKEN` would leak the bubble to production

Used initially by: Medusa, TarXPools, Dex, Crucible, Console — recommend back-porting to A or B at next maintenance pass.

---

## Custodial / PHI / financial products: belt-and-braces

For products like Vylth Flow, PV, Hummingbird — combine two layers:

1. **Build-time strip** (A or C) so URL strings can't reach the production bundle.
2. **Runtime guard** that checks `mode === 'production'` AND `network !== 'mainnet'` AND token present, and bails early if any fail.

This way: even if a future build pipeline regression accidentally bypasses one gate, the other one still keeps the widget off.

Flow's three-guard implementation:

```ts
if (
  !import.meta.env.PROD &&
  import.meta.env.VITE_NETWORK !== 'mainnet' &&
  import.meta.env.VITE_ANNOT_TOKEN
) {
  // …inject script…
}
```

Combined with A or C in `vite.config.ts`, this gives you both compile-time AND runtime exclusion.

---

## Smoke testing the verification

For any approach above, the canonical proof that production is clean:

```bash
pnpm build
grep -r 'annot.vylth.com' dist/ && echo FAIL || echo CLEAN
grep -r 'data-token' dist/ && echo CHECK || echo CLEAN
```

Both should print `CLEAN`. Run this in CI as a regression test for any product where the widget must not ship to production.

---

## React, Vue, Svelte

The pattern is the same regardless of framework. The widget itself is framework-agnostic vanilla JS.

- **React**: install `@vylth/annotator-react` and use the component. The `enabled` prop is a clean third gate alongside A and B.
- **Vue / Svelte**: use pattern A or B with the framework's idiomatic env access (`import.meta.env.PROD` works in both).

Wrappers for Vue and Svelte aren't yet published — PRs welcome.
