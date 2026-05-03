-- husariabeats — Migration: add full metadata columns to albums table
-- Run once against live DB:
--   docker exec -i husariabeats_com-db-1 psql -U husaria -d husariabeats < db/migrate_albums_metadata.sql

ALTER TABLE albums
    -- Bilingual titles (replacing single 'title' column)
    ADD COLUMN IF NOT EXISTS title_pl              VARCHAR(200),
    ADD COLUMN IF NOT EXISTS title_en              VARCHAR(200),
    -- Bilingual taglines (short era descriptor shown on album card)
    ADD COLUMN IF NOT EXISTS tagline_pl            VARCHAR(300),
    ADD COLUMN IF NOT EXISTS tagline_en            VARCHAR(300),
    -- Historical era classification (matches songs.era constraint)
    ADD COLUMN IF NOT EXISTS era                   VARCHAR(50)
        CHECK (era IN ('medieval','partitions','wwi','wwii','cold_war','modern')),
    -- UI colour hue (0-360, drives cover art palette)
    ADD COLUMN IF NOT EXISTS hue                   INTEGER,
    -- Human-readable cover art description (for AI generation prompt / alt text)
    ADD COLUMN IF NOT EXISTS cover_label           TEXT,
    -- YouTube playlist IDs (PL and EN language playlists)
    ADD COLUMN IF NOT EXISTS youtube_playlist_id_pl VARCHAR(50),
    ADD COLUMN IF NOT EXISTS youtube_playlist_id_en VARCHAR(50);

-- Back-fill existing title column → title_pl if title_pl is null
UPDATE albums SET title_pl = title WHERE title_pl IS NULL AND title IS NOT NULL;
