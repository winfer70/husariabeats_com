# routers/songs.py — Song management endpoints
#
# Routes:
#   GET    /api/songs          — list all songs, optional ?album_slug= filter
#   POST   /api/songs          — create a new song
#   PATCH  /api/songs/{slug}   — update any song field (status, YouTube IDs, metadata,
#                                streaming URLs: spotify, apple_music, amazon, youtube_music, itunes,
#                                content: subtitle, summary, long_text, sources, year_label, bg_hue, bg_label)
#   DELETE /api/songs/{slug}   — delete a song; blocked while an active release is in progress
#
# Inputs:  SongCreate (slug+title_pl+title_en required, rest optional)
#          SongUpdate (all fields optional)
# Outputs: list[SongOut] | SongOut | 204 No Content

from __future__ import annotations

import json as _json
import os
from datetime import date as _date, datetime as _dt

import databases
import httpx as _httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, field_validator

# Injected by main.py lifespan
db: databases.Database | None = None

# Filesystem path to releases dir — injected by main.py
RELEASES_DIR: str = ""

# YouTube OAuth credentials — injected by main.py; endpoint returns 503 if unset
YT_CLIENT_ID:     str = ""
YT_CLIENT_SECRET: str = ""
YT_REFRESH_TOKEN: str = ""

router = APIRouter(tags=["songs"])

_VALID_STATUSES = {"scaffold", "audio_ready", "sync_done", "render_done", "ready_to_release", "queued", "released"}
_VALID_ERAS     = {"medieval", "partitions", "wwi", "wwii", "cold_war", "modern"}

# Shared SELECT column list used by GET, POST, and PATCH RETURNING
_SELECT_COLS = """
    slug, title_pl, title_en, status, album_slug,
    year_event, era, image_path,
    youtube_id_pl, youtube_id_en,
    youtube_short_pl, youtube_short_en,
    spotify_url, apple_music_url, amazon_url, youtube_music_url, itunes_url,
    release_date::text AS release_date,
    subtitle_pl, subtitle_en,
    summary_pl, summary_en,
    long_text_pl, long_text_en,
    sources, year_label, bg_hue, bg_label
"""


class SongOut(BaseModel):
    slug:              str
    title_pl:          str
    title_en:          str
    status:            str
    album_slug:        str | None
    year_event:        int | None
    era:               str | None
    image_path:        str | None
    youtube_id_pl:     str | None
    youtube_id_en:     str | None
    youtube_short_pl:  str | None
    youtube_short_en:  str | None
    spotify_url:       str | None
    apple_music_url:   str | None
    amazon_url:        str | None
    youtube_music_url: str | None
    itunes_url:        str | None
    release_date:      str | None  # ISO date string
    subtitle_pl:       str | None
    subtitle_en:       str | None
    summary_pl:        str | None
    summary_en:        str | None
    long_text_pl:      str | None
    long_text_en:      str | None
    sources:           list = []   # JSONB array; DB default is empty list
    year_label:        str | None
    bg_hue:            int | None
    bg_label:          str | None

    @field_validator("sources", mode="before")
    @classmethod
    def parse_sources(cls, v):
        """Coerce JSONB string to list — databases library returns JSONB as str."""
        if isinstance(v, str):
            return _json.loads(v)
        return v or []


class SongUpdate(BaseModel):
    status:            str | None = None
    title_pl:          str | None = None
    title_en:          str | None = None
    album_slug:        str | None = None
    year_event:        int | None = None
    era:               str | None = None
    image_path:        str | None = None
    youtube_id_pl:     str | None = None
    youtube_id_en:     str | None = None
    youtube_short_pl:  str | None = None
    youtube_short_en:  str | None = None
    spotify_url:       str | None = None
    apple_music_url:   str | None = None
    amazon_url:        str | None = None
    youtube_music_url: str | None = None
    itunes_url:        str | None = None
    release_date:      str | None = None  # YYYY-MM-DD or None to leave unchanged
    subtitle_pl:       str | None = None
    subtitle_en:       str | None = None
    summary_pl:        str | None = None
    summary_en:        str | None = None
    long_text_pl:      str | None = None
    long_text_en:      str | None = None
    sources:           list | None = None  # JSONB array; None means leave unchanged
    year_label:        str | None = None
    bg_hue:            str | None = None
    bg_label:          str | None = None


