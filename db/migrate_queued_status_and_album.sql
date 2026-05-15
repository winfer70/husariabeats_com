-- Migration: add 'queued' to songs.status CHECK constraint + rename album slug
--
-- Run once against the live DB:
--   docker compose exec db psql -U husaria -d husariabeats -f /docker-entrypoint-initdb.d/migrate_queued_status_and_album.sql
-- Or via psql pipe:
--   docker compose exec -T db psql -U husaria -d husariabeats < db/migrate_queued_status_and_album.sql

BEGIN;

-- ── 1. Extend songs.status CHECK to include 'queued' ─────────────────────────

-- Drop old constraint (name may vary — using table scan to find it)
DO $$
DECLARE
  cname TEXT;
BEGIN
  SELECT conname INTO cname
  FROM   pg_constraint
  WHERE  conrelid = 'songs'::regclass
    AND  contype  = 'c'
    AND  conname LIKE '%status%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE songs DROP CONSTRAINT %I', cname);
  END IF;
END $$;

-- Add new constraint with 'queued' included
ALTER TABLE songs
  ADD CONSTRAINT songs_status_check
  CHECK (status IN ('scaffold','audio_ready','sync_done','render_done','scheduled','queued','released'));

-- ── 2. Rename album slug: rzeczpospolita → krew-i-chwala ─────────────────────

-- Copy album record under new slug (safe if old record exists)
INSERT INTO albums (
  slug, title, title_pl, title_en,
  tagline_pl, tagline_en, description,
  era, hue, cover_label, status, release_date, cover_art,
  youtube_playlist_id_pl, youtube_playlist_id_en
)
SELECT
  'krew-i-chwala', title, title_pl, title_en,
  tagline_pl, tagline_en, description,
  era, hue, cover_label, status, release_date, cover_art,
  youtube_playlist_id_pl, youtube_playlist_id_en
FROM albums
WHERE slug = 'rzeczpospolita'
ON CONFLICT (slug) DO NOTHING;

-- Point all songs at the new album slug
UPDATE songs
SET    album_slug = 'krew-i-chwala'
WHERE  album_slug = 'rzeczpospolita';

-- Remove old album record
DELETE FROM albums WHERE slug = 'rzeczpospolita';

COMMIT;
