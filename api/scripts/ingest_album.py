#!/usr/bin/env python3
# api/scripts/ingest_album.py — Ingest album folder into releases/
#
# Scans an album directory (e.g. ZAPOMNIANI-2026-06), reads each song's
# meta.json for the slug, locates the 6 required release files, and copies
# them to /releases/{slug}/ with standardized names.
#
# Expected album structure:
#   {AlbumDir}/{SongFolder}/meta.json         — contains slug
#   {AlbumDir}/{SongFolder}/PL/*_pl.mp4       — full YouTube PL
#   {AlbumDir}/{SongFolder}/PL/*-feed-pl.mp4  — feed PL (Shorts/TikTok/IG/FB)
#   {AlbumDir}/{SongFolder}/EN/*_en.mp4       — full YouTube EN
#   {AlbumDir}/{SongFolder}/EN/*-feed-en.mp4  — feed EN
#   {AlbumDir}/thumbnails/{slug}_thumb.jpg    — YouTube thumbnail
#   {AlbumDir}/zapomnianiFeed/                — fallback for feed videos
#
# Usage:
#   python3 ingest_album.py <album_dir> [--releases-dir /path] [--copy]
#   Default mode: dry-run (shows what would happen, copies nothing)
#   --copy: actually copy files to releases/

from __future__ import annotations

import argparse
import json
import re
import shutil
from pathlib import Path

_PROJECT_DIR = Path(__file__).resolve().parents[2]
RELEASES_DIR_DEFAULT = _PROJECT_DIR / "releases"

# ── Helpers ───────────────────────────────────────────────────────────────────

def find_video(search_dir: Path, *patterns: str) -> Path | None:
    """Return first file matching any of the given glob patterns in search_dir."""
    for pattern in patterns:
        matches = sorted(search_dir.glob(pattern))
        if matches:
            return matches[0]
    return None


def find_thumbnail(thumbnails_dir: Path, slug: str) -> Path | None:
    """
    Try both hyphen and underscore thumbnail naming variants.
    e.g. wojtek-niedzwiedz → wojtek_niedzwiedz_thumb.jpg
    """
    candidates = [
        thumbnails_dir / f"{slug}_thumb.jpg",
        thumbnails_dir / f"{slug.replace('-', '_')}_thumb.jpg",
    ]
    for p in candidates:
        if p.exists():
            return p
    return None


def find_feed_in_fallback(feed_dir: Path, slug: str, lang: str) -> Path | None:
    """
    Search zapomnianiFeed/ for a feed video matching this slug + language.
    Files there use naming like 'CaptainPilecki-Feed-PL.mp4'.
    Derives TitleCase stem from slug for matching.
    """
    if not feed_dir or not feed_dir.exists():
        return None
    lang_upper = lang.upper()
    # Build TitleCase stem from slug (captain-pilecki → CaptainPilecki)
    title_case = "".join(p.capitalize() for p in slug.split("-"))
    for candidate in sorted(feed_dir.iterdir()):
        name = candidate.name
        if not name.endswith(".mp4"):
            continue
        name_up = name.upper()
        if f"-{lang_upper}" in name_up and (
            title_case.upper() in name_up
            or any(p.upper() in name_up for p in slug.split("-") if len(p) > 3)
        ):
            return candidate
    return None


# ── Song processing ───────────────────────────────────────────────────────────