class SongCreate(SongUpdate):
    """All SongUpdate fields plus required identifiers for creating a new song."""

    slug:     str         # Unique identifier; 409 if already taken
    title_pl: str         # Polish title (required)
    title_en: str         # English title (required)


@router.get("/songs", response_model=list[SongOut])
async def list_songs(
    album_slug: str | None = Query(None, description="Filter songs by album slug"),
    status:     str | None = Query(None, description="Filter songs by status"),
    era:        str | None = Query(None, description="Filter songs by era"),
):
    """
    Return songs ordered by year_event ASC (nulls last), then slug.

    Args:
        album_slug: Optional — only return songs belonging to this album.
        status:     Optional — only return songs with this status value.
        era:        Optional — only return songs for this era.

    Returns:
        List of SongOut objects matching all supplied filters.
    """
    if status is not None and status not in _VALID_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid status '{status}'. Valid: {sorted(_VALID_STATUSES)}",
        )
    if era is not None and era not in _VALID_ERAS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid era '{era}'. Valid: {sorted(_VALID_ERAS)}",
        )

    conditions: list[str] = []
    params:     dict      = {}
    if album_slug is not None:
        conditions.append("album_slug = :album_slug")
        params["album_slug"] = album_slug
    if status is not None:
        conditions.append("status = :status")
        params["status"] = status
    if era is not None:
        conditions.append("era = :era")
        params["era"] = era

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    rows = await db.fetch_all(
        f"""
        SELECT {_SELECT_COLS}
        FROM   songs
        {where}
        ORDER  BY year_event ASC NULLS LAST, slug ASC
        """,
        params,
    )
    return [dict(r) for r in rows]


@router.post("/songs", response_model=SongOut, status_code=201)
async def create_song(body: SongCreate):
    """
    Create a new song record.

    Validates slug uniqueness and that era/status values are from the allowed sets.
    Status defaults to 'scaffold' when not supplied.

    Args:
        body: SongCreate payload — slug, title_pl, and title_en are required.

    Returns:
        SongOut of the newly created song.

    Raises:
        HTTPException 409 if a song with the given slug already exists.
        HTTPException 422 if status or era is not a recognised value.
    """
    if body.status is not None and body.status not in _VALID_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid status '{body.status}'. Valid: {sorted(_VALID_STATUSES)}",
        )
    if body.era is not None and body.era not in _VALID_ERAS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid era '{body.era}'. Valid: {sorted(_VALID_ERAS)}",
        )

    # Reject duplicate slug before attempting the INSERT
    existing = await db.fetch_one(
        "SELECT slug FROM songs WHERE slug = :slug",
        {"slug": body.slug},
    )
    if existing:
        raise HTTPException(status_code=409, detail=f"Song '{body.slug}' already exists")

    # Build INSERT dynamically; fall back to 'scaffold' status when omitted
    data = body.model_dump(exclude_none=True)
    if "status" not in data:
        data["status"] = "scaffold"

    cols         = ", ".join(data.keys())
    placeholders = ", ".join(f":{k}" for k in data.keys())

    row = await db.fetch_one(
        f"""
        INSERT INTO songs ({cols})
        VALUES      ({placeholders})
        RETURNING   {_SELECT_COLS}
        """,
        data,
    )
    if not row:
        raise HTTPException(status_code=500, detail="Insert failed")
    return dict(row)


@router.get("/songs/{slug}", response_model=SongOut)
async def get_song(slug: str):
    """
    Fetch a single song by its slug.

    Args:
        slug: URL path parameter identifying the song.

    Returns:
        SongOut of the matching song.

    Raises:
        HTTPException 404 if no song with the given slug exists.
    """
    row = await db.fetch_one(
        f"SELECT {_SELECT_COLS} FROM songs WHERE slug = :slug",
        {"slug": slug},
    )
    if not row:
        raise HTTPException(status_code=404, detail=f"Song '{slug}' not found")
    return dict(row)


