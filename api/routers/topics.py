# routers/topics.py — Community topic endpoints
#
# Routes:
#   GET   /api/topics        — list all topics with vote counts
#   POST  /api/topics        — create new topic (rate limited: 5 submissions per IP per hour)
#   PATCH /api/topics/{id}   — update status or planned_release (admin)
#
# Inputs:  TopicCreate(title, description) | TopicUpdate(status, planned_release)
# Outputs: list[TopicOut] | TopicOut

from __future__ import annotations

import asyncio
import databases
import redis.asyncio as aioredis
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from routers.notifications import notify_topic_subscribers

# Injected by main.py lifespan
db: databases.Database | None = None
redis: aioredis.Redis | None = None

router = APIRouter(tags=["topics"])

# Rate limit: max topic submissions per IP per window
_TOPIC_RATE_LIMIT = 5
_TOPIC_RATE_WINDOW = 3600  # seconds (1 hour)


class TopicCreate(BaseModel):
    title:       str = Field(..., min_length=3, max_length=200)
    description: str | None = Field(None, max_length=1000)


class TopicOut(BaseModel):
    id:          int
    title:       str
    description: str | None
    status:      str
    vote_count:  int


class TopicUpdate(BaseModel):
    status:          str | None = None  # open, in_development, released
    planned_release: str | None = None  # free text e.g. "Jun 2026"


_VALID_TOPIC_STATUSES = {"open", "in_development", "released"}


@router.get("/topics", response_model=list[TopicOut])
async def list_topics():
    """Return all topics ordered by vote count descending."""
    rows = await db.fetch_all("""
        SELECT t.id, t.title, t.description, t.status,
               COUNT(v.id) AS vote_count
        FROM   topics t
        LEFT JOIN votes v ON v.topic_id = t.id
        GROUP  BY t.id
        ORDER  BY vote_count DESC, t.created_at DESC
    """)
    return [dict(r) for r in rows]


@router.post("/topics", response_model=TopicOut, status_code=201)
async def create_topic(body: TopicCreate, request: Request):
    """
    Create a new community topic suggestion.

    Rate limited to 5 submissions per IP per hour via Redis counter.
    Returns 429 if limit exceeded.
    """
    # Get client IP (X-Forwarded-For set by nginx)
    client_ip = request.headers.get("X-Forwarded-For", request.client.host).split(",")[0].strip()
    rate_key = f"topic_rate:{client_ip}"

    # Check and increment submission count for this IP
    count = await redis.incr(rate_key)
    if count == 1:
        # First submission in window — set expiry
        await redis.expire(rate_key, _TOPIC_RATE_WINDOW)
    if count > _TOPIC_RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"Too many topic submissions. Limit: {_TOPIC_RATE_LIMIT} per hour.",
        )

    row = await db.fetch_one(
        """
        INSERT INTO topics (title, description)
        VALUES (:title, :description)
        RETURNING id, title, description, status
        """,
        {"title": body.title, "description": body.description},
    )
    if not row:
        raise HTTPException(status_code=500, detail="Insert failed")
    return {**dict(row), "vote_count": 0}


@router.patch("/topics/{topic_id}", response_model=TopicOut)
async def update_topic(topic_id: int, body: TopicUpdate):
    """
    Update a topic's status or planned_release label (admin use).

    Only non-None fields are written. Returns updated topic with vote count.
    """
    if body.status is not None and body.status not in _VALID_TOPIC_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid status '{body.status}'. Valid: {sorted(_VALID_TOPIC_STATUSES)}",
        )

    # Check topic exists
    existing = await db.fetch_one(
        "SELECT id FROM topics WHERE id = :id",
        {"id": topic_id},
    )
    if not existing:
        raise HTTPException(status_code=404, detail=f"Topic {topic_id} not found")

    updates = body.model_dump(exclude_none=True)
    if not updates:
        # Nothing to change — return current row with vote count
        row = await db.fetch_one(
            """
            SELECT t.id, t.title, t.description, t.status,
                   COUNT(v.id) AS vote_count
            FROM   topics t
            LEFT JOIN votes v ON v.topic_id = t.id
            WHERE  t.id = :id
            GROUP  BY t.id
            """,
            {"id": topic_id},
        )
        return dict(row)

    set_clauses = ", ".join(f"{col} = :{col}" for col in updates)
    updates["id"] = topic_id

    await db.execute(
        f"UPDATE topics SET {set_clauses} WHERE id = :id",
        updates,
    )

    row = await db.fetch_one(
        """
        SELECT t.id, t.title, t.description, t.status,
               COUNT(v.id) AS vote_count
        FROM   topics t
        LEFT JOIN votes v ON v.topic_id = t.id
        WHERE  t.id = :id
        GROUP  BY t.id
        """,
        {"id": topic_id},
    )

    # Notify subscribers when status changes to in_development or released
    new_status = updates.get("status")
    if new_status in ("in_development", "released") and row:
        asyncio.create_task(
            notify_topic_subscribers(
                db=db,
                topic_id=topic_id,
                topic_title=row["title"],
                new_status=new_status,
            )
        )

    return dict(row)
