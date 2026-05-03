# routers/albums.py — Album management endpoints
#
# Routes:
#   GET   /api/albums          — list all albums, optional ?era= and ?status= filters
#   GET   /api/albums/{slug}   — fetch a single album by slug
#   POST  /api/albums          — create a new album (409 if slug exists)
#   PATCH /api/albums/{slug}   — update any album field (dynamic SET)
#
# Inputs:  AlbumCreate (slug required, rest optional; status defaults to 'planned')
#          AlbumUpdate (all fields optional, era and status validated)
# Outputs: list[AlbumOut] | AlbumOut

from __future__ import annotations

import databases
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

# Injected by main.py lifespan
db: databases.Database | None = None

router = APIRouter(tags=["albums"])

_VALID_ERAS     = {"medieval", "partitions", "wwi", "wwii", "cold_war", "modern"}
_VALID_STATUSES = {"planned", "in_production", "released"}

# Shared SELECT column list used by GET, POST, and PATCH RETURNING
_SELECT_COLS = """
    slug, title_pl, title_en, tagline_pl, tagline_en,
    era, hue, cover_label, status,
    release_date::text AS release_date,
    youtube_playlist_id_pl, youtube_playlist_id_en,
    (SELECT COUNT(*) FROM songs WHERE album_slug = albums.slug AND status != 'scaffold') AS songs_count
"""


class AlbumOut(BaseModel):
    slug:                   str
    title_pl:               str | None
    title_en:               str | None
    tagline_pl:             str | None
    tagline_en:             str | None
    era:                    str | None
    hue:                    int | None
    cover_label:            str | None
    status:                 str
    release_date:           str | None  # ISO date string
    youtube_playlist_id_pl: str | None
    youtube_playlist_id_en: str | None
    songs_count:            int


class AlbumUpdate(BaseModel):
    title_pl:               str | None = None
    title_en:               str | None = None
    tagline_pl:             str | None = None
    tagline_en:             str | None = None
    era:                    str | None = None
    hue:                    str | None = None
    cover_label:            str | None = None
    status:                 str | None = None
    release_date:           str | None = None  # YYYY-MM-DD or None to leave unchanged
    youtube_playlist_id_pl: str | None = None
    youtube_playlist_id_en: str | None = None


class AlbumCreate(AlbumUpdate):
    """All AlbumUpdate fields plus the required slug. Status defaults to 'planned'."""

    slug:   str           # Unique identifier; 409 if already taken
    status: str = "planned"  # Override AlbumUpdate's None default


@router.get("/albums", response_model=list[AlbumOut])
async def list_albums(
    era:    str | None = Query(None, description="Filter albums by era"),
    status: str | None = Query(None, description="Filter albums by status"),
):
    """
    Return albums ordered by release_date DESC (nulls last), then slug.

    Args:
        era:    Optional query param — only return albums for this era.
        status: Optional query param — only return albums with this status.

    Returns:
        List of AlbumOut objects matching the filters.

    Raises:
        HTTPException 422 if the era or status filter value is not recognised.
    """
    if era is not None and era not in _VALID_ERAS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid era '{era}'. Valid: {sorted(_VALID_ERAS)}",
        )
    if status is not None and status not in _VALID_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid status '{status}'. Valid: {sorted(_VALID_STATUSES)}",
        )

    # Build WHERE clause dynamically based on provided filters
    conditions: list[str] = []
    params:     dict      = {}
    if era is not None:
        conditions.append("era = :era")
        params["era"] = era
    if status is not None:
        conditions.append("status = :status")
        params["status"] = status

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    rows = await db.fetch_all(
        f"""
        SELECT {_SELECT_COLS}
        FROM   albums
        {where}
        ORDER  BY release_date DESC NULLS LAST, slug ASC
        """,
        params,
    )
    return [dict(r) for r in rows]


