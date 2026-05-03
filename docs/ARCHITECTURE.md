# HusariaBeats — Architecture Overview

Educational companion website for the Husaria Beats YouTube channel.
Bilingual (PL/EN), timeline-based, community voting, YouTube embeds, and fully automated release pipeline.

---

## System Overview

**husariabeats.com** documents Polish military history through music. Each song corresponds to a historical event; the site provides bilingual context (summary, long-form text, citations), links to YouTube videos (PL and EN language versions), and streaming platform links populated after DistroKid distribution.

Core features:
- **Timeline page** — chronologically ordered song cards with era filter, parallax scrolling, and in-place video expand
- **Albums page** — grid of albums with era/status filter; clicking an album shows all its songs sorted by `year_event`
- **Community voting** — users submit topic ideas and vote (SHA-256 email hash, Redis 24 h dedup, DB unique constraint)
- **Admin panel** — internal management of songs, albums, release queue, and settings
- **Release automation** — n8n cron uploads videos to YouTube, updates the DB, and triggers ISR revalidation

---

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | Next.js App Router (TypeScript) | 14 |
| i18n | next-intl (URL-based: `/pl/...`, `/en/...`) | — |
| Backend API | FastAPI + asyncpg + databases | Python 3.11 |
| Database | PostgreSQL | 16 |
| Cache / rate-limit | Redis | 7 |
| Containerisation | Docker Compose | — |
| Reverse proxy | nginx (host) + Cloudflare (Full strict TLS) | — |
| Release automation | n8n at `n8n.REDACTEDn8n.win` | — |
| Admin auth | Cloudflare Zero Trust Access | — |

---

## Service Topology

All services run inside a single Docker Compose project on the same host as ticker-tap.com.
The host-bound ports are `127.0.0.1` only; nginx terminates TLS and proxies inbound traffic.

```
Internet
  │
  ├─ husariabeats.com          (Cloudflare CDN → nginx → 127.0.0.1:3001)
  │    └─ /api/*               (nginx location → 127.0.0.1:8001)
  │
  └─ admin.husariabeats.com    (Cloudflare Access → nginx → 127.0.0.1:3002)

┌─────────────────────────────────────────────────────────────┐
│  Docker network: husariabeats_net                           │
│                                                             │
│  frontend  :3001  Next.js 14   ─┐                           │
│  api       :8001  FastAPI      ─┼─ db (PostgreSQL :5432)    │
│  admin     :3002  Next.js 14  ─┘ └─ redis (:6379)           │
└─────────────────────────────────────────────────────────────┘
```

### Service details

| Service | Image / Build | Host port | Notes |
|---|---|---|---|
| `frontend` | `./frontend` (Next.js build) | `127.0.0.1:3001` | ISR; uses `INTERNAL_API_URL` for server-side fetches |
| `api` | `./api` (FastAPI + uvicorn) | `127.0.0.1:8001` | Async; reads `DATABASE_URL` + `REDIS_URL` from `.env` |
| `admin` | `./admin` (Next.js build) | `127.0.0.1:3002` | Internal only; Cloudflare Access protects the domain |
| `db` | `postgres:16-alpine` | internal | Persistent volume `postgres_data`; schema bootstrapped from `db/init.sql` |
| `redis` | `redis:7-alpine` | internal | Vote dedup cache, 24 h TTL per email-hash/topic pair |

### Public URLs

| URL | Destination |
|---|---|
| `https://husariabeats.com` | Next.js frontend |
| `https://husariabeats.com/api/*` | FastAPI backend (nginx proxy_pass) |
| `https://husariabeats.com/api/docs` | FastAPI Swagger UI |
| `https://admin.husariabeats.com` | Next.js admin panel |

---

## Database Schema

Schema is bootstrapped from `db/init.sql` on first container start (PostgreSQL `docker-entrypoint-initdb.d`).
Migration SQL files in `db/` are applied manually against a running DB.

### `songs`

Tracks each song through its production lifecycle.

| Column | Type | Notes |
|---|---|---|
| `slug` | PK VARCHAR | URL-safe identifier |
| `title_pl` / `title_en` | VARCHAR | Bilingual display title |
| `status` | VARCHAR | `scaffold → audio_ready → sync_done → render_done → scheduled → released` |
| `album_slug` | VARCHAR | FK to `albums.slug` |
| `year_event` | INTEGER | Historical year (used for timeline sort order) |
| `era` | VARCHAR | `medieval / partitions / wwi / wwii / cold_war / modern` |
| `youtube_id_pl` / `youtube_id_en` | VARCHAR | YouTube video IDs per language |
| `spotify_url` / `apple_music_url` / `amazon_url` / `youtube_music_url` / `itunes_url` | TEXT | Streaming links; populated after DistroKid confirms distribution |
| `image_path` | TEXT | Cover image path |
| `subtitle_pl` / `subtitle_en` | VARCHAR | Short subtitle shown on cards |
| `summary_pl` / `summary_en` | TEXT | Medium-length summary |
| `long_text_pl` / `long_text_en` | TEXT | Full article body |
| `sources` | JSONB | Array of citation strings, default `[]` |
| `year_label` / `bg_hue` / `bg_label` | — | Timeline display helpers |
| `release_date` | TIMESTAMPTZ | When song was (or will be) released |
| `created_at` | TIMESTAMPTZ | Row creation time |

### `albums`

Album metadata. Planned albums show a countdown on the frontend.

