#!/usr/bin/env python3
"""
api/scripts/add_song.py — CLI tool to add a new song record to the database.

Usage:
    python api/scripts/add_song.py --slug <slug> --title-pl <title> --title-en <title> [options]

Required:
    --slug          Unique song identifier (e.g. husaria-pod-wiedniem).
    --title-pl      Polish title.
    --title-en      English title.

Optional metadata:
    --album-slug    Slug of the parent album.
    --era           One of: medieval, partitions, wwi, wwii, cold_war, modern.
    --year-event    Historical year the song refers to (integer).
    --status        Initial status (default: scaffold).
    --release-date  YYYY-MM-DD format.
    --subtitle-pl   Polish subtitle.
    --subtitle-en   English subtitle.
    --summary-pl    Polish summary / description.
    --summary-en    English summary / description.

Optional YouTube IDs:
    --yt-pl         YouTube video ID for Polish upload.
    --yt-en         YouTube video ID for English upload.

Optional streaming URLs:
    --spotify-url
    --apple-music-url
    --amazon-url
    --youtube-music-url
    --itunes-url

Flags:
    --dry-run       Print the INSERT that would be executed without writing to DB.
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
from pathlib import Path

import asyncpg
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Environment setup — load .env from project root (two levels up from script)
# ---------------------------------------------------------------------------
_SCRIPT_DIR  = Path(__file__).resolve().parent
_PROJECT_DIR = _SCRIPT_DIR.parent.parent
load_dotenv(_PROJECT_DIR / ".env")

# Prefer explicit DATABASE_URL; fall back to constructing from POSTGRES_* vars
DATABASE_URL = os.environ.get("DATABASE_URL") or (
    "postgresql+asyncpg://"
    f"{os.environ.get('POSTGRES_USER', 'husaria')}:"
    f"{os.environ.get('POSTGRES_PASSWORD', '')}@"
    f"db:5432/"
    f"{os.environ.get('POSTGRES_DB', 'husariabeats')}"
)

VALID_ERAS = ["medieval", "partitions", "wwi", "wwii", "cold_war", "modern"]
VALID_STATUSES = [
    "scaffold", "audio_ready", "sync_done", "render_done", "scheduled", "released",
]


def parse_args() -> argparse.Namespace:
    """Parse and return command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Add a new HusariaBeats song to the database.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )

    # Required fields
    parser.add_argument("--slug",     required=True, help="Unique song slug")
    parser.add_argument("--title-pl", required=True, dest="title_pl", help="Polish title")
    parser.add_argument("--title-en", required=True, dest="title_en", help="English title")

    # Optional metadata
    parser.add_argument("--album-slug",   dest="album_slug",   default=None)
    parser.add_argument("--era",          dest="era",          default=None,
                        help=f"One of: {', '.join(VALID_ERAS)}")
    parser.add_argument("--year-event",   dest="year_event",   type=int, default=None,
                        help="Historical year (integer)")
    parser.add_argument("--status",       dest="status",       default="scaffold",
                        help=f"One of: {', '.join(VALID_STATUSES)} (default: scaffold)")
    parser.add_argument("--release-date", dest="release_date", default=None,
                        help="YYYY-MM-DD")
    parser.add_argument("--subtitle-pl",  dest="subtitle_pl",  default=None)
    parser.add_argument("--subtitle-en",  dest="subtitle_en",  default=None)
    parser.add_argument("--summary-pl",   dest="summary_pl",   default=None)
    parser.add_argument("--summary-en",   dest="summary_en",   default=None)

    # YouTube IDs
    parser.add_argument("--yt-pl", dest="youtube_id_pl", default=None,
                        help="YouTube video ID for Polish upload")
    parser.add_argument("--yt-en", dest="youtube_id_en", default=None,
                        help="YouTube video ID for English upload")

    # Streaming URLs
    parser.add_argument("--spotify-url",       dest="spotify_url",       default=None)
    parser.add_argument("--apple-music-url",   dest="apple_music_url",   default=None)
    parser.add_argument("--amazon-url",        dest="amazon_url",        default=None)
    parser.add_argument("--youtube-music-url", dest="youtube_music_url", default=None)
    parser.add_argument("--itunes-url",        dest="itunes_url",        default=None)

    parser.add_argument(
        "--dry-run", action="store_true",
        help="Print what would be inserted without writing to the database",
    )

    return parser.parse_args()


