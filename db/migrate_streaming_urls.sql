-- husariabeats — Migration: add streaming platform URL columns to songs
-- Run once against live DB:
--   docker exec -i husariabeats_com-db-1 psql -U husaria -d husariabeats < db/migrate_streaming_urls.sql

ALTER TABLE songs
    ADD COLUMN IF NOT EXISTS spotify_url        TEXT,
    ADD COLUMN IF NOT EXISTS apple_music_url    TEXT,
    ADD COLUMN IF NOT EXISTS amazon_url         TEXT,
    ADD COLUMN IF NOT EXISTS youtube_music_url  TEXT,
    ADD COLUMN IF NOT EXISTS itunes_url         TEXT;