def process_song(
    song_dir: Path,
    thumbnails_dir: Path,
    feed_dir: Path | None,
    releases_dir: Path,
    copy: bool,
) -> dict:
    """
    Process one song directory.

    Args:
        song_dir:       Path to the song subfolder containing meta.json.
        thumbnails_dir: Path to album-level thumbnails/ directory.
        feed_dir:       Optional path to album-level zapomnianiFeed/ directory.
        releases_dir:   Destination root (releases/{slug}/).
        copy:           If True, copy files; otherwise dry-run.

    Returns:
        Dict with keys: slug, files (target→src), ready, copied.
    """
    meta_path = song_dir / "meta.json"
    if not meta_path.exists():
        return {"slug": song_dir.name, "error": "no meta.json", "ready": False}

    try:
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        return {"slug": song_dir.name, "error": f"invalid meta.json: {exc}", "ready": False}

    slug = meta.get("slug")
    if not slug:
        return {"slug": song_dir.name, "error": "meta.json missing 'slug'", "ready": False}

    pl_dir = song_dir / "PL"
    en_dir = song_dir / "EN"

    def find_pl_full() -> Path | None:
        """Full 16:9 PL video — *_pl.mp4 or *-PL.mp4, excluding feed."""
        for pattern in ("*_pl.mp4", "*-PL.mp4", "*-pl.mp4", "*_PL.mp4"):
            for f in sorted(pl_dir.glob(pattern)):
                if "feed" not in f.name.lower():
                    return f
        return None

    def find_en_full() -> Path | None:
        """Full 16:9 EN video — *_en.mp4 or *-EN.mp4, excluding feed."""
        for pattern in ("*_en.mp4", "*-EN.mp4", "*-en.mp4", "*_EN.mp4"):
            for f in sorted(en_dir.glob(pattern)):
                if "feed" not in f.name.lower():
                    return f
        return None

    def find_feed_pl() -> Path | None:
        """Feed 9:16 PL video — check per-song dir first, fallback to zapomnianiFeed."""
        found = find_video(pl_dir, "*-feed-pl.mp4", "*feed-pl.mp4")
        return found or find_feed_in_fallback(feed_dir, slug, "PL")

    def find_feed_en() -> Path | None:
        """Feed 9:16 EN video — check per-song dir first, fallback to zapomnianiFeed."""
        found = find_video(en_dir, "*-feed-en.mp4", "*feed-en.mp4")
        return found or find_feed_in_fallback(feed_dir, slug, "EN")

    sources: dict[str, Path | None] = {
        f"{slug}_pl.mp4":      find_pl_full(),
        f"{slug}_en.mp4":      find_en_full(),
        f"{slug}-feed-pl.mp4": find_feed_pl(),
        f"{slug}-feed-en.mp4": find_feed_en(),
        f"{slug}_thumb.jpg":   find_thumbnail(thumbnails_dir, slug),
        "meta.json":           meta_path,
    }

    ready = all(v is not None for v in sources.values())
    copied: list[str] = []

    if copy:
        dest_dir = releases_dir / slug
        dest_dir.mkdir(parents=True, exist_ok=True)
        for target_name, src in sources.items():
            if src:
                shutil.copy2(src, dest_dir / target_name)
                copied.append(target_name)

    return {"slug": slug, "files": sources, "ready": ready, "copied": copied}


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Ingest album folder into releases/ with standardized filenames."
    )
    parser.add_argument("album_dir", type=Path, help="Album root dir (e.g. ZAPOMNIANI-2026-06)")
    parser.add_argument(
        "--releases-dir",
        type=Path,
        default=RELEASES_DIR_DEFAULT,
        help=f"Destination releases root (default: {RELEASES_DIR_DEFAULT})",
    )
    parser.add_argument(
        "--copy",
        action="store_true",
        help="Actually copy files (default: dry run, no files written)",
    )
    args = parser.parse_args()

    album_dir = args.album_dir.resolve()
    if not album_dir.exists():
        print(f"ERROR: album dir not found: {album_dir}")
        return 1

    thumbnails_dir = album_dir / "thumbnails"
    feed_dir       = album_dir / "zapomnianiFeed"

    print(f"Album:    {album_dir}")
    print(f"Releases: {args.releases_dir}")
    print(f"Mode:     {'COPY' if args.copy else 'DRY RUN (pass --copy to write)'}")
    print()

    # Song dirs = subdirs that contain meta.json (excludes thumbnails/, zapomnianiFeed/, etc.)
    song_dirs = sorted(
        d for d in album_dir.iterdir()
        if d.is_dir() and (d / "meta.json").exists()
    )

    if not song_dirs:
        print("No song directories with meta.json found.")
        return 1

    total_ready  = 0
    total_copied = 0

    for song_dir in song_dirs:
        result = process_song(song_dir, thumbnails_dir, feed_dir, args.releases_dir, args.copy)

        if "error" in result:
            print(f"  ✗  {result['slug']}: {result['error']}")
            print()
            continue

        slug   = result["slug"]
        files  = result["files"]
        ready  = result["ready"]
        copied = result["copied"]

        status = "✓ READY  " if ready else "✗ MISSING"
        print(f"  {status}  {slug}")

        album_prefix = str(album_dir) + "/"
        for fname, src in files.items():
            icon     = "✓" if src else "✗"
            src_disp = str(src).replace(album_prefix, "") if src else "NOT FOUND"
            copied_tag = " [copied]" if fname in copied else ""
            print(f"    {icon}  {fname:<42}{src_disp}{copied_tag}")

        if ready:
            total_ready += 1
        if copied:
            total_copied += len(copied)
        print()

    print("─" * 70)
    print(f"Songs ready: {total_ready}/{len(song_dirs)}")
    if args.copy:
        print(f"Files copied: {total_copied}")
    else:
        print("Dry run complete — pass --copy to actually write files to releases/")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