@router.patch("/songs/{slug}", response_model=SongOut)
async def update_song(slug: str, body: SongUpdate):
    """
    Partially update a song record.

    Only non-None fields are written. Status and era must be valid values.

    Args:
        slug: URL path parameter identifying the song.
        body: SongUpdate payload; fields left as None are not touched.

    Returns:
        SongOut of the updated (or unchanged) song.

    Raises:
        HTTPException 404 if no song with the given slug exists.
        HTTPException 422 if status or era is not a recognised value.
    """
    if body.status is not None and body.status not in _VALID_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid status '{body.status}'. Valid: {sorted(_VALID_STATUSES)}",
        )
    if body.era is not None and body.era not in _VALID_ERAS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid era '{body.era}'. Valid: {sorted(_VALID_ERAS)}",
        )

    # Verify song exists before attempting any write
    existing = await db.fetch_one(
        "SELECT slug FROM songs WHERE slug = :slug",
        {"slug": slug},
    )
    if not existing:
        raise HTTPException(status_code=404, detail=f"Song '{slug}' not found")

    # Build dynamic SET clause from provided fields only
    updates = body.model_dump(exclude_none=True)
    if not updates:
        # Nothing to update — return current row unchanged
        row = await db.fetch_one(
            f"SELECT {_SELECT_COLS} FROM songs WHERE slug = :slug",
            {"slug": slug},
        )
        return dict(row)

    # asyncpg requires datetime objects for TIMESTAMPTZ columns, not strings
    if "release_date" in updates and isinstance(updates["release_date"], str):
        updates["release_date"] = _dt.fromisoformat(updates["release_date"])

    set_clauses  = ", ".join(f"{col} = :{col}" for col in updates)
    updates["slug"] = slug  # Bind the WHERE parameter last to avoid collision

    row = await db.fetch_one(
        f"""
        UPDATE songs
        SET    {set_clauses}
        WHERE  slug = :slug
        RETURNING {_SELECT_COLS}
        """,
        updates,
    )
    if not row:
        raise HTTPException(status_code=500, detail="Update failed")
    return dict(row)


@router.get("/songs/{slug}/files")
async def check_song_files(slug: str):
    """
    Check which release files exist on disk for a given song slug.

    Looks in RELEASES_DIR/{slug}/ for the five expected files:
      {slug}_pl.mp4, {slug}_en.mp4, {slug}-feed-pl.mp4,
      {slug}-feed-en.mp4, {slug}_thumb.jpg

    Returns a dict of bool flags plus a 'missing' list of key names.
    """
    if not RELEASES_DIR:
        raise HTTPException(status_code=503, detail="RELEASES_DIR not configured")
    base = os.path.join(RELEASES_DIR, slug)
    files = {
        "pl_mp4":      os.path.exists(os.path.join(base, f"{slug}_pl.mp4")),
        "en_mp4":      os.path.exists(os.path.join(base, f"{slug}_en.mp4")),
        "feed_pl_mp4": os.path.exists(os.path.join(base, f"{slug}-feed-pl.mp4")),
        "feed_en_mp4": os.path.exists(os.path.join(base, f"{slug}-feed-en.mp4")),
        "thumb":       os.path.exists(os.path.join(base, f"{slug}_thumb.jpg")),
    }
    missing = [k for k, v in files.items() if not v]
    return {**files, "missing": missing}


