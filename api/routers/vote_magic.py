# routers/vote_magic.py — Magic link email verification for vote subscriptions.
#
# Routes:
#   GET /api/vote_magic/verify?token=xxx
#       — verifies token from Redis, creates vote_subscription row,
#         redirects to /pl/next?subscribed=1 or /en/next?subscribed=1
#
# Internal helper (called by votes.py after successful vote):
#   send_magic_link(email, topic_id, topic_title) — generates token, sends email
#
# Token storage: Redis key "magic_token:{token}" → JSON, TTL 900s
# Inputs:  GET ?token=str
# Outputs: RedirectResponse or JSONResponse

import asyncio
import hashlib
import json
import os
import secrets

import databases
import redis.asyncio as aioredis
import resend
from fastapi import APIRouter, Query
from fastapi.responses import RedirectResponse, JSONResponse

from email_templates import magic_link_email

# Injected by main.py lifespan
db:    databases.Database | None = None
redis: aioredis.Redis     | None = None

router = APIRouter(tags=["vote_magic"])

MAGIC_TOKEN_TTL   = 900   # 15 minutes
MAGIC_LINK_BASE   = os.environ.get("MAGIC_LINK_BASE_URL", "https://husariabeats.com")
EMAIL_FROM        = os.environ.get("EMAIL_FROM", "onboarding@resend.dev")
EMAIL_FROM_NAME   = os.environ.get("EMAIL_FROM_NAME", "HusariaBeats")

resend.api_key = os.environ.get("RESEND_API_KEY", "")


async def send_magic_link(email: str, topic_id: int, topic_title: str) -> None:
    """
    Generate a magic link token, store in Redis, and send confirmation email.
    Called fire-and-forget from votes.py — exceptions are caught and logged, never raised.

    Args:
        email:       subscriber's email address
        topic_id:    ID of the topic being voted on
        topic_title: human-readable topic title used in the email body
    """
    try:
        # Generate a cryptographically secure random token
        token = secrets.token_urlsafe(32)
        payload = json.dumps({"topic_id": topic_id, "email": email})

        # Store token payload in Redis with TTL; key format: "magic_token:{token}"
        await redis.setex(f"magic_token:{token}", MAGIC_TOKEN_TTL, payload)

        magic_url = f"{MAGIC_LINK_BASE}/api/vote_magic/verify?token={token}"

        # Build HTML email via template helper (returns {"subject": ..., "html": ...})
        tpl = magic_link_email(topic_title, magic_url)

        # Resend SDK is synchronous — run in thread to not block event loop
        await asyncio.to_thread(
            resend.Emails.send,
            {
                "from": f"{EMAIL_FROM_NAME} <{EMAIL_FROM}>",
                "to": [email],
                "subject": tpl["subject"],
                "html": tpl["html"],
            }
        )
    except Exception as exc:
        # Email failure must NOT break the vote flow
        print(f"[vote_magic] send_magic_link failed: {exc}")


@router.get("/vote_magic/verify")
async def verify_magic_link(token: str = Query(...)):
    """
    Verify a magic link token from email.
    On success: creates vote_subscription row, deletes token, redirects to /pl/next?subscribed=1
    On failure: redirects to /pl/next?subscribed=0

    Args:
        token: URL-safe token from the magic link query string
    Returns:
        RedirectResponse to /pl/next with subscribed=1 (success) or subscribed=0 (failure)
    """
    # Look up token in Redis; missing or expired → failure redirect
    raw = await redis.get(f"magic_token:{token}")
    if not raw:
        return RedirectResponse(url=f"{MAGIC_LINK_BASE}/pl/next?subscribed=0", status_code=302)

    data     = json.loads(raw)
    topic_id = data["topic_id"]
    email    = data["email"]

    # Hash email for storage — raw email is also kept for sending future notifications
    email_hash = hashlib.sha256(email.strip().lower().encode()).hexdigest()

    # Insert subscription row; ON CONFLICT ensures idempotency for repeated clicks
    await db.execute(
        """
        INSERT INTO vote_subscriptions (topic_id, email_hash, email_raw)
        VALUES (:topic_id, :email_hash, :email_raw)
        ON CONFLICT (topic_id, email_hash) DO NOTHING
        """,
        {"topic_id": topic_id, "email_hash": email_hash, "email_raw": email},
    )

    # Consume token — one-time use only
    await redis.delete(f"magic_token:{token}")

    return RedirectResponse(url=f"{MAGIC_LINK_BASE}/pl/next?subscribed=1", status_code=302)
