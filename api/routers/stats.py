# routers/stats.py — Platform statistics endpoints for HusariaBeats songs
#
# Routes:
#   GET  /api/stats/{slug}      — return platform_stats JSONB for one song
#   POST /api/stats/refresh-all — fetch YouTube Data API v3 stats for all
#                                 released songs and upsert platform_stats
#
# The refresh-all endpoint batches YouTube IDs into groups of 50 (API limit),
# fetches view/like/comment counts, then writes merged stats back to the DB.
#
# Environment variables consumed:
#   YOUTUBE_API_KEY — set via main.py lifespan from os.getenv

from __future__ import annotations

import json
from datetime import datetime, timezone

import databases
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# Injected by main.py lifespan before any request is handled
db: databases.Database | None = None
YOUTUBE_API_KEY: str = ""

router = APIRouter(tags=["stats"])

YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"
YT_BATCH_SIZE = 50  # YouTube Data API v3 maximum IDs per request


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class StatsOut(BaseModel):
    """Platform statistics for a single song."""
    slug: str
    platform_stats: dict


class RefreshResult(BaseModel):
    """Result summary after refreshing YouTube stats for all released songs."""
    updated: int
    skipped: int
    errors: list[str]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _fetch_yt_batch(ids: list[str], client: httpx.AsyncClient) -> dict[str, dict]:
    """
    Fetch YouTube video statistics for a batch of video IDs.

    Args:
        ids:    List of YouTube video IDs (max 50).
        client: Shared httpx.AsyncClient instance.

    Returns:
        Dict mapping video_id → {views, likes, comments} (int values).
        Missing/private videos are omitted from the result.
    """
    params = {
        "part": "statistics",
        "id": ",".join(ids),
        "key": YOUTUBE_API_KEY,
    }
    resp = await client.get(YOUTUBE_VIDEOS_URL, params=params, timeout=20.0)
    resp.raise_for_status()

    data = resp.json()
    result: dict[str, dict] = {}

    for item in data.get("items", []):
        vid_id = item.get("id")
        stats = item.get("statistics", {})
        result[vid_id] = {
            # YouTube returns string integers; cast to int with fallback 0
            "views":    int(stats.get("viewCount", 0)),
            "likes":    int(stats.get("likeCount", 0)),
            "comments": int(stats.get("commentCount", 0)),
        }

    return result


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/stats/{slug}", response_model=StatsOut)
async def get_stats(slug: str):
    """
    Return the stored platform_stats JSONB for a single song.

    Args:
        slug: Song slug (path param).

    Returns:
        StatsOut with slug and platform_stats dict.

    Raises:
        HTTPException 404 if the song slug does not exist.
    """
    row = await db.fetch_one(
        "SELECT slug, platform_stats FROM songs WHERE slug = :slug",
        {"slug": slug},
    )
    if not row:
        raise HTTPException(status_code=404, detail=f"Song '{slug}' not found")

    # platform_stats may be stored as a string (JSONB returned as str by databases)
    raw = row["platform_stats"]
    stats = json.loads(raw) if isinstance(raw, str) else (raw or {})

    return StatsOut(slug=row["slug"], platform_stats=stats)


@router.post("/stats/refresh-all", response_model=RefreshResult)
async def refresh_all_stats():
    """
    Fetch YouTube Data API v3 statistics for all released songs and upsert
    platform_stats in the database.

    Process:
      1. SELECT all released songs with youtube_id_pl / youtube_id_en.
      2. Collect non-null IDs, deduplicate, batch into groups of 50.
      3. For each batch call the YouTube videos.list API.
      4. Build per-song platform_stats merging PL and EN stats.
      5. UPDATE songs SET platform_stats = :stats WHERE slug = :slug.

    Returns:
        RefreshResult with counts of updated and skipped songs plus any
        per-song error strings.

    Raises:
        HTTPException 500 if the YouTube API key is not configured.
    """
    if not YOUTUBE_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="YOUTUBE_API_KEY is not configured",
        )

    # 1. Fetch all released songs with their YouTube IDs
    rows = await db.fetch_all(
        """
        SELECT slug, youtube_id_pl, youtube_id_en
        FROM songs
        WHERE status = 'released'
        """,
    )

    # 2. Collect unique non-null YouTube IDs and map them to slugs
    #    A single video ID may appear for both PL and EN (unlikely but safe).
    all_ids: list[str] = []
    seen: set[str] = set()
    for row in rows:
        for col in ("youtube_id_pl", "youtube_id_en"):
            vid = row[col]
            if vid and vid not in seen:
                all_ids.append(vid)
                seen.add(vid)

    # 3. Batch into groups of YT_BATCH_SIZE and call the API
    fetched_at = datetime.now(timezone.utc).isoformat()
    yt_stats: dict[str, dict] = {}
    errors: list[str] = []

    async with httpx.AsyncClient() as client:
        for batch_start in range(0, len(all_ids), YT_BATCH_SIZE):
            batch = all_ids[batch_start : batch_start + YT_BATCH_SIZE]
            try:
                batch_result = await _fetch_yt_batch(batch, client)
                yt_stats.update(batch_result)
            except Exception as exc:
                errors.append(f"Batch {batch_start}–{batch_start + len(batch)}: {exc}")

    # 4 & 5. Build platform_stats per song and write to DB
    updated = 0
    skipped = 0

    for row in rows:
        slug = row["slug"]
        id_pl = row["youtube_id_pl"]
        id_en = row["youtube_id_en"]

        # Skip songs with no YouTube IDs at all
        if not id_pl and not id_en:
            skipped += 1
            continue

        platform_stats: dict = {"fetched_at": fetched_at}

        if id_pl and id_pl in yt_stats:
            platform_stats["youtube_pl"] = yt_stats[id_pl]
        elif id_pl:
            # ID present but not returned by API (private/deleted)
            platform_stats["youtube_pl"] = {"views": 0, "likes": 0, "comments": 0}

        if id_en and id_en in yt_stats:
            platform_stats["youtube_en"] = yt_stats[id_en]
        elif id_en:
            platform_stats["youtube_en"] = {"views": 0, "likes": 0, "comments": 0}

        try:
            await db.execute(
                """
                UPDATE songs
                SET platform_stats = CAST(:stats AS jsonb)
                WHERE slug = :slug
                """,
                {"stats": json.dumps(platform_stats), "slug": slug},
            )
            updated += 1
        except Exception as exc:
            errors.append(f"DB update failed for '{slug}': {exc}")

    return RefreshResult(updated=updated, skipped=skipped, errors=errors)
