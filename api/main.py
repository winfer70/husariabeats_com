# husariabeats API — FastAPI entry point
#
# Mounts:
#   /api/topics        — GET list, POST create, PATCH update topic
#   /api/votes         — POST vote (Redis 24h dedup by hashed email)
#   /api/songs         — GET list, PATCH update song
#   /api/release_queue — GET/POST/PATCH/DELETE release queue
#   /api/settings      — GET all settings, PUT upsert setting
#   /api/vote_magic    — GET verify magic link token → creates vote subscription
#   /api/stats         — GET platform_stats for one song; POST refresh-all from YouTube
#   /api/figures       — CRUD for historical_figures (ZAPOMNIANI album heroes)
#
# Environment variables (from .env via docker compose):
#   DATABASE_URL      — asyncpg connection string
#   REDIS_URL         — redis://redis:6379/0
#   SECRET_KEY        — for future auth / token signing
#   YOUTUBE_API_KEY   — YouTube Data API v3 key for stats refresh

import os
from contextlib import asynccontextmanager

import databases
import redis.asyncio as aioredis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import topics, votes, songs, release_queue, settings, albums, vote_magic, release, upload, stats, historical_figures

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
    topics.db        = database
    topics.redis     = redis_client
    votes.db         = database
    votes.redis      = redis_client
    songs.db              = database
    songs.RELEASES_DIR    = os.getenv("RELEASES_DIR", "")
    songs.YT_CLIENT_ID    = os.getenv("YOUTUBE_CLIENT_ID", "")
    songs.YT_CLIENT_SECRET = os.getenv("YOUTUBE_CLIENT_SECRET", "")
    songs.YT_REFRESH_TOKEN = os.getenv("YOUTUBE_REFRESH_TOKEN", "")
    release_queue.db = database
    settings.db      = database
    albums.db        = database
    vote_magic.db    = database
    vote_magic.redis = redis_client
    release.db       = database
    upload.db        = database
    stats.db              = database
    stats.YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")
    historical_figures.db = database

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
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE"],
    allow_headers=["*"],
)

app.include_router(topics.router,        prefix="/api")
app.include_router(votes.router,         prefix="/api")
app.include_router(songs.router,         prefix="/api")
app.include_router(release_queue.router, prefix="/api")
app.include_router(settings.router,      prefix="/api")
app.include_router(albums.router,        prefix="/api")
app.include_router(vote_magic.router,    prefix="/api")
app.include_router(release.router,       prefix="/api")
app.include_router(upload.router,        prefix="/api")
app.include_router(stats.router,             prefix="/api")
app.include_router(historical_figures.router, prefix="/api")


@app.get("/api/health")
async def health():
    """Quick health check for nginx / uptime monitoring."""
    return {"status": "ok"}
