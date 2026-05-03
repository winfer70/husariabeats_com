#!/usr/bin/env python3
"""
api/scripts/release.py — CLI tool to queue a song for release.

Usage:
    python api/scripts/release.py --song <slug> [--date YYYY-MM-DD]
                                   [--platforms youtube,facebook,instagram,tiktok]
                                   [--dry-run]

What it does:
    1. Validates song exists in DB and has status 'render_done'.
    2. Checks for duplicate queue entry (rejects if song already queued).
    3. Warns if another song is scheduled on the same date.
    4. Inserts into release_queue (status='pending').
    5. Updates songs.status → 'scheduled'.
    6. Prints: DistroKid CSV row, YouTube title/desc, social post draft.

Options:
    --song       Song slug (required). Must exist in DB with status render_done.
    --date       Release date YYYY-MM-DD. Defaults to tomorrow.
    --platforms  Comma-separated list. Default: youtube,facebook,instagram,tiktok.
    --dry-run    Print all output without writing to DB.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from datetime import date, timedelta
from pathlib import Path

import asyncpg
from dotenv import load_dotenv

# Load .env from project root (two levels up from this script)
_SCRIPT_DIR  = Path(__file__).resolve().parent
_PROJECT_DIR = _SCRIPT_DIR.parent.parent
load_dotenv(_PROJECT_DIR / ".env")

DATABASE_URL    = os.environ.get("DATABASE_URL", "")
TIMELINE_JSON   = _PROJECT_DIR / "frontend" / "src" / "data" / "timeline.json"
ALL_PLATFORMS   = ["youtube", "facebook", "instagram", "tiktok"]
VALID_STATUSES  = {"render_done"}  # Only songs at this stage are ready to release


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments and return parsed namespace."""
    parser = argparse.ArgumentParser(
        description="Queue a HusariaBeats song for automated release.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--song",
        required=True,
        help="Song slug (must exist in DB with status 'render_done')",
    )
    parser.add_argument(
        "--date",
        default=None,
        help="Release date YYYY-MM-DD (default: tomorrow)",
    )
    parser.add_argument(
        "--platforms",
        default=",".join(ALL_PLATFORMS),
        help="Comma-separated platforms (default: all)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print output without writing to database",
    )
    return parser.parse_args()


def load_timeline_entry(slug: str) -> dict | None:
    """
    Load a timeline.json entry matching the song slug.

    Returns the entry dict if found, None otherwise.
    Input: slug — song identifier to match against timeline entry 'id' field.
    Output: dict with title, subtitle, summary, longText, sources (all localised).
    """
    if not TIMELINE_JSON.exists():
        return None
    try:
        with open(TIMELINE_JSON, encoding="utf-8") as f:
            entries: list[dict] = json.load(f)
        return next((e for e in entries if e.get("id") == slug), None)
    except Exception:
        return None


def make_yt_description(entry: dict | None, lang: str) -> str:
    """
    Build a YouTube description from a timeline entry.

    Input: entry — timeline.json dict (or None), lang — 'pl' or 'en'.
    Output: Description string (summary + sources or fallback).
    """
    if not entry:
        return "husariabeats — Historia · Muzyka · Prawda\nhttps://husariabeats.com"

    summary   = entry.get("summary",  {}).get(lang, "")
    long_text = entry.get("longText", {}).get(lang, "")
    sources   = entry.get("sources",  [])

    parts = []
    if summary:
        parts.append(summary)
    if long_text:
        parts.append(long_text)
    if sources:
        parts.append("\nŹródła / Sources:")
        parts.extend(f"  • {s}" for s in sources)
    parts.append("\nhusariabeats — Historia · Muzyka · Prawda")
    parts.append("https://husariabeats.com")
    return "\n".join(parts)


def make_social_post(song: dict, entry: dict | None) -> str:
    """
    Generate a bilingual social media post draft.

    Input: song — DB row dict (title_pl, title_en), entry — timeline dict or None.
    Output: Formatted post string for Facebook/Instagram/TikTok caption.
    """
    summary_pl = (entry or {}).get("summary", {}).get("pl", "")
    summary_en = (entry or {}).get("summary", {}).get("en", "")
    year_label = (entry or {}).get("yearLabel", "")

    pl_line = f"🇵🇱 {song['title_pl']}"
    if year_label:
        pl_line += f" | {year_label}"
    if summary_pl:
        pl_line += f"\n{summary_pl}"
    pl_line += "\n#husariabeats #historia #polska #muzykahistoryczna"

    en_line = f"\n\n🇬🇧 {song['title_en']}"
    if year_label:
        en_line += f" | {year_label}"
    if summary_en:
        en_line += f"\n{summary_en}"
    en_line += "\n#husariabeats #history #poland #historicmusic"

    return pl_line + en_line


def make_distrokid_row(song: dict, release_date: str, album_title: str) -> str:
    """
    Generate a DistroKid CSV row for the song.

    DistroKid format: Artist, Title, Album, Release Date, various metadata.
    Input: song — DB row, release_date — YYYY-MM-DD, album_title — album name.
    Output: CSV row string (header commented for reference).
    """
    # DistroKid album upload CSV columns (simplified)
    # Track Title | Release Date | Album | Primary Artist | ...
    return (
        f"husariabeats,{song['title_en']},{album_title},{release_date},"
        f"Electronic,Pop,Instrumental"
    )


