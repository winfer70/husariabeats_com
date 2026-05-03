# routers/settings.py — Site settings endpoints
#
# Routes:
#   GET /api/settings   — return all settings as {key: value} dict
#   PUT /api/settings   — upsert a single setting key/value
#
# Settings keys: release_min_gap_hours, release_daily_limit, auto_release_enabled
#
# Inputs:  SettingUpdate(key: str, value: str)
# Outputs: SettingsOut({settings: dict[str, str]})

from __future__ import annotations

import databases
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# Injected by main.py lifespan
db: databases.Database | None = None

router = APIRouter(tags=["settings"])

_ALLOWED_KEYS = {"release_min_gap_hours", "release_daily_limit", "auto_release_enabled"}


class SettingUpdate(BaseModel):
    key:   str
    value: str


@router.get("/settings", response_model=dict[str, str])
async def get_settings():
    """Return all site settings as a flat key→value dict."""
    rows = await db.fetch_all("SELECT key, value FROM settings ORDER BY key")
    return {r["key"]: r["value"] for r in rows}


@router.put("/settings", response_model=dict[str, str])
async def update_setting(body: SettingUpdate):
    """
    Upsert a single setting value.

    Key must be in the allowed set. Returns full settings dict after update.
    """
    if body.key not in _ALLOWED_KEYS:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown setting key '{body.key}'. Allowed: {sorted(_ALLOWED_KEYS)}",
        )

    await db.execute(
        """
        INSERT INTO settings (key, value)
        VALUES (:key, :value)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        """,
        {"key": body.key, "value": body.value},
    )

    # Return full settings after update
    rows = await db.fetch_all("SELECT key, value FROM settings ORDER BY key")
    return {r["key"]: r["value"] for r in rows}
