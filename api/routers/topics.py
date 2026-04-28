# routers/topics.py — Community topic endpoints
#
# Routes:
#   GET  /api/topics        — list all topics with vote counts
#   POST /api/topics        — create new topic (title, description)
#
# Inputs:  TopicCreate(title: str, description: str | None)
# Outputs: list[TopicOut] | TopicOut

from __future__ import annotations

import databases
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

# Injected by main.py lifespan
db: databases.Database | None = None

router = APIRouter(tags=["topics"])


class TopicCreate(BaseModel):
    title:       str = Field(..., max_length=200)
    description: str | None = None


class TopicOut(BaseModel):
    id:          int
    title:       str
    description: str | None
    status:      str
    vote_count:  int


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
async def create_topic(body: TopicCreate):
    """Create a new community topic suggestion."""
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
