-- husariabeats — Migration: add rich content columns to songs table
-- Run once against live DB:
--   docker exec -i husariabeats_com-db-1 psql -U husaria -d husariabeats < db/migrate_songs_content.sql

ALTER TABLE songs
    -- Short bilingual subtitle shown under the title on the timeline
    ADD COLUMN IF NOT EXISTS subtitle_pl   VARCHAR(300),
    ADD COLUMN IF NOT EXISTS subtitle_en   VARCHAR(300),
    -- One-paragraph bilingual summary (timeline card expanded view)
    ADD COLUMN IF NOT EXISTS summary_pl    TEXT,
    ADD COLUMN IF NOT EXISTS summary_en    TEXT,
    -- Full bilingual body text (song detail page)
    ADD COLUMN IF NOT EXISTS long_text_pl  TEXT,
    ADD COLUMN IF NOT EXISTS long_text_en  TEXT,
    -- JSONB array of citation strings, e.g. ["Norman Davies, Rising '44"]
    ADD COLUMN IF NOT EXISTS sources       JSONB   DEFAULT '[]'::jsonb,
    -- Display year label, e.g. "15 VII 1410" (shown on timeline)
    ADD COLUMN IF NOT EXISTS year_label    VARCHAR(20),
    -- Background colour hue (0-360) for timeline card mood
    ADD COLUMN IF NOT EXISTS bg_hue        INTEGER,
    -- Background art description for AI generation / alt text
    ADD COLUMN IF NOT EXISTS bg_label      TEXT;
