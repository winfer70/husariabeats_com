# routers/release_queue.py — Release queue management endpoints
#
# Routes:
#   GET    /api/release_queue        — list all queue entries with song titles
#   POST   /api/release_queue        — add song to release queue
#   PATCH  /api/release_queue/{id}   — update scheduled_at, platforms, or status
#   DELETE /api/release_queue/{id}   — remove entry from queue
#
# Inputs:  QueueEntryCreate, QueueEntryUpdate
# Outputs: list[QueueEntryOut] | QueueEntryOut

from __future__ import annotations

import databases
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

# Injected by main.py lifespan
db: databases.Database | None = None

router = APIRouter(tags=["release_queue"])

_VALID_STATUSES  = {"pending", "releasing", "released", "failed"}
_VALID_PLATFORMS = {"youtube", "facebook", "instagram", "tiktok"}


class QueueEntryOut(BaseModel):
    id:            int
    song_slug:     str
    song_title_pl: str
    song_title_en: str
    scheduled_at:  str   # ISO date string YYYY-MM-DD
    platforms:     list[str]
    status:        str


class QueueEntryCreate(BaseModel):
    song_slug:    str = Field(..., min_length=1)
    scheduled_at: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")  # YYYY-MM-DD
    platforms:    list[str] = Field(default=["youtube", "facebook", "instagram", "tiktok"])


class QueueEntryUpdate(BaseModel):
    scheduled_at: str | None = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    platforms:    list[str] | None = None
    status:       str | None = None


@router.get("/release_queue", response_model=list[QueueEntryOut])
async def list_queue():
    """Return all release queue entries ordered by scheduled date ascending."""
    rows = await db.fetch_all("""
        SELECT rq.id,
               rq.song_id    AS song_slug,
               s.title_pl    AS song_title_pl,
               s.title_en    AS song_title_en,
               rq.scheduled_at::text AS scheduled_at,
               rq.platforms,
               rq.status
        FROM   release_queue rq
        JOIN   songs s ON s.slug = rq.song_id
        ORDER  BY rq.scheduled_at ASC
    """)
    result = []
    for r in rows:
        row = dict(r)
        # platforms is stored as TEXT[] — convert from postgres array string if needed
        platforms = row["platforms"]
        if isinstance(platforms, str):
            # e.g. '{youtube,facebook}' → ['youtube', 'facebook']
            platforms = platforms.strip("{}").split(",") if platforms != "{}" else []
        row["platforms"] = platforms
        result.append(row)
    return result


@router.post("/release_queue", response_model=QueueEntryOut, status_code=201)
async def add_to_queue(body: QueueEntryCreate):
    """
    Add a song to the release queue.

    Returns 404 if song_slug not found.
    Returns 409 if the same song is already queued.
    Validates platforms against allowed set.
    """
    # Validate platforms
    invalid = set(body.platforms) - _VALID_PLATFORMS
    if invalid:
        raise HTTPException(status_code=422, detail=f"Invalid platforms: {invalid}")

    # Check song exists
    song = await db.fetch_one(
        "SELECT slug, title_pl, title_en FROM songs WHERE slug = :slug",
        {"slug": body.song_slug},
    )
    if not song:
        raise HTTPException(status_code=404, detail=f"Song '{body.song_slug}' not found")

    # Check for duplicate queue entry (same song)
    duplicate = await db.fetch_one(
        "SELECT id FROM release_queue WHERE song_id = :slug AND status != 'released'",
        {"slug": body.song_slug},
    )
    if duplicate:
        raise HTTPException(
            status_code=409,
            detail=f"Song '{body.song_slug}' already in queue (id={duplicate['id']})",
        )

    # Convert platforms list to Postgres array literal
    platforms_pg = "{" + ",".join(body.platforms) + "}"

    row = await db.fetch_one(
        """
        INSERT INTO release_queue (song_id, scheduled_at, platforms, status)
        VALUES (:song_id, :scheduled_at::date, :platforms, 'pending')
        RETURNING id, song_id AS song_slug, scheduled_at::text AS scheduled_at, platforms, status
        """,
        {
            "song_id":      body.song_slug,
            "scheduled_at": body.scheduled_at,
            "platforms":    platforms_pg,
        },
    )
    if not row:
        raise HTTPException(status_code=500, detail="Insert failed")

    result = dict(row)
    platforms = result["platforms"]
    if isinstance(platforms, str):
        platforms = platforms.strip("{}").split(",") if platforms != "{}" else []
    result["platforms"] = platforms
    result["song_title_pl"] = song["title_pl"]
    result["song_title_en"] = song["title_en"]
    return result


