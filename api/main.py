# husariabeats API — FastAPI entry point
#
# Mounts:
#   /api/topics  — GET list, POST create topic
#   /api/votes   — POST vote (Redis 24h dedup by hashed email)
#
# Environment variables (from .env via docker compose):
#   DATABASE_URL  — asyncpg connection string
#   REDIS_URL     — redis://redis:6379/0
#   SECRET_KEY    — for future auth / token signing

import os
from contextlib import asynccontextmanager

import databases
import redis.asyncio as aioredis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import topics, votes

DATABASE_URL = os.environ["DATABASE_URL"]
REDIS_URL    = os.environ.get("REDIS_URL", "redis://redis:6379/0")

database = databases.Database(DATABASE_URL)
redis_client: aioredis.Redis | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Connect to DB and Redis on startup; disconnect on shutdown."""
    global redis_client
    await database.connect()
    redis_client = await aioredis.from_url(REDIS_URL, decode_responses=True)

    # Inject shared resources into routers
    topics.db     = database
    votes.db      = database
    votes.redis   = redis_client

    yield

    await database.disconnect()
    await redis_client.aclose()


app = FastAPI(
    title="HusariaBeats API",
    version="0.1.0",
    docs_url="/api/docs",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://husariabeats.com", "http://localhost:3001"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(topics.router, prefix="/api")
app.include_router(votes.router,  prefix="/api")


@app.get("/api/health")
async def health():
    """Quick health check for nginx / uptime monitoring."""
    return {"status": "ok"}
