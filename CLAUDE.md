# annotator

> Project guide. Design/asset work routes through shared Claude Code skills (see below).

<!-- VYLTH-DESIGN-SKILLS:BEGIN (managed block — safe to regenerate, do not hand-edit) -->
## Design & Asset Skills

User-level Claude Code skills auto-trigger on these task types. If you are explicitly doing one of these, invoke the skill by name — don't hand-roll it. Each skill carries non-negotiable rules, a mandatory build order, anti-patterns, and a quality checklist. Visual treatment defers to `premium-glass-ui`; motion to `web-motion`/`remotion-premium-video`; raster rendering to `nano-banana`; so output stays consistent across sessions.

| When doing… | Invoke skill |
|---|---|
| Glassy / premium / sleek / 3D-depth UI | `premium-glass-ui` |
| Tactile hardware-style controls (knobs, dials) | `skeuomorphic-ui` |
| UI animation / button & hover / micro-interactions | `web-motion` |
| Forms / sign-up / checkout / validation / multi-step | `form-ux` |
| "Where do I find UI/design/template references" | `ui-design-sources` |
| Card component (stat / quote / pricing / dashboard tile / OG share) | `card-primitives` |
| Remotion video / product ad / onboarding video | `remotion-premium-video` |
| A single video frame or thumbnail/preview frame | `video-frame-composition` |
| Landing / marketing / pricing page | `premium-landing-page` |
| Swipe carousel (X / Instagram / LinkedIn) | `social-carousel` |
| OG / link-preview / social share image | `og-image` |
| Pitch / investor / fundraising deck slide | `pitch-deck-slide` |
| Infographic / data snapshot / stat graphic | `infographic-design` |
| App Store / Play Store listing screenshots | `app-store-screenshots` |
| Brand meme | `brand-meme` |
| Wallpaper / lockscreen / home-screen widget | `wallpaper-widget` |
| Smart-contract / DeFi protocol security audit | `smart-contract-audit` |
| Backend blockchain integration (RPC/tx/reorg/indexing) | `onchain-integration` |
| Generate/ render an actual image (Gemini image gen) | `nano-banana` |
<!-- VYLTH-DESIGN-SKILLS:END -->