@router.patch("/release_queue/{entry_id}", response_model=QueueEntryOut)
async def update_queue_entry(entry_id: int, body: QueueEntryUpdate):
    """
    Update a queue entry's scheduled date, platforms, or status.

    Only non-None fields are written.
    Returns 404 if entry not found.
    """
    if body.status is not None and body.status not in _VALID_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid status '{body.status}'. Valid: {sorted(_VALID_STATUSES)}",
        )
    if body.platforms is not None:
        invalid = set(body.platforms) - _VALID_PLATFORMS
        if invalid:
            raise HTTPException(status_code=422, detail=f"Invalid platforms: {invalid}")

    # Check entry exists
    existing = await db.fetch_one(
        "SELECT id FROM release_queue WHERE id = :id",
        {"id": entry_id},
    )
    if not existing:
        raise HTTPException(status_code=404, detail=f"Queue entry {entry_id} not found")

    updates = {}
    if body.scheduled_at is not None:
        updates["scheduled_at"] = body.scheduled_at
    if body.status is not None:
        updates["status"] = body.status
    if body.platforms is not None:
        updates["platforms"] = "{" + ",".join(body.platforms) + "}"

    if not updates:
        # Nothing to update — return current row
        row = await db.fetch_one(
            """
            SELECT rq.id, rq.song_id AS song_slug, s.title_pl AS song_title_pl,
                   s.title_en AS song_title_en, rq.scheduled_at::text AS scheduled_at,
                   rq.platforms, rq.status
            FROM   release_queue rq JOIN songs s ON s.slug = rq.song_id
            WHERE  rq.id = :id
            """,
            {"id": entry_id},
        )
        return _format_queue_row(dict(row))

    set_clauses = []
    params = {"id": entry_id}
    if "scheduled_at" in updates:
        set_clauses.append("scheduled_at = :scheduled_at::date")
        params["scheduled_at"] = updates["scheduled_at"]
    if "status" in updates:
        set_clauses.append("status = :status")
        params["status"] = updates["status"]
    if "platforms" in updates:
        set_clauses.append("platforms = :platforms")
        params["platforms"] = updates["platforms"]

    row = await db.fetch_one(
        f"""
        UPDATE release_queue
        SET    {", ".join(set_clauses)}
        WHERE  id = :id
        RETURNING id, song_id AS song_slug, scheduled_at::text AS scheduled_at, platforms, status
        """,
        params,
    )
    if not row:
        raise HTTPException(status_code=500, detail="Update failed")

    result = _format_queue_row(dict(row))
    # Fetch song titles separately since RETURNING doesn't JOIN
    song = await db.fetch_one(
        "SELECT title_pl, title_en FROM songs WHERE slug = :slug",
        {"slug": result["song_slug"]},
    )
    result["song_title_pl"] = song["title_pl"]
    result["song_title_en"] = song["title_en"]
    return result


@router.delete("/release_queue/{entry_id}", status_code=204)
async def delete_queue_entry(entry_id: int):
    """
    Remove an entry from the release queue.

    Returns 404 if entry not found. Returns 204 No Content on success.
    """
    existing = await db.fetch_one(
        "SELECT id FROM release_queue WHERE id = :id",
        {"id": entry_id},
    )
    if not existing:
        raise HTTPException(status_code=404, detail=f"Queue entry {entry_id} not found")

    await db.execute(
        "DELETE FROM release_queue WHERE id = :id",
        {"id": entry_id},
    )


def _format_queue_row(row: dict) -> dict:
    """Normalize platforms from Postgres TEXT[] string to Python list."""
    platforms = row.get("platforms", [])
    if isinstance(platforms, str):
        platforms = platforms.strip("{}").split(",") if platforms != "{}" else []
    row["platforms"] = platforms
    return row
