/*
 * admin/src/app/songs/page.tsx — Song management page (client component).
 *
 * Wide horizontally-scrollable table. Every cell is inline-editable:
 *   onBlur → PATCH /api/songs/:slug (text inputs)
 *   onChange → PATCH /api/songs/:slug (select dropdowns)
 *
 * Main table columns (all inline-editable):
 *   Slug | Title PL | Title EN | Status | Album | Era | Year | Release
 *   YT PL | YT EN | Spotify | Apple | Amazon | YT Music | iTunes
 *
 * Expanded detail row (▶ toggle) — rich content only:
 *   subtitle_pl/en, summary_pl/en, long_text_pl/en, sources, image_path, year_label, bg_hue, bg_label
 *
 * Optimistic UI: local state updates immediately; API errors revert + show toast.
 */
"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Song {
  slug:              string;
  title_pl:          string;
  title_en:          string;
  status:            string;
  album_slug:        string | null;
  year_event:        number | null;
  era:               string | null;
  image_path:        string | null;
  youtube_id_pl:     string | null;
  youtube_id_en:     string | null;
  youtube_short_pl:  string | null;
  youtube_short_en:  string | null;
  spotify_url:       string | null;
  apple_music_url:   string | null;
  amazon_url:        string | null;
  youtube_music_url: string | null;
  itunes_url:        string | null;
  release_date:      string | null;
  subtitle_pl:       string | null;
  subtitle_en:       string | null;
  summary_pl:        string | null;
  summary_en:        string | null;
  long_text_pl:      string | null;
  long_text_en:      string | null;
  sources:           string[];
  year_label:        string | null;
  bg_hue:            string | null;
  bg_label:          string | null;
}

const VALID_STATUSES = [
  "scaffold", "audio_ready", "sync_done", "render_done", "ready_to_release", "queued", "released",
];

const VALID_ERAS = [
  "medieval", "partitions", "wwi", "wwii", "cold_war", "modern",
];

const STATUS_BADGE: Record<string, string> = {
  scaffold:         "badge-gray",
  audio_ready:      "badge-blue",
  sync_done:        "badge-yellow",
  render_done:      "badge-orange",
  ready_to_release: "badge-lime",
  queued:           "badge-teal",
  released:         "badge-green",
};

// Shared cell + input styles
const CELL_INPUT: React.CSSProperties = {
  fontSize: 12, background: "transparent",
  border: "1px solid #3a3028", color: "#e8ddd5",
  borderRadius: 4, padding: "3px 6px", minWidth: 0,
};

const MONO_INPUT: React.CSSProperties = { ...CELL_INPUT, fontFamily: "monospace" };

/** Text input that fires PATCH on blur if value changed. */
function InlineInput({
  songSlug, field, value, disabled, onPatch,
  placeholder = "—", mono = false, width = 110,
}: {
  songSlug:     string;
  field:        string;
  value:        string | null;
  disabled:     boolean;
  onPatch:      (update: Partial<Song>) => void;
  placeholder?: string;
  mono?:        boolean;
  width?:       number;
}) {
  return (
    <input
      key={`${field}-${songSlug}-${value}`}
      defaultValue={value ?? ""}
      placeholder={placeholder}
      disabled={disabled}
      style={{ ...(mono ? MONO_INPUT : CELL_INPUT), width }}
      onBlur={e => {
        const next = e.target.value.trim() || null;
        if (next !== value) onPatch({ [field]: next } as Partial<Song>);
      }}
      aria-label={`${field} for ${songSlug}`}
    />
  );
}

/** Textarea that fires PATCH on blur if value changed. */
function InlineTextarea({
  songSlug, field, value, disabled, onPatch, placeholder = "—", rows = 3,
}: {
  songSlug:     string;
  field:        string;
  value:        string | null;
  disabled:     boolean;
  onPatch:      (update: Partial<Song>) => void;
  placeholder?: string;
  rows?:        number;
}) {
  return (
    <textarea
      key={`${field}-${songSlug}-${value}`}
      defaultValue={value ?? ""}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      style={{
        ...CELL_INPUT, width: "100%", resize: "vertical",
        fontFamily: "inherit", lineHeight: 1.5,
      }}
      onBlur={e => {
        const next = e.target.value.trim() || null;
        if (next !== value) onPatch({ [field]: next } as Partial<Song>);
      }}
      aria-label={`${field} for ${songSlug}`}
    />
  );
}

