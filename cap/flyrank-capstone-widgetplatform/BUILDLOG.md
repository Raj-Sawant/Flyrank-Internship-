# Build Log

## v1.0.0 — Initial Build

### Stack Decisions
- **Node.js + Express** — minimal, well-understood, no framework overhead
- **pg (node-postgres)** — direct driver, no ORM overhead, full SQL control
- **bcrypt** — industry-standard password hashing (cost factor 10)
- **jsonwebtoken** — JWT sign/verify, 7-day expiry
- **Zod** — runtime validation with TypeScript-like schemas
- **express-rate-limit** — simple sliding window rate limiter
- **cors** — express middleware, public CORS for widget endpoints, strict for admin

### Database Schema
- `users` — id, email (unique), password_hash, created_at
- `widgets` — uuid PK (gen_random_uuid), user_id FK, JSONB fields/display_options, version counter
- `submissions` — serial PK, widget_id FK, user_id (denormalized for fast dashboard queries), JSONB data, ip/country/city

### Key Design Choices
1. **Widget ID as UUID text** — avoids sequential ID enumeration attacks
2. **Denormalized user_id on submissions** — avoids a JOIN on every dashboard query
3. **JSONB for widget fields** — flexible schema without migrations for field changes
4. **Version counter on widgets** — enables cache-busting on config endpoint
5. **Geo enrichment async** — never blocks submission storage; graceful degradation
6. **Honeypot over CAPTCHA** — invisible to users, no third-party dependency
7. **Fire-and-forget notify** — side effects never affect submission reliability

### Files Created
- `docker-compose.yml` — Postgres 15 + app service
- `Dockerfile` — Node 20 Alpine, production deps only
- `.env.example` — all env vars documented
- `.gitignore` — node_modules, .env, logs
- `package.json` — locked dependency versions
- `capstone.yaml` — run/seed/test commands + endpoint list
- `README.md` — setup, API reference, architecture notes
- `EVIDENCE.md` — requirement evidence with code snippets
- `src/db.js` — pg Pool + migrate() with all table DDL
- `src/index.js` — Express app, middleware, route mounting, error handler
- `src/middleware/auth.js` — JWT Bearer token verification
- `src/middleware/cors.js` — publicCors (wildcard) + adminCors (origin-restricted)
- `src/routes/auth.js` — register + login with bcrypt + JWT
- `src/routes/widgets.js` — full CRUD, tenant-isolated, embed snippet
- `src/routes/public.js` — widget.js serving + config endpoint
- `src/routes/submissions.js` — public POST with rate limit, honeypot, geo, notify
- `src/services/geo.js` — ip-api.com → ipapi.co fallback chain, 3s timeout
- `src/services/notify.js` — console log stub, NOTIFY_FAIL env for testing
- `src/dashboard/routes.js` — submissions list + stats (per_widget, per_day, geo)
- `src/seed.js` — creates 2 demo tenants + 1 widget
- `widget/widget.js` — self-contained IIFE widget, fetches config, renders form
- `test-site/index.html` — plain HTML customer site on different origin
- `tests/cors.test.js` — OPTIONS preflight + cross-origin POST
- `tests/submissions.test.js` — valid/invalid/honeypot/oversized payloads
- `tests/ratelimit.test.js` — burst 15 requests, expect 429
- `tests/geo.test.js` — provider A success, fallback to B, all-providers-down
