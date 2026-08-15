"""
FlyRank Internship · Backend Track · W5 · A9
The Polite Scraper — Books to Scrape
Stages 0–6 in a single entry-point.
"""

import json
import time
import re
import hashlib
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from pydantic import BaseModel, HttpUrl, field_validator, ValidationError
from typing import Optional

# ── paths ──────────────────────────────────────────────────────────────────────
ROOT        = Path(__file__).parent.parent
CACHE_DIR   = ROOT / "cache"
OUTPUT_DIR  = ROOT / "output"
CACHE_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

# ── constants ──────────────────────────────────────────────────────────────────
BASE_URL    = "https://books.toscrape.com/catalogue/"
START_URL   = "https://books.toscrape.com/catalogue/page-1.html"
USER_AGENT  = "FlyRankInternshipA9/1.0 (+https://github.com/your-username/flyrank-internship)"
TIMEOUT     = 10          # seconds
DELAY       = 0.6         # seconds between real requests
MAX_PAGES   = 3

# One fake URL to prove Stage 5 (broken-page survival)
INJECT_BROKEN_URL = "https://books.toscrape.com/catalogue/this-book-does-not-exist_9999/index.html"

HEADERS = {"User-Agent": USER_AGENT}

# ── run stats (mutable dict passed around) ─────────────────────────────────────
stats = {
    "start_time": None,
    "end_time": None,
    "catalogue_pages_fetched": 0,
    "detail_pages_fetched": 0,
    "cache_hits": 0,
    "valid_records": 0,
    "invalid_records": 0,
    "failed_pages": 0,
    "failed_urls": [],
}

# ══════════════════════════════════════════════════════════════════════════════
# STAGE 1 — polite fetch with cache
# ══════════════════════════════════════════════════════════════════════════════

def _cache_path(url: str) -> Path:
    """Turn a URL into a safe filename inside cache/."""
    slug = hashlib.md5(url.encode()).hexdigest()
    return CACHE_DIR / f"{slug}.html"


def fetch(url: str, is_catalogue: bool = False) -> Optional[str]:
    """
    Return HTML for *url*.
    - Checks cache first; prints CACHE HIT / FETCH.
    - Sends user-agent + timeout on real requests.
    - Checks status code; returns None on non-200.
    - Retries once on 5xx / timeout; never retries 404 or 403.
    """
    path = _cache_path(url)

    if path.exists():
        print(f"  CACHE HIT  {url}  ({path.stat().st_size:,} bytes)")
        stats["cache_hits"] += 1
        return path.read_text(encoding="utf-8")

    # real network request
    time.sleep(DELAY)
    try:
        resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
    except requests.exceptions.Timeout:
        print(f"  TIMEOUT    {url}  — retrying once …")
        time.sleep(DELAY * 2)
        try:
            resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        except Exception as exc:
            print(f"  FAILED     {url}  — {exc}")
            stats["failed_pages"] += 1
            stats["failed_urls"].append(url)
            return None
    except Exception as exc:
        print(f"  FAILED     {url}  — {exc}")
        stats["failed_pages"] += 1
        stats["failed_urls"].append(url)
        return None

    # status-code check
    if resp.status_code == 200:
        html = resp.text
        path.write_text(html, encoding="utf-8")
        print(f"  FETCH      {url}  ({len(html):,} bytes)")
        if is_catalogue:
            stats["catalogue_pages_fetched"] += 1
        else:
            stats["detail_pages_fetched"] += 1
        return html

    # non-200 — do NOT retry 404 or 403
    if resp.status_code in (404, 403):
        print(f"  {resp.status_code}         {url}  — skipping (will not retry)")
        stats["failed_pages"] += 1
        stats["failed_urls"].append(url)
        return None

    # 5xx — single retry
    print(f"  {resp.status_code}         {url}  — server error, retrying once …")
    time.sleep(DELAY * 3)
    try:
        resp2 = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        if resp2.status_code == 200:
            html = resp2.text
            path.write_text(html, encoding="utf-8")
            if is_catalogue:
                stats["catalogue_pages_fetched"] += 1
            else:
                stats["detail_pages_fetched"] += 1
            return html
    except Exception:
        pass

    print(f"  FAILED     {url}  — gave up after retry")
    stats["failed_pages"] += 1
    stats["failed_urls"].append(url)
    return None


# ══════════════════════════════════════════════════════════════════════════════
# STAGE 2 — discover all book URLs across 3 catalogue pages
# ══════════════════════════════════════════════════════════════════════════════