@router.get("/albums/{slug}", response_model=AlbumOut)
async def get_album(slug: str):
    """
    Fetch a single album by its slug.

    Args:
        slug: URL path parameter identifying the album.

    Returns:
        AlbumOut of the matching album.

    Raises:
        HTTPException 404 if no album with the given slug exists.
    """
    row = await db.fetch_one(
        f"SELECT {_SELECT_COLS} FROM albums WHERE slug = :slug",
        {"slug": slug},
    )
    if not row:
        raise HTTPException(status_code=404, detail=f"Album '{slug}' not found")
    return dict(row)


@router.post("/albums", response_model=AlbumOut, status_code=201)
async def create_album(body: AlbumCreate):
    """
    Create a new album record.

    Validates slug uniqueness, and that era/status values are from the allowed sets.
    Status defaults to 'planned' when not supplied.

    Args:
        body: AlbumCreate payload — slug is required; all other fields are optional.

    Returns:
        AlbumOut of the newly created album.

    Raises:
        HTTPException 409 if an album with the given slug already exists.
        HTTPException 422 if era or status is not a recognised value.
    """
    if body.era is not None and body.era not in _VALID_ERAS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid era '{body.era}'. Valid: {sorted(_VALID_ERAS)}",
        )
    # body.status always has a value ('planned' default), so validate unconditionally
    if body.status not in _VALID_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid status '{body.status}'. Valid: {sorted(_VALID_STATUSES)}",
        )

    # Reject duplicate slug before attempting the INSERT
    existing = await db.fetch_one(
        "SELECT slug FROM albums WHERE slug = :slug",
        {"slug": body.slug},
    )
    if existing:
        raise HTTPException(status_code=409, detail=f"Album '{body.slug}' already exists")

    # Build INSERT from all provided (non-None) fields
    data = body.model_dump(exclude_none=True)

    cols         = ", ".join(data.keys())
    placeholders = ", ".join(f":{k}" for k in data.keys())

    row = await db.fetch_one(
        f"""
        INSERT INTO albums ({cols})
        VALUES      ({placeholders})
        RETURNING   {_SELECT_COLS}
        """,
        data,
    )
    if not row:
        raise HTTPException(status_code=500, detail="Insert failed")
    return dict(row)


@router.patch("/albums/{slug}", response_model=AlbumOut)
async def update_album(slug: str, body: AlbumUpdate):
    """
    Partially update an album record.

    Only non-None fields are written. Era and status must be valid values.

    Args:
        slug: URL path parameter identifying the album.
        body: AlbumUpdate payload; fields left as None are not touched.

    Returns:
        AlbumOut of the updated (or unchanged) album.

    Raises:
        HTTPException 404 if no album with the given slug exists.
        HTTPException 422 if era or status is not a recognised value.
    """
    if body.era is not None and body.era not in _VALID_ERAS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid era '{body.era}'. Valid: {sorted(_VALID_ERAS)}",
        )
    if body.status is not None and body.status not in _VALID_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid status '{body.status}'. Valid: {sorted(_VALID_STATUSES)}",
        )

    # Verify album exists before attempting any write
    existing = await db.fetch_one(
        "SELECT slug FROM albums WHERE slug = :slug",
        {"slug": slug},
    )
    if not existing:
        raise HTTPException(status_code=404, detail=f"Album '{slug}' not found")

    # Build dynamic SET clause from provided fields only
    updates = body.model_dump(exclude_none=True)
    if not updates:
        # Nothing to update — return current row unchanged
        row = await db.fetch_one(
            f"SELECT {_SELECT_COLS} FROM albums WHERE slug = :slug",
            {"slug": slug},
        )
        return dict(row)

    set_clauses     = ", ".join(f"{col} = :{col}" for col in updates)
    updates["slug"] = slug  # Bind the WHERE parameter last to avoid collision

    row = await db.fetch_one(
        f"""
        UPDATE albums
        SET    {set_clauses}
        WHERE  slug = :slug
        RETURNING {_SELECT_COLS}
        """,
        updates,
    )
    if not row:
        raise HTTPException(status_code=500, detail="Update failed")
    return dict(row)
