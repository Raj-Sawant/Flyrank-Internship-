# Flyrank Capstone — Embeddable Widget & Lead-Capture Platform

A Node.js + Express platform for creating embeddable lead-capture widgets with multi-tenant isolation, geo enrichment, and a dashboard analytics API.

## Quick Start

### With Docker (recommended)

```bash
docker compose up
```

The API will be available at `http://localhost:3000`.

### Without Docker (local dev)

1. Start a PostgreSQL instance and set `DATABASE_URL` in `.env`.
2. Copy `.env.example` to `.env` and adjust values.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the server:
   ```bash
   npm start
   ```

### Seed demo data

```bash
npm run seed
```

This creates two tenant accounts and a sample widget. Note the widget ID printed to stdout.

### Update test-site

Open `test-site/index.html` and replace `YOUR_WIDGET_ID` with the widget ID from the seed output.

Serve the test site from a different port to simulate a cross-origin customer site:

```bash
npx serve test-site -p 5500
```

Then open `http://localhost:5500` in your browser.

## API Reference

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register a new tenant account |
| POST | `/auth/login` | Login and receive a JWT |

### Widgets (authenticated)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/widgets` | List all widgets for the authenticated tenant |
| POST | `/widgets` | Create a new widget |
| GET | `/widgets/:id` | Get a widget by ID |
| PUT | `/widgets/:id` | Update a widget |
| DELETE | `/widgets/:id` | Delete a widget |
| GET | `/widgets/:id/snippet` | Get the embed HTML snippet |

### Public (no auth, CORS open)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/widget.js` | Serve the embeddable widget script |
| GET | `/widgets/:id/config` | Get widget config for rendering |
| POST | `/submissions` | Submit form data from widget |

### Dashboard (authenticated)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard/submissions` | List submissions (filterable by widgetId, paginated) |
| GET | `/dashboard/stats` | Stats: per widget, per day, geo breakdown |

## Embedding a Widget

After creating a widget and getting its ID, embed it on any site:

```html
<script src="http://localhost:3000/widget.js?v=1.0.0" data-widget-id="YOUR_WIDGET_ID"></script>
```

## Running Tests

```bash
npm test
```

Tests require the server to be running. Start it first with `npm start` or `docker compose up`.

## Architecture

- **Multi-tenancy**: All widget/submission queries are scoped to `user_id` from the JWT — tenants can never access each other's data.
- **Geo enrichment**: IP-to-geo uses a two-provider fallback chain (ip-api.com → ipapi.co). If both fail, the submission is still stored without geo data.
- **Spam protection**: Honeypot field (invisible to humans, must be empty). Rate limiting: 10 req/min per IP on the submissions endpoint.
- **Side effects**: The notify service is fire-and-forget — it never blocks or fails the submission response.
- **Widget caching**: `widget.js` is served with `Cache-Control: immutable` (versioned URL). Widget config has a 5-minute cache.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `JWT_SECRET` | — | Secret for signing JWTs (use a long random string in prod) |
| `PORT` | `3000` | HTTP port |
| `WIDGET_VERSION` | `1.0.0` | Widget bundle version (used in cache headers) |
| `BASE_URL` | `http://localhost:3000` | Public base URL (used in embed snippets) |
| `ADMIN_ORIGIN` | `http://localhost:3000` | Allowed origin for admin CORS |
| `NOTIFY_FAIL` | — | Set to `true` to simulate notification failure (for testing) |
