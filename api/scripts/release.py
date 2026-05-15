#!/usr/bin/env python3
"""
api/scripts/release.py — HusariaBeats release management CLI.

Commands:
    import  <path>                   Import/update song from meta.json
    status  <slug> <new_status>      Update song status
    queue   <slug> [options]         Schedule a release
    trigger <slug>                   Release immediately (calls API + n8n webhook)
    list    [--status <status>]      List songs
    queue-list                       List release queue

Usage examples:
    python release.py import  /home/REDACTED420/projects/husariabeats_com/releases/zapomniani/meta.json
    python release.py status  zapomniani render_done
    python release.py queue   zapomniani --at "2026-06-01T10:00" --platforms youtube,instagram
    python release.py trigger zapomniani
    python release.py list    --status render_done
    python release.py queue-list
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import asyncpg
import httpx
from dotenv import load_dotenv

# Load .env from project root (two levels up from this script)
_SCRIPT_DIR  = Path(__file__).resolve().parent
_PROJECT_DIR = _SCRIPT_DIR.parent.parent
load_dotenv(_PROJECT_DIR / ".env")

DATABASE_URL           = os.environ.get("DATABASE_URL", "")
N8N_RELEASE_WEBHOOK    = os.environ.get("N8N_RELEASE_WEBHOOK_URL", "")
RELEASES_DIR           = Path(os.environ.get("RELEASES_DIR", str(_PROJECT_DIR / "releases")))
RELEASES_BASE_URL      = os.environ.get("RELEASES_BASE_URL", "https://husariabeats.com/releases")
ALL_PLATFORMS          = ["youtube", "facebook", "instagram", "tiktok"]
VALID_STATUSES         = {"scaffold", "audio_ready", "sync_done", "render_done", "scheduled", "released"}
VALID_ERAS             = {"medieval", "partitions", "wwi", "wwii", "cold_war", "modern"}


def _db_url() -> str:
    """Convert asyncpg URL to plain asyncpg format."""
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL not set in .env", file=sys.stderr)
        sys.exit(1)
    return DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── import ───────────────────────────────────────────────────────────────────

async def cmd_import(args: argparse.Namespace) -> None:
    """
    Import or update a song from a meta.json file.
    Creates/updates the DB row and sets status=render_done.

    Input: args.path — path to meta.json file.
    """
    path = Path(args.path).expanduser().resolve()
    if not path.exists():
        print(f"ERROR: {path} not found", file=sys.stderr)
        sys.exit(1)

    with open(path, encoding="utf-8") as f:
        meta: dict = json.load(f)

    slug = meta.get("slug")
    if not slug:
        print("ERROR: meta.json missing 'slug'", file=sys.stderr)
        sys.exit(1)
    if not meta.get("title", {}).get("pl"):
        print("ERROR: meta.json missing title.pl", file=sys.stderr)
        sys.exit(1)

    if meta.get("era") and meta["era"] not in VALID_ERAS:
        print(f"ERROR: invalid era '{meta['era']}'. Valid: {sorted(VALID_ERAS)}", file=sys.stderr)
        sys.exit(1)

    # Flatten meta.json into DB columns
    data: dict = {
        "slug":       slug,
        "title_pl":   meta["title"]["pl"],
        "title_en":   meta["title"].get("en", ""),
        "status":     "render_done",
    }
    if meta.get("era"):           data["era"]            = meta["era"]
    if meta.get("album_slug"):    data["album_slug"]     = meta["album_slug"]
    if meta.get("year_event"):    data["year_event"]     = meta["year_event"]
    if meta.get("year_label"):    data["year_label"]     = meta["year_label"]
    if meta.get("bg_hue") is not None: data["bg_hue"]   = meta["bg_hue"]
    if meta.get("bg_label"):      data["bg_label"]       = meta["bg_label"]
    if meta.get("sources"):       data["sources"]        = json.dumps(meta["sources"])
    if meta.get("subtitle"):
        data["subtitle_pl"] = meta["subtitle"].get("pl")
        data["subtitle_en"] = meta["subtitle"].get("en")
    if meta.get("summary"):
        data["summary_pl"]  = meta["summary"].get("pl")
        data["summary_en"]  = meta["summary"].get("en")
    if meta.get("long_text"):
        data["long_text_pl"] = meta["long_text"].get("pl")
        data["long_text_en"] = meta["long_text"].get("en")

    conn = await asyncpg.connect(_db_url())
    try:
        cols         = ", ".join(data.keys())
        placeholders = ", ".join(f"${i+1}" for i in range(len(data)))
        update_cols  = [k for k in data.keys() if k != "slug"]
        updates      = ", ".join(f"{c} = EXCLUDED.{c}" for c in update_cols)

        row = await conn.fetchrow(
            f"""
            INSERT INTO songs ({cols})
            VALUES ({placeholders})
            ON CONFLICT (slug) DO UPDATE SET {updates}
            RETURNING slug, title_pl, title_en, status, album_slug
            """,
            *data.values(),
        )
    finally:
        await conn.close()

    print(f"\n✓ Imported: {row['slug']}")
    print(f"  Title PL:  {row['title_pl']}")
    print(f"  Title EN:  {row['title_en']}")
    print(f"  Status:    {row['status']}")
    print(f"  Album:     {row['album_slug'] or '—'}")

    # Show expected file paths
    song_dir = RELEASES_DIR / slug
    vblock   = meta.get("video", {})
    print(f"\n  Expected files in {song_dir}:")
    for key in ("file_pl", "file_en", "thumbnail"):
        fname   = vblock.get(key, f"{slug}_{key.split('_')[-1]}.mp4")
        fpath   = song_dir / fname
        exists  = "✓" if fpath.exists() else "✗ MISSING"
        print(f"    {exists}  {fname}")
    print()


# ── status ───────────────────────────────────────────────────────────────────

async def cmd_status(args: argparse.Namespace) -> None:
    """
    Update a song's production status.

    Input: args.slug, args.new_status.
    """
    if args.new_status not in VALID_STATUSES:
        print(f"ERROR: invalid status '{args.new_status}'. Valid: {sorted(VALID_STATUSES)}", file=sys.stderr)
        sys.exit(1)

    conn = await asyncpg.connect(_db_url())
    try:
        row = await conn.fetchrow(
            "UPDATE songs SET status = $1 WHERE slug = $2 RETURNING slug, status",
            args.new_status, args.slug,
        )
    finally:
        await conn.close()

    if not row:
        print(f"ERROR: song '{args.slug}' not found", file=sys.stderr)
        sys.exit(1)

    print(f"✓ {row['slug']} → {row['status']}")


# ── queue ─────────────────────────────────────────────────────────────────────

async def cmd_queue(args: argparse.Namespace) -> None:
    """
    Schedule a song for release at a specific datetime.

    Input: args.slug, args.at (ISO datetime or YYYY-MM-DD), args.platforms.
    """
    platforms = [p.strip().lower() for p in (args.platforms or ",".join(ALL_PLATFORMS)).split(",") if p.strip()]
    invalid   = set(platforms) - set(ALL_PLATFORMS)
    if invalid:
        print(f"ERROR: invalid platforms: {invalid}", file=sys.stderr)
        sys.exit(1)

    # Parse datetime
    if args.at:
        dt_str = args.at.strip()
        # Try YYYY-MM-DDTHH:MM then YYYY-MM-DD
        for fmt in ("%Y-%m-%dT%H:%M", "%Y-%m-%d %H:%M", "%Y-%m-%d"):
            try:
                dt = datetime.strptime(dt_str, fmt)
                break
            except ValueError:
                continue
        else:
            print(f"ERROR: invalid datetime '{args.at}'. Use YYYY-MM-DDTHH:MM or YYYY-MM-DD", file=sys.stderr)
            sys.exit(1)
    else:
        dt = datetime.now() + timedelta(days=1)
        dt = dt.replace(hour=10, minute=0, second=0, microsecond=0)

    conn = await asyncpg.connect(_db_url())
    try:
        song = await conn.fetchrow(
            "SELECT slug, title_pl, status FROM songs WHERE slug = $1",
            args.slug,
        )
        if not song:
            print(f"ERROR: song '{args.slug}' not found", file=sys.stderr)
            sys.exit(1)
        if song["status"] != "render_done":
            print(f"ERROR: song status is '{song['status']}' — must be render_done", file=sys.stderr)
            sys.exit(1)

        active = await conn.fetchrow(
            "SELECT id FROM release_queue WHERE song_id = $1 AND status IN ('pending','releasing')",
            args.slug,
        )
        if active:
            print(f"ERROR: song already in queue (id={active['id']})", file=sys.stderr)
            sys.exit(1)

        platforms_pg = "{" + ",".join(platforms) + "}"
        row = await conn.fetchrow(
            """
            INSERT INTO release_queue (song_id, scheduled_at, platforms, status)
            VALUES ($1, $2, $3, 'pending')
            RETURNING id, song_id, scheduled_at::text, status
            """,
            args.slug, dt, platforms_pg,
        )
        await conn.execute(
            "UPDATE songs SET status = 'scheduled' WHERE slug = $1",
            args.slug,
        )
    finally:
        await conn.close()

    print(f"\n✓ Scheduled: {args.slug}")
    print(f"  Queue ID:  {row['id']}")
    print(f"  At:        {row['scheduled_at']}")
    print(f"  Platforms: {', '.join(platforms)}")
    print()


# ── trigger ───────────────────────────────────────────────────────────────────

async def cmd_trigger(args: argparse.Namespace) -> None:
    """
    Release a song immediately: creates queue entry with scheduled_at=NOW, fires n8n webhook.

    Input: args.slug.
    """
    platforms    = ALL_PLATFORMS
    platforms_pg = "{" + ",".join(platforms) + "}"

    conn = await asyncpg.connect(_db_url())
    try:
        song = await conn.fetchrow(
            "SELECT slug, title_pl, status FROM songs WHERE slug = $1",
            args.slug,
        )
        if not song:
            print(f"ERROR: song '{args.slug}' not found", file=sys.stderr)
            sys.exit(1)
        if song["status"] != "render_done":
            print(f"ERROR: status is '{song['status']}' — must be render_done", file=sys.stderr)
            sys.exit(1)

        active = await conn.fetchrow(
            "SELECT id FROM release_queue WHERE song_id = $1 AND status IN ('pending','releasing')",
            args.slug,
        )
        if active:
            print(f"ERROR: song already in queue (id={active['id']})", file=sys.stderr)
            sys.exit(1)

        row = await conn.fetchrow(
            """
            INSERT INTO release_queue (song_id, scheduled_at, platforms, status)
            VALUES ($1, NOW(), $2, 'pending')
            RETURNING id, song_id, scheduled_at::text, status
            """,
            args.slug, platforms_pg,
        )
        await conn.execute(
            "UPDATE songs SET status = 'scheduled' WHERE slug = $1",
            args.slug,
        )
        queue_id = row["id"]
    finally:
        await conn.close()

    print(f"\n✓ Queue entry created: id={queue_id}")

    # Call n8n webhook
    if N8N_RELEASE_WEBHOOK:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                res = await client.post(N8N_RELEASE_WEBHOOK, json={"queue_id": queue_id})
            if res.status_code < 300:
                print(f"✓ n8n webhook triggered (HTTP {res.status_code})")
            else:
                print(f"✗ n8n webhook returned HTTP {res.status_code}", file=sys.stderr)
        except Exception as e:
            print(f"✗ n8n webhook failed: {e}", file=sys.stderr)
    else:
        print("  (N8N_RELEASE_WEBHOOK_URL not set — set it in .env to auto-trigger n8n)")
    print()


# ── list ──────────────────────────────────────────────────────────────────────

async def cmd_list(args: argparse.Namespace) -> None:
    """
    List songs, optionally filtered by status.

    Input: args.status (optional filter).
    """
    conn = await asyncpg.connect(_db_url())
    try:
        if args.status:
            if args.status not in VALID_STATUSES:
                print(f"ERROR: invalid status '{args.status}'. Valid: {sorted(VALID_STATUSES)}", file=sys.stderr)
                sys.exit(1)
            rows = await conn.fetch(
                "SELECT slug, title_pl, status, album_slug, era, year_label FROM songs WHERE status = $1 ORDER BY year_event ASC NULLS LAST",
                args.status,
            )
        else:
            rows = await conn.fetch(
                "SELECT slug, title_pl, status, album_slug, era, year_label FROM songs ORDER BY status, year_event ASC NULLS LAST",
            )
    finally:
        await conn.close()

    if not rows:
        print("No songs found.")
        return

    print(f"\n{'SLUG':<30} {'STATUS':<14} {'ALBUM':<20} {'ERA':<12} {'YEAR'}")
    print("-" * 90)
    for r in rows:
        print(f"{r['slug']:<30} {r['status']:<14} {(r['album_slug'] or '—'):<20} {(r['era'] or '—'):<12} {r['year_label'] or '—'}")
    print()


# ── queue-list ────────────────────────────────────────────────────────────────

async def cmd_queue_list(_args: argparse.Namespace) -> None:
    """List all entries in the release queue."""
    conn = await asyncpg.connect(_db_url())
    try:
        rows = await conn.fetch(
            """
            SELECT rq.id, rq.song_id, s.title_pl, rq.scheduled_at::text,
                   rq.platforms, rq.status, rq.released_at::text AS released_at
            FROM   release_queue rq
            JOIN   songs s ON s.slug = rq.song_id
            ORDER  BY rq.scheduled_at ASC
            """,
        )
    finally:
        await conn.close()

    if not rows:
        print("Release queue is empty.")
        return

    print(f"\n{'ID':<6} {'SLUG':<30} {'SCHEDULED AT':<22} {'STATUS':<12} {'PLATFORMS'}")
    print("-" * 100)
    for r in rows:
        platforms = r["platforms"]
        if isinstance(platforms, (list, tuple)):
            platforms = ",".join(platforms)
        elif isinstance(platforms, str):
            platforms = platforms.strip("{}")
        print(f"{r['id']:<6} {r['song_id']:<30} {str(r['scheduled_at']):<22} {r['status']:<12} {platforms}")
    print()


# ── CLI wiring ────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        prog="release.py",
        description="HusariaBeats release management CLI",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # import
    p_import = sub.add_parser("import", help="Import song from meta.json")
    p_import.add_argument("path", help="Path to meta.json file")

    # status
    p_status = sub.add_parser("status", help="Update song status")
    p_status.add_argument("slug", help="Song slug")
    p_status.add_argument("new_status", help=f"New status. Valid: {sorted(VALID_STATUSES)}")

    # queue
    p_queue = sub.add_parser("queue", help="Schedule a release")
    p_queue.add_argument("slug", help="Song slug (must be render_done)")
    p_queue.add_argument("--at", default=None, help="Datetime: YYYY-MM-DDTHH:MM or YYYY-MM-DD (default: tomorrow 10:00)")
    p_queue.add_argument("--platforms", default=None, help="Comma-separated platforms (default: all)")

    # trigger
    p_trigger = sub.add_parser("trigger", help="Release now (queue + fire n8n webhook)")
    p_trigger.add_argument("slug", help="Song slug (must be render_done)")

    # list
    p_list = sub.add_parser("list", help="List songs")
    p_list.add_argument("--status", default=None, help="Filter by status")

    # queue-list
    sub.add_parser("queue-list", help="List release queue")

    args = parser.parse_args()

    cmd_map = {
        "import":     cmd_import,
        "status":     cmd_status,
        "queue":      cmd_queue,
        "trigger":    cmd_trigger,
        "list":       cmd_list,
        "queue-list": cmd_queue_list,
    }
    asyncio.run(cmd_map[args.command](args))


if __name__ == "__main__":
    main()
