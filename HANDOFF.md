# HANDOFF — HusariaBeats / Jarema Wiśniowiecki Session
Date: 2026-06-02

## What Was Accomplished

### Jarema Wiśniowiecki song — Phase 1 COMPLETE

Full bilingual lyrics created (PL + EN):
- Structure: Intro → Verse 1 (Male Rap, 10L) → Verse 2 (Female Rap, 6L) → Chorus (All, 5L) → Verse 3 (Male Rap, 10L) → Verse 4 (Narrator, 6L) → Bridge (Both, 8L) → Final Chorus (2L) → Outro
- Style: aggressive Drill 808 + Orchestral Trap, multi-voice (gritty male / female rap / deep narrator)
- Outro: "Pamiętajcie! / Polska nigdy nie zginęła! / HUSARIA BEATS!" (PL) / "Remember! / Poland never perished! / HUSARIA BEATS!" (EN)

Remotion scaffold created at `Proton Drive/.../HusariaBeats/Remotion/src/songs/Jarema_1651/`:
- Jarema_1651Video.tsx (adapted from CecoraVideo)
- story/story_data.ts (17 scenes)
- story/StoryManager.tsx + StoryScene.tsx
- data/scene_timings.ts + scene_timings_en.ts (all-zero placeholders)
- data/lyrics_pl.ts (50 lines, proportional timing estimates)
- data/lyrics_en.ts (50 lines, proportional timing estimates)
- public/jarema-wisnowiecki/ folder (audio placeholders + scenes/.gitkeep)

Compositions registered in Root.tsx:
- id="Jarema1651-PL" + id="Jarema1651-EN"

NewStructure song folder created at `Proton Drive/.../HusariaBeats/NewStructure/Unreleased/KREW_I_CHWALA/Jarema_1651/`:
- meta.json (full metadata, all platform descriptions)
- PL/ and EN/ folders with: lyrics_clean.txt, lyrics_suno.txt, suno_prompt.txt, description_youtube.txt, tags_youtube.txt, hype_post_facebook.txt, hype_post_instagram.txt
- SHARED/LeonardoPrompts.txt (15 image prompts)
- SHARED/historical_research.txt

## Current State
- Phase 1 (Scaffold) COMPLETE
- Phase 2 (Audio) PENDING — user must generate in Suno

## Exact Next Action
1. Open `NewStructure/Unreleased/KREW_I_CHWALA/Jarema_1651/PL/suno_prompt.txt` + `PL/lyrics_suno.txt`
2. Paste into Suno → generate PL vocal
3. Repeat for EN
4. Save both MP3s to PL/ and EN/ folders
5. Tell Claude: "Audio saved, copy to Remotion for jarema-wisnowiecki" → Phase 3 sync runs automatically

## Known Issues / Notes
- StoryScene.tsx import path `../../../../shared/useAudioPulse` — verify in Remotion Studio (may need `../../../shared/useAudioPulse`)
- lyrics_pl.ts / lyrics_en.ts startFrame values are estimates — sync scripts overwrite with real timestamps in Phase 3
- ZAPOMNIANI 4-song release queue (general-maczek, groszkowski-janusz, kosacki-mine-detector, wojtek-niedzwiedz) still pending

## Blockers
None. Phase 2 is a human Suno task.