def discover_book_urls() -> list[str]:
    """Crawl up to MAX_PAGES catalogue pages; return deduplicated book URLs."""
    book_urls: list[str] = []
    current_url = START_URL
    pages_visited = 0

    while current_url and pages_visited < MAX_PAGES:
        print(f"\n[catalogue page {pages_visited + 1}] {current_url}")
        html = fetch(current_url, is_catalogue=True)
        if not html:
            break

        soup = BeautifulSoup(html, "html.parser")

        # collect book links on this page
        for article in soup.select("article.product_pod"):
            a_tag = article.select_one("h3 > a")
            if a_tag and a_tag.get("href"):
                abs_url = urljoin(current_url, a_tag["href"])
                book_urls.append(abs_url)

        pages_visited += 1

        # follow "next" link — let the site decide pagination
        next_li = soup.select_one("li.next > a")
        if next_li and pages_visited < MAX_PAGES:
            current_url = urljoin(current_url, next_li["href"])
        else:
            current_url = None

    # deduplicate while preserving order
    seen: set[str] = set()
    unique: list[str] = []
    for u in book_urls:
        if u not in seen:
            seen.add(u)
            unique.append(u)

    print(f"\ncatalogue_pages={pages_visited}  discovered={len(book_urls)}  unique_urls={len(unique)}")
    return unique


# ══════════════════════════════════════════════════════════════════════════════
# STAGE 3 — extract raw record from each book page
# ══════════════════════════════════════════════════════════════════════════════

def extract_raw(url: str, source_page: str) -> Optional[dict]:
    """Return an 8-key raw record, or None if the page could not be fetched."""
    html = fetch(url)
    if html is None:
        return None

    soup = BeautifulSoup(html, "html.parser")

    # target the product area only
    product = soup.select_one("div.product_main") or soup
    article = soup.select_one("article.product_page") or soup

    title_tag = product.select_one("h1")
    title = title_tag.get_text(strip=True) if title_tag else None

    price_tag = product.select_one("p.price_color")
    price_text = price_tag.get_text(strip=True) if price_tag else None

    avail_tag = product.select_one("p.availability")
    availability_text = avail_tag.get_text(strip=True) if avail_tag else None

    # rating is a CSS class on <p class="star-rating Three">
    rating_tag = product.select_one("p.star-rating")
    rating_text = rating_tag["class"][1] if rating_tag and len(rating_tag.get("class", [])) > 1 else None

    # description lives in <div id="product_description"> sibling <p>
    desc_header = article.find("div", id="product_description")
    if desc_header and desc_header.find_next_sibling("p"):
        description = desc_header.find_next_sibling("p").get_text(strip=True)
    else:
        description = None   # some books have no description — store null

    return {
        "title": title,
        "product_url": url,
        "price_text": price_text,
        "availability_text": availability_text,
        "rating_text": rating_text,
        "description": description,
        "source_page": source_page,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


# ══════════════════════════════════════════════════════════════════════════════
# STAGE 4 — schema, normalize, validate, store
# ══════════════════════════════════════════════════════════════════════════════

WORD_TO_NUM = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
}

class BookRecord(BaseModel):
    title: str
    product_url: str
    price_text: str
    price_gbp: float
    availability_text: str
    rating_text: str
    rating: int
    description: Optional[str] = None
    source_page: str
    fetched_at: str

    @field_validator("product_url", "source_page")
    @classmethod
    def must_be_https(cls, v: str) -> str:
        if not v.startswith("https://"):
            raise ValueError(f"URL must start with https://: {v}")
        return v

    @field_validator("price_gbp")
    @classmethod
    def must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("price_gbp must be positive")
        return v


def normalize(raw: dict) -> tuple[Optional[BookRecord], Optional[str]]:
    """
    Clean raw fields → typed BookRecord.
    Returns (record, None) on success or (None, error_message) on failure.
    """
    # price: "£51.77" → 51.77
    price_text = raw.get("price_text") or ""
    price_match = re.search(r"[\d.]+", price_text)
    price_gbp = float(price_match.group()) if price_match else 0.0

    # rating: "Three" → 3
    rating_word = (raw.get("rating_text") or "").lower()
    rating = WORD_TO_NUM.get(rating_word, 0)

    try:
        record = BookRecord(
            title=raw.get("title") or "",
            product_url=raw.get("product_url") or "",
            price_text=raw.get("price_text") or "",
            price_gbp=price_gbp,
            availability_text=raw.get("availability_text") or "",
            rating_text=raw.get("rating_text") or "",
            rating=rating,
            description=raw.get("description"),
            source_page=raw.get("source_page") or "",
            fetched_at=raw.get("fetched_at") or "",
        )
        return record, None
    except (ValidationError, Exception) as exc:
        return None, str(exc)


