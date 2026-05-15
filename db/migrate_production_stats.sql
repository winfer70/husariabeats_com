-- db/migrate_production_stats.sql
-- Adds platform_stats and production_notes JSONB columns to songs table.
ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS platform_stats   JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS production_notes JSONB DEFAULT '{}'::jsonb;
