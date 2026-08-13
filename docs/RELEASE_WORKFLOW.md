# HusariaBeats — Release Workflow

Complete reference for the automated song release pipeline powered by n8n.

---

## n8n Workflow Overview

| Property | Value |
|---|---|
| Workflow ID | `bB7YCOGVtKm6oZz0` |
| n8n instance | `https://n8n.your-automation-host.example` |
| Node count | ~50 nodes |
| Trigger | Cron — daily 09:00 Warsaw time (Europe/Warsaw) |

---

## Step-by-Step Flow

```
[Cron 09:00 Warsaw]
       │
       ▼
1. CHECK QUEUE
   GET /api/release_queue?status=queued
   → Find entries with scheduled_at ≤ NOW()
   → If none: stop (no release today)
       │
       ▼
2. KILL SWITCH CHECK
   GET /api/settings
   → Read auto_release_enabled key
   → If "false": stop (automation paused)
   → Also check: releases today < release_daily_limit
       │
       ▼
3. FIND DRIVE FOLDER
   Google Drive: search for folder husariabeats-releases/{song_slug}/
   → Folder must exist with expected files
       │
       ▼
4. DOWNLOAD ASSETS
   Download from Drive:
     - video_pl.mp4
     - video_en.mp4
     - meta.json
   Parse meta.json → extract title/description/tags per language
       │
       ▼
5. UPLOAD TO YOUTUBE (PL)
   YouTube Data API v3 — videos.insert
   → title: meta.json title_pl
   → description: meta.json description_pl
   → tags: meta.json tags_pl[]
   → playlist: albums.youtube_playlist_id_pl
   → publishAt: scheduled_at from release_queue
   → Store returned video ID
       │
       ▼
6. UPLOAD TO YOUTUBE (EN)
   Same as step 5 using EN fields
   → playlist: albums.youtube_playlist_id_en
   → Store returned video ID
       │
       ▼
7. SAVE VIDEO IDs TO DB
   PATCH /api/songs/{slug}
   → youtube_id_pl: <id from step 5>
   → youtube_id_en: <id from step 6>
       │
       ▼
8. PATCH METADATA
   PATCH /api/songs/{slug}
   → status: "released"
   → release_date: NOW()
   PATCH /api/release_queue/{id}
   → status: "released"
       │
       ▼
9. SOCIAL STUBS
   (Facebook, Instagram, TikTok nodes — currently stubs pending API approvals)
   → Draft posts using meta.json title + description
   → Post when platform APIs are live
       │
       ▼
10. MARK RELEASED
    Confirm songs.status = "released" in DB
    Close associated voting topic if topic_id is set
       │
       ▼
11. REVALIDATE SITE
    POST https://husariabeats.com/api/revalidate
    Headers: Content-Type: application/json
    Body:
      {
        "secret": "<REVALIDATE_SECRET>",
        "paths": [
          "/pl",
          "/en",
          "/pl/albums/{album_slug}",
          "/en/albums/{album_slug}"
        ]
      }
    → Next.js ISR cache flushed; site reflects new release within seconds
```

---

## Google Drive Folder Structure

All release assets must be placed in Drive before the scheduled release date.

```
husariabeats-releases/
└── {song_slug}/
    ├── video_pl.mp4     — Polish-language video
    ├── video_en.mp4     — English-language video
    └── meta.json        — metadata for YouTube upload and social posts
```

### `meta.json` Required Fields

```json
{
  "title_pl":       "Kosacki - Twórca Granatu [HusariaBeats]",
  "title_en":       "Kosacki - The Grenade Inventor [HusariaBeats]",
  "description_pl": "Pełny opis po polsku...",
  "description_en": "Full English description...",
  "tags_pl":        ["husaria", "historia polski", "ii wojna światowa"],
  "tags_en":        ["husaria", "polish history", "world war ii"]
}
```

All six fields are required. The n8n workflow will error if any field is missing.

---

## How to Queue a Release

### 1. Ensure the song is in `render_done` status

```sql
UPDATE songs
SET    status = 'render_done'
WHERE  slug   = 'kosacki';
```

### 2. Add (or update) the release_queue entry

```sql
-- Insert new entry
INSERT INTO release_queue (song_id, scheduled_at, platforms)
VALUES (
    'kosacki',
    '2026-06-10 07:00:00+02',   -- UTC+2 Warsaw summer time
    '{youtube,facebook,instagram,tiktok}'
);

-- Or update an existing queued entry
UPDATE release_queue
SET    status       = 'queued',
       scheduled_at = '2026-06-10 07:00:00+02'
WHERE  song_id      = 'kosacki';
```

### 3. Place assets in Drive

Create the folder `husariabeats-releases/kosacki/` in the Google Drive account connected to n8n, and upload `video_pl.mp4`, `video_en.mp4`, and `meta.json`.

### 4. Verify kill switch is on

```sql
SELECT value FROM settings WHERE key = 'auto_release_enabled';
-- must return 'true'
```

---

## Kill Switch

The global kill switch is stored in the `settings` table.

```sql
-- Pause all automation
UPDATE settings SET value = 'false' WHERE key = 'auto_release_enabled';

-- Resume
UPDATE settings SET value = 'true'  WHERE key = 'auto_release_enabled';
```

The n8n workflow reads `GET /api/settings` at step 2. If `auto_release_enabled` is `false`, all subsequent nodes are skipped and the workflow exits cleanly (no DB changes, no uploads).

The admin panel (`/settings` page) provides a toggle for this without needing to write SQL.

---

## ISR Revalidation

The final n8n node (`Revalidate Site1`) calls the Next.js on-demand revalidation endpoint.

**Endpoint**: `POST https://husariabeats.com/api/revalidate`

**Secret** (loaded from the `REVALIDATE_SECRET` environment variable in both n8n and the app runtime):

`<REVALIDATE_SECRET>`

**Request body**:
```json
{
  "secret": "<REVALIDATE_SECRET>",
  "paths":  ["/pl", "/en", "/pl/albums/{album_slug}", "/en/albums/{album_slug}"]
}
```

**Effect**: `revalidatePath()` is called for each path in the array, immediately invalidating the Next.js ISR cache. The next visitor to any of those URLs gets a freshly rendered page with the new song visible.

Without this step, ISR pages would refresh on their own schedule (every 300 s maximum). With it, the site updates within a few seconds of a release completing.

---

## Manual Override (CLI Script)

For manual or test releases outside the n8n cron:

```bash
python api/scripts/release.py --song kosacki --date 2026-05-15
```

This script:
1. Updates `songs.status` to the next lifecycle step
2. Adds or updates the `release_queue` entry
3. Generates YouTube title/description (PL + EN) from DB fields
4. Prepares a DistroKid CSV row
5. Drafts social post text
6. Optionally closes the related voting topic

DistroKid has no API; the CSV must be submitted manually ~1 day before release.

---

## Adding a New Song (CLI)

```bash
python api/scripts/add_song.py \
  --slug     kosacki \
  --title-pl "Kosacki" \
  --title-en "Kosacki" \
  --album    zapomniani \
  --year     1939 \
  --era      wwii
```

This inserts a row into `songs` with `status = 'scaffold'` and all nullable fields empty, ready for content to be filled in via the admin panel.