| Column | Type | Notes |
|---|---|---|
| `slug` | PK VARCHAR | |
| `title` / `title_pl` / `title_en` | VARCHAR | `title` kept for backward compatibility |
| `tagline_pl` / `tagline_en` | VARCHAR | Short era descriptor on album card |
| `description` | TEXT | Long description |
| `era` | VARCHAR | Same enum as `songs.era` |
| `hue` | INTEGER | 0–360, drives cover art palette |
| `cover_label` | TEXT | Human-readable cover art description |
| `status` | VARCHAR | `planned → in_production → released` |
| `release_date` | TIMESTAMPTZ | |
| `cover_art` | TEXT | Image path |
| `youtube_playlist_id_pl` / `youtube_playlist_id_en` | VARCHAR | YouTube playlist IDs per language |

### `release_queue`

Scheduled release entries consumed by the n8n daily cron.

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `song_id` | VARCHAR | FK → `songs.slug` |
| `scheduled_at` | TIMESTAMPTZ | Target release time |
| `platforms` | TEXT[] | Default `{youtube,facebook,instagram,tiktok}` |
| `status` | VARCHAR | `queued → released \| skipped` |

### `settings`

Key-value store for runtime-configurable release cadence (no redeploy needed).

| Key | Default | Purpose |
|---|---|---|
| `release_min_gap_hours` | `24` | Minimum hours between consecutive releases |
| `release_daily_limit` | `1` | Maximum songs released per day |
| `auto_release_enabled` | `true` | Global kill switch for automation |

### `topics` + `votes`

Community voting. `votes.email_hash` stores SHA-256 of voter email (never raw). Redis enforces 24 h cooldown; DB `UNIQUE(topic_id, email_hash)` is the hard safety net.

---

## ISR Data Flow

Next.js 14 uses Incremental Static Regeneration (ISR) with `revalidate: 300` (5 minutes).

```
Browser
  │
  ▼
Next.js page (server component)
  │   fetch(`${INTERNAL_API_URL}/api/songs?status=released`, { next: { revalidate: 300 } })
  │   fetch(`${INTERNAL_API_URL}/api/albums`, { next: { revalidate: 300 } })
  ▼
FastAPI /api/*  →  PostgreSQL
  │
  └─ cached page served from Next.js ISR store for up to 300 s

On release:
  n8n → POST https://husariabeats.com/api/revalidate
           { secret: REVALIDATE_SECRET, paths: ["/pl", "/en", "/pl/albums/{slug}", ...] }
  Next.js revalidate route calls revalidatePath() → ISR cache flushed immediately
```

Server components use `INTERNAL_API_URL=http://api:8000` (Docker internal DNS) to bypass the public proxy. The browser always talks to `NEXT_PUBLIC_API_URL=https://husariabeats.com/api`.

The NavBar receives its `albums` data as a prop from the layout server component, which fetches albums once per layout render. The Timeline page passes `songs` to `TimelineClientPage`; the Albums page passes albums to `AlbumsClientPage` — both client components handle interactivity (filters, expand/collapse, era pills).

---

## Admin Panel

Hosted at `admin.husariabeats.com`, protected by Cloudflare Zero Trust Access (one-time code to `husariabeats@gmail.com`).

Build: separate Next.js container at `127.0.0.1:3002`. All API calls use `INTERNAL_API_URL=http://api:8000`.

Pages:
- **Songs** (`/songs`) — full table with inline-editable fields for all 16 song columns; expandable rows for rich text content; status lifecycle management
- **New Song** (`/songs/new`) — form to create a new song row
- **Release Queue** (`/queue`) — view and manage upcoming scheduled releases; set dates and platforms
- **Settings** (`/settings`) — edit `release_min_gap_hours`, `release_daily_limit`, `auto_release_enabled`
- **Voting** (`/voting`) — view community topics and vote counts

---

## Key Environment Variables

| Variable | Where used | Purpose |
|---|---|---|
| `POSTGRES_USER` | `api`, `db` | PostgreSQL credentials |
| `POSTGRES_PASSWORD` | `api`, `db` | PostgreSQL credentials |
| `POSTGRES_DB` | `api`, `db` | Database name (default: `husariabeats`) |
| `DATABASE_URL` | `api` | Full asyncpg connection string (constructed in compose) |
| `REDIS_URL` | `api` | Redis connection (default: `redis://redis:6379/0`) |
| `REVALIDATE_SECRET` | `frontend`, n8n | Shared secret for ISR revalidation endpoint |
| `INTERNAL_API_URL` | `frontend`, `admin` | Internal Docker URL: `http://api:8000` |
| `NEXT_PUBLIC_API_URL` | `frontend` (browser) | Public URL: `https://husariabeats.com/api` |
| `YOUTUBE_API_KEY` | n8n / `api/scripts/` | YouTube Data API v3 key for uploads |
| `SECRET_KEY` | `api` | Reserved for future auth / token signing |

All secrets are stored in `.env` (never committed). See `.env.example` for a template.

---

## Social Platform Roadmap

| Platform | API | Status |
|---|---|---|
| YouTube | Data API v3 (OAuth) | Live — uploads and metadata working |
| Facebook | Graph API | Pending Meta App Review (1–2 weeks) |
| Instagram | Graph API (via Facebook Page) | Pending — must link to FB Page |
| TikTok | Content Posting API | Blocked — audit requires demo video |
| Upload-Post | Third-party multi-platform API | Recommended fallback (~$9–19/mo) for TikTok + FB + IG |

n8n OAuth redirect URI: `https://REDACTEDn8n.win/rest/oauth2-credential/callback`
