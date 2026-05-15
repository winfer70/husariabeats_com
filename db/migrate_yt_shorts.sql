-- Migration: add youtube_short_pl and youtube_short_en to songs table
-- Run: docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T db psql -U husaria -d husariabeats < db/migrate_yt_shorts.sql

BEGIN;

ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS youtube_short_pl VARCHAR(20),
  ADD COLUMN IF NOT EXISTS youtube_short_en VARCHAR(20);

COMMIT;
