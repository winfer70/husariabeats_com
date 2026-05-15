"""
fetch_release_dates.py — Fetch YouTube publishedAt for released songs and update release_date in DB.

Since the DB is inside Docker (not exposed to host), this script:
1. Dumps song slugs + YouTube IDs via `docker exec psql`
2. Fetches publishedAt from YouTube Data API v3
3. Generates SQL UPDATE statements
4. Applies them via `docker exec psql` (with --apply)

Dry-run by default; pass --apply to write.

Usage:
    python3 fetch_release_dates.py [--apply]

Requires:
    pip install httpx --break-system-packages
"""

import argparse
import json
import os
import subprocess
from datetime import date, datetime, timezone

import httpx

# ── Config ────────────────────────────────────────────────────────────────────

YOUTUBE_API_KEY = os.environ.get(
    "YOUTUBE_API_KEY", "REDACTED"
)
YT_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"
BATCH_SIZE = 50
DB_CONTAINER = "husariabeats_com-db-1"
DB_USER = "husaria"
DB_NAME = "husariabeats"


# ── DB helpers (via docker exec) ──────────────────────────────────────────────


def psql_query(sql: str) -> str:
    """Run a SQL query in the DB container, return stdout."""
    result = subprocess.run(
        [
            "docker", "exec", DB_CONTAINER,
            "psql", "-U", DB_USER, "-d", DB_NAME,
            "-t",           # tuples only (no headers/footers)
            "-A",           # unaligned output
            "-F", "|",      # field separator
            "-c", sql,
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"psql error: {result.stderr.strip()}")
    return result.stdout.strip()


def psql_exec(sql: str) -> None:
    """Execute a SQL statement in the DB container."""
    result = subprocess.run(
        ["docker", "exec", DB_CONTAINER, "psql", "-U", DB_USER, "-d", DB_NAME, "-c", sql],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"psql error: {result.stderr.strip()}")


# ── YouTube helpers ───────────────────────────────────────────────────────────


def fetch_published_dates(video_ids: list[str]) -> dict[str, date]:
    """Batch-fetch publishedAt for YouTube video IDs. Returns video_id → date."""
    result: dict[str, date] = {}
    for i in range(0, len(video_ids), BATCH_SIZE):
        batch = video_ids[i : i + BATCH_SIZE]
        resp = httpx.get(
            YT_VIDEOS_URL,
            params={
                "part": "snippet",
                "id": ",".join(batch),
                "key": YOUTUBE_API_KEY,
                "fields": "items(id,snippet/publishedAt)",
            },
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json()
        for item in data.get("items", []):
            vid_id = item["id"]
            published_str = item["snippet"]["publishedAt"]
            dt = datetime.fromisoformat(published_str.replace("Z", "+00:00"))
            result[vid_id] = dt.astimezone(timezone.utc).date()
    return result


# ── Main ──────────────────────────────────────────────────────────────────────


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch YouTube release dates for songs")
    parser.add_argument(
        "--apply", action="store_true", help="Write results to DB (default: dry-run)"
    )
    args = parser.parse_args()
    dry_run = not args.apply

    # 1. Query DB for released songs with YouTube IDs but no release_date
    raw = psql_query(
        """
        SELECT slug, youtube_id_pl, youtube_id_en
        FROM songs
        WHERE status = 'released'
          AND release_date IS NULL
          AND (youtube_id_pl IS NOT NULL OR youtube_id_en IS NOT NULL)
        ORDER BY slug
        """
    )

    if not raw:
        print("No released songs missing release_date with YouTube IDs found.")
        return

    rows: list[tuple[str, str | None, str | None]] = []
    for line in raw.splitlines():
        parts = line.split("|")
        slug = parts[0].strip()
        id_pl = parts[1].strip() or None if len(parts) > 1 else None
        id_en = parts[2].strip() or None if len(parts) > 2 else None
        rows.append((slug, id_pl, id_en))

    print(f"Found {len(rows)} songs to process:")
    for slug, id_pl, id_en in rows:
        print(f"  {slug:30s}  PL={id_pl or '—':15s}  EN={id_en or '—'}")

    # 2. Collect all unique video IDs
    all_ids: list[str] = []
    for _, id_pl, id_en in rows:
        for vid in (id_pl, id_en):
            if vid and vid not in all_ids:
                all_ids.append(vid)

    print(f"\nFetching publish dates for {len(all_ids)} YouTube videos...")
    published = fetch_published_dates(all_ids)
    print(f"  → {len(published)} returned from API\n")

    # 3. Compute release_date per song
    updates: list[tuple[date, str]] = []
    for slug, id_pl, id_en in rows:
        dates = []
        if id_pl and id_pl in published:
            dates.append(published[id_pl])
        if id_en and id_en in published:
            dates.append(published[id_en])

        if not dates:
            print(f"  {slug:30s}  ⚠ No data from YouTube — skip")
            continue

        release_date = min(dates)
        pl_str = str(published.get(id_pl, "—")) if id_pl else "—"
        en_str = str(published.get(id_en, "—")) if id_en else "—"
        print(f"  {slug:30s}  PL={pl_str}  EN={en_str}  → {release_date}")
        updates.append((release_date, slug))

    if dry_run:
        print(f"\n[DRY RUN] Would update {len(updates)} songs. Pass --apply to write.")
        return

    # 4. Apply updates
    for release_date, slug in updates:
        psql_exec(
            f"UPDATE songs SET release_date = '{release_date}' WHERE slug = '{slug}'"
        )

    print(f"\n✅ Updated {len(updates)} songs with release_date.")

    # Report remaining songs without release_date
    still_missing = psql_query(
        "SELECT slug FROM songs WHERE status = 'released' AND release_date IS NULL ORDER BY slug"
    )
    if still_missing:
        print(f"\n⚠ Still missing release_date:")
        for s in still_missing.splitlines():
            print(f"  {s.strip()}")
    else:
        print("✅ All released songs now have release_date.")


if __name__ == "__main__":
    main()