async def main() -> None:
    """Main entry point: validate, optionally queue, print output."""
    args = parse_args()

    # Validate and parse platforms
    platforms = [p.strip().lower() for p in args.platforms.split(",") if p.strip()]
    invalid   = set(platforms) - set(ALL_PLATFORMS)
    if invalid:
        print(f"Error: invalid platforms: {invalid}", file=sys.stderr)
        sys.exit(1)

    # Parse release date
    if args.date:
        try:
            release_date = date.fromisoformat(args.date)
        except ValueError:
            print(f"Error: invalid date '{args.date}', expected YYYY-MM-DD", file=sys.stderr)
            sys.exit(1)
    else:
        release_date = date.today() + timedelta(days=1)

    if not DATABASE_URL:
        print("Error: DATABASE_URL not set in environment / .env", file=sys.stderr)
        sys.exit(1)

    # Convert asyncpg URL format (asyncpg doesn't support postgresql+asyncpg://)
    db_url = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

    conn = await asyncpg.connect(db_url)
    try:
        # Fetch song
        song = await conn.fetchrow(
            "SELECT slug, title_pl, title_en, status, album_slug FROM songs WHERE slug = $1",
            args.song,
        )
        if not song:
            print(f"Error: song '{args.song}' not found in database.", file=sys.stderr)
            sys.exit(1)

        if song["status"] not in VALID_STATUSES:
            print(
                f"Error: song '{args.song}' has status '{song['status']}'.\n"
                f"Only songs with status 'render_done' can be queued.",
                file=sys.stderr,
            )
            sys.exit(1)

        # Check for duplicate queue entry
        existing_queue = await conn.fetchrow(
            "SELECT id FROM release_queue WHERE song_id = $1 AND status != 'released'",
            args.song,
        )
        if existing_queue:
            print(
                f"Error: song '{args.song}' is already in the queue (id={existing_queue['id']}).",
                file=sys.stderr,
            )
            sys.exit(1)

        # Warn if another song scheduled on same date
        same_date = await conn.fetchrow(
            "SELECT song_id FROM release_queue WHERE scheduled_at = $1 AND status = 'pending'",
            release_date,
        )
        if same_date:
            print(
                f"Warning: another song ('{same_date['song_id']}') is already "
                f"scheduled for {release_date}. Proceeding anyway.",
                file=sys.stderr,
            )

        # Get album title
        album_title = "husariabeats"
        if song["album_slug"]:
            album_row = await conn.fetchrow(
                "SELECT title FROM albums WHERE slug = $1",
                song["album_slug"],
            )
            if album_row:
                album_title = album_row["title"]

        # Write to DB (unless dry-run)
        if not args.dry_run:
            platforms_pg = "{" + ",".join(platforms) + "}"
            await conn.execute(
                """
                INSERT INTO release_queue (song_id, scheduled_at, platforms, status)
                VALUES ($1, $2, $3, 'pending')
                """,
                args.song,
                release_date,
                platforms_pg,
            )
            await conn.execute(
                "UPDATE songs SET status = 'scheduled' WHERE slug = $1",
                args.song,
            )

        # Load timeline entry for rich output
        entry = load_timeline_entry(args.song)

    finally:
        await conn.close()

    # Print output
    dry_label = " [DRY RUN — nothing written to DB]" if args.dry_run else ""
    print(f"\n{'='*60}")
    print(f"  RELEASE QUEUED{dry_label}")
    print(f"{'='*60}")
    print(f"  Song:      {args.song}")
    print(f"  Title PL:  {song['title_pl']}")
    print(f"  Title EN:  {song['title_en']}")
    print(f"  Date:      {release_date}")
    print(f"  Platforms: {', '.join(platforms)}")
    print(f"  Album:     {song['album_slug'] or '—'}")

    print(f"\n{'-'*60}")
    print("  DISTROKID CSV ROW")
    print(f"{'-'*60}")
    print("  # Format: artist, title_en, album, release_date, genres")
    print(f"  {make_distrokid_row(dict(song), str(release_date), album_title)}")

    print(f"\n{'-'*60}")
    print("  YOUTUBE TITLE")
    print(f"{'-'*60}")
    print(f"  PL: {song['title_pl']} | husariabeats")
    print(f"  EN: {song['title_en']} | husariabeats")

    print(f"\n{'-'*60}")
    print("  YOUTUBE DESCRIPTION (EN)")
    print(f"{'-'*60}")
    for line in make_yt_description(entry, "en").split("\n"):
        print(f"  {line}")

    print(f"\n{'-'*60}")
    print("  YOUTUBE DESCRIPTION (PL)")
    print(f"{'-'*60}")
    for line in make_yt_description(entry, "pl").split("\n"):
        print(f"  {line}")

    print(f"\n{'-'*60}")
    print("  SOCIAL POST DRAFT (FB / IG / TikTok)")
    print(f"{'-'*60}")
    for line in make_social_post(dict(song), entry).split("\n"):
        print(f"  {line}")

    print(f"\n{'='*60}\n")


if __name__ == "__main__":
    asyncio.run(main())