@router.post("/songs/{slug}/sync_youtube")
async def sync_youtube_description(slug: str):
    """
    Append streaming platform links to the YouTube video description(s) for a song.

    Requires YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN env vars.
    Updates both youtube_id_pl and youtube_id_en (whichever are set).
    Idempotent — replaces any existing streaming block before appending the new one.

    Returns {"synced": {"pl": bool, "en": bool}}.
    """
    if not YT_CLIENT_ID or not YT_REFRESH_TOKEN:
        raise HTTPException(status_code=503, detail="YouTube OAuth credentials not configured")

    row = await db.fetch_one(
        f"SELECT {_SELECT_COLS} FROM songs WHERE slug = :slug",
        {"slug": slug},
    )
    if not row:
        raise HTTPException(status_code=404, detail=f"Song '{slug}' not found")
    song = dict(row)

    if not song.get("youtube_id_pl") and not song.get("youtube_id_en"):
        raise HTTPException(status_code=422, detail="Song has no YouTube IDs set")

    # Build streaming links section (only populated URLs)
    streaming_lines = []
    if song.get("spotify_url"):       streaming_lines.append(f"Spotify: {song['spotify_url']}")
    if song.get("apple_music_url"):   streaming_lines.append(f"Apple Music: {song['apple_music_url']}")
    if song.get("amazon_url"):        streaming_lines.append(f"Amazon Music: {song['amazon_url']}")
    if song.get("youtube_music_url"): streaming_lines.append(f"YouTube Music: {song['youtube_music_url']}")
    if song.get("itunes_url"):        streaming_lines.append(f"iTunes: {song['itunes_url']}")

    if not streaming_lines:
        raise HTTPException(status_code=422, detail="No streaming URLs set on this song")

    _STREAMING_SEP = "\n─────────────────────\n🎵 SŁUCHAJ TUTAJ"
    streaming_block = _STREAMING_SEP + " / LISTEN HERE:\n" + "\n".join(streaming_lines)

    async with _httpx.AsyncClient() as client:
        # Exchange refresh token for access token
        token_resp = await client.post("https://oauth2.googleapis.com/token", data={
            "client_id":     YT_CLIENT_ID,
            "client_secret": YT_CLIENT_SECRET,
            "refresh_token": YT_REFRESH_TOKEN,
            "grant_type":    "refresh_token",
        })
        if token_resp.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"Token refresh failed: {token_resp.text[:200]}",
            )
        access_token = token_resp.json()["access_token"]
        auth = {"Authorization": f"Bearer {access_token}"}

        results: dict = {}
        for lang, yt_id in [("pl", song.get("youtube_id_pl")), ("en", song.get("youtube_id_en"))]:
            if not yt_id:
                results[lang] = False
                continue
            # Fetch current video snippet
            info = await client.get(
                f"https://www.googleapis.com/youtube/v3/videos?part=snippet&id={yt_id}",
                headers=auth,
            )
            items = info.json().get("items", []) if info.status_code == 200 else []
            if not items:
                results[lang] = False
                continue
            snippet = items[0]["snippet"]
            # Strip old streaming block (idempotent) then append fresh one
            base_desc = snippet.get("description", "")
            if _STREAMING_SEP in base_desc:
                base_desc = base_desc[:base_desc.index(_STREAMING_SEP)]
            snippet["description"] = base_desc.rstrip() + "\n\n" + streaming_block
            upd = await client.put(
                "https://www.googleapis.com/youtube/v3/videos?part=snippet",
                json={"id": yt_id, "snippet": snippet},
                headers=auth,
            )
            results[lang] = upd.status_code == 200

    return {"synced": results}


@router.delete("/songs/{slug}", status_code=204)
async def delete_song(slug: str):
    """
    Delete a song record by slug.

    Blocked while a release_queue entry for the song is in an active state
    (any status other than 'released' or 'failed'), to avoid deleting a song
    mid-release pipeline.  The ON DELETE CASCADE on release_queue.song_slug
    ensures any completed/failed queue rows are removed automatically.

    Args:
        slug: URL path parameter identifying the song to delete.

    Returns:
        204 No Content on success.

    Raises:
        HTTPException 404 if no song with the given slug exists.
        HTTPException 409 if the song has an active release_queue entry.
    """
    # Verify song exists
    existing = await db.fetch_one(
        "SELECT slug FROM songs WHERE slug = :slug",
        {"slug": slug},
    )
    if not existing:
        raise HTTPException(status_code=404, detail=f"Song '{slug}' not found")

    # Block deletion while an active release is in progress
    active_release = await db.fetch_one(
        """
        SELECT id FROM release_queue
        WHERE  song_slug = :slug
          AND  status NOT IN ('released', 'failed')
        LIMIT  1
        """,
        {"slug": slug},
    )
    if active_release:
        raise HTTPException(
            status_code=409,
            detail=f"Song '{slug}' has an active release in progress; cancel it first",
        )

    # Delete the song; FK ON DELETE CASCADE cleans up release_queue rows
    await db.execute(
        "DELETE FROM songs WHERE slug = :slug",
        {"slug": slug},
    )
