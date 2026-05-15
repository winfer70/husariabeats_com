# routers/release_queue.py — Release queue management endpoints
#
# Routes:
#   GET    /api/release_queue           — list all queue entries with song titles
#   POST   /api/release_queue           — add song to release queue
#   PATCH  /api/release_queue/{id}      — update scheduled_at, platforms, status, topic_id
#   DELETE /api/release_queue/{id}      — remove entry from queue
#   POST   /api/release_queue/trigger   — fire n8n release webhook immediately
#
# Inputs:  QueueEntryCreate, QueueEntryUpdate
# Outputs: list[QueueEntryOut] | QueueEntryOut

from __future__ import annotations

import os
from datetime import datetime as _dt

import databases
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

# Injected by main.py lifespan
db: databases.Database | None = None

router = APIRouter(tags=["release_queue"])

_VALID_STATUSES  = {"pending", "releasing", "released", "failed"}
_VALID_PLATFORMS = {"youtube", "facebook", "instagram", "tiktok", "youtube_short"}

# n8n webhook — use N8N_RELEASE_WEBHOOK_URL (set in .env), fallback to N8N_WEBHOOK_URL
_N8N_WEBHOOK_URL = os.getenv(
    "N8N_RELEASE_WEBHOOK_URL",
    os.getenv("N8N_WEBHOOK_URL", "http://ai_agent_n8n:5678/webhook/husariabeats-release"),
)


class QueueEntryOut(BaseModel):
    id:                     int
    song_slug:              str
    song_title_pl:          str
    song_title_en:          str
    scheduled_at:           str   # ISO datetime string
    platforms:              list[str]
    status:                 str
    topic_id:               int | None = None
    upload_post_request_id: str | None = None
    released_at:            str | None = None


class QueueEntryCreate(BaseModel):
    song_slug:    str = Field(..., min_length=1)
    # Accept YYYY-MM-DD or YYYY-MM-DDTHH:MM (datetime-local input format)
    scheduled_at: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$")
    platforms:    list[str] = Field(default=["youtube", "facebook", "instagram", "tiktok"])
    topic_id:     int | None = None


class QueueEntryUpdate(BaseModel):
    scheduled_at: str | None = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$")
    platforms:    list[str] | None = None
    status:       str | None = None
    topic_id:     int | None = None
    upload_post_request_id: str | None = None
    released_at:  str | None = None


class TriggerRequest(BaseModel):
    queue_id: int | None = None  # Target specific queue entry; None = auto-pick next pending
    lang:     str | None = None  # 'pl' | 'en' | None (both)


@router.post("/release_queue/trigger", status_code=200)
async def trigger_release(body: TriggerRequest = TriggerRequest()):
    """
    Fire the n8n release webhook immediately.

    Optional queue_id selects a specific entry; lang restricts to 'pl' or 'en'.
    Without either, n8n auto-picks the next pending entry and uploads both languages.

    Returns 502 if n8n is unreachable or returns a non-2xx response.
    """
    payload: dict = {"source": "admin"}
    if body.queue_id is not None:
        payload["queue_id"] = body.queue_id
    if body.lang is not None:
        payload["lang"] = body.lang
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(_N8N_WEBHOOK_URL, json=payload)
        if resp.status_code >= 400:
            raise HTTPException(
                status_code=502,
                detail=f"n8n webhook returned {resp.status_code}: {resp.text[:200]}",
            )
        return {"triggered": True, "n8n_status": resp.status_code}
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Could not reach n8n webhook: {exc}",
        )


