# Evidence — Flyrank Capstone Widget Platform

This document captures evidence of key requirements being met.

## 1. Multi-Tenant Isolation

All widget and submission queries include a `user_id` filter derived from the JWT payload:

```sql
-- Widgets: always scoped to authenticated user
SELECT * FROM widgets WHERE id = $1 AND user_id = $2

-- Submissions dashboard: join to verify ownership
SELECT s.* FROM submissions s
JOIN widgets w ON w.id = s.widget_id
WHERE w.user_id = $1
```

Tenant B cannot read Tenant A's widgets or submissions even if they know the widget ID.

## 2. Public CORS on Submission & Config Endpoints

`src/middleware/cors.js` applies `cors({ origin: '*' })` to:
- `GET /widget.js`
- `GET /widgets/:id/config`
- `POST /submissions` (including `OPTIONS` preflight)

Verified by `tests/cors.test.js`.

## 3. Rate Limiting

`express-rate-limit` applied to `POST /submissions`:
- **10 requests/min per IP** — returns `429` with `{ error: "Too many requests, please slow down" }`
- Standard headers (`RateLimit-*`) returned in every response

Verified by `tests/ratelimit.test.js`.

## 4. Honeypot Spam Protection

A hidden `honeypot` field is included in the widget form (positioned off-screen, `tabIndex=-1`).
If the field is non-empty on submission, the server silently returns `200 OK` without storing the record.

```js
if (honeypot && honeypot.length > 0) {
  return res.status(200).json({ ok: true }); // silent drop
}
```

Verified by `tests/submissions.test.js` → "Honeypot field filled returns 200".

## 5. Geo Enrichment with Fallback Chain

`src/services/geo.js` implements a two-provider chain:
1. **Provider A**: ip-api.com — free, no API key, 45 req/min
2. **Provider B**: ipapi.co — free tier ~1000/day
3. **Fallback**: returns `{}` — submission is stored without geo data

Each provider call has a 3-second timeout via `AbortController`.

Verified by `tests/geo.test.js`.

## 6. Safe Side Effects (Fire-and-Forget Notify)

`notify()` is called with `.catch()` — it never blocks the response:

```js
notify({ submissionId, widgetId, data, geo }).catch(err => {
  console.error('Notify failed (non-critical):', err.message);
});
res.status(201).json({ ok: true, id: subRows[0].id });
```

## 7. Widget Versioning & Caching

- `GET /widget.js` → `Cache-Control: public, max-age=31536000, immutable` + `X-Widget-Version` header
- `GET /widgets/:id/config` → `Cache-Control: public, max-age=300`
- Widget version controlled via `WIDGET_VERSION` env var

## 8. Payload Size Limits

Express body parser configured with `{ limit: '50kb' }`. Zod schema enforces:
- Max 20 fields per submission
- Each field value max 1000 characters

## 9. Dashboard Analytics

`GET /dashboard/stats` returns:
- **per_widget**: submission counts per widget
- **per_day**: daily submission counts (last 30 days)
- **geo_breakdown**: top 20 countries by submission count
