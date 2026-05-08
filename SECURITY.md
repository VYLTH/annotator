# Security

This document describes the security model of the Vylth annotator and what we redact, validate, and reject. If you spot something concerning, please mail **labs@vylth.com** instead of opening a public issue.

## Threat model

The annotator runs in two trust contexts:

1. **The widget** runs inside the host page. Same origin as the host page, has whatever access the host page has (cookies, localStorage, fetch). The widget must avoid leaking secrets that it incidentally observes (console logs, network errors).
2. **The API service** receives diagnostic envelopes and serves the dashboard. It must reject malformed input, scope reads to the authenticated project, and not become a vector for stored XSS or filesystem traversal.

## Token model

- Tokens are random 24-byte hex (192 bits of entropy — brute force is intractable).
- Stored as **SHA-256** in `annotator_projects.token_hash`. The raw token is never persisted.
- Sent on each request as `X-Annot-Token`. HTTPS only on hosted; bound to localhost on `annotator run`.
- No password reuse, no rotation in v0 (manual: insert a new row with a new hash, retire the old one).
- Tokens are scoped to one project — the cricket token can only read/write cricket annotations.

## Widget redaction

### Screenshot
Selectors passed via `data-redact="..."` are CSS-blurred *before* the screenshot is taken. Common patterns:

- Mint / Flow / PV: `.wallet-address`, `.private-key`, `.tx-hash`, `.balance`
- Hummingbird: `.patient-name`, `.mrn`, `.dob`, `.diagnosis`
- Nexus: `input[type="password"]`, `.api-key`, `.session-token`

The blur is destructive — the captured PNG has the blurred pixels, not the original.

### Console buffer
The console ring buffer (last 100 entries) is automatically scrubbed for secret-shaped strings before submission. We replace any of the following with `[REDACTED]`:

| Pattern | Why |
|---|---|
| `Bearer <token>` | OAuth/JWT auth headers |
| `eyJ…` | JWT tokens |
| `sk_live_…` / `sk_test_…` / `pk_live_…` / `pk_test_…` | Stripe-style keys |
| `AKIA…` | AWS access keys |
| `gh[ps]_…` | GitHub PATs |
| Long `<base64>.<base64>` shapes | Generic secret tokens |

If your secret format isn't covered, please open an issue.

### Network buffer
Captured: URL, method, status, duration. **Not captured**: request body, response body, headers (including `Authorization`).

URL query strings are sanitized before storage — params named `token`, `access_token`, `refresh_token`, `id_token`, `auth_token`, `api_key`, `apikey`, `key`, `password`, `sig`, `signature`, `jwt`, `session*` get their values replaced with `[REDACTED]`.

### What we deliberately don't capture
- Cookies
- localStorage / sessionStorage contents
- Form values
- DOM attribute values (other than the `data-*` annotator config)
- HTTP headers

## Server-side checks

| Check | Where |
|---|---|
| Token presence + match (SHA-256) | `auth.py::project_from_token` |
| Image is base64-decodable | `main.py::create_feedback` |
| Image starts with PNG magic bytes (`89 50 4E 47 …`) | `main.py::create_feedback` |
| Image ≤ 25 MB raw (configurable) | `main.py::create_feedback` |
| Inline storage ≤ 500 KB; larger → R2 (if configured) else 413 | `storage.py::store` |
| Project-scoping on every read/write | `main.py` (every endpoint) |
| CORS: explicit `allow_methods=[GET,POST,OPTIONS]`, `allow_headers=[X-Annot-Token, Content-Type]` | `main.py::CORSMiddleware` |
| `client_max_body_size 8M` at nginx layer (hosted) | `/etc/nginx/sites-enabled/annot.vylth.com.conf` |
| systemd hardening (`ProtectSystem=strict`, `NoNewPrivileges`, `PrivateTmp`) | `/etc/systemd/system/annotator.service` |

## Known unknowns / not yet hardened

- **No per-token rate limiting.** A leaked token could spam annotations until the storage cap fills. Mitigation: rotate the project's token (manual today) + the 25 MB hard cap caps blast radius per request. Tracking issue: rate limit middleware.
- **No TLS pinning.** Trust chain is the system root CA store.
- **Self-hosters who edit `.env` manually** may forget `chmod 600`. The CLI's `annotator setup` writes `.env.local` as `0o600`; manual paths don't.

## Reporting a vulnerability

Email **labs@vylth.com** with steps to reproduce. No public disclosure for at least 14 days while we triage. We aim to respond within 48 hours.

We don't run a paid bug-bounty program but we acknowledge contributors in release notes.