@router.get("/release_queue", response_model=list[QueueEntryOut])
async def list_queue():
    """Return all release queue entries ordered by scheduled date ascending."""
    rows = await db.fetch_all("""
        SELECT rq.id,
               rq.song_id                      AS song_slug,
               s.title_pl                      AS song_title_pl,
               s.title_en                      AS song_title_en,
               rq.scheduled_at::text           AS scheduled_at,
               rq.platforms,
               rq.status,
               rq.topic_id,
               rq.upload_post_request_id,
               rq.released_at::text            AS released_at
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

    # Check for duplicate queue entry (same song, not yet released/failed)
    duplicate = await db.fetch_one(
        "SELECT id FROM release_queue WHERE song_id = :slug AND status NOT IN ('released','failed')",
        {"slug": body.song_slug},
    )
    if duplicate:
        raise HTTPException(
            status_code=409,
            detail=f"Song '{body.song_slug}' already in queue (id={duplicate['id']})",
        )

    row = await db.fetch_one(
        """
        INSERT INTO release_queue (song_id, scheduled_at, platforms, status, topic_id)
        VALUES (:song_id, :scheduled_at, :platforms, 'pending', :topic_id)
        RETURNING id, song_id AS song_slug, scheduled_at::text AS scheduled_at,
                  platforms, status, topic_id, upload_post_request_id, released_at::text AS released_at
        """,
        {
            "song_id":      body.song_slug,
            "scheduled_at": _dt.fromisoformat(body.scheduled_at),
            "platforms":    body.platforms,
            "topic_id":     body.topic_id,
        },
    )
    if not row:
        raise HTTPException(status_code=500, detail="Insert failed")

    # Update song status to 'queued' now that it's in the release queue
    await db.execute(
        "UPDATE songs SET status = 'queued' WHERE slug = :slug",
        {"slug": body.song_slug},
    )

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
    Update a queue entry's scheduled datetime, platforms, status, or topic linkage.

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
        updates["platforms"] = body.platforms
    if body.topic_id is not None:
        updates["topic_id"] = body.topic_id
    if body.upload_post_request_id is not None:
        updates["upload_post_request_id"] = body.upload_post_request_id
    if body.released_at is not None:
        updates["released_at"] = body.released_at

    if not updates:
        row = await db.fetch_one(
            """
            SELECT rq.id, rq.song_id AS song_slug, s.title_pl AS song_title_pl,
                   s.title_en AS song_title_en, rq.scheduled_at::text AS scheduled_at,
                   rq.platforms, rq.status, rq.topic_id, rq.upload_post_request_id,
                   rq.released_at::text AS released_at
            FROM   release_queue rq JOIN songs s ON s.slug = rq.song_id
            WHERE  rq.id = :id
            """,
            {"id": entry_id},
        )
        return _format_queue_row(dict(row))

    set_clauses = []
    params = {"id": entry_id}
    if "scheduled_at" in updates:
        set_clauses.append("scheduled_at = :scheduled_at")
        params["scheduled_at"] = _dt.fromisoformat(updates["scheduled_at"])
    if "status" in updates:
        set_clauses.append("status = :status")
        params["status"] = updates["status"]
    if "platforms" in updates:
        set_clauses.append("platforms = :platforms")
        params["platforms"] = updates["platforms"]
    if "topic_id" in updates:
        set_clauses.append("topic_id = :topic_id")
        params["topic_id"] = updates["topic_id"]
    if "upload_post_request_id" in updates:
        set_clauses.append("upload_post_request_id = :upload_post_request_id")
        params["upload_post_request_id"] = updates["upload_post_request_id"]
    if "released_at" in updates:
        set_clauses.append("released_at = :released_at::timestamptz")
        params["released_at"] = updates["released_at"]

    row = await db.fetch_one(
        f"""
        UPDATE release_queue
        SET    {", ".join(set_clauses)}
        WHERE  id = :id
        RETURNING id, song_id AS song_slug, scheduled_at::text AS scheduled_at,
                  platforms, status, topic_id, upload_post_request_id,
                  released_at::text AS released_at
        """,
        params,
    )
    if not row:
        raise HTTPException(status_code=500, detail="Update failed")

    result = _format_queue_row(dict(row))
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
    Remove an entry from the release queue and revert the song status to ready_to_release.

    Returns 404 if entry not found. Returns 204 No Content on success.
    """
    existing = await db.fetch_one(
        "SELECT id, song_id FROM release_queue WHERE id = :id",
        {"id": entry_id},
    )
    if not existing:
        raise HTTPException(status_code=404, detail=f"Queue entry {entry_id} not found")

    song_id = existing["song_id"]
    await db.execute(
        "DELETE FROM release_queue WHERE id = :id",
        {"id": entry_id},
    )
    # Revert song status so it surfaces again as ready to schedule
    await db.execute(
        "UPDATE songs SET status = 'ready_to_release' WHERE slug = :slug",
        {"slug": song_id},
    )


def _format_queue_row(row: dict) -> dict:
    """Normalize platforms from Postgres TEXT[] string to Python list."""
    platforms = row.get("platforms", [])
    if isinstance(platforms, str):
        platforms = platforms.strip("{}").split(",") if platforms != "{}" else []
    row["platforms"] = platforms
    return row
