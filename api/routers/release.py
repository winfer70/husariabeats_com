# routers/release.py — Release management endpoints
#
# Routes:
#   GET  /api/release/ready           — songs with status=render_done (ready to schedule)
#   POST /api/songs/import            — upsert song from meta.json body
#   POST /api/release/trigger/{slug}  — create queue entry + fire n8n webhook immediately
#   POST /api/revalidate              — proxy on-demand ISR revalidation to Next.js frontend
#
# Environment variables used:
#   UPLOAD_POST_API_KEY      — upload-post.com API key
#   UPLOAD_POST_PROFILE      — upload-post.com profile name (user parameter)
#   RELEASES_BASE_URL        — public base URL for video files (e.g. https://husariabeats.com/releases)
#   N8N_RELEASE_WEBHOOK_URL  — n8n webhook URL for immediate trigger (optional)
#   REVALIDATE_SECRET        — shared secret for ISR revalidation
#   FRONTEND_INTERNAL_URL    — internal Docker URL for Next.js frontend (default: http://frontend:3001)
#
# Inputs:  MetaImport (meta.json body), slug path param, RevalidateRequest
# Outputs: list[SongOut] | SongOut | QueueTriggerOut | RevalidateOut

from __future__ import annotations

import json as _json
import os
from datetime import datetime, timezone

import httpx
import databases
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from routers.songs import SongOut, _SELECT_COLS as SONG_COLS

# Injected by main.py lifespan
db: databases.Database | None = None

router = APIRouter(tags=["release"])

_VALID_STATUSES  = {"scaffold", "audio_ready", "sync_done", "render_done", "ready_to_release", "released"}
_VALID_ERAS      = {"medieval", "partitions", "wwi", "wwii", "cold_war", "modern"}
_VALID_PLATFORMS = {"youtube", "facebook", "instagram", "tiktok", "youtube_short"}


# ── Pydantic models ───────────────────────────────────────────────────────────

class VideoBlock(BaseModel):
    file_pl:   str | None = None
    file_en:   str | None = None
    thumbnail: str | None = None


class YoutubePlatform(BaseModel):
    title_pl:       str | None = None
    title_en:       str | None = None
    description_pl: str | None = None
    description_en: str | None = None
    tags:           list[str] = []


class CaptionPlatform(BaseModel):
    caption_pl: str | None = None
    caption_en: str | None = None
    hashtags:   list[str] = []


class FacebookPlatform(BaseModel):
    caption_pl: str | None = None
    caption_en: str | None = None


class PlatformsBlock(BaseModel):
    youtube:   YoutubePlatform  | None = None
    instagram: CaptionPlatform  | None = None
    tiktok:    CaptionPlatform  | None = None
    facebook:  FacebookPlatform | None = None


class ReleaseConfig(BaseModel):
    default_platforms: list[str] = ["youtube", "facebook", "instagram", "tiktok"]
    distrokid_upc:     str | None = None
    spotify_uri:       str | None = None


class MetaImport(BaseModel):
    """
    Full meta.json structure for importing a rendered song.
    slug, title.pl, title.en are required; everything else is optional.
    """
    slug:       str
    era:        str | None = None
    album_slug: str | None = None

    title:    dict[str, str]        # {"pl": ..., "en": ...}
    subtitle: dict[str, str] | None = None
    summary:  dict[str, str] | None = None
    long_text: dict[str, str] | None = None
    sources:  list[str] = []

    year_event: int    | None = None
    year_label: str    | None = None
    bg_hue:     int    | None = None
    bg_label:   str    | None = None

    video:     VideoBlock     | None = None
    platforms: PlatformsBlock | None = None
    release:   ReleaseConfig  | None = None


