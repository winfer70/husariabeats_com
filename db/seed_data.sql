-- husariabeats — Seed data: all albums and confirmed released songs
-- Run after all migrations have been applied:
--   docker exec -i husariabeats_com-db-1 psql -U husaria -d husariabeats < db/seed_data.sql
--
-- YouTube IDs mapped from channel UC2PnrumRbzKoDu3dnrR08rA (2026-05-03).
-- Release dates intentionally NOT set — will be added via admin panel when confirmed.
-- Uncertain album mappings noted with TODO comments.
-- Run idempotently: ON CONFLICT DO NOTHING skips existing rows.

-- ── Albums ────────────────────────────────────────────────────────────────────

INSERT INTO albums (slug, title_pl, title_en, title, tagline_pl, tagline_en, era, hue, cover_label, status) VALUES
    ('rzeczpospolita', 'RZECZPOSPOLITA', 'RZECZPOSPOLITA', 'RZECZPOSPOLITA',
     'Złoty wiek 1505–1648', 'The Golden Age, 1505–1648',
     'medieval', 42, 'Wawel cathedral, gold leaf', 'released'),

    ('rozbiory', 'ROZBIORY', 'PARTITIONS', 'ROZBIORY',
     'Trzy zabory, jeden naród', 'Three Powers, One Nation',
     'partitions', 18, 'Torn map, candlelight', 'released'),

    ('godzina-w', 'GODZINA W', 'W-HOUR', 'GODZINA W',
     'Powstanie Warszawskie', 'The Warsaw Uprising',
     'wwii', 8, 'Sewer hatch, ash', 'released'),

    -- Not yet released — release dates TBD
    ('zapomniani', 'ZAPOMNIANI', 'THE FORGOTTEN', 'ZAPOMNIANI',
     'Żołnierze Wyklęci', 'The Cursed Soldiers',
     'cold_war', 220, 'Forest at dawn, frost', 'planned'),

    ('stocznia', 'STOCZNIA', 'THE SHIPYARD', 'STOCZNIA',
     'Solidarność 1980–1989', 'Solidarność, 1980–1989',
     'cold_war', 195, 'Crane silhouette, banner', 'planned'),

    ('trzecia-rp', 'III RP', 'THE THIRD REPUBLIC', 'III RP',
     'Po 1989', 'After 1989',
     'modern', 165, 'Concrete, neon, dawn', 'planned')

ON CONFLICT (slug) DO NOTHING;


-- ── RZECZPOSPOLITA songs (Golden Age, medieval era) ───────────────────────────
-- All uploaded 2026-04-06. 10 songs + album intro identified on channel.
-- Note: albums.json spec says 9 songs — Relief of Smolensk may belong to a
--       different album; verify and reassign via admin panel if needed.

