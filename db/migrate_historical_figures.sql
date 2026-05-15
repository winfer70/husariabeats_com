-- db/migrate_historical_figures.sql
-- Creates historical_figures table and adds figure_slug FK to songs.
CREATE TABLE IF NOT EXISTS historical_figures (
    slug          TEXT PRIMARY KEY,
    name_pl       TEXT NOT NULL,
    name_en       TEXT NOT NULL,
    birth_year    INT,
    death_year    INT,
    bio_pl        TEXT,
    bio_en        TEXT,
    arc_west_pl   TEXT,
    arc_west_en   TEXT,
    arc_east_pl   TEXT,
    arc_east_en   TEXT,
    image_url     TEXT,
    created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS figure_slug TEXT REFERENCES historical_figures(slug);
