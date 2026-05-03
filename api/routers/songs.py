# routers/songs.py — Song management endpoints
#
# Routes:
#   GET   /api/songs          — list all songs, optional ?album_slug= filter
#   POST  /api/songs          — create a new song
#   PATCH /api/songs/{slug}   — update any song field (status, YouTube IDs, metadata,
#                               streaming URLs: spotify, apple_music, amazon, youtube_music, itunes,
#                               content: subtitle, summary, long_text, sources, year_label, bg_hue, bg_label)
#
# Inputs:  SongCreate (slug+title_pl+title_en required, rest optional)
#          SongUpdate (all fields optional)
# Outputs: list[SongOut] | SongOut

from __future__ import annotations

import json as _json

import databases
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, field_validator

# Injected by main.py lifespan
db: databases.Database | None = None

router = APIRouter(tags=["songs"])

_VALID_STATUSES = {"scaffold", "audio_ready", "sync_done", "render_done", "scheduled", "released"}
_VALID_ERAS     = {"medieval", "partitions", "wwi", "wwii", "cold_war", "modern"}

# Shared SELECT column list used by GET, POST, and PATCH RETURNING
_SELECT_COLS = """
    slug, title_pl, title_en, status, album_slug,
    year_event, era, image_path,
    youtube_id_pl, youtube_id_en,
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
