# routers/historical_figures.py — CRUD endpoints for historical_figures table
#
# Routes:
#   GET    /api/figures           — list all figures ordered by name_pl
#   GET    /api/figures/{slug}    — retrieve one figure or 404
#   POST   /api/figures           — create a new figure
#   PATCH  /api/figures/{slug}    — partial update (only non-None fields)
#   DELETE /api/figures/{slug}    — delete figure or 404
#
# The historical_figures table stores biographical and narrative data for the
# Polish heroes featured on the ZAPOMNIANI album, including the Double Betrayal
# Arc narratives (arc_west = Western abandonment, arc_east = Communist erasure).
#
# Injected dependency:
#   db — databases.Database, set by main.py lifespan before serving requests

from __future__ import annotations

import databases
from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel

# Injected by main.py lifespan
db: databases.Database | None = None

router = APIRouter(tags=["historical_figures"])


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class FigureOut(BaseModel):
    """Full representation of a historical figure returned by GET endpoints."""
    slug: str
    name_pl: str
    name_en: str
    birth_year: int | None
    death_year: int | None
    bio_pl: str | None
    bio_en: str | None
    arc_west_pl: str | None
    arc_west_en: str | None
    arc_east_pl: str | None
    arc_east_en: str | None
    image_url: str | None


class FigureCreate(BaseModel):
    """Payload for creating a new historical figure (POST /api/figures)."""
    slug: str
    name_pl: str
    name_en: str
    birth_year: int | None = None
    death_year: int | None = None
    bio_pl: str | None = None
    bio_en: str | None = None
    arc_west_pl: str | None = None
    arc_west_en: str | None = None
    arc_east_pl: str | None = None
    arc_east_en: str | None = None
    image_url: str | None = None


class FigureUpdate(BaseModel):
    """Payload for partial update (PATCH /api/figures/{slug}).
    Only non-None fields are written to the database."""
    name_pl: str | None = None
    name_en: str | None = None
    birth_year: int | None = None
    death_year: int | None = None
    bio_pl: str | None = None
    bio_en: str | None = None
    arc_west_pl: str | None = None
    arc_west_en: str | None = None
    arc_east_pl: str | None = None
    arc_east_en: str | None = None
    image_url: str | None = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_COLUMNS = [
    "slug", "name_pl", "name_en", "birth_year", "death_year",
    "bio_pl", "bio_en", "arc_west_pl", "arc_west_en",
    "arc_east_pl", "arc_east_en", "image_url",
]

_SELECT_COLS = ", ".join(_COLUMNS)


def _row_to_out(row) -> FigureOut:
    """Convert a databases Row to a FigureOut Pydantic model.

    Args:
        row: A databases.Record returned by fetch_one / fetch_all.

    Returns:
        FigureOut populated from the row.
    """
    return FigureOut(**{col: row[col] for col in _COLUMNS})


async def _assert_exists(slug: str) -> None:
    """Raise HTTP 404 if a figure with the given slug does not exist.

    Args:
        slug: Primary key to look up.

    Raises:
        HTTPException 404 if not found.
    """
    row = await db.fetch_one(
        "SELECT slug FROM historical_figures WHERE slug = :slug",
        {"slug": slug},
    )
    if not row:
        raise HTTPException(status_code=404, detail=f"Figure '{slug}' not found")


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/figures", response_model=list[FigureOut])
async def list_figures():
    """
    Return all historical figures ordered alphabetically by Polish name.

    Returns:
        List of FigureOut objects, possibly empty.
    """
    rows = await db.fetch_all(
        f"SELECT {_SELECT_COLS} FROM historical_figures ORDER BY name_pl",
    )
    return [_row_to_out(r) for r in rows]


@router.get("/figures/{slug}", response_model=FigureOut)
async def get_figure(slug: str):
    """
    Return a single historical figure by slug.

    Args:
        slug: Primary key slug (path param).

    Returns:
        FigureOut for the matching row.

    Raises:
        HTTPException 404 if not found.
    """
    row = await db.fetch_one(
        f"SELECT {_SELECT_COLS} FROM historical_figures WHERE slug = :slug",
        {"slug": slug},
    )
    if not row:
        raise HTTPException(status_code=404, detail=f"Figure '{slug}' not found")
    return _row_to_out(row)


@router.post("/figures", response_model=FigureOut, status_code=201)
async def create_figure(body: FigureCreate):
    """
    Insert a new historical figure record.

    Args:
        body: FigureCreate with required slug, name_pl, name_en and optional fields.

    Returns:
        FigureOut of the newly created row with HTTP 201.

    Raises:
        HTTPException 409 if a figure with the same slug already exists.
    """
    # Check for duplicate slug before attempting insert
    existing = await db.fetch_one(
        "SELECT slug FROM historical_figures WHERE slug = :slug",
        {"slug": body.slug},
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Figure with slug '{body.slug}' already exists",
        )

    await db.execute(
        """
        INSERT INTO historical_figures
            (slug, name_pl, name_en, birth_year, death_year,
             bio_pl, bio_en, arc_west_pl, arc_west_en,
             arc_east_pl, arc_east_en, image_url)
        VALUES
            (:slug, :name_pl, :name_en, :birth_year, :death_year,
             :bio_pl, :bio_en, :arc_west_pl, :arc_west_en,
             :arc_east_pl, :arc_east_en, :image_url)
        """,
        body.dict(),
    )

    row = await db.fetch_one(
        f"SELECT {_SELECT_COLS} FROM historical_figures WHERE slug = :slug",
        {"slug": body.slug},
    )
    return _row_to_out(row)


@router.patch("/figures/{slug}", response_model=FigureOut)
async def update_figure(slug: str, body: FigureUpdate):
    """
    Partially update a historical figure — only non-None fields are written.

    Args:
        slug: Primary key slug (path param).
        body: FigureUpdate with any subset of updatable fields.

    Returns:
        Updated FigureOut.

    Raises:
        HTTPException 404 if slug not found.
        HTTP 204 (via Response) if body contains no updatable fields.
    """
    await _assert_exists(slug)

    # Build SET clause only for fields explicitly provided in the request body
    updates = {k: v for k, v in body.dict().items() if v is not None}
    if not updates:
        # Nothing to update — return 204 No Content
        return Response(status_code=204)

    set_clause = ", ".join(f"{col} = :{col}" for col in updates)
    params = {**updates, "slug": slug}

    await db.execute(
        f"UPDATE historical_figures SET {set_clause} WHERE slug = :slug",
        params,
    )

    row = await db.fetch_one(
        f"SELECT {_SELECT_COLS} FROM historical_figures WHERE slug = :slug",
        {"slug": slug},
    )
    return _row_to_out(row)


@router.delete("/figures/{slug}", status_code=204)
async def delete_figure(slug: str):
    """
    Delete a historical figure by slug.

    Args:
        slug: Primary key slug (path param).

    Returns:
        204 No Content on success.

    Raises:
        HTTPException 404 if slug not found.
    """
    await _assert_exists(slug)
    await db.execute(
        "DELETE FROM historical_figures WHERE slug = :slug",
        {"slug": slug},
    )