/** Labeled field wrapper in expanded detail section. */
function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 10, color: "#a89a92", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

/** Table header cell with consistent compact style. */
function TH({ children, width }: { children: React.ReactNode; width?: number }) {
  return (
    <th style={{ fontSize: 11, padding: "6px 8px", whiteSpace: "nowrap",
                 minWidth: width, maxWidth: width }}>
      {children}
    </th>
  );
}

/** Clickable sortable table header cell. Highlights active column with gold arrow. */
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
      }}
    >
      {label} {active ? (sortDir === "asc" ? "↑" : "↓") : <span style={{ opacity: 0.3 }}>↕</span>}
    </th>
  );
}

/** Table data cell wrapper. */
function TD({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <td style={{ padding: "4px 6px", verticalAlign: "middle",
                 textAlign: center ? "center" : undefined }}>
      {children}
    </td>
  );
}

export default function SongsPage() {
  const [songs, setSongs]           = useState<Song[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [saving, setSaving]         = useState<Record<string, boolean>>({});
  const [expandedSlug, setExpanded] = useState<string | null>(null);
  const [toast, setToast]           = useState<string | null>(null);
  const [sortField, setSortField]   = useState<string>("year_event");
  const [sortDir,   setSortDir]     = useState<"asc" | "desc">("asc");

  // File check cache: slug → result (null = fetch failed, undefined = not yet fetched)
  const [fileStatus, setFileStatus] = useState<Record<string, {
    pl_mp4: boolean; en_mp4: boolean;
    feed_pl_mp4: boolean; feed_en_mp4: boolean;
    thumb: boolean; missing: string[];
  } | null>>({});

  // Per-slug YouTube sync state
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  /** Fetch file presence for a song; caches in fileStatus. */
  async function fetchFileStatus(slug: string) {
    if (fileStatus[slug] !== undefined) return;
    try {
      const res = await fetch(`/api/songs/${slug}/files`);
      if (!res.ok) { setFileStatus(prev => ({ ...prev, [slug]: null })); return; }
      const data = await res.json();
      setFileStatus(prev => ({ ...prev, [slug]: data }));
    } catch {
      setFileStatus(prev => ({ ...prev, [slug]: null }));
    }
  }

  /** Call POST /api/songs/{slug}/sync_youtube to append streaming links to YT descriptions. */
  async function syncYoutube(slug: string) {
    setSyncing(prev => ({ ...prev, [slug]: true }));
    try {
      const res = await fetch(`/api/songs/${slug}/sync_youtube`, { method: "POST" });
      const data = await res.json().catch(() => ({ detail: res.statusText }));
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      const { synced } = data;
      const summary = Object.entries(synced as Record<string, boolean>)
        .map(([lang, ok]) => `${lang.toUpperCase()}: ${ok ? "✓" : "✗"}`)
        .join("  ");
      showToast(`YouTube sync — ${summary}`);
    } catch (e) {
      showToast(`Sync failed: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setSyncing(prev => ({ ...prev, [slug]: false }));
    }
  }

  const fetchSongs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/songs");
      if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
      const data: Song[] = await res.json();
      setSongs(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load songs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSongs(); }, [fetchSongs]);

  /**
   * PATCH a single field on a song.
   * Optimistically updates local state; reverts + toasts on API error.
   */
  async function patchSong(slug: string, update: Partial<Song>, prevSong: Song) {
    setSongs(prev => prev.map(s => s.slug === slug ? { ...s, ...update } : s));
    setSaving(prev => ({ ...prev, [slug]: true }));
    try {
      const res = await fetch(`/api/songs/${slug}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(update),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? res.statusText);
      }
      const updated: Song = await res.json();
      setSongs(prev => prev.map(s => s.slug === slug ? updated : s));
    } catch (e) {
      setSongs(prev => prev.map(s => s.slug === slug ? prevSong : s));
      showToast(`Error: ${e instanceof Error ? e.message : "Save failed"}`);
    } finally {
      setSaving(prev => ({ ...prev, [slug]: false }));
    }
  }

  // Columns: expand + slug + 7 meta + 2 YT + 2 YT Short + 5 platform = 18 total
  const COL_COUNT = 18;

  /** Toggle sort direction on same field; reset to asc on new field. */
  function handleSort(field: string) {
    if (field === sortField) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  }

  /**
   * Sorted copy of songs array for rendering.
   * year_event uses numeric comparison; all other fields use locale string compare.
   */
  const sorted = [...songs].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortField === "year_event") {
      return ((a.year_event ?? 0) - (b.year_event ?? 0)) * dir;
    }
    const f = sortField as keyof Song;
    return ((a[f] ?? "") as string).localeCompare((b[f] ?? "") as string) * dir;
  });

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Songs</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/songs/new">
            <button className="btn-primary" style={{ fontSize: 13, padding: "6px 14px" }}>
              + New Song
            </button>
          </Link>
          <button className="btn-primary" onClick={fetchSongs}
                  style={{ fontSize: 13, padding: "6px 14px", background: "transparent",
                           border: "1px solid #3a3028", color: "#a89a92" }}>
            Refresh
          </button>
        </div>
      </div>

      {toast   && <div className="error-box" style={{ marginBottom: 16 }}>{toast}</div>}
      {loading && <p style={{ color: "#a89a92" }}>Loading…</p>}
      {error   && <div className="error-box"><strong>Could not load songs — </strong>{error}</div>}

      {!loading && !error && (
        /* Horizontal scroll for wide table */
        <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #2a2018" }}>
          <table className="data-table" style={{ minWidth: 1800 }}>
            <thead>
              <tr>
                <TH width={32}>{""}</TH>
                <SortableTH field="slug"         label="Slug"    width={140} sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableTH field="title_pl"     label="Title PL" width={150} sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableTH field="title_en"     label="Title EN" width={150} sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableTH field="status"       label="Status"  width={110} sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableTH field="album_slug"   label="Album"   width={110} sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableTH field="era"          label="Era"     width={95}  sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableTH field="year_event"   label="Year"    width={70}  sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableTH field="release_date" label="Release" width={105} sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <TH width={110}>YT PL</TH>
                <TH width={110}>YT EN</TH>
                <TH width={110}>Short PL</TH>
                <TH width={110}>Short EN</TH>
                <TH width={210}>Spotify</TH>
                <TH width={210}>Apple Music</TH>
                <TH width={210}>Amazon</TH>
                <TH width={210}>YT Music</TH>
                <TH width={210}>iTunes</TH>
              </tr>
            </thead>
            <tbody>
              {songs.length === 0 ? (
                <tr>
                  <td colSpan={COL_COUNT}
                      style={{ textAlign: "center", color: "#a89a92", padding: 32 }}>
                    No songs yet. Use <strong>+ New Song</strong> or{" "}
                    <code>add_song.py</code>.
                  </td>
                </tr>
              ) : (
                sorted.map(song => {
                  const isExpanded = expandedSlug === song.slug;
                  const isSaving   = saving[song.slug];
                  const patch      = (u: Partial<Song>) => patchSong(song.slug, u, song);

                  return (
                    <React.Fragment key={song.slug}>

                      {/* ── Main row — all fields inline-editable ── */}
                      <tr style={{ opacity: isSaving ? 0.6 : 1, transition: "opacity 0.15s" }}>

                        {/* Expand toggle (rich content + file status) */}
                        <TD center>
                          <button
                            onClick={() => {
                              const opening = expandedSlug !== song.slug;
                              setExpanded(opening ? song.slug : null);
                              if (opening) fetchFileStatus(song.slug);
                            }}
                            title="Edit rich content + file status"
                            style={{
                              background: "none", border: "none", cursor: "pointer",
                              color: "#a89a92", fontSize: 11, padding: 4,
                              transform: isExpanded ? "rotate(90deg)" : "none",
                              transition: "transform 0.15s",
                            }}
                            aria-label={isExpanded ? "Collapse" : "Expand rich content"}
                          >▶</button>
                        </TD>

                        {/* Slug — read-only identifier */}
                        <TD>
                          <span style={{ fontFamily: "monospace", fontSize: 11, color: "#a89a92" }}>
                            {song.slug}
                          </span>
                        </TD>

                        {/* Title PL */}
                        <TD>
                          <InlineInput songSlug={song.slug} field="title_pl"
                            value={song.title_pl} disabled={isSaving}
                            onPatch={patch} width={140} />
                        </TD>

                        {/* Title EN */}
                        <TD>
                          <InlineInput songSlug={song.slug} field="title_en"
                            value={song.title_en} disabled={isSaving}
                            onPatch={patch} width={140} />
                        </TD>

                        {/* Status — select with badge colour */}
                        <TD>
                          <select
                            value={song.status}
                            disabled={isSaving}
                            className={`badge ${STATUS_BADGE[song.status] ?? "badge-gray"}`}
                            style={{ background: "transparent", border: "none", cursor: "pointer",
                                     fontFamily: "inherit", fontSize: "inherit", padding: 0, outline: "none" }}
                            onChange={e => patch({ status: e.target.value })}
                            aria-label={`Status for ${song.slug}`}
                          >
                            {VALID_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </TD>

                        {/* Album slug */}
                        <TD>
                          <InlineInput songSlug={song.slug} field="album_slug"
                            value={song.album_slug} disabled={isSaving}
                            onPatch={patch} mono placeholder="—" width={100} />
                        </TD>

                        {/* Era — select */}
                        <TD>
                          <select
                            key={`era-${song.slug}-${song.era}`}
                            defaultValue={song.era ?? ""}
                            disabled={isSaving}
                            style={{ ...CELL_INPUT, width: 88 }}
                            onChange={e => {
                              const v = e.target.value || null;
                              if (v !== song.era) patch({ era: v });
                            }}
                            aria-label={`Era for ${song.slug}`}
                          >
                            <option value="">—</option>
                            {VALID_ERAS.map(e => <option key={e} value={e}>{e}</option>)}
                          </select>
                        </TD>

                        {/* Year event — number */}
                        <TD>
                          <input
                            key={`year_event-${song.slug}-${song.year_event}`}
                            type="number"
                            defaultValue={song.year_event ?? ""}
                            placeholder="—"
                            disabled={isSaving}
                            style={{ ...MONO_INPUT, width: 60 }}
                            onBlur={e => {
                              const raw  = e.target.value.trim();
                              const next = raw ? parseInt(raw, 10) : null;
                              if (next !== song.year_event) patch({ year_event: next });
                            }}
                            aria-label={`Year for ${song.slug}`}
                          />
                        </TD>

                        {/* Release date */}
                        <TD>
                          <InlineInput songSlug={song.slug} field="release_date"
                            value={song.release_date} disabled={isSaving}
                            onPatch={patch} mono placeholder="YYYY-MM-DD" width={96} />
                        </TD>

                        {/* YouTube PL ID */}
                        <TD>
                          <InlineInput songSlug={song.slug} field="youtube_id_pl"
                            value={song.youtube_id_pl} disabled={isSaving}
                            onPatch={patch} mono width={100} />
                        </TD>

                        {/* YouTube EN ID */}
                        <TD>
                          <InlineInput songSlug={song.slug} field="youtube_id_en"
                            value={song.youtube_id_en} disabled={isSaving}
                            onPatch={patch} mono width={100} />
                        </TD>

                        {/* YouTube Short PL */}
                        <TD>
                          <InlineInput songSlug={song.slug} field="youtube_short_pl"
                            value={song.youtube_short_pl} disabled={isSaving}
                            onPatch={patch} mono width={100} />
                        </TD>

                        {/* YouTube Short EN */}
                        <TD>
                          <InlineInput songSlug={song.slug} field="youtube_short_en"
                            value={song.youtube_short_en} disabled={isSaving}
                            onPatch={patch} mono width={100} />
                        </TD>

                        {/* Streaming platform URLs */}
                        <TD>
                          <InlineInput songSlug={song.slug} field="spotify_url"
                            value={song.spotify_url} disabled={isSaving}
                            onPatch={patch} placeholder="https://open.spotify.com/…" width={200} />
                        </TD>

                        <TD>
                          <InlineInput songSlug={song.slug} field="apple_music_url"
                            value={song.apple_music_url} disabled={isSaving}
                            onPatch={patch} placeholder="https://music.apple.com/…" width={200} />
                        </TD>

                        <TD>
                          <InlineInput songSlug={song.slug} field="amazon_url"
                            value={song.amazon_url} disabled={isSaving}
                            onPatch={patch} placeholder="https://music.amazon.com/…" width={200} />
                        </TD>

                        <TD>
                          <InlineInput songSlug={song.slug} field="youtube_music_url"
                            value={song.youtube_music_url} disabled={isSaving}
                            onPatch={patch} placeholder="https://music.youtube.com/…" width={200} />
                        </TD>

                        <TD>
                          <InlineInput songSlug={song.slug} field="itunes_url"
                            value={song.itunes_url} disabled={isSaving}
                            onPatch={patch} placeholder="https://music.apple.com/…" width={200} />
                        </TD>
                      </tr>

                      {/* ── Expanded row — rich content (subtitle, summary, longText, sources) ── */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={COL_COUNT} style={{
                            background: "#1a1510",
                            borderTop: "1px solid #3a3028",
                            borderBottom: "2px solid #dc143c",
                            padding: "16px 24px",
                          }}>
                            <div style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: "16px 32px",
                            }}>

                              <DetailField label="Subtitle PL">
                                <InlineInput songSlug={song.slug} field="subtitle_pl"
                                  value={song.subtitle_pl} disabled={isSaving}
                                  onPatch={patch} width={380} />
                              </DetailField>

                              <DetailField label="Subtitle EN">
                                <InlineInput songSlug={song.slug} field="subtitle_en"
                                  value={song.subtitle_en} disabled={isSaving}
                                  onPatch={patch} width={380} />
                              </DetailField>

                              <DetailField label="Summary PL">
                                <InlineTextarea songSlug={song.slug} field="summary_pl"
                                  value={song.summary_pl} disabled={isSaving}
                                  onPatch={patch} rows={3} />
                              </DetailField>

                              <DetailField label="Summary EN">
                                <InlineTextarea songSlug={song.slug} field="summary_en"
                                  value={song.summary_en} disabled={isSaving}
                                  onPatch={patch} rows={3} />
                              </DetailField>

                              <DetailField label="Long Text PL">
                                <InlineTextarea songSlug={song.slug} field="long_text_pl"
                                  value={song.long_text_pl} disabled={isSaving}
                                  onPatch={patch} rows={5} />
                              </DetailField>

                              <DetailField label="Long Text EN">
                                <InlineTextarea songSlug={song.slug} field="long_text_en"
                                  value={song.long_text_en} disabled={isSaving}
                                  onPatch={patch} rows={5} />
                              </DetailField>

                              {/* Sources — comma-separated, saved as JSONB array */}
                              <DetailField label="Sources (comma-separated)">
                                <InlineInput
                                  songSlug={song.slug} field="_sources_raw"
                                  value={song.sources?.join(", ") ?? null}
                                  disabled={isSaving}
                                  onPatch={u => {
                                    const raw = (u as Record<string, string | null>)._sources_raw;
                                    const arr = raw
                                      ? raw.split(",").map(s => s.trim()).filter(Boolean)
                                      : [];
                                    patch({ sources: arr });
                                  }}
                                  placeholder="Davies, Rising '44, ECS Archiwum"
                                  width={380}
                                />
                              </DetailField>

                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px 16px" }}>
                                <DetailField label="Year Label">
                                  <InlineInput songSlug={song.slug} field="year_label"
                                    value={song.year_label} disabled={isSaving}
                                    onPatch={patch} placeholder="15 VII 1410" width={110} />
                                </DetailField>

                                <DetailField label="BG Hue (0-360)">
                                  <InlineInput songSlug={song.slug} field="bg_hue"
                                    value={song.bg_hue} disabled={isSaving}
                                    onPatch={patch} placeholder="28" width={70} mono />
                                </DetailField>

                                <DetailField label="Image Path">
                                  <InlineInput songSlug={song.slug} field="image_path"
                                    value={song.image_path} disabled={isSaving}
                                    onPatch={patch} placeholder="/images/…" width={160} />
                                </DetailField>
                              </div>

                              <DetailField label="BG Label (cover art description)">
                                <InlineInput songSlug={song.slug} field="bg_label"
                                  value={song.bg_label} disabled={isSaving}
                                  onPatch={patch} placeholder="Battle of Grunwald — banners against thundercloud sky"
                                  width={380} />
                              </DetailField>

                              {/* File status panel */}
                              <div style={{ gridColumn: "1 / -1" }}>
                                <label style={{ fontSize: 10, color: "#a89a92", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                  Release Files
                                </label>
                                {fileStatus[song.slug] === undefined && (
                                  <p style={{ fontSize: 11, color: "#a89a92", margin: "6px 0 0" }}>Loading…</p>
                                )}
                                {fileStatus[song.slug] === null && (
                                  <p style={{ fontSize: 11, color: "#c87070", margin: "6px 0 0" }}>Could not check files</p>
                                )}
                                {fileStatus[song.slug] && (() => {
                                  const fs = fileStatus[song.slug]!;
                                  const items: [boolean, string][] = [
                                    [fs.pl_mp4,      `${song.slug}_pl.mp4`],
                                    [fs.en_mp4,      `${song.slug}_en.mp4`],
                                    [fs.feed_pl_mp4, `${song.slug}-feed-pl.mp4`],
                                    [fs.feed_en_mp4, `${song.slug}-feed-en.mp4`],
                                    [fs.thumb,       `${song.slug}_thumb.jpg`],
                                  ];
                                  return (
                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                                      {items.map(([ok, filename]) => (
                                        <span
                                          key={filename}
                                          title={filename}
                                          style={{
                                            fontSize: 11, padding: "2px 8px",
                                            borderRadius: 4,
                                            border: ok ? "1px solid #2d4a27" : "1px solid #5a2a2a",
                                            background: ok ? "#0d1f0a" : "#1f0a0a",
                                            color: ok ? "#6dbf67" : "#c87070",
                                            fontFamily: "monospace",
                                          }}
                                        >
                                          {ok ? "✓" : "✗"} {filename}
                                        </span>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* YouTube description sync — shown when song has YT IDs */}
                              {(song.youtube_id_pl || song.youtube_id_en) && (
                                <div style={{ gridColumn: "1 / -1" }}>
                                  <label style={{ fontSize: 10, color: "#a89a92", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    YouTube Sync
                                  </label>
                                  <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 10 }}>
                                    <button
                                      onClick={() => syncYoutube(song.slug)}
                                      disabled={!!syncing[song.slug] || isSaving}
                                      title="Append streaming platform links to YouTube video descriptions"
                                      style={{
                                        fontSize: 12, padding: "4px 12px",
                                        background: "#0d1e35",
                                        border: "1px solid #1e4080",
                                        color: "#6aadee",
                                        borderRadius: 4, cursor: "pointer",
                                        opacity: (syncing[song.slug] || isSaving) ? 0.5 : 1,
                                      }}
                                      aria-label={`Sync YouTube descriptions for ${song.slug}`}
                                    >
                                      {syncing[song.slug] ? "Syncing…" : "🎵 Sync YT descriptions"}
                                    </button>
                                    <span style={{ fontSize: 11, color: "#5a5048" }}>
                                      Appends Spotify / Apple Music / streaming links to YT video descriptions
                                    </span>
                                  </div>
                                </div>
                              )}

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
