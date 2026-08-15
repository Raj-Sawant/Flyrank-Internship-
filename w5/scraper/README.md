# FlyRank A9 — The Polite Scraper

A polite scraping pipeline that downloads three catalogue pages from **Books to Scrape**, visits all 60 book pages, turns messy HTML into clean, validated JSON, survives a broken page, and ends every run with an honest report.

---

## Target Classification

| Field | Detail |
|---|---|
| **Site** | [Books to Scrape](https://books.toscrape.com) |
| **Why** | It is a public sandbox built specifically so people can practise scraping on it. The site's own homepage states this explicitly. |
| **Scope** | First **3 catalogue pages only** (20 books × 3 = 60 books) |
| **Data collected** | Title, price, availability, star rating, description, source URL, fetch timestamp |
| **robots.txt result** | `https://books.toscrape.com/robots.txt` returns **HTTP 404** — no robots file found. A missing file is not permission; it is just a missing file. Because this is a declared sandbox, scraping it is appropriate. |

> **I will not reuse this code on another site without checking its rules and terms first.**

---

## Quick Start

### Requirements

- Python 3.10+
- pip

### Install

```bash
cd scraper
pip install requests beautifulsoup4 pydantic
```

### Run

```bash
python src/main.py
```

First run fetches from the network and fills `cache/`.  
Second run reads entirely from cache — same 60 records, no extra requests.

### Output

| File | Contents |
|---|---|
| `output/books.json` | 60 validated, unique book records |
| `output/errors.json` | Any records that failed schema validation |
| `output/run-report.json` | Run stats: duration, cache hits, failures, counts |

---

## Record Schema

Every record in `books.json` has these fields:

```json
{
  "title":             "string — book title",
  "product_url":       "string (https://) — canonical URL, dedup key",
  "price_text":        "string — raw price as scraped (e.g. '£51.77')",
  "price_gbp":         "float  — cleaned numeric price",
  "availability_text": "string — raw availability string",
  "rating_text":       "string — word rating (e.g. 'Three')",
  "rating":            "int    — numeric rating 1–5",
  "description":       "string | null — null when not on page",
  "source_page":       "string (https://) — catalogue page it was found on",
  "fetched_at":        "string — ISO-8601 UTC timestamp"
}
```

Validated with **Pydantic**. Records that fail go to `errors.json` with a reason — they never enter `books.json`.

---

## Politeness Rules

| Rule | Value |
|---|---|
| **User-Agent** | `FlyRankInternshipA9/1.0 (+https://github.com/your-username/flyrank-internship)` |
| **Delay** | ≥ 600 ms between every real request |
| **Timeout** | 10 seconds — never waits forever |
| **Cache** | HTML saved to `cache/` on first fetch; subsequent runs read the file, never re-request |
| **Status check** | Only HTTP 200 is parsed; 404/403 are logged and skipped immediately; 5xx gets one retry |

---

## Why No Browser Was Needed

The data is already present in the static HTML the server sends. Books to Scrape is a server-rendered site — every price, title, and description arrives in the first response. A headless browser (Playwright/Puppeteer) would only add startup cost, memory overhead, and latency for zero gain on this target.

---

## Sample Run Report

```json
{
  "start_time": "2026-08-15T10:00:00+00:00",
  "end_time": "2026-08-15T10:01:45+00:00",
  "duration_seconds": 105.3,
  "catalogue_pages_fetched": 3,
  "detail_pages_fetched": 60,
  "cache_hits": 0,
  "valid_records": 60,
  "invalid_records": 0,
  "failed_pages": 1,
  "failed_urls": [
    "https://books.toscrape.com/catalogue/this-book-does-not-exist_9999/index.html"
  ]
}
```

*(The `failed_pages: 1` is the deliberately injected fake URL used to prove the pipeline survives broken pages.)*

---

## Ethics Note

Use an official API when one exists. Never bypass logins, paywalls, or blocks. Collect only what you need. This scraper touches only a declared public sandbox and stores no personal data.

---

## Limitation

The scraper is single-threaded and processes books sequentially. On a cold run (no cache) with 60+ requests at 600 ms each, the full run takes ~2 minutes. This is intentional — speed is traded for politeness.