class QueueTriggerOut(BaseModel):
    """Response from POST /api/release/trigger/{slug}."""
    queue_id:         int
    song_slug:        str
    scheduled_at:     str
    status:           str
    webhook_called:   bool
    webhook_error:    str | None = None


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _call_n8n_webhook(queue_id: int) -> tuple[bool, str | None]:
    """
    POST to n8n release webhook with queue_id.

    Returns (success: bool, error_message: str | None).
    Silently skips if N8N_RELEASE_WEBHOOK_URL is not configured.
    """
    url = os.environ.get("N8N_RELEASE_WEBHOOK_URL", "").strip()
    if not url:
        return False, "N8N_RELEASE_WEBHOOK_URL not configured"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.post(url, json={"queue_id": queue_id})
            if res.status_code < 300:
                return True, None
            return False, f"n8n returned HTTP {res.status_code}"
    except Exception as e:
        return False, str(e)


# ── Routes ────────────────────────────────────────────────────────────────────

class RevalidateRequest(BaseModel):
    paths: list[str]


class RevalidateOut(BaseModel):
    revalidated: bool
    paths:       list[str]


@router.post("/revalidate", response_model=RevalidateOut)
async def revalidate_frontend(body: RevalidateRequest):
    """
    Proxy on-demand ISR revalidation to the Next.js frontend.

    Forwards paths to the frontend's /api/revalidate endpoint using the
    shared REVALIDATE_SECRET. Called by the admin panel Sync button.

    Raises:
        HTTPException 502 if the frontend revalidate call fails.
    """
    frontend_url = os.environ.get("FRONTEND_INTERNAL_URL", "http://frontend:3001")
    secret       = os.environ.get("REVALIDATE_SECRET", "")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.post(
                f"{frontend_url}/api/revalidate",
                json={"secret": secret, "paths": body.paths},
            )
        if res.status_code >= 400:
            raise HTTPException(status_code=502, detail=f"Frontend revalidate failed: {res.text[:200]}")
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach frontend: {exc}")
    return RevalidateOut(revalidated=True, paths=body.paths)


@router.get("/release/ready", response_model=list[SongOut])
async def list_ready_songs():
    """
    Return all songs with status=render_done, ordered by year_event ASC.
    These are songs ready to be scheduled or released immediately.
    """
    rows = await db.fetch_all(
        f"""
        SELECT {SONG_COLS}
        FROM   songs
        WHERE  status = 'render_done'
        ORDER  BY year_event ASC NULLS LAST, slug ASC
        """,
    )
    result = []
    for r in rows:
        row = dict(r)
        if isinstance(row.get("sources"), str):
            row["sources"] = _json.loads(row["sources"])
        result.append(row)
    return result


@router.post("/songs/import", response_model=SongOut, status_code=201)
async def import_song(body: MetaImport):
    """
    Import or update a song from a meta.json payload.

    Upserts the song row: creates if slug doesn't exist, updates all provided
    fields if it does. Sets status to 'render_done' on import.

    Args:
        body: MetaImport — full meta.json structure.

    Returns:
        SongOut of the created/updated song.

    Raises:
        HTTPException 422 if era value is not recognised.
    """
    if body.era is not None and body.era not in _VALID_ERAS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid era '{body.era}'. Valid: {sorted(_VALID_ERAS)}",
        )

    # Flatten nested meta.json structure into DB columns
    data: dict = {
        "slug":     body.slug,
        "title_pl": body.title.get("pl", ""),
        "title_en": body.title.get("en", ""),
        "status":   "render_done",
    }
    if body.era:               data["era"]            = body.era
    if body.album_slug:        data["album_slug"]     = body.album_slug
    if body.year_event:        data["year_event"]     = body.year_event
    if body.year_label:        data["year_label"]     = body.year_label
    if body.bg_hue is not None: data["bg_hue"]        = body.bg_hue
    if body.bg_label:          data["bg_label"]       = body.bg_label
    if body.sources:           data["sources"]        = _json.dumps(body.sources)
    if body.subtitle:
        data["subtitle_pl"] = body.subtitle.get("pl")
        data["subtitle_en"] = body.subtitle.get("en")
    if body.summary:
        data["summary_pl"]  = body.summary.get("pl")
        data["summary_en"]  = body.summary.get("en")
    if body.long_text:
        data["long_text_pl"] = body.long_text.get("pl")
        data["long_text_en"] = body.long_text.get("en")

    # Upsert: insert new or update existing on slug conflict
    cols         = ", ".join(data.keys())
    placeholders = ", ".join(f":{k}" for k in data.keys())
    update_cols  = [k for k in data.keys() if k != "slug"]
    updates      = ", ".join(f"{c} = EXCLUDED.{c}" for c in update_cols)

    row = await db.fetch_one(
        f"""
        INSERT INTO songs ({cols})
        VALUES ({placeholders})
        ON CONFLICT (slug) DO UPDATE SET {updates}
        RETURNING {SONG_COLS}
        """,
        data,
    )
    if not row:
        raise HTTPException(status_code=500, detail="Upsert failed")

    result = dict(row)
    if isinstance(result.get("sources"), str):
        result["sources"] = _json.loads(result["sources"])
    return result


