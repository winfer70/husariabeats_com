PRODUCTION_GUIDE.md written to the project root. It covers:

All 8 phases end-to-end (lyrics → scaffold → audio → sync → QA → images → publish → shorts/feeds)
All skills in one place: /husaria-lyrics, new-song, video-editor, lyric-sync, video-shorts, video-feeds, tiktok-promo, handoff
Quick-reference tables for: Suno tag patterns, meta.json schema, platform character limits, scene structure, lyric colors, render commands, file naming
Release readiness gate (full checklist before DistroKid upload)
Troubleshooting table with 15 known bug patterns and their fixes
The individual skill files in SKILLS/ remain the authoritative technical specs — this doc is the overview that ties everything together

# Husaria Beats — Master Production Guide

> Single reference document covering the complete song + video production pipeline end-to-end.
> Skills live in `SKILLS/` and `~/.claude/skills/husaria-lyrics/`. Use this doc as the overview; go to the individual skill files for full technical specs.

---

## Table of Contents

1. [What Is Husaria Beats](#1-what-is-husaria-beats)
2. [Pipeline Overview](#2-pipeline-overview)
3. [Phase 0 — Lyric Writing](#3-phase-0--lyric-writing)
4. [Phase 1 — Video Scaffold](#4-phase-1--video-scaffold)
5. [Phase 2 — Audio Export (Suno)](#5-phase-2--audio-export-suno)
6. [Phase 3 — Audio Sync](#6-phase-3--audio-sync)
7. [Phase 4 — QA + Timing](#7-phase-4--qa--timing)
8. [Phase 5 — Scene Images + Thumbnail](#8-phase-5--scene-images--thumbnail)
9. [Phase 6 — Publish](#9-phase-6--publish)
10. [Phase 7 — Promo Short (9:16)](#10-phase-7--promo-short-916)
11. [Phase 8 — Feed Video (4:5)](#11-phase-8--feed-video-45)
12. [Session Management](#12-session-management)
13. [Skill Summary + Slash Commands](#13-skill-summary--slash-commands)
14. [Key Constants + File Naming](#14-key-constants--file-naming)
15. [Release Readiness Gate](#15-release-readiness-gate)
16. [Troubleshooting Quick Reference](#16-troubleshooting-quick-reference)

---

## 1. What Is Husaria Beats

**Bilingual (PL+EN) YouTube music channel** — Polish history told through AI-generated melodic trap/autotune rap.

- Email: husariabeats@gmail.com | Tagline: **Historia • Muzyka • Prawda**
- YouTube: @HusariaBeats | Instagram: @husariabeats | TikTok: @husariabeats | Facebook: "Husaria Beats"
- DistroKid Musician Plus active (Spotify distribution ~1 day lead time)
- Suno Pro ($10/mo) — commercial license on all Pro-tier tracks
- Leonardo AI Essential ($10/mo) — commercial use covered, no attribution required

### The Double Betrayal (core concept — every song must contain both)

1. **West's Silence** — Yalta, visas denied, erased from Western history books
2. **Communist Erasure** — show trials, name scrubbed from Polish textbooks, treated as traitors

Arc: hero defeats Nazis → erased by post-war powers. Never deliver one without the other.

### Release Calendar

| Album | Target | Songs |
|---|---|---|
| KREW_I_CHWALA | ✓ Apr 2026 RELEASED | 10 songs + Intro |
| ZAPOMNIANI | Jun 2026 | Pilecki, Wojtek, Maczek, Kosacki, Łączniczki, Sosnowski, Sosnkowski, Sosabowski, Fieldorf, Groszkowski + Intro |
| GRANICE | Jul 2026 | partitions + uprisings |
| SOLIDARNI | Q3 2026 | WWII resistance + Solidarity |
| PIERWSZE_DNI | 1 Sep 2026 (fixed anniversary) | September 1939 |
| SZPIEDZY_I_GENIUSZE | Q4 2026 | codebreakers + spies |
| DYWIZJON_303 | Nov 2026 – Mar 2027 | 7 songs, 3-week cadence |
| KOBIETY_ZELAZA | Mar 2027 | 11 songs |
| PODZIEMNA_POLSKA | Q2 2027 | underground resistance culture |
| MORZE_I_NIEBO | Q3 2027 | naval + air campaigns |

---

## 2. Pipeline Overview

```
PHASE 0 — LYRICS          /husaria-lyrics skill → 6 files per song
PHASE 1 — SCAFFOLD        Claude: 5 parallel agents → Remotion + song folder
PHASE 2 — AUDIO           Human: Suno export → copy to Remotion/public/
PHASE 3 — AUDIO SYNC      Scripts: demucs + stable-ts → exact frame timings
PHASE 4 — QA + TIMING     Human + Claude: Remotion Studio → fix flagged scenes
PHASE 5 — IMAGES          Human: Leonardo AI → 15 scene JPGs + thumbnail
PHASE 6 — PUBLISH         Claude: meta.json + YouTube/social content; Human: upload
PHASE 7 — PROMO SHORT     Claude + Human: 30s 9:16 vertical clip → all platforms
PHASE 8 — FEED VIDEO      Claude + Human: 4:5 Instagram Feed version
```

**Total time estimate per song:** ~4–5 hours (human + automated work combined)

**Rule: never hardcode frame counts.** `durationInFrames` always imports from `data/lyrics_pl.ts` → `SONG_DURATION_FRAMES_PL`. Sync scripts write these values automatically from real audio duration.

---

## 3. Phase 0 — Lyric Writing

**Skill:** `/husaria-lyrics` (`~/.claude/skills/husaria-lyrics/SKILL.md`)

**Trigger:** `/husaria-lyrics <hero/topic> --path <SongFolder>`

Produces 6 files saved to disk:

```
{SongFolder}/
  PL/
    lyrics_suno.txt   ← Section labels + all Suno voice/delivery tags
    lyrics_clean.txt  ← Pure lyric text — SOURCE OF TRUTH for subtitles
    suno_style_pl.txt ← Genre + instrument style descriptors
  EN/
    lyrics_suno.txt   ← Mirror of PL structure; first line = "{Title} (English Version)"
    lyrics_clean.txt  ← Pure text, no labels
    suno_style_en.txt ← EN genre variants differ from PL (see below)
```

### Song Structure (target: ~4 minutes)

```
[Intro: Male Rap]       6+ AABB rhyming lines + "Historia milczała! My mówimy! Start!" closer
[Verse 1: Male Rap]     8 lines (4 Male + 4 Female — female gets [Female Rap] inline)
[Pre-Chorus]            optional, builds tension
[Chorus: Both]          4–6 lines, [Heavy Bass Drop, Anthemic], mid-chorus [Male]/[Female] split
[Verse 2: Male Rap]
[Chorus: Both]
[Verse 3: Male Rap]
[Bridge: All Vocals]    [Female - Sad/Emotional] + per-line voice splits + [Both - Building Intensity]
[Verse 4: Female Rap]   optional, solo female when betrayal section is female-only
[Final Chorus: Both]    [Maximum Energy], same [Male]/[Female] mid-split as regular chorus
[Outro]                 [Military Snare Drum Fade Out] + shouted outro on same lines + [End]
```

### Mandatory Line Rules

- **8–12 syllables per line** — no exceptions
- **AABB rhyme scheme** — every couplet rhymes on final stressed syllable
- All years/numbers as **digits** in `lyrics_clean.txt`; can be spelled out in `lyrics_suno.txt`
- `lyrics_clean.txt` is the subtitle source — must match what Suno actually sings

### Key Suno Tag Patterns

| Tag | Use |
|---|---|
| `[Verse 1: Male Rap]` | Combined inline label (NOT two separate lines) |
| `[Chorus: Both]` / `[Final Chorus: Both]` | Combined inline — Final adds `[Maximum Energy]` |
| `[Female Rap]` | Female response within a verse (no new verse label) |
| `[Female - Sad/Emotional]` | Bridge primary voice (NOT Sad/Melodic) |
| `[Male - Shouted] text` | Inline: tag + text on SAME line (outro/bridge) |
| `[End]` | Closes the file (last line) |

### Style Prompt Formula (PL)

```
{Genre}, Male and Female Duet, {BPM}, {Delivery}, {Instruments}, {Feel}, Polska wymowa
```

| Song type | Genre |
|---|---|
| Battle / armoured | `Epic Orchestral Hip-Hop` |
| Pilot / air | `Cinematic Polish Rap, Dark Boom-Bap` |
| Spy / noir | `Modern Polish Rap` + `Dark Phonk Bass` + `Mystery Noir Melodies` |
| Engineer / inventor | `Cinematic Dark Rap, Gritty Boom-Bap` |

EN style prompt: same formula but omit `Polska wymowa`; genre tags differ (e.g. `Modern Cinematic Hip-Hop, Dark Orchestral Trap` for pilot).

Instruments palette: `Deep 808 Bass · Military Snare Drums · Warm Accordion · Haunting Piano · Cinematic Strings`

### Digit Conversion (do before alignment)

Before running Phase 3 sync, update `lyrics_clean.txt` to use digits everywhere:
- Years: `1944` (not "tysiąc dziewięćset czterdziesty czwarty")
- PL thousands: `14 000` (space-separated)
- EN thousands: `14,000` (comma-separated)
- Royal ordinals: always Roman (`III`, `IX`)

---

## 4. Phase 1 — Video Scaffold

**Skill:** `SKILLS/new-song.md`
**Trigger:** "start new video for [Song Name]"

Claude launches **5 parallel subagents** simultaneously:

| Agent | Task |
|---|---|
| A | Create `Remotion/src/songs/{SongTitle_YYYY}/` folder structure |
| B | Generate `story_data.ts` — 17 SceneConfig objects |
| C | Generate 15 Leonardo AI prompts → `SHARED/LeonardoPrompts.txt` |
| D | Generate `lyrics_pl.ts` + `lyrics_en.ts` (proportional timing estimates) |
| E | Register 2 compositions in `Root.tsx` (PL + EN) |

### Required inputs before starting

| Variable | Example |
|---|---|
| `song_key` | `kapitan_pilecki` (lowercase, no spaces) |
| `song_title` | `Captain_Pilecki` (folder name form) |
| `year` | `1940` |
| `album` | `ZAPOMNIANI` |
| Song description | brief paragraph for scene headlines |
| PL + EN lyrics | section headers like `[Refren]`, `[Wers 1]` |

### Remotion folder structure created

```
Remotion/src/songs/{SongTitle_YYYY}/
  {SongTitle_YYYY}Video.tsx     ← root composition
  data/
    scene_timings.ts            ← PL scene start frames (sync writes real values)
    scene_timings_en.ts         ← EN scene start frames
    lyrics_pl.ts                ← PL lyric lines + SONG_DURATION_FRAMES_PL
    lyrics_en.ts                ← EN lyric lines + SONG_DURATION_FRAMES_EN
  story/
    story_data.ts               ← 17 SceneConfig objects + getSceneAt()
    StoryManager.tsx            ← routes frame → scene + lyric lookup
    StoryScene.tsx              ← renders single scene (Ken Burns + text + watermark)

Remotion/public/{song_key}/
  scenes/                       ← JPGs go here after Phase 5
  audio_pl.mp3                  ← filled in Phase 2
  audio_en.mp3                  ← filled in Phase 2
```

Shared reusables (import directly — do not copy):
```
Remotion/src/shared/
  PromoShortTemplate.tsx        ← promo short / feed base component
  useAudioPulse.ts              ← bass-energy hook (0–1 per frame) for lyric glow
```

### 17-scene fixed structure (all songs)

```
1  mist           story      Opening / fog of war
2  hetman         story      Leader introduction
3  sejm           story      Political context / decision
4  betrayal       story      Turning point / failure
5  outnumbered    story      Battle situation
6  retreat        story      Crisis / withdrawal
7  chorus1        CHORUS     First chorus — s7_chorus.jpg
8  nobles_flee    story      Consequence / aftermath
9  prisoners      story      Loss / captivity
10 last_stand     story      Final resistance
11 trophy         story      Enemy triumph or Polish cost
12 chorus2        CHORUS     Second chorus — s7_chorus.jpg (reversed Ken Burns)
13 osman          story      Enemy perspective / context
14 khotyn         story      Historical follow-up / legacy
15 forgotten      story      Memory / erasure
16 final_chorus   CHORUS     Final chorus — s7_chorus.jpg (slow epic zoom)
17 remember       MEMORIAL   Memorial close
```

Scene IDs are conventional — adapt headline content to the specific song but keep the arc structure.

---

## 5. Phase 2 — Audio Export (Suno)

**Owner: Human**

1. Export PL vocal track from Suno → save to `NewStructure/Unreleased/{Album}/{SongFolder}/PL/`
2. Export EN vocal track → save to `NewStructure/Unreleased/{Album}/{SongFolder}/EN/`
3. Tell Claude: **"Audio saved, copy to Remotion for {song_key}"**

Claude will copy and rename to:
- `Remotion/public/{song_key}/audio_pl.mp3`
- `Remotion/public/{song_key}/audio_en.mp3`

Then automatically proceeds to Phase 3.

**Note:** Images are NOT needed yet — generate them in Phase 5 after sync QA is complete.

---

## 6. Phase 3 — Audio Sync

**Skill:** `SKILLS/lyric-sync.md`

Fully automated. Sets the exact video duration by measuring real audio length.

```bash
cd "<YOUR_HUSARIABEATS_WORKSPACE>"
python scripts/sync_all.py --song {song_key} --method stable
```

### What sync_all.py does (in sequence)

| Step | Script | Output |
|---|---|---|
| 1 | `sync_scenes_*.py` | Whisper scene transitions → `scene_timings.ts` / `scene_timings_en.ts` |
| 2 | `vocal_isolate_{song}.py` | Demucs separates vocal track → `vocals_pl.wav` / `vocals_en.wav` |
| 3 | `align_lyrics_{song}.py` | stable-ts forced alignment → `lyrics_pl.ts` / `lyrics_en.ts` |
| 4 | `diagnose_timing.py` | Side-by-side diff: scene timings vs Whisper suggestions |
| 5 | `fix_timings_{song}.py` | Auto-correct scene timing out-of-bounds + monotonicity |

### Why stable-ts (not regular Whisper)

Autotuned vocals destroy Whisper transcription accuracy. stable-ts uses cross-attention as a **pattern matcher** with known text — no transcription happens. Result: ~20ms per-word accuracy, 100% section coverage.

### Sync methods (fallback order)

| Method | Flag | Notes |
|---|---|---|
| stable-ts forced alignment | `--method stable` | **RECOMMENDED.** Requires `pip install stable-ts` + song-specific `align_lyrics_{song}.py` |
| aeneas DTW (PL) + WhisperX (EN) | `--method forced` | Backup — requires ffmpeg + espeak + Python ≤3.13 |
| WhisperX both langs | `--method whisperx` | Backup — Python ≤3.13 only |
| faster-whisper | *(default)* | Always works on Python 3.14; most manual fixes needed |

### Auto-retry QA loop (stable-ts)

Run up to 3 passes before asking for manual input:

| Metric | Threshold | Action |
|---|---|---|
| Lines with duration < 45fr | > 0 in chorus/bridge | Add MANUAL_OVERRIDES with 90fr minimum |
| Last 2 lines of chorus | Both < 60fr | Apply chorus-last-line-cramming fix |
| Section coverage | < 60% | Move section boundary earlier, re-run |
| Outro lines | Any < 30fr | Extend endFrame manually |

### Subtitle timing constants

| Constant | Value | Meaning |
|---|---|---|
| `MIN_LINE_FRAMES` | 30 | 1s minimum display duration |
| `MAX_LINE_DURATION` | 180 | 6s max (prevents runaway in gaps) |
| `WORD_END_TAIL` | 12 | 0.4s hold after last word ends |
| `TAIL_BUFFER_FR` | 45 | 1.5s buffer appended to each section slice |

### Setting up stable-ts for a new song

Copy `align_lyrics_stable.py` (Beresteczko template) and update:
1. `SONG_KEY` and `SONG_TITLE` at the top
2. `PL_INTRO_OFFSET` / `EN_INTRO_OFFSET` (first singing word frame — detect via Whisper word diagnostic)
3. `PL_SECTION_BOUNDARIES` / `EN_SECTION_BOUNDARIES` (8 sections mapped to scene_timings.ts keys)
4. Register in `SONG_REGISTRY` inside `sync_all.py`

---

## 7. Phase 4 — QA + Timing

**Owner: Human + Claude** | Remotion Studio

Images are NOT required for this phase — `StoryScene.tsx` silently skips missing images.

```bash
cd "<YOUR_REMOTION_WORKSPACE>"
npm run dev
# Select {SongTitle}-PL composition — showFrameCounter: true is already set
```

### Fix flagged scenes

1. Review `diagnose_timing.py` output — lines flagged `!` (delta > 100fr) need manual correction
2. Scrub to the frame shown; listen for the exact lyric onset
3. Edit `startFrame` in `data/lyrics_pl.ts` — Remotion hot-reloads
4. Repeat for EN composition

### Visual QA checklist

- [ ] Chorus scenes (7/12/16) feel visually impactful — not just gradient
- [ ] Memorial/outro (scene 17) sustains through full instrumental tail
- [ ] No subtitle appearing more than 30 frames early or late
- [ ] Watermark visible bottom-right all scenes: `bottom: 32, right: 48, height: 72, opacity: 0.82`
- [ ] Legal disclaimer footer visible bottom-left all scenes (11px, rgba white 22%)
- [ ] Section lyric colors correct: Chorus → gold `#c8a84b` | Bridge/Outro → muted `#b0a090` italic | Verse → cream `#e8d9b5`
- [ ] EN composition shows English as primary (big), Polish as secondary (small)

When done: set `showFrameCounter: false` in Root.tsx. Tell Claude: **"Timing QA done, start images for {song_key}"**

---

## 8. Phase 5 — Scene Images + Thumbnail

**Owner: Human** | Leonardo AI

Open `NewStructure/Unreleased/{Album}/{SongFolder}/SHARED/LeonardoPrompts.txt`

### Scene images (15 unique)

Generate one image per prompt:
- **Model:** Leonardo Diffusion XL
- **Resolution:** 1920×1080
- **Guidance Scale:** 7 | **Steps:** 35
- **Naming:** `s{N}_{scene_id}.jpg` → save to `Remotion/public/{song_key}/scenes/`

Scenes 7, 12, 16 (all chorus) share `s7_chorus.jpg` — generate only once.

### YouTube content policy for scene images

**Safe:** silhouettes, atmospheric compositions, distant battle formations, memorial scenes, symbolic imagery

**Never:** close-up wounds or blood, bodies in graphic detail, execution/torture scenes, banned symbols (Nazi insignia etc.)

Adjustment: instead of "blood-soaked battlefield" → "fallen soldiers in the silence after battle"

### Thumbnail

A separate `thumbnail_prompt.txt` is pre-generated per song (produced by the thumbnail skill). Full spec:

- **Size:** 1280×720px (16:9), JPG ≤2MB
- **Template:** dramatic portrait, ¾ facing, haunted resolve / stoic defiance, dark era-appropriate background, gold amber lighting from left, text space in bottom-left third
- **Text overlay (post-generation):** title (≤3 words) + year, gold serif `#c8a84b`, bottom-left, dark drop shadow
- **Mobile check:** readable at 320px width
- **Save to:** `Remotion/public/{song_key}/thumbnail.jpg` AND `SHARED/{slug}_thumb.jpg`

After images are added: `npm run dev` → scrub through to confirm all 15 scenes loaded with correct Ken Burns.

---

## 9. Phase 6 — Publish

### 6.1 Generate meta.json (Claude)

Saved to `NewStructure/{Album}/{SongFolder}/meta.json`. Full schema:

```json
{
  "slug": "captain-pilecki",
  "era": "wwii",
  "album_slug": "zapomniani",
  "title": { "pl": "ROTMISTRZ PILECKI", "en": "CAPTAIN PILECKI" },
  "subtitle": { "pl": "Dobrowolnie wszedł do Auschwitz", "en": "He walked into Auschwitz by choice" },
  "year_event": 1940,
  "year_label": "1940 – 1948",
  "bg_hue": 42,
  "bg_label": "II Wojna Światowa",
  "summary": { "pl": "≤80 chars — TikTok/IG hook", "en": "≤80 chars — YouTube opener" },
  "long_text": { "pl": "Full PL YouTube description...", "en": "Full EN YouTube description..." },
  "sources": ["Author, 'Title', Publisher Year"],
  "video": {
    "file_pl":      "{slug}_pl.mp4",
    "file_en":      "{slug}_en.mp4",
    "file_feed_pl": "{slug}-feed-pl.mp4",
    "file_feed_en": "{slug}-feed-en.mp4",
    "thumbnail":    "{slug}_thumb.jpg"
  },
  "platforms": {
    "youtube": { "title_pl": "...", "title_en": "...", "description_pl": "...", "description_en": "...", "tags": [] },
    "tiktok":  { "caption_pl": "≤150 chars total incl. hashtags", "caption_en": "..." },
    "instagram": { "caption_pl": "≤125 chars before blank line fold...", "caption_en": "..." },
    "facebook": { "title_pl": "...", "description_pl": "..." }
  },
  "release": { "distrokid_upc": "", "spotify_uri": "" }
}
```

#### Era → bg_hue reference

| Era | bg_hue | bg_label |
|---|---|---|
| Medieval / Husaria | 30 | Średniowiecze / Husaria |
| WWI / Partitions | 30 (gold) | Rozbiory |
| WWII | 42 | II Wojna Światowa |
| Communist / Cold War | 220 | Komunizm |

#### Platform character limits (enforce strictly)

| Platform | Field | Hard cap | Sweet spot |
|---|---|---|---|
| TikTok | caption | 2,200 | **≤150 total incl. hashtags** |
| Instagram | caption | 2,200 | **≤125 before fold**; ≤30 hashtags |
| YouTube | title | 100 | 60–70 (incl. ` \| HusariaBeats [PL]` suffix) |
| meta.json | summary.pl/en | **80 chars** | punchy hook — hard limit |

#### YouTube title format
```
PL: "ROTMISTRZ PILECKI | HusariaBeats [PL]"
EN: "CAPTAIN PILECKI | HusariaBeats [EN]"
```
`[PL]`/`[EN]` suffix required — prevents YouTube spam filter on near-identical uploads.

#### Posting strategy
- **PL version** → all social platforms (TikTok/IG/FB + YouTube PL)
- **EN version** → YouTube only; EN posts stagger +2h after PL via workflow
- `scheduled_date` is NOT in meta.json — workflow calculates at runtime

### 6.2 Render videos

```bash
cd "<YOUR_REMOTION_WORKSPACE>"

npx remotion render {SongTitle}{Year}-PL out/{slug}_pl.mp4 --codec h264 --crf 18 --pixel-format yuv420p --audio-bitrate 320k
npx remotion render {SongTitle}{Year}-EN out/{slug}_en.mp4 --codec h264 --crf 18 --pixel-format yuv420p --audio-bitrate 320k
```

**NEVER use `--crf 1`** — corrupts h264, produces unplayable files. Always `--crf 18`.

### 6.3 Upload workflow

1. **DistroKid** — batch upload with ~1 day lead before YouTube publish date
2. **YouTube** — schedule both PL + EN with thumbnails; assign to PL + EN playlists; pin a historical context comment
3. **Social** — TikTok/IG/FB via Upload-Post.com + n8n workflow (EN posts stagger +2h)
4. After Spotify goes live (~1 day): fill `release.spotify_uri` in meta.json

---

## 10. Phase 7 — Promo Short (9:16)

**Skill:** `SKILLS/video-shorts.md`
**Format:** 1080×1920 · 900 frames · 30fps

Triggered after Phase 4 QA — same scene images; no extra assets needed.

### Setup

```typescript
// PromoShort.tsx constants to update:
const SONG_KEY = "{songkey}";
const CONTEXT_IMAGES = ["{songkey}/scenes/s7_chorus.jpg", ...];
const CHORUS_PL = "First chorus line PL";
const CHORUS_EN = "First chorus line EN";
```

```typescript
// data/promo_audio_start.ts:
export const AUDIO_START_PL = chorus1_frame - 90;  // 3s before chorus drop
export const PROMO_DURATION_PL = AUDIO_START_PL + 900;
```

Register 2 compositions in Root.tsx: `{SongKey}-Short-PL` and `{SongKey}-Short-EN` (width: 1080, height: **1920**).

### 6-beat structure

| Frames | Beat | Content |
|---|---|---|
| 0–89 | Hook | Song name + year, full-bleed scene image |
| 90–299 | Context | 3-image fast cuts + stat overlay (36px gold) |
| 300–539 | Chorus hit | Lyric subtitle flash (56px / 28px gold) |
| 540–719 | Tease | "Historia której nie znasz" italic 72px |
| 720–839 | Callout | 3-row platform badges (YT red / IG gradient / FB blue) |
| 840–899 | Logo hold | Channel logo + tagline "Historia • Muzyka • Prawda" |

**Persistent overlay (all beats):** `▶ @HusariaBeats` header at top — semi-transparent dark pill.

**Platform note:** Write **"YT"** not "YouTube" in callout on TikTok (algorithmic suppression).

### Render

```bash
npx remotion render {SongKey}-Short-PL out/{slug}-feed-pl.mp4 --codec h264 --crf 18 --pixel-format yuv420p --audio-bitrate 320k
npx remotion render {SongKey}-Short-EN out/{slug}-feed-en.mp4 --codec h264 --crf 18 --pixel-format yuv420p --audio-bitrate 320k
```

---

## 11. Phase 8 — Feed Video (4:5)

**Skill:** `SKILLS/video-feeds.md`
**Format:** 1080×1350 · 900 frames · 30fps

Same `PromoShort.tsx` component — only canvas height changes. No new component file needed.

Register 2 additional compositions in Root.tsx: `{SongTitle}{Year}-Feed-PL` / `-Feed-EN` (height: **1350**).

```bash
npx remotion render {SongTitle}{Year}-Feed-PL out/shorts/{songkey}_feed_pl.mp4 ...
npx remotion render {SongTitle}{Year}-Feed-EN out/shorts/{songkey}_feed_en.mp4 ...
```

If elements are clipped at 4:5, add `const isFeed = useVideoConfig().height === 1350` and adjust vertical positioning.

---

## 12. Session Management

**Skill:** `SKILLS/handoff.md`
**Trigger:** "wrap up" / "save progress" / "end session" / "goodnight" / `/handoff`

Claude writes `HANDOFF.md` at the project root covering:
- Current song + phase
- Completed this session
- Next actions (prioritized)
- Last script run + result
- Open QA issues
- Key files modified
- Pending decisions

Then updates `memory/MEMORY.md` with durable lessons.

### Memory types

| Type | File location | When to write |
|---|---|---|
| `feedback` | `memory/feedback_*.md` | User corrects an appREDACTED; confirmed non-obvious choice |
| `project` | `memory/project_*.md` | Who's doing what, why, by when |
| `user` | `memory/user_*.md` | User role, preferences, knowledge |
| `reference` | `memory/reference_*.md` | Where to find info in external systems |

MEMORY.md is an index (one-liner per entry) — full content lives in individual files.

---

## 13. Skill Summary + Slash Commands

| Command | Skill file | What it does |
|---|---|---|
| `/husaria-lyrics <topic>` | `~/.claude/skills/husaria-lyrics/SKILL.md` | Full bilingual lyric production (6 files) |
| `/handoff` | `SKILLS/handoff.md` | Save session state → HANDOFF.md + update MEMORY.md |
| new video for {song} | `SKILLS/new-song.md` | Full 8-phase pipeline with 5 parallel scaffold agents |
| *(video technical ref)* | `SKILLS/video-editor.md` | Detailed Remotion steps, scene planning, audio sync |
| *(lyric sync)* | `SKILLS/lyric-sync.md` | stable-ts forced alignment setup + QA loop |
| *(promo short)* | `SKILLS/video-shorts.md` | 30s 9:16 vertical clip pipeline |
| *(feed video)* | `SKILLS/video-feeds.md` | 4:5 Instagram Feed clip pipeline |
| *(tiktok spec)* | `SKILLS/tiktok-promo.md` | TikTok promo detailed spec (6-beat structure, T&C) |

---

## 14. Key Constants + File Naming

### Remotion render constants

```
FPS:           30
Canvas (main): 1920 × 1080
Canvas (short): 1080 × 1920
Canvas (feed):  1080 × 1350
Promo duration: 900 frames (30s)
Scene count:   17 (fixed — always)
```

### Scene image naming

```
s{N}_{scene_id}.jpg   → N = 1-15, scene_id = descriptive (e.g. s1_mist.jpg)
s7_chorus.jpg         → shared by scenes 7, 12, 16 (chorus)
s14_library.jpg       → "forgotten by West" scene — can reuse across songs
```

All images → `Remotion/public/{song_key}/scenes/`

### Video output naming (meta.json → matches upload workflow)

```
{slug}_pl.mp4         → main PL video (16:9)
{slug}_en.mp4         → main EN video (16:9)
{slug}-feed-pl.mp4    → promo short + feed PL (9:16 or 4:5)
{slug}-feed-en.mp4    → promo short + feed EN
{slug}_thumb.jpg      → YouTube thumbnail (1280×720)
```

### Section lyric colors (StoryScene.tsx)

| Section label contains | Primary color | Style |
|---|---|---|
| "refren" / "chorus" | `#c8a84b` gold | normal |
| "bridge" / "outro" | `#b0a090` muted | italic |
| anything else | `#e8d9b5` cream | normal |

### Audio-reactive lyric glow

`useAudioPulse(audioSrc)` in `src/shared/useAudioPulse.ts` returns 0–1 bass energy per frame.
Applied as: `0 0 ${pulse*20}px rgba(200,168,75,${pulse})` on active lyric textShadow.
**No CSS transitions** — Remotion renders frame-by-frame; `transition:` never fires.

---

## 15. Release Readiness Gate

Run before DistroKid upload:

- [ ] Audio: Suno Pro tier — commercial license confirmed
- [ ] `Remotion/public/{key}/audio_pl.mp3` + `audio_en.mp3` exist
- [ ] Demucs isolation complete (`vocals_pl.wav` + `vocals_en.wav`)
- [ ] stable-ts alignment done — QA thresholds passed (< 200ms avg drift)
- [ ] `lyrics_clean.txt` matches what's in `lyrics_pl/en.ts` exactly (digits, no extra blanks)
- [ ] All 15 scene JPGs in `Remotion/public/{key}/scenes/` (correct naming)
- [ ] SCENE_ORDER strictly monotonically increasing in `story_data.ts`
- [ ] All `imagePath` fields set on STORY_SCENES that have images
- [ ] Main video PL rendered — played through, subtitles visible + gold glow on beat
- [ ] Main video EN rendered — same checks
- [ ] Promo short PL + EN rendered (9:16, ≤30s)
- [ ] Feed video PL + EN rendered (4:5, ≤30s)
- [ ] `meta.json` complete: all platform captions, summary ≤80 chars, long_text, sources
- [ ] Thumbnail `{slug}_thumb.jpg` generated with text overlay — mobile check done
- [ ] DistroKid uploaded with correct release date (~1 day before YouTube)
- [ ] YouTube scheduled with thumbnails; PL + EN playlists assigned
- [ ] Social posts ready (TikTok/IG/FB)

---

## 16. Troubleshooting Quick Reference

| Problem | Cause | Fix |
|---|---|---|
| Subtitles 60-100fr early in Verse 3 / Bridge | Autotune onset lag varies by segment | Manual calibration in Remotion Studio; `--method stable` avoids this |
| Chorus last-line cramming (both < 60fr) | stable-ts collapses last 2 lines | MANUAL_OVERRIDES: separate by 90fr minimum |
| EN scene_timings wrong | Derived from full mix, not vocal WAV | Run Whisper word diagnostic on `vocals_en.wav` |
| `torchcodec DLL error` with demucs | torchaudio 2.11+ needs FFmpeg DLLs | Copy BtbN.FFmpeg.GPL.Shared.8.0 bin/ DLLs into `torchcodec` package dir |
| Scene shows gradient despite JPG existing | `imagePath` missing in story_data.ts | Add `imagePath: "{song}/scenes/sN_id.jpg"` to the scene entry |
| SCENE_ORDER scenes unreachable | SCENE_STARTS values not monotonically increasing | Reorder SCENE_STARTS to strictly increasing values |
| Root.tsx import error | Component name mismatch | Match import name exactly to the export in `{SongTitle_YYYY}Video.tsx` |
| Video renders but unplayable | Used `--crf 1` | Re-render with `--crf 18 --codec h264` |
| `[Verse 1: Male Rap]` delivery wrong | Old two-line format sent to Suno | Use combined inline label on ONE line |
| EN sync overflow past song duration | EN section window too short for line count | Inspect actual EN vocal WAV to find true section start times |
| kenBurns crash on load | `scene?.kenBurns` not guarded against undefined | Use `const k = scene?.kenBurns ?? { startScale: 1.0, endScale: 1.0, ... }` |
| Polish curly quotes in TS strings | `„text"` causes parse error | Use `\u201e` / `\u201d` Unicode escapes or plain ASCII `"` |
| DistroKid rejects cover art | Non-square image | PIL: `Image.new("RGB",(1024,1024),(0,0,0))` → scale source to fit → paste centered |
| Lyric subtitle text shows spelled-out numbers | `lyrics_clean.txt` not digit-converted | Update text fields in `lyrics_clean.txt` + re-run alignment |

---

_Last updated: 2026-05-08_
