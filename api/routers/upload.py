# routers/upload.py — File upload endpoint for release assets
#
# Routes:
#   GET  /api/upload/{slug}/status  — list which of the 5 expected files exist for a song
#   POST /api/upload/{slug}/{filename} — stream a release file to disk at /releases/{slug}/
#   DELETE /api/upload/{slug}/{filename} — delete a release file
#
# Files are written to /releases/{slug}/ which is bind-mounted from
# ./releases/ on the host (served by nginx at /releases/).
#
# Inputs:  slug (must exist in songs table), filename (validated against pattern)
# Outputs: FileStatusOut | UploadOut | 204 No Content

from __future__ import annotations

import re
import shutil
from pathlib import Path

import databases
from fastapi import APIRouter, HTTPException, UploadFile
from pydantic import BaseModel

db: databases.Database | None = None

router = APIRouter(tags=["upload"])

RELEASES_DIR = Path("/releases")

# Expected files per song slug — order matters for display
_EXPECTED_SUFFIXES = [
    ("_pl.mp4",       "YouTube long-form PL",       "video"),
    ("_en.mp4",       "YouTube long-form EN",       "video"),
    ("-feed-pl.mp4",  "Feed PL (Shorts/TikTok/IG/FB)", "video"),
    ("-feed-en.mp4",  "Feed EN (Shorts/TikTok/IG/FB)", "video"),
    ("_thumb.jpg",    "YouTube thumbnail",          "image"),
    ("/meta.json",    "Release metadata",           "json"),
]

# Valid filename patterns (security: reject path traversal and unexpected files)
_VALID_PATTERNS = [
    re.compile(r"^[a-z0-9][a-z0-9-]*_pl\.mp4$"),
    re.compile(r"^[a-z0-9][a-z0-9-]*_en\.mp4$"),
    re.compile(r"^[a-z0-9][a-z0-9-]*-feed-pl\.mp4$"),
    re.compile(r"^[a-z0-9][a-z0-9-]*-feed-en\.mp4$"),
    re.compile(r"^[a-z0-9][a-z0-9-]*_thumb\.jpg$"),
    re.compile(r"^meta\.json$"),
]

MAX_SIZE_BYTES = 4 * 1024 * 1024 * 1024  # 4 GB hard cap


class FileEntry(BaseModel):
    """Status of a single expected release file."""
    filename: str
    label:    str
    kind:     str   # video | image | json
    exists:   bool
    size_mb:  float | None  # None when file missing


class FileStatusOut(BaseModel):
    """All expected files for a given song slug."""
    slug:       str
    base_url:   str
    files:      list[FileEntry]
    ready:      bool  # True when all 6 files present


class UploadOut(BaseModel):
    """Result of a successful upload."""
    slug:      str
    filename:  str
    size_bytes: int
    path:      str


def _validate_filename(filename: str) -> None:
    """Raise 422 if filename does not match any allowed pattern."""
    if not any(p.match(filename) for p in _VALID_PATTERNS):
        raise HTTPException(
            status_code=422,
            detail=f"Invalid filename '{filename}'. Must match: {{slug}}_pl.mp4, _en.mp4, -feed-pl.mp4, -feed-en.mp4, _thumb.jpg, or meta.json",
        )


async def _assert_slug_exists(slug: str) -> None:
    """Raise 404 if slug not found in songs table."""
    row = await db.fetch_one("SELECT slug FROM songs WHERE slug = :slug", {"slug": slug})
    if not row:
        raise HTTPException(status_code=404, detail=f"Song '{slug}' not found")


@router.get("/upload/{slug}/status", response_model=FileStatusOut)
async def get_upload_status(slug: str):
    """
    Return which of the 6 expected release files exist for a song slug.

    Args:
        slug: Song slug to check.

    Returns:
        FileStatusOut with per-file existence and size info.
    """
    await _assert_slug_exists(slug)

    song_dir = RELEASES_DIR / slug
    files: list[FileEntry] = []

    for suffix, label, kind in _EXPECTED_SUFFIXES:
        if suffix == "/meta.json":
            filename = "meta.json"
            path = song_dir / "meta.json"
        else:
            filename = f"{slug}{suffix}"
            path = song_dir / filename

        exists   = path.exists()
        size_mb  = round(path.stat().st_size / (1024 * 1024), 2) if exists else None
        files.append(FileEntry(filename=filename, label=label, kind=kind, exists=exists, size_mb=size_mb))

    releases_base = "https://husariabeats.com/releases"
    return FileStatusOut(
        slug=slug,
        base_url=f"{releases_base}/{slug}",
        files=files,
        ready=all(f.exists for f in files),
    )


async def _check_and_advance_status(slug: str) -> None:
    """Auto-advance song to render_done when all 6 expected files are present."""
    song_dir = RELEASES_DIR / slug
    all_present = all(
        (song_dir / (f"{slug}{suf}" if suf != "/meta.json" else "meta.json")).exists()
        for suf, _, _ in _EXPECTED_SUFFIXES
    )
    if not all_present:
        return
    row = await db.fetch_one("SELECT status FROM songs WHERE slug = :slug", {"slug": slug})
    if row and row["status"] not in ("scheduled", "released"):
        await db.execute(
            "UPDATE songs SET status = 'render_done' WHERE slug = :slug",
            {"slug": slug},
        )


@router.post("/upload/{slug}/{filename}", response_model=UploadOut, status_code=201)
async def upload_file(slug: str, filename: str, file: UploadFile):
    """
    Stream a release file to disk at /releases/{slug}/{filename}.

    Validates: slug exists in DB, filename matches allowed pattern,
    file size within 4 GB cap.

    Args:
        slug:     Song slug (path param).
        filename: Target filename (path param) — must match allowed pattern.
        file:     Multipart file upload body.

    Returns:
        UploadOut with slug, filename, size.

    Raises:
        HTTPException 404 if slug not found.
        HTTPException 422 if filename invalid.
        HTTPException 413 if file exceeds 4 GB.
    """
    await _assert_slug_exists(slug)
    _validate_filename(filename)

    song_dir = RELEASES_DIR / slug
    song_dir.mkdir(parents=True, exist_ok=True)

    dest = song_dir / filename

    # Stream file to disk in 1 MB chunks to avoid loading large videos into memory
    written = 0
    try:
        with dest.open("wb") as out:
            while chunk := await file.read(1024 * 1024):
                written += len(chunk)
                if written > MAX_SIZE_BYTES:
                    out.close()
                    dest.unlink(missing_ok=True)
                    raise HTTPException(status_code=413, detail="File exceeds 4 GB limit")
                out.write(chunk)
    except HTTPException:
        raise
    except Exception as exc:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Write failed: {exc}") from exc

    await _check_and_advance_status(slug)
    return UploadOut(
        slug=slug,
        filename=filename,
        size_bytes=written,
        path=str(dest),
    )


@router.delete("/upload/{slug}/{filename}", status_code=204)
async def delete_file(slug: str, filename: str):
    """
    Delete a release file from /releases/{slug}/{filename}.

    Args:
        slug:     Song slug.
        filename: Filename to delete — must match allowed pattern.

    Returns:
        204 No Content on success.

    Raises:
        HTTPException 404 if slug or file not found.
        HTTPException 422 if filename invalid.
    """
    await _assert_slug_exists(slug)
    _validate_filename(filename)

    dest = RELEASES_DIR / slug / filename
    if not dest.exists():
        raise HTTPException(status_code=404, detail=f"File '{filename}' not found for '{slug}'")

    dest.unlink()