def validate_args(args: argparse.Namespace) -> None:
    """
    Validate argument values that have constrained domains.

    Exits with a clear error message on any validation failure.
    Input: args — parsed argparse.Namespace.
    """
    if args.era is not None and args.era not in VALID_ERAS:
        print(
            f"Error: invalid era '{args.era}'.\n"
            f"Valid values: {', '.join(VALID_ERAS)}",
            file=sys.stderr,
        )
        sys.exit(1)

    if args.status not in VALID_STATUSES:
        print(
            f"Error: invalid status '{args.status}'.\n"
            f"Valid values: {', '.join(VALID_STATUSES)}",
            file=sys.stderr,
        )
        sys.exit(1)

    if args.release_date is not None:
        # Validate YYYY-MM-DD format without importing date (light validation)
        parts = args.release_date.split("-")
        if len(parts) != 3 or not all(p.isdigit() for p in parts):
            print(
                f"Error: invalid release-date '{args.release_date}', expected YYYY-MM-DD",
                file=sys.stderr,
            )
            sys.exit(1)


def print_song_summary(args: argparse.Namespace, dry: bool) -> None:
    """
    Print a formatted summary of the song being created.

    Input: args — parsed arguments, dry — whether this is a dry run.
    """
    dry_label = " [DRY RUN — nothing written to DB]" if dry else ""
    print(f"\n{'='*60}")
    print(f"  SONG ADDED{dry_label}")
    print(f"{'='*60}")
    print(f"  Slug:       {args.slug}")
    print(f"  Title PL:   {args.title_pl}")
    print(f"  Title EN:   {args.title_en}")
    print(f"  Status:     {args.status}")
    print(f"  Era:        {args.era or '—'}")
    print(f"  Year Event: {args.year_event or '—'}")
    print(f"  Album:      {args.album_slug or '—'}")
    print(f"  Release:    {args.release_date or '—'}")

    if args.youtube_id_pl or args.youtube_id_en:
        print(f"\n  YouTube PL: {args.youtube_id_pl or '—'}")
        print(f"  YouTube EN: {args.youtube_id_en or '—'}")

    # Only print streaming URLs section if at least one is provided
    streaming = {
        "Spotify":       args.spotify_url,
        "Apple Music":   args.apple_music_url,
        "Amazon Music":  args.amazon_url,
        "YouTube Music": args.youtube_music_url,
        "iTunes":        args.itunes_url,
    }
    if any(streaming.values()):
        print(f"\n{'-'*60}")
        print("  STREAMING URLS")
        print(f"{'-'*60}")
        for label, url in streaming.items():
            if url:
                print(f"  {label:<14} {url}")

    print(f"\n{'='*60}\n")


async def main() -> None:
    """Main entry point: validate inputs, check slug uniqueness, insert song."""
    args = parse_args()
    validate_args(args)

    if not DATABASE_URL:
        print("Error: DATABASE_URL not set and POSTGRES_* vars missing.", file=sys.stderr)
        sys.exit(1)

    # asyncpg does not accept the +asyncpg driver prefix — strip it
    db_url = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

    conn = await asyncpg.connect(db_url)
    try:
        # Guard: reject if slug already exists in songs table
        existing = await conn.fetchrow(
            "SELECT slug FROM songs WHERE slug = $1",
            args.slug,
        )
        if existing:
            print(
                f"Error: slug '{args.slug}' already exists in the database.",
                file=sys.stderr,
            )
            sys.exit(1)

        # Guard: verify album_slug exists if provided
        if args.album_slug:
            album = await conn.fetchrow(
                "SELECT slug FROM albums WHERE slug = $1",
                args.album_slug,
            )
            if not album:
                print(
                    f"Error: album_slug '{args.album_slug}' not found in the albums table.",
                    file=sys.stderr,
                )
                sys.exit(1)

        if args.dry_run:
            # Dry-run: skip DB write and show what would have been inserted
            print_song_summary(args, dry=True)
            return

        # Insert the new song row
        await conn.execute(
            """
            INSERT INTO songs (
                slug, title_pl, title_en, status,
                album_slug, era, year_event, release_date,
                subtitle_pl, subtitle_en, summary_pl, summary_en,
                youtube_id_pl, youtube_id_en,
                spotify_url, apple_music_url, amazon_url,
                youtube_music_url, itunes_url
            ) VALUES (
                $1,  $2,  $3,  $4,
                $5,  $6,  $7,  $8,
                $9,  $10, $11, $12,
                $13, $14,
                $15, $16, $17,
                $18, $19
            )
            """,
            args.slug, args.title_pl, args.title_en, args.status,
            args.album_slug, args.era, args.year_event, args.release_date,
            args.subtitle_pl, args.subtitle_en, args.summary_pl, args.summary_en,
            args.youtube_id_pl, args.youtube_id_en,
            args.spotify_url, args.apple_music_url, args.amazon_url,
            args.youtube_music_url, args.itunes_url,
        )

    finally:
        await conn.close()

    print_song_summary(args, dry=False)


if __name__ == "__main__":
    asyncio.run(main())