INSERT INTO songs (slug, title_pl, title_en, album_slug, year_event, year_label, era, status,
                   youtube_id_pl, youtube_id_en) VALUES

    ('rzeczpospolita-intro',
     'Intro', 'Intro',
     'rzeczpospolita', NULL, NULL, 'medieval', 'released',
     'fhxer_MhKVM', 'hio33-ZzAPM'),

    ('grunwald',
     'Bitwa pod Grunwaldem', 'Battle of Grunwald',
     'rzeczpospolita', 1410, '15 VII 1410', 'medieval', 'released',
     'X2cnEO2tgpI', 'kV0y2OWiGeA'),

    ('legnica',
     'Bitwa pod Legnicą', 'Battle of Legnica',
     'rzeczpospolita', 1241, '9 IV 1241', 'medieval', 'released',
     'FKy_ROAwKc0', 'iL0vQ4p-gYs'),

    ('orsha',
     'Bitwa pod Orszą', 'Battle of Orsha',
     'rzeczpospolita', 1514, '8 IX 1514', 'medieval', 'released',
     'rgwhT0VwtbE', '0os_CvLT2sY'),

    ('kircholm',
     'Bitwa pod Kircholmem', 'Battle of Kircholm',
     'rzeczpospolita', 1605, '27 IX 1605', 'medieval', 'released',
     '1lr-itbJEkU', 'dnK32hCVMB8'),

    ('cecora',
     'Cecora 1620', 'Cecora 1620',
     'rzeczpospolita', 1620, 'IX 1620', 'medieval', 'released',
     'I-18yQzc4Nk', 'HL-pOOAnmR0'),

    ('chocim',
     'Bitwa pod Chocimiem', 'Battle of Khotyn',
     'rzeczpospolita', 1621, 'IX 1621', 'medieval', 'released',
     'IPv1jwKW01o', 'iJPp3qvlSkg'),

    ('berestechko',
     'Beresteczko 1651', 'Berestechko 1651',
     'rzeczpospolita', 1651, 'VI 1651', 'medieval', 'released',
     'HoZ84wlMvg0', 'EV_nSLL97tg'),

    ('czestochowa',
     'Obrona Częstochowy', 'Siege of Częstochowa',
     'rzeczpospolita', 1655, '1655–1656', 'medieval', 'released',
     'GP4b-G_ejzk', 'IFJbXDoXsyA'),

    ('wiedzen',
     'Bitwa pod Wiedniem', 'Battle of Vienna',
     'rzeczpospolita', 1683, '12 IX 1683', 'medieval', 'released',
     'If6G8ON2rf8', 'rSuHneNmSoU'),

    -- TODO: verify this belongs to rzeczpospolita and not rozbiory
    ('smolensk',
     'Odsiecz Smoleńska', 'Relief of Smolensk',
     'rzeczpospolita', 1611, 'X 1611', 'medieval', 'released',
     'a5cuYZo5F5I', 'FIlfWawFGKQ')

ON CONFLICT (slug) DO NOTHING;


-- ── GODZINA W songs (Warsaw Uprising / WWII era) ─────────────────────────────
-- Uploaded in older batch (exact dates unknown). 8 of 11 confirmed.
-- 3 songs from this album not yet identified on channel — add via admin panel.
-- NOTE: Wyklęci and Skrzydła Chwały skipped — album assignment uncertain.
--       Add manually via admin panel after verifying.

INSERT INTO songs (slug, title_pl, title_en, album_slug, year_event, year_label, era, status,
                   youtube_id_pl, youtube_id_en) VALUES

    ('cichociemni',
     'Cichociemni', 'The Silent Unseen',
     'godzina-w', 1941, '1941–1944', 'wwii', 'released',
     'BrzqevCu_Zk', 'OMJnvUHTKRs'),

    -- Historical note: 1920 Polish-Soviet War; era wwi (post-WWI independence)
    ('cud-nad-wisla',
     'Cud nad Wisłą', 'Miracle on the Vistula',
     'godzina-w', 1920, '15 VIII 1920', 'wwi', 'released',
     'RsXo8DVXFC0', 'vO1W3lB6LIA'),

    ('dywizjon-303',
     'Dywizjon 303', 'Squadron 303',
     'godzina-w', 1940, '1940', 'wwii', 'released',
     'pmz_5SDUK78', 'eVfFjqUEwLE'),

    ('czerwone-maki',
     'Czerwone Maki', 'Red Poppies',
     'godzina-w', 1944, '18 V 1944', 'wwii', 'released',
     'UQ5VLf6m508', 'UhbR88Nwjlc'),

    ('enigma',
     'Enigma', 'Enigma',
     'godzina-w', 1932, '1932', 'wwii', 'released',
     'jpXCeFo1HH0', 'jPeMETwfnMA'),

    ('syberia',
     'Syberia', 'Siberia',
     'godzina-w', 1940, '1940', 'wwii', 'released',
     'XbNCPeBpzqk', 'sU3cH9A-ps8')

ON CONFLICT (slug) DO NOTHING;


-- ── ROZBIORY songs (Partitions era) ───────────────────────────────────────────
-- Uploaded 2026-05-02. 2 of 7 songs confirmed on channel.
-- Remaining 5 not yet uploaded — add via admin panel when published.

INSERT INTO songs (slug, title_pl, title_en, album_slug, year_event, year_label, era, status,
                   youtube_id_pl, youtube_id_en) VALUES

    ('konstytucja-3-maja',
     'Konstytucja 3 maja', 'The Third of May',
     'rozbiory', 1791, '3 V 1791', 'partitions', 'released',
     'gRQXi55QP-s', 'QqSCjzlCzLM'),

    ('konstytucja-duma',
     'Konstytucja 3 maja: Duma Narodu', 'The Third of May: Pride of the Nation',
     'rozbiory', 1791, '3 V 1791', 'partitions', 'released',
     'HaJ3_4eGhoU', 'W8TBzpxgjc4')

