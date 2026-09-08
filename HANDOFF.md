# HANDOFF — husariabeats_com
Date: 2026-08-29 (updated by Cursor scan)

## Current state
- Branch: `main` ⚠️ — `main` and `dev` are at the same commit (`268a389`), so no divergence risk right now. But next work should branch off `dev`, not `main`.
- Security remediation complete. Repo is safe to make public.
- `release.sh` has placeholder host/user values — fill before next deploy.

## Recent work
- Jarema Wisniowiecki song session documented (merged `feature/jarema-wisniowiecki-handoff`).
- Security sanitization (secrets, LAN IPs removed from history).
- Admin dashboard expansion, historical figures, upload pipeline.

## Song data location
No `content/songs/` directory. Song data lives in `data/husariabeats_song.md` and `data/AUTOMATION_REFERENCE.md`.

## Immediate next action
**Jarema_1651 Suno audio** — generate PL+EN audio via Suno, save as `audio_pl.mp3` and `audio_en.mp3` into the song folder / db entry, then say "Audio saved" to proceed with the pipeline. Skills at: `C:\Users\koter\Proton Drive\kamilo420\My files\HusariaBeats\SKILLS\new-song.md`

## n8n Code node reminder
`helpers.httpRequest`, URL-encoded body. Not `$helpers`, not `fetch`, not `FormData`.

## Other next actions
1. Before next deploy: fill `release.sh` with actual production host/user (labserver or swiss-knife — confirm current host).
2. Apply any pending SQL migration files in `db/` manually on live DB.
3. Make `winfer70/husariabeats_com` public on GitHub — security review complete.
4. Future: GRANICE album (next after Jarema_1651).