@router.post("/release/trigger/{slug}", response_model=QueueTriggerOut)
async def trigger_release(slug: str, platforms: list[str] | None = None):
    """
    Immediately queue a song for release and fire the n8n webhook.

    Creates a release_queue entry with scheduled_at=NOW() and calls the
    n8n webhook so the workflow starts immediately instead of waiting for cron.

    Args:
        slug:      Song slug — must have status=render_done.
        platforms: Optional override; defaults to all 4 platforms.

    Returns:
        QueueTriggerOut with queue_id and webhook call status.

    Raises:
        HTTPException 404 if song not found.
        HTTPException 422 if song status is not render_done.
        HTTPException 409 if an active queue entry already exists.
    """
    # Validate song exists and is ready to queue
    song = await db.fetch_one(
        "SELECT slug, status FROM songs WHERE slug = :slug",
        {"slug": slug},
    )
    if not song:
        raise HTTPException(status_code=404, detail=f"Song '{slug}' not found")
    if song["status"] not in {"render_done", "ready_to_release"}:
        raise HTTPException(
            status_code=422,
            detail=f"Song '{slug}' status is '{song['status']}' — must be render_done or ready_to_release",
        )

    # Block duplicate active queue entry
    active = await db.fetch_one(
        "SELECT id FROM release_queue WHERE song_id = :slug AND status IN ('pending','releasing')",
        {"slug": slug},
    )
    if active:
        raise HTTPException(
            status_code=409,
            detail=f"Song '{slug}' already has an active queue entry (id={active['id']})",
        )

    plats = platforms or ["youtube", "facebook", "instagram", "tiktok"]
    invalid = set(plats) - _VALID_PLATFORMS
    if invalid:
        raise HTTPException(status_code=422, detail=f"Invalid platforms: {invalid}")

    platforms_pg  = "{" + ",".join(plats) + "}"
    now           = datetime.now(timezone.utc).isoformat()

    # Create queue entry with scheduled_at = NOW
    row = await db.fetch_one(
        """
        INSERT INTO release_queue (song_id, scheduled_at, platforms, status)
        VALUES (:slug, NOW(), :platforms, 'pending')
        RETURNING id, song_id AS song_slug, scheduled_at::text, status
        """,
        {"slug": slug, "platforms": platforms_pg},
    )
    if not row:
        raise HTTPException(status_code=500, detail="Queue insert failed")

    # Update song status → queued
    await db.execute(
        "UPDATE songs SET status = 'queued' WHERE slug = :slug",
        {"slug": slug},
    )

    queue_id = row["id"]

    # Call n8n webhook — non-blocking failure (webhook may not be configured yet)
    webhook_ok, webhook_err = await _call_n8n_webhook(queue_id)

    return QueueTriggerOut(
        queue_id=queue_id,
        song_slug=slug,
        scheduled_at=str(row["scheduled_at"]),
        status="pending",
        webhook_called=webhook_ok,
        webhook_error=webhook_err,
    )