ON CONFLICT (slug) DO NOTHING;


-- ── ZAPOMNIANI scaffold (upcoming album) ──────────────────────────────────────
-- zapomniani-intro exists from n8n workflow testing; ensure it's present.
-- Add remaining songs via admin panel or add_song.py as render completes.

INSERT INTO songs (slug, title_pl, title_en, album_slug, era, status) VALUES
    ('zapomniani-intro',
     'Intro', 'Intro',
     'zapomniani', 'cold_war', 'scaffold')

ON CONFLICT (slug) DO NOTHING;


-- ── Uncertain songs — scaffold with YouTube IDs, album TBD ────────────────────
-- These videos exist on channel but album placement is uncertain.
-- Update album_slug via admin panel once confirmed.

INSERT INTO songs (slug, title_pl, title_en, album_slug, era, status,
                   youtube_id_pl, youtube_id_en) VALUES

    -- Best fit: ZAPOMNIANI — "Żołnierze Wyklęci" is the exact ZAPOMNIANI theme.
    -- Could be a pre-release single. Set album_slug to zapomniani once confirmed.
    ('wykleci',
     'Wyklęci', 'The Cursed',
     NULL, 'cold_war', 'scaffold',
     'Rw6NeD6KjFI', 'KxoqxXPhLJk'),

    -- Best fit: RZECZPOSPOLITA — husaria wings imagery fits Golden Age era.
    -- Could also be a standalone / ZAPOMNIANI intro. Verify via admin panel.
    ('skrzydla-chwaly',
     'Skrzydła Chwały', 'Wings of Glory',
     NULL, 'medieval', 'scaffold',
     '1F-WPr23G6Q', 'XoRCf55c5vk')

ON CONFLICT (slug) DO NOTHING;


-- ── Internal tracking topics — uncertain/upcoming songs ───────────────────────
-- Using topics table to track placement decisions and missing songs.
-- status 'in_development' = internal tracking, not community-visible.

INSERT INTO topics (title, description, status, planned_release) VALUES

    ('Wyklęci / The Cursed — album assignment',
     'Song exists on channel (PL: Rw6NeD6KjFI / EN: KxoqxXPhLJk). '
     'Best fit: ZAPOMNIANI (Żołnierze Wyklęci theme). '
     'Could be pre-release single. Update slug wykleci album_slug in admin panel once confirmed.',
     'in_development', NULL),

    ('Skrzydła Chwały / Wings of Glory — album assignment',
     'Song exists on channel (PL: 1F-WPr23G6Q / EN: XoRCf55c5vk). '
     'Best fit: RZECZPOSPOLITA (husaria wings = Golden Age imagery). '
     'Update slug skrzydla-chwaly album_slug in admin panel once confirmed.',
     'in_development', NULL),

    ('Smolensk — verify album placement',
     'Slug: smolensk (Odsiecz Smoleńska 1611). '
     'Seeded under RZECZPOSPOLITA but may belong to ROZBIORY (Partitions era boundary). '
     'Year 1611 is within RZECZPOSPOLITA tagline range 1505–1648 so likely correct.',
     'in_development', NULL),

    ('GODZINA W — 3 missing songs',
     'Album spec says 11 songs. Only 6 identified on channel: '
     'Cichociemni, Cud nad Wisłą, Dywizjon 303, Czerwone Maki, Enigma, Syberia. '
     'Missing 3: likely Godzina W title track + 2 others not yet uploaded or not identified. '
     'Add via admin panel or add_song.py when identified.',
     'in_development', NULL),

    ('ROZBIORY — 5 missing songs',
     'Album spec says 7 songs. Only 2 uploaded to channel as of 2026-05-03: '
     'Konstytucja 3 maja + Konstytucja 3 maja: Duma Narodu. '
     'Remaining 5 songs not yet on channel — add via admin panel when uploaded.',
     'in_development', NULL)

ON CONFLICT DO NOTHING;
