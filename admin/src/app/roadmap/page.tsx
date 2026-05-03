/*
 * admin/src/app/roadmap/page.tsx — Roadmap page (client component).
 *
 * Album-level view of the production roadmap. Shows ALL albums (including
 * unreleased and planned), each with their songs, so the user can plan and
 * manage future content.
 *
 * Albums are ordered by status group (in_production → planned → released),
 * then by release_date ASC (nulls last), then by slug. Released albums
 * default to collapsed since they are already complete.
 *
 * Features:
 *   - Inline target-date editing per album (onBlur → PATCH /api/albums/:slug)
 *   - Inline status select per album (onChange → PATCH /api/albums/:slug)
 *   - "+ Add Song" inline form per album card (POST /api/songs)
 *   - "+ New Album" inline form in page header (POST /api/albums)
 *   - Standalone section for songs with no album_slug
 */
"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Album {
  slug:         string;
  title_pl:     string;
  title_en:     string | null;
  era:          string | null;
  status:       string;
  release_date: string | null;
}

interface Song {
  slug:       string;
  title_pl:   string;
  title_en:   string;
  status:     string;
  album_slug: string | null;
  year_event: number | null;
  era:        string | null;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const VALID_ERAS = [
  "medieval", "partitions", "wwi", "wwii", "cold_war", "modern",
];

const VALID_ALBUM_STATUSES = ["planned", "in_production", "released"];

/** Status group ordering used to sort albums top-to-bottom. */
const STATUS_ORDER: Record<string, number> = {
  in_production: 0,
  planned:       1,
  released:      2,
};

/** Status dot colour for album card header. */
const STATUS_DOT_COLOR: Record<string, string> = {
  planned:       "#6b6560",
  in_production: "#c8a84b",
  released:      "#2d6a4f",
};

/** Badge CSS class for song status chips (mirrors songs/page.tsx). */
const SONG_STATUS_BADGE: Record<string, string> = {
  scaffold:    "badge-gray",
  audio_ready: "badge-blue",
  sync_done:   "badge-yellow",
  render_done: "badge-orange",
  scheduled:   "badge-purple",
  released:    "badge-green",
};

/** Regex for validating slug inputs — lowercase kebab-case only. */
const SLUG_RE = /^[a-z0-9-]+$/;

// ─── Shared input styles (identical to songs/page.tsx) ────────────────────────

const CELL_INPUT: React.CSSProperties = {
  fontSize: 12, background: "transparent",
  border: "1px solid #3a3028", color: "#e8ddd5",
  borderRadius: 4, padding: "3px 6px", minWidth: 0,
};

const MONO_INPUT: React.CSSProperties = { ...CELL_INPUT, fontFamily: "monospace" };

// ─── Helper: album sort ────────────────────────────────────────────────────────

/**
 * sortAlbums — returns albums sorted by status group (in_production → planned →
 * released), then by release_date ASC (nulls last), then slug alphabetically.
 *
 * @param albums - Source array of Album objects.
 * @returns A new sorted array (input is not mutated).
 */
function sortAlbums(albums: Album[]): Album[] {
  return [...albums].sort((a, b) => {
    // Primary: status group order
    const so = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
    if (so !== 0) return so;

    // Secondary: release_date ASC, nulls last
    if (a.release_date && b.release_date) return a.release_date.localeCompare(b.release_date);
    if (a.release_date) return -1;
    if (b.release_date) return 1;

    // Tertiary: slug alphabetical
    return a.slug.localeCompare(b.slug);
  });
}

// ─── Micro-components ──────────────────────────────────────────────────────────

/**
 * TH — compact table header cell (mirrors songs/page.tsx).
 *
 * @param children - Header text or element.
 * @param width    - Optional fixed pixel width.
 */
function TH({ children, width }: { children: React.ReactNode; width?: number }) {
  return (
    <th style={{ fontSize: 11, padding: "6px 8px", whiteSpace: "nowrap",
                 minWidth: width, maxWidth: width }}>
      {children}
    </th>
  );
}

/**
 * TD — table data cell with consistent padding/alignment (mirrors songs/page.tsx).
 *
 * @param children - Cell content.
 * @param center   - Centre-align the content.
 */
function TD({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <td style={{ padding: "4px 6px", verticalAlign: "middle",
                 textAlign: center ? "center" : undefined }}>
      {children}
    </td>
  );
}

/**
 * SortableTH — clickable table header cell that toggles sort direction.
 * Shows a gold highlight and directional arrow when active, otherwise a
 * dim ↕ indicator to hint that the column is sortable.
 *
 * @param field     - Song field key this header sorts by.
 * @param label     - Display text for the header.
 * @param width     - Optional fixed pixel width.
 * @param sortField - Currently active sort field.
 * @param sortDir   - Current sort direction ("asc" | "desc").
 * @param onSort    - Callback invoked with `field` when clicked.
 */
function SortableTH({ field, label, width, sortField, sortDir, onSort }: {
  field: string; label: string; width?: number;
  sortField: string; sortDir: "asc" | "desc";
  onSort: (field: string) => void;
}) {
  const active = sortField === field;
  return (
    <th
      onClick={() => onSort(field)}
      style={{
        fontSize: 11, padding: "6px 8px", whiteSpace: "nowrap",
        minWidth: width, maxWidth: width,
        cursor: "pointer", userSelect: "none",
        color: active ? "#c8a84b" : undefined,
        background: "#1a1510",
      }}
    >
      {label} {active ? (sortDir === "asc" ? "↑" : "↓") : <span style={{ opacity: 0.3 }}>↕</span>}
    </th>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

/**
 * RoadmapPage — renders all albums with their songs in collapsible cards.
 *
 * Fetches /api/albums and /api/songs in parallel on mount. Albums are grouped
 * by status and sorted within each group. Songs with no album_slug appear in a
 * standalone section at the bottom.
 */
export default function RoadmapPage() {
  // ── State ────────────────────────────────────────────────────────────────────

  const [albums, setAlbums]         = useState<Album[]>([]);
  const [songs, setSongs]           = useState<Song[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  // Per-album PATCH in-flight state (dims the card slightly)
  const [savingAlbum, setSavingAlbum] = useState<Record<string, boolean>>({});

  // Per-album collapse state; released albums start collapsed
  const [collapsed, setCollapsed]   = useState<Set<string>>(new Set());

  // Per-album "add song" form visibility
  const [showAddSong, setShowAddSong] = useState<Record<string, boolean>>({});

  // Per-album add-song form field values
  const [addSongForm, setAddSongForm] = useState<
    Record<string, { slug: string; title_pl: string; title_en: string }>
  >({});

  // Per-album add-song POST in-flight state
  const [savingSong, setSavingSong] = useState<Record<string, boolean>>({});

  // "+ New Album" panel visibility + field values
  const [showNewAlbum, setShowNewAlbum] = useState(false);
  const [newAlbumForm, setNewAlbumForm] = useState({
    slug: "", title_pl: "", title_en: "", era: "", status: "planned",
  });
  const [savingNewAlbum, setSavingNewAlbum] = useState(false);

  // Toast: { msg, type }
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  // Shared sort state — applies to every album's song table simultaneously
  const [songSortField, setSongSortField] = useState<string>("year_event");
  const [songSortDir,   setSongSortDir]   = useState<"asc" | "desc">("asc");

  // ── Utilities ─────────────────────────────────────────────────────────────────

  /** Show a toast message that auto-dismisses after 3.5 s. */
  function showToast(msg: string, type: "ok" | "err" = "err") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  /** Toggle the expand/collapse state for a single album card. */
  function toggleCollapse(slug: string) {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  /**
   * handleSongSort — toggles direction if the same field is clicked again,
   * otherwise switches to the new field with ascending direction.
   *
   * @param field - The Song field key to sort by.
   */
  function handleSongSort(field: string) {
    if (field === songSortField) setSongSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSongSortField(field); setSongSortDir("asc"); }
  }

  // ── Data fetching ─────────────────────────────────────────────────────────────

  /**
   * fetchData — loads /api/albums and /api/songs in parallel.
   * Sets released albums to collapsed in the initial state.
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Parallel fetch: albums + songs
      const [albumRes, songRes] = await Promise.all([
        fetch("/api/albums"),
        fetch("/api/songs"),
      ]);
      if (!albumRes.ok) throw new Error(`Albums API ${albumRes.status}: ${albumRes.statusText}`);
      if (!songRes.ok)  throw new Error(`Songs API ${songRes.status}: ${songRes.statusText}`);

      const albumData: Album[] = await albumRes.json();
      const songData: Song[]   = await songRes.json();

      setAlbums(Array.isArray(albumData) ? albumData : []);
      setSongs(Array.isArray(songData) ? songData : []);

      // Released albums are "done" — start them collapsed
      const releasedSlugs = new Set<string>(
        (Array.isArray(albumData) ? albumData : [])
          .filter(a => a.status === "released")
          .map(a => a.slug),
      );
      setCollapsed(releasedSlugs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Mutations ─────────────────────────────────────────────────────────────────

  /**
   * patchAlbum — optimistically updates an album field, then PATCHes the API.
   * Reverts to prevAlbum and shows an error toast if the request fails.
   *
   * @param slug      - Album slug to update.
   * @param update    - Partial Album fields to send to the API.
   * @param prevAlbum - Snapshot used for revert on error.
   */
  async function patchAlbum(slug: string, update: Partial<Album>, prevAlbum: Album) {
    // Optimistic local update for immediate feedback
    setAlbums(prev => prev.map(a => a.slug === slug ? { ...a, ...update } : a));
    setSavingAlbum(prev => ({ ...prev, [slug]: true }));
    try {
      const res = await fetch(`/api/albums/${slug}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(update),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? res.statusText);
      }
      // Replace with confirmed server state
      const updated: Album = await res.json();
      setAlbums(prev => prev.map(a => a.slug === slug ? updated : a));
    } catch (e) {
      // Revert optimistic update
      setAlbums(prev => prev.map(a => a.slug === slug ? prevAlbum : a));
      showToast(`Error: ${e instanceof Error ? e.message : "Save failed"}`);
    } finally {
      setSavingAlbum(prev => ({ ...prev, [slug]: false }));
    }
  }

  /**
   * submitAddSong — validates and POSTs a new song linked to the given album.
   * Adds the song to local state on success and clears/closes the inline form.
   *
   * @param albumSlug - Slug of the album to attach the new song to.
   */
  async function submitAddSong(albumSlug: string) {
    const form = addSongForm[albumSlug] ?? { slug: "", title_pl: "", title_en: "" };

    // Validate all fields
    if (!form.slug || !form.title_pl || !form.title_en) {
      showToast("All three fields (slug, title_pl, title_en) are required.");
      return;
    }
    if (!SLUG_RE.test(form.slug)) {
      showToast("Slug must be lowercase kebab-case (letters, digits, hyphens only).");
      return;
    }

    setSavingSong(prev => ({ ...prev, [albumSlug]: true }));
    try {
      const res = await fetch("/api/songs", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          slug:       form.slug,
          title_pl:   form.title_pl,
          title_en:   form.title_en,
          album_slug: albumSlug,
          status:     "scaffold",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? res.statusText);
      }
      const newSong: Song = await res.json();
      setSongs(prev => [...prev, newSong]);
      // Clear the form and close the inline panel
      setAddSongForm(prev => ({ ...prev, [albumSlug]: { slug: "", title_pl: "", title_en: "" } }));
      setShowAddSong(prev => ({ ...prev, [albumSlug]: false }));
      showToast(`Song "${form.slug}" added.`, "ok");
    } catch (e) {
      showToast(`Error: ${e instanceof Error ? e.message : "Add song failed"}`);
    } finally {
      setSavingSong(prev => ({ ...prev, [albumSlug]: false }));
    }
  }

  /**
   * submitNewAlbum — validates and POSTs a new album.
   * Adds the album to local state on success and closes the form panel.
   */
  async function submitNewAlbum() {
    if (!newAlbumForm.slug || !newAlbumForm.title_pl) {
      showToast("Slug and Title PL are required.");
      return;
    }
    if (!SLUG_RE.test(newAlbumForm.slug)) {
      showToast("Slug must be lowercase kebab-case (letters, digits, hyphens only).");
      return;
    }

    setSavingNewAlbum(true);
    try {
      // Build the body; omit empty optional fields
      const body: Record<string, string> = {
        slug:     newAlbumForm.slug,
        title_pl: newAlbumForm.title_pl,
        status:   newAlbumForm.status,
      };
      if (newAlbumForm.title_en) body.title_en = newAlbumForm.title_en;
      if (newAlbumForm.era)      body.era      = newAlbumForm.era;

      const res = await fetch("/api/albums", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? res.statusText);
      }
      const newAlbum: Album = await res.json();
      setAlbums(prev => [...prev, newAlbum]);
      setNewAlbumForm({ slug: "", title_pl: "", title_en: "", era: "", status: "planned" });
      setShowNewAlbum(false);
      showToast(`Album "${newAlbum.slug}" created.`, "ok");
    } catch (e) {
      showToast(`Error: ${e instanceof Error ? e.message : "Create album failed"}`);
    } finally {
      setSavingNewAlbum(false);
    }
  }

  // ── Derived data ──────────────────────────────────────────────────────────────

  const sortedAlbums = sortAlbums(albums);

  /**
   * Group all songs by album_slug.
   * Songs with no album_slug are keyed under "_standalone".
   */
  const songsByAlbum: Record<string, Song[]> = {};
  for (const song of songs) {
    const key = song.album_slug ?? "_standalone";
    if (!songsByAlbum[key]) songsByAlbum[key] = [];
    songsByAlbum[key].push(song);
  }
  const standaloneSongs = songsByAlbum["_standalone"] ?? [];

  // ── Render helpers ─────────────────────────────────────────────────────────────

  /**
   * renderSongTable — renders the read-only song table inside a card body,
   * plus the inline "+ Add Song" form at the bottom (omitted for standalone).
   *
   * @param albumSlug    - Parent album slug used to key form state.
   * @param albumSongs   - Songs to display in the table.
   * @param isStandalone - When true, the add-song form is hidden.
   */
  function renderSongTable(albumSlug: string, albumSongs: Song[], isStandalone = false) {
    const isAddingVisible = !!showAddSong[albumSlug];
    const form            = addSongForm[albumSlug] ?? { slug: "", title_pl: "", title_en: "" };
    const isSavingSong    = !!savingSong[albumSlug];

    // Sort songs by the shared sort state before rendering
    const sortedSongs = [...albumSongs].sort((a, b) => {
      const dir = songSortDir === "asc" ? 1 : -1;
      if (songSortField === "year_event") return ((a.year_event ?? 0) - (b.year_event ?? 0)) * dir;
      const av = (a[songSortField as keyof Song] ?? "") as string;
      const bv = (b[songSortField as keyof Song] ?? "") as string;
      return av.localeCompare(bv) * dir;
    });

    return (
      <div style={{ padding: "12px 16px" }}>

        {/* Song table — read-only display + → Pipeline links */}
        {albumSongs.length > 0 ? (
          <div style={{ overflowX: "auto", borderRadius: 4, border: "1px solid #2a2018", marginBottom: 12 }}>
            <table className="data-table" style={{ minWidth: 600 }}>
              <thead>
                <tr>
                  <SortableTH field="slug"     label="Slug"     width={140} sortField={songSortField} sortDir={songSortDir} onSort={handleSongSort} />
                  <SortableTH field="title_pl" label="Title PL" width={160} sortField={songSortField} sortDir={songSortDir} onSort={handleSongSort} />
                  <SortableTH field="title_en" label="Title EN" width={160} sortField={songSortField} sortDir={songSortDir} onSort={handleSongSort} />
                  <SortableTH field="status"   label="Stage"    width={110} sortField={songSortField} sortDir={songSortDir} onSort={handleSongSort} />
                  <SortableTH field="era"      label="Era"      width={90}  sortField={songSortField} sortDir={songSortDir} onSort={handleSongSort} />
                  <SortableTH field="year_event" label="Year"   width={70}  sortField={songSortField} sortDir={songSortDir} onSort={handleSongSort} />
                  <TH width={80}>{""}</TH>
                </tr>
              </thead>
              <tbody>
                {sortedSongs.map(song => (
                  <tr key={song.slug}>

                    {/* Slug — monospace identifier */}
                    <TD>
                      <span style={{ fontFamily: "monospace", fontSize: 11, color: "#a89a92" }}>
                        {song.slug}
                      </span>
                    </TD>

                    {/* Title PL */}
                    <TD>
                      <span style={{ fontSize: 12, color: "#e8ddd5" }}>{song.title_pl}</span>
                    </TD>

                    {/* Title EN */}
                    <TD>
                      <span style={{ fontSize: 12, color: "#a89a92" }}>{song.title_en}</span>
                    </TD>

                    {/* Status badge — read-only display */}
                    <TD>
                      <span className={`badge ${SONG_STATUS_BADGE[song.status] ?? "badge-gray"}`}>
                        {song.status}
                      </span>
                    </TD>

                    {/* Era */}
                    <TD>
                      <span style={{ fontSize: 11, color: "#a89a92" }}>{song.era ?? "—"}</span>
                    </TD>

                    {/* Year event */}
                    <TD>
                      <span style={{ fontFamily: "monospace", fontSize: 11, color: "#a89a92" }}>
                        {song.year_event ?? "—"}
                      </span>
                    </TD>

                    {/* → Pipeline link */}
                    <TD center>
                      <Link
                        href="/pipeline"
                        title={`View "${song.slug}" in Pipeline`}
                        style={{ fontSize: 11, color: "#c8a84b", textDecoration: "none", whiteSpace: "nowrap" }}
                      >
                        → Pipeline
                      </Link>
                    </TD>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: "#6b6560", fontSize: 12, margin: "0 0 12px" }}>No songs yet.</p>
        )}

        {/* + Add Song controls — hidden for the standalone section */}
        {!isStandalone && (
          <>
            {!isAddingVisible ? (
              <button
                onClick={() => setShowAddSong(prev => ({ ...prev, [albumSlug]: true }))}
                style={{
                  fontSize: 12, padding: "4px 12px",
                  background: "transparent",
                  border: "1px solid #3a3028",
                  color: "#a89a92", borderRadius: 4, cursor: "pointer",
                }}
              >
                + Add Song
              </button>
            ) : (
              /* Inline add-song form */
              <div style={{
                display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap",
                padding: "10px 12px",
                background: "#14100d",
                border: "1px solid #3a3028",
                borderRadius: 6,
              }}>

                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <label style={{ fontSize: 10, color: "#a89a92", textTransform: "uppercase" }}>Slug *</label>
                  <input
                    value={form.slug}
                    placeholder="my-song-slug"
                    style={{ ...MONO_INPUT, width: 150 }}
                    disabled={isSavingSong}
                    onChange={e => setAddSongForm(prev => ({
                      ...prev,
                      [albumSlug]: { ...form, slug: e.target.value.toLowerCase() },
                    }))}
                    aria-label="New song slug"
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <label style={{ fontSize: 10, color: "#a89a92", textTransform: "uppercase" }}>Title PL *</label>
                  <input
                    value={form.title_pl}
                    placeholder="Tytuł po polsku"
                    style={{ ...CELL_INPUT, width: 160 }}
                    disabled={isSavingSong}
                    onChange={e => setAddSongForm(prev => ({
                      ...prev,
                      [albumSlug]: { ...form, title_pl: e.target.value },
                    }))}
                    aria-label="New song title PL"
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <label style={{ fontSize: 10, color: "#a89a92", textTransform: "uppercase" }}>Title EN *</label>
                  <input
                    value={form.title_en}
                    placeholder="English title"
                    style={{ ...CELL_INPUT, width: 160 }}
                    disabled={isSavingSong}
                    onChange={e => setAddSongForm(prev => ({
                      ...prev,
                      [albumSlug]: { ...form, title_en: e.target.value },
                    }))}
                    aria-label="New song title EN"
                  />
                </div>

                {/* Submit */}
                <button
                  onClick={() => submitAddSong(albumSlug)}
                  disabled={isSavingSong}
                  style={{
                    fontSize: 12, padding: "5px 14px",
                    background: "#c8a84b", color: "#0e0b07",
                    border: "none", borderRadius: 4, cursor: "pointer",
                    fontWeight: 600, opacity: isSavingSong ? 0.6 : 1,
                  }}
                >
                  {isSavingSong ? "Saving…" : "Add"}
                </button>

                {/* Cancel */}
                <button
                  onClick={() => {
                    setShowAddSong(prev => ({ ...prev, [albumSlug]: false }));
                    setAddSongForm(prev => ({
                      ...prev,
                      [albumSlug]: { slug: "", title_pl: "", title_en: "" },
                    }));
                  }}
                  disabled={isSavingSong}
                  style={{
                    fontSize: 12, padding: "5px 10px",
                    background: "transparent",
                    border: "1px solid #3a3028",
                    color: "#6b6560", borderRadius: 4, cursor: "pointer",
                  }}
                >
                  Cancel
                </button>

              </div>
            )}
          </>
        )}

      </div>
    );
  }

  /**
   * renderAlbumCard — renders a single album as a collapsible card with a
   * header (always visible) and a body (song table + add-song form).
   *
   * @param album - The Album object to render.
   */
  function renderAlbumCard(album: Album) {
    const isCollapsed = collapsed.has(album.slug);
    const isSaving    = !!savingAlbum[album.slug];
    const albumSongs  = songsByAlbum[album.slug] ?? [];
    const dotColor    = STATUS_DOT_COLOR[album.status] ?? "#6b6560";

    // Left border signals current workflow status
    const borderLeft =
      album.status === "in_production" ? "3px solid #c8a84b" :
      album.status === "released"      ? "3px solid #2d6a4f" :
      "3px solid transparent";

    // Released albums are visually de-emphasised
    const cardOpacity = album.status === "released" ? 0.7 : 1;

    return (
      <div
        key={album.slug}
        style={{
          background:   "#1a1510",
          border:       "1px solid rgba(200,168,75,0.15)",
          borderLeft,
          borderRadius: 8,
          opacity:      cardOpacity,
          marginBottom: 16,
          overflow:     "hidden",
          transition:   "opacity 0.15s",
        }}
      >

        {/* ── Card header — always visible, click to expand/collapse ── */}
        <div
          onClick={() => toggleCollapse(album.slug)}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 16px",
            cursor: "pointer",
            userSelect: "none",
            flexWrap: "wrap",
          }}
        >

          {/* Expand/collapse arrow — rotates when expanded */}
          <span
            aria-hidden="true"
            style={{
              display:    "inline-block",
              fontSize:   11,
              color:      "#a89a92",
              transform:  isCollapsed ? "rotate(0deg)" : "rotate(90deg)",
              transition: "transform 0.15s",
              minWidth:   12,
              flexShrink: 0,
            }}
          >▶</span>

          {/* Status dot */}
          <span
            aria-hidden="true"
            style={{
              display:      "inline-block",
              width: 9, height: 9,
              borderRadius: "50%",
              background:   dotColor,
              flexShrink:   0,
            }}
          />

          {/* Album titles: title_pl large serif + title_en small muted */}
          <div style={{ flex: "1 1 auto", minWidth: 0 }}>
            <span style={{
              fontFamily:    "Georgia, serif",
              fontSize:      17,
              fontWeight:    700,
              color:         "#e8ddd5",
              marginRight:   8,
              letterSpacing: "0.01em",
            }}>
              {album.title_pl}
            </span>
            {album.title_en && (
              <span style={{ fontSize: 12, color: "#6b6560" }}>
                {album.title_en}
              </span>
            )}
          </div>

          {/* Era badge — same style as songs page */}
          {album.era && (
            <span
              className="badge badge-gray"
              style={{ flexShrink: 0, fontSize: 10 }}
              onClick={e => e.stopPropagation()}
            >
              {album.era}
            </span>
          )}

          {/* Target release date — inline editable; stopPropagation prevents card toggle */}
          <input
            key={`release_date-${album.slug}-${album.release_date}`}
            defaultValue={album.release_date ?? ""}
            placeholder="YYYY-MM-DD"
            disabled={isSaving}
            title="Target release date (YYYY-MM-DD)"
            style={{ ...MONO_INPUT, width: 100, flexShrink: 0 }}
            onClick={e => e.stopPropagation()}
            onBlur={e => {
              const next = e.target.value.trim() || null;
              if (next !== album.release_date) patchAlbum(album.slug, { release_date: next }, album);
            }}
            aria-label={`Release date for album ${album.slug}`}
          />

          {/* Status select — onChange immediately PATCHes the album */}
          <select
            key={`status-${album.slug}-${album.status}`}
            value={album.status}
            disabled={isSaving}
            style={{
              ...CELL_INPUT,
              width:      120,
              flexShrink: 0,
              color:      dotColor,
              fontWeight: 600,
            }}
            onClick={e => e.stopPropagation()}
            onChange={e => {
              patchAlbum(album.slug, { status: e.target.value }, album);
              // Auto-collapse when marking as released
              if (e.target.value === "released") {
                setCollapsed(prev => new Set(prev).add(album.slug));
              }
            }}
            aria-label={`Status for album ${album.slug}`}
          >
            {VALID_ALBUM_STATUSES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Song count chip */}
          <span
            style={{
              fontSize: 11, padding: "2px 8px",
              background: "#14100d",
              border: "1px solid #3a3028",
              borderRadius: 10, color: "#a89a92",
              flexShrink: 0, whiteSpace: "nowrap",
            }}
            onClick={e => e.stopPropagation()}
          >
            {albumSongs.length} {albumSongs.length === 1 ? "song" : "songs"}
          </span>

        </div>
        {/* ── Card body — hidden when collapsed ── */}
        {!isCollapsed && renderSongTable(album.slug, albumSongs)}

      </div>
    );
  }

  // ── Page render ───────────────────────────────────────────────────────────────

  return (
    <>

      {/* Page header */}
      <div style={{
        display: "flex", alignItems: "flex-start",
        justifyContent: "space-between", marginBottom: 20,
      }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Roadmap</h1>
          {!loading && !error && (
            <p style={{ fontSize: 13, color: "#a89a92", margin: 0 }}>
              {albums.length} {albums.length === 1 ? "album" : "albums"} ·{" "}
              {songs.length} {songs.length === 1 ? "song" : "songs"} planned
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            className="btn-primary"
            onClick={() => setShowNewAlbum(v => !v)}
            style={{ fontSize: 13, padding: "6px 14px" }}
          >
            {showNewAlbum ? "✕ Cancel" : "+ New Album"}
          </button>
          <button
            className="btn-primary"
            onClick={fetchData}
            style={{
              fontSize: 13, padding: "6px 14px",
              background: "transparent",
              border: "1px solid #3a3028",
              color: "#a89a92",
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* New album inline form — displayed above the card list */}
      {showNewAlbum && (
        <div style={{
          background:   "#1a1510",
          border:       "1px solid rgba(200,168,75,0.3)",
          borderRadius: 8,
          padding:      "16px 20px",
          marginBottom: 20,
        }}>
          <p style={{
            fontSize: 12, color: "#c8a84b", fontWeight: 600,
            margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            New Album
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>

            {/* Slug — required, kebab-case */}
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <label style={{ fontSize: 10, color: "#a89a92", textTransform: "uppercase" }}>Slug *</label>
              <input
                value={newAlbumForm.slug}
                placeholder="album-slug"
                style={{ ...MONO_INPUT, width: 150 }}
                disabled={savingNewAlbum}
                onChange={e => setNewAlbumForm(f => ({ ...f, slug: e.target.value.toLowerCase() }))}
                aria-label="New album slug"
              />
            </div>

            {/* Title PL — required */}
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <label style={{ fontSize: 10, color: "#a89a92", textTransform: "uppercase" }}>Title PL *</label>
              <input
                value={newAlbumForm.title_pl}
                placeholder="Tytuł po polsku"
                style={{ ...CELL_INPUT, width: 180 }}
                disabled={savingNewAlbum}
                onChange={e => setNewAlbumForm(f => ({ ...f, title_pl: e.target.value }))}
                aria-label="New album title PL"
              />
            </div>

            {/* Title EN — optional */}
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <label style={{ fontSize: 10, color: "#a89a92", textTransform: "uppercase" }}>Title EN</label>
              <input
                value={newAlbumForm.title_en}
                placeholder="English title"
                style={{ ...CELL_INPUT, width: 180 }}
                disabled={savingNewAlbum}
                onChange={e => setNewAlbumForm(f => ({ ...f, title_en: e.target.value }))}
                aria-label="New album title EN"
              />
            </div>

            {/* Era — optional select */}
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <label style={{ fontSize: 10, color: "#a89a92", textTransform: "uppercase" }}>Era</label>
              <select
                value={newAlbumForm.era}
                style={{ ...CELL_INPUT, width: 110 }}
                disabled={savingNewAlbum}
                onChange={e => setNewAlbumForm(f => ({ ...f, era: e.target.value }))}
                aria-label="New album era"
              >
                <option value="">—</option>
                {VALID_ERAS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>

            {/* Status — defaults to planned */}
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <label style={{ fontSize: 10, color: "#a89a92", textTransform: "uppercase" }}>Status</label>
              <select
                value={newAlbumForm.status}
                style={{ ...CELL_INPUT, width: 120 }}
                disabled={savingNewAlbum}
                onChange={e => setNewAlbumForm(f => ({ ...f, status: e.target.value }))}
                aria-label="New album status"
              >
                {VALID_ALBUM_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Submit button */}
            <button
              onClick={submitNewAlbum}
              disabled={savingNewAlbum}
              style={{
                fontSize: 13, padding: "6px 16px",
                background: "#c8a84b", color: "#0e0b07",
                border: "none", borderRadius: 4,
                fontWeight: 700, cursor: "pointer",
                opacity: savingNewAlbum ? 0.6 : 1,
              }}
            >
              {savingNewAlbum ? "Creating…" : "Create Album"}
            </button>

          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div
          className={toast.type === "ok" ? "success-box" : "error-box"}
          style={{ marginBottom: 16 }}
        >
          {toast.msg}
        </div>
      )}

      {/* Loading / error states */}
      {loading && <p style={{ color: "#a89a92" }}>Loading…</p>}
      {error   && <div className="error-box"><strong>Could not load data — </strong>{error}</div>}

      {/* Album cards + standalone section */}
      {!loading && !error && (
        <>
          {sortedAlbums.length === 0 && standaloneSongs.length === 0 ? (
            <div style={{
              textAlign: "center", color: "#a89a92",
              padding: "64px 32px", fontSize: 15,
              border: "1px solid #2a2018", borderRadius: 8,
            }}>
              No albums yet. Use <strong>+ New Album</strong> to get started.
            </div>
          ) : (
            <>
              {/* One card per album, sorted by status group */}
              {sortedAlbums.map(album => renderAlbumCard(album))}

              {/* Standalone songs section — songs with no album_slug */}
              {standaloneSongs.length > 0 && (
                <div style={{
                  background:   "#1a1510",
                  border:       "1px solid rgba(200,168,75,0.1)",
                  borderLeft:   "3px solid #3a3028",
                  borderRadius: 8,
                  overflow:     "hidden",
                  marginTop:    8,
                }}>
                  {/* Section header */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "12px 16px",
                    borderBottom: "1px solid #2a2018",
                  }}>
                    <span style={{
                      fontFamily: "monospace", fontSize: 12,
                      fontWeight: 600, color: "#6b6560",
                      letterSpacing: "0.06em",
                    }}>
                      STANDALONE SONGS
                    </span>
                    <span style={{
                      fontSize: 11, padding: "2px 8px",
                      background: "#14100d",
                      border: "1px solid #3a3028",
                      borderRadius: 10, color: "#6b6560",
                    }}>
                      {standaloneSongs.length} {standaloneSongs.length === 1 ? "song" : "songs"}
                    </span>
                  </div>
                  {/* Reuse the song table renderer; isStandalone=true hides add-song form */}
                  {renderSongTable("_standalone", standaloneSongs, true)}
                </div>
              )}
            </>
          )}
        </>
      )}

    </>
  );
}
