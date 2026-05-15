-- husariabeats — PostgreSQL schema bootstrap
-- Runs automatically on first container start via docker-entrypoint-initdb.d/
--
-- Tables:
--   songs         — song production tracking (status lifecycle)
--   albums        — album metadata and release tracking
--   release_queue — scheduled automated releases per platform
--   settings      — configurable release cadence (no redeploy needed)
--   topics        — community-suggested song/album ideas for voting
--   votes         — one vote per email hash per topic per 24h (Redis dedup)

-- ── Songs ────────────────────────────────────────────────────────────────────
-- Tracks each song through production lifecycle.
-- status: scaffold → audio_ready → sync_done → render_done → scheduled → released
CREATE TABLE IF NOT EXISTS songs (
    slug            VARCHAR(100)    PRIMARY KEY,
    title_pl        VARCHAR(200),
    title_en        VARCHAR(200),
    -- Production status lifecycle
    status          VARCHAR(50)     DEFAULT 'scaffold'
                    CHECK (status IN ('scaffold','audio_ready','sync_done','render_done','scheduled','queued','released')),
    album_slug      VARCHAR(100),
    year_event      INTEGER,
    -- Historical era classification
    era             VARCHAR(50)
                    CHECK (era IN ('medieval','partitions','wwi','wwii','cold_war','modern')),
    youtube_id_pl      VARCHAR(20),
    youtube_id_en      VARCHAR(20),
    -- Streaming platform links (populated after DistroKid distribution confirms)
    spotify_url        TEXT,
    apple_music_url    TEXT,
    amazon_url         TEXT,
    youtube_music_url  TEXT,
    itunes_url         TEXT,
    image_path         TEXT,
    -- Rich content fields (bilingual)
    subtitle_pl        VARCHAR(300),
    subtitle_en        VARCHAR(300),
    summary_pl         TEXT,
    summary_en         TEXT,
    long_text_pl       TEXT,
    long_text_en       TEXT,
    -- JSONB array of citation strings
    sources            JSONB           DEFAULT '[]'::jsonb,
    -- Timeline display fields
    year_label         VARCHAR(20),
    bg_hue             INTEGER,
    bg_label           TEXT,
    release_date       TIMESTAMPTZ,
    created_at         TIMESTAMPTZ     DEFAULT NOW()
);

-- ── Albums ───────────────────────────────────────────────────────────────────
-- Album metadata. Planned albums show countdown on frontend until released.
-- status: planned → in_production → released
CREATE TABLE IF NOT EXISTS albums (
    slug                    VARCHAR(100)    PRIMARY KEY,
    -- Legacy single-language title (kept for backward compat)
    title                   VARCHAR(200),
    -- Bilingual titles
    title_pl                VARCHAR(200),
    title_en                VARCHAR(200),
    -- Bilingual taglines (short era descriptor on album card)
    tagline_pl              VARCHAR(300),
    tagline_en              VARCHAR(300),
    description             TEXT,
    -- Historical era classification
    era                     VARCHAR(50)
                            CHECK (era IN ('medieval','partitions','wwi','wwii','cold_war','modern')),
    -- UI colour hue (0-360, drives cover art palette)
    hue                     INTEGER,
    -- Human-readable cover art description
    cover_label             TEXT,
    -- Album status lifecycle
    status                  VARCHAR(50)     DEFAULT 'planned'
                            CHECK (status IN ('planned','in_production','released')),
    release_date            TIMESTAMPTZ,
    cover_art               TEXT,
    -- YouTube playlist IDs (PL and EN language playlists)
    youtube_playlist_id_pl  VARCHAR(50),
    youtube_playlist_id_en  VARCHAR(50)
);

-- ── Release queue ─────────────────────────────────────────────────────────────
-- Scheduled release entries consumed by n8n daily cron.
-- status: pending → releasing → released | failed
CREATE TABLE IF NOT EXISTS release_queue (
    id              SERIAL          PRIMARY KEY,
    song_id         VARCHAR(100)    REFERENCES songs(slug) ON DELETE CASCADE,
    scheduled_at    TIMESTAMPTZ     NOT NULL,
    -- platforms to post to on this release
    platforms       TEXT[]          DEFAULT '{youtube,facebook,instagram,tiktok}',
    -- pending | releasing | released | failed
    status          VARCHAR(50)     DEFAULT 'pending'
                    CHECK (status IN ('pending','releasing','released','failed')),
    topic_id               INT          REFERENCES topics(id) ON DELETE SET NULL,
    upload_post_request_id VARCHAR(100),
    released_at            TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_release_queue_scheduled ON release_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_release_queue_status    ON release_queue(status);

-- ── Settings ─────────────────────────────────────────────────────────────────
-- Key-value store for configurable release cadence.
-- Values can be changed at runtime via admin panel — no redeploy needed.
CREATE TABLE IF NOT EXISTS settings (
    key             VARCHAR(100)    PRIMARY KEY,
    value           TEXT            NOT NULL
);

INSERT INTO settings (key, value) VALUES
    -- Minimum hours between consecutive automated releases
    ('release_min_gap_hours', '24'),
    -- Maximum songs that can be released per day
    ('release_daily_limit',   '1'),
    -- Global kill switch — set to 'false' to pause all automation
    ('auto_release_enabled',  'true')
ON CONFLICT (key) DO NOTHING;

-- ── Community voting: topics ──────────────────────────────────────────────────
-- Community-suggested ideas. planned_release set when assigned to an album.
-- status: open | in_development | released
CREATE TABLE IF NOT EXISTS topics (
    id              SERIAL          PRIMARY KEY,
    title           VARCHAR(200)    NOT NULL,
    description     TEXT,
    -- open | in_development | released
    status          VARCHAR(50)     DEFAULT 'open',
    -- Human-readable planned release label, e.g. "Jun 2026" (admin-set)
    planned_release VARCHAR(50),
    created_at      TIMESTAMPTZ     DEFAULT NOW()
);

-- ── Community voting: votes ───────────────────────────────────────────────────
-- One vote per email (SHA-256 hash) per topic. Redis handles 24h rate-limit;
-- DB unique constraint is the hard safety net.
CREATE TABLE IF NOT EXISTS votes (
    id              SERIAL          PRIMARY KEY,
    topic_id        INTEGER         REFERENCES topics(id) ON DELETE CASCADE,
    -- SHA-256 of voter email — never store raw email
    email_hash      VARCHAR(64)     NOT NULL,
    voted_at        TIMESTAMPTZ     DEFAULT NOW(),
    -- Hard constraint: one vote per email hash per topic
    UNIQUE (topic_id, email_hash)
);

CREATE INDEX IF NOT EXISTS idx_votes_topic      ON votes(topic_id);
CREATE INDEX IF NOT EXISTS idx_votes_email_hash ON votes(email_hash);

-- ── Seed data ─────────────────────────────────────────────────────────────────
INSERT INTO topics (title, description, status) VALUES
    ('Husaria at Vienna 1683',  'Full documentary on the Battle of Vienna charge', 'open'),
    ('Polish-Ottoman Wars',     'Series covering all major engagements 1620-1696', 'open'),
    ('Pancerni cavalry',        'Lighter cavalry complement to husaria',            'open')
ON CONFLICT DO NOTHING;
