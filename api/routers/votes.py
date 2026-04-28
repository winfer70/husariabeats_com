# routers/votes.py — Voting endpoint
#
# Route:
#   POST /api/votes  — cast upvote for a topic
#
# Dedup strategy:
#   - SHA-256 hash of voter email stored in `votes` table (UNIQUE constraint)
#   - Redis key  "vote:{email_hash}:{topic_id}"  with 86400s TTL
#   - Redis checked first (fast path); DB unique constraint is safety net
#
# Inputs:  VoteRequest(topic_id: int, email: str)
# Outputs: VoteResult(success: bool, vote_count: int)

from __future__ import annotations

import hashlib

import databases
import redis.asyncio as aioredis
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

# Injected by main.py lifespan
db:    databases.Database   | None = None
redis: aioredis.Redis       | None = None

router = APIRouter(tags=["votes"])

VOTE_TTL_SECONDS = 86_400  # 24 hours


class VoteRequest(BaseModel):
    topic_id: int
    email:    EmailStr


class VoteResult(BaseModel):
    success:    bool
    vote_count: int


@router.post("/votes", response_model=VoteResult)
async def cast_vote(body: VoteRequest):
    """
    Cast an upvote for a topic.
    Rate-limited to once per email per topic per 24h via Redis + DB unique constraint.
    """
    email_hash = hashlib.sha256(body.email.strip().lower().encode()).hexdigest()
    redis_key  = f"vote:{email_hash}:{body.topic_id}"

    # Fast dedup via Redis
    already_voted = await redis.exists(redis_key)
    if already_voted:
        raise HTTPException(status_code=429, detail="Already voted in the last 24 hours")

    # Verify topic exists
    topic = await db.fetch_one(
        "SELECT id FROM topics WHERE id = :id", {"id": body.topic_id}
    )
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    # Insert vote (DB unique constraint guards against race conditions)
    try:
        await db.execute(
            "INSERT INTO votes (topic_id, email_hash) VALUES (:topic_id, :email_hash)",
            {"topic_id": body.topic_id, "email_hash": email_hash},
        )
    except Exception:
        raise HTTPException(status_code=429, detail="Already voted for this topic")

    # Set Redis TTL after successful insert
    await redis.setex(redis_key, VOTE_TTL_SECONDS, "1")

    # Return updated vote count
    row = await db.fetch_one(
        "SELECT COUNT(*) AS cnt FROM votes WHERE topic_id = :id",
        {"id": body.topic_id},
    )
    return {"success": True, "vote_count": row["cnt"]}