# ══════════════════════════════════════════════════════════════════════════════
# STAGE 5 — run report
# ══════════════════════════════════════════════════════════════════════════════

def write_report(duration: float) -> None:
    stats["end_time"] = datetime.now(timezone.utc).isoformat()
    report = {
        "start_time": stats["start_time"],
        "end_time": stats["end_time"],
        "duration_seconds": round(duration, 2),
        "catalogue_pages_fetched": stats["catalogue_pages_fetched"],
        "detail_pages_fetched": stats["detail_pages_fetched"],
        "cache_hits": stats["cache_hits"],
        "valid_records": stats["valid_records"],
        "invalid_records": stats["invalid_records"],
        "failed_pages": stats["failed_pages"],
        "failed_urls": stats["failed_urls"],
    }
    out = OUTPUT_DIR / "run-report.json"
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"\nRun report → {out}")
    print(json.dumps(report, indent=2))


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main() -> None:
    t0 = time.time()
    stats["start_time"] = datetime.now(timezone.utc).isoformat()

    print("=" * 60)
    print("FlyRank A9 — The Polite Scraper")
    print("=" * 60)

    # ── Stage 2: discover 60 book URLs ────────────────────────────────────────
    print("\n── Stage 2: discovering book URLs ──")
    book_urls = discover_book_urls()

    # inject one deliberately broken URL to prove Stage 5
    book_urls.append(INJECT_BROKEN_URL)
    print(f"  (injected 1 fake URL for failure-resilience test)")

    # ── Stages 3 + 4: extract → normalize → validate ──────────────────────────
    print("\n── Stages 3 + 4: fetch, extract, normalize, validate ──")

    # source_page is the catalogue page each book was found on;
    # we store it per book via a simple index heuristic (20 per page)
    def source_for(idx: int) -> str:
        page_num = (idx // 20) + 1
        return f"https://books.toscrape.com/catalogue/page-{page_num}.html"

    good_records: dict[str, dict] = {}   # keyed by product_url for idempotency
    error_records: list[dict] = []

    # load existing books.json so a re-run doesn't duplicate
    books_path = OUTPUT_DIR / "books.json"
    if books_path.exists():
        existing = json.loads(books_path.read_text(encoding="utf-8"))
        for rec in existing:
            good_records[rec["product_url"]] = rec
        print(f"  Loaded {len(good_records)} existing records from books.json")

    for idx, url in enumerate(book_urls):
        print(f"\n[{idx+1}/{len(book_urls)}] {url}")
        raw = extract_raw(url, source_for(idx))
        if raw is None:
            # fetch already logged the failure
            continue

        record, err = normalize(raw)
        if record:
            good_records[record.product_url] = record.model_dump()
            stats["valid_records"] += 1
        else:
            error_records.append({"url": url, "reason": err, "raw": raw})
            stats["invalid_records"] += 1
            print(f"  INVALID    {url}  — {err}")

    # print one sample record
    if good_records:
        sample = next(iter(good_records.values()))
        print("\n── Sample record ──")
        print(json.dumps(sample, indent=2, default=str))

    # ── Stage 4: write books.json (exactly 60 real records) ───────────────────
    # exclude the injected fake URL from output
    output_records = [
        v for v in good_records.values()
        if v["product_url"] != INJECT_BROKEN_URL
    ]
    books_path.write_text(
        json.dumps(output_records, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"\nbooks.json → {books_path}  ({len(output_records)} records)")

    # errors.json
    errors_path = OUTPUT_DIR / "errors.json"
    errors_path.write_text(
        json.dumps(error_records, indent=2, default=str),
        encoding="utf-8",
    )
    print(f"errors.json → {errors_path}  ({len(error_records)} records)")

    # ── Stage 5: run report ────────────────────────────────────────────────────
    write_report(time.time() - t0)
    print(f"\ndetail_pages={stats['detail_pages_fetched']}  "
          f"valid={stats['valid_records']}  "
          f"invalid={stats['invalid_records']}  "
          f"failed={stats['failed_pages']}")


if __name__ == "__main__":
    main()
