/*
 * admin/src/app/pipeline/page.tsx — Production Pipeline page (client component).
 *
 * Shows all songs grouped into collapsible stage sections in production order:
 * scaffold → audio_ready → sync_done → render_done → ready_to_release → queued → released.
 * Released section starts collapsed by default.
 *
 * Each stage section:
 *   - Header with stage name, song count badge, colour dot, collapse toggle
 *   - Horizontally-scrollable table with the same inline-edit fields as songs/page.tsx
 *   - "→ Queue" action (render_done + scheduled stages only): POST /api/release_queue
 *   - "✕ Delete" action per row: DELETE /api/songs/:slug
 *   - ▶ expand row: subtitle_pl/en + summary_pl/en rich content
 *
 * Optimistic UI: status changes re-group rows immediately; reverts on API error.
 * Fetches /api/songs on mount; filters out released songs client-side.
 */
"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Constants ────────────────────────────────────────────────────────────────

/** Pipeline stages in production order (includes "released"). */
const PIPELINE_STAGES = [
  "scaffold",
  "audio_ready",
  "sync_done",
  "render_done",
  "ready_to_release",
  "queued",
  "released",
] as const;

type Stage = (typeof PIPELINE_STAGES)[number];

/** All valid statuses for the status select dropdown. */
const VALID_STATUSES = [
  "scaffold", "audio_ready", "sync_done", "render_done", "ready_to_release", "queued", "released",
];

/** Valid era values for the era select dropdown. */
const VALID_ERAS = [
  "medieval", "partitions", "wwi", "wwii", "cold_war", "modern",
];

/** Badge CSS class names matching songs/page.tsx. */
const STATUS_BADGE: Record<string, string> = {
  scaffold:         "badge-gray",
  audio_ready:      "badge-blue",
  sync_done:        "badge-yellow",
  render_done:      "badge-orange",
  ready_to_release: "badge-lime",
  queued:           "badge-teal",
  released:         "badge-green",
};

/**
 * Dot colour for each pipeline stage — matches the STATUS_BADGE visual theme.
 * Used in section header to give an at-a-glance colour signal.
 */
const STAGE_DOT_COLOR: Record<Stage, string> = {
  scaffold:         "#6b7280",  // gray
  audio_ready:      "#3b82f6",  // blue
  sync_done:        "#ca8a04",  // amber/yellow
  render_done:      "#ea580c",  // orange
  ready_to_release: "#4ade80",  // green
  queued:           "#4acece",  // teal
  released:         "#22c55e",  // bright green
};

/**
 * Human-readable stage labels shown in section headers.
 * Underscore-separated slugs converted to spaced uppercase.
 */
const STAGE_LABEL: Record<Stage, string> = {
  scaffold:         "SCAFFOLD",
  audio_ready:      "AUDIO READY",
  sync_done:        "SYNC DONE",
  render_done:      "RENDER DONE",
  ready_to_release: "READY TO RELEASE",
  queued:           "QUEUED",
  released:         "RELEASED",
};

/** Upload platforms available for selection. */
const ALL_PLATFORMS = ["youtube", "tiktok", "instagram", "facebook", "youtube_short"] as const;
type Platform = (typeof ALL_PLATFORMS)[number];
const PLATFORM_LABEL: Record<Platform, string> = {
  youtube:       "YT",
  tiktok:        "Tok",
  instagram:     "IG",
  facebook:      "FB",
  youtube_short: "YT♯",
};

/**
 * Stages that show the queue/reschedule action buttons.
 * render_done + ready_to_release: POST new queue entry.
 * queued: PATCH existing entry (reschedule).
 */
const QUEUE_ELIGIBLE_STAGES = new Set<Stage>(["render_done", "ready_to_release", "queued"]);

// ─── Shared cell styles (identical to songs/page.tsx) ─────────────────────────

const CELL_INPUT: React.CSSProperties = {
  fontSize: 12, background: "transparent",
  border: "1px solid #3a3028", color: "#e8ddd5",
  borderRadius: 4, padding: "3px 6px", minWidth: 0,
};

const MONO_INPUT: React.CSSProperties = { ...CELL_INPUT, fontFamily: "monospace" };

// ─── Shared sub-components (mirrors songs/page.tsx) ───────────────────────────

/**
 * InlineInput — text input that PATCHes the song on blur if value changed.
 *
 * @param songSlug  - Song identifier (used in API call + aria-label).
 * @param field     - JSON field name to patch.
 * @param value     - Current field value (null renders as "").
 * @param disabled  - True while a save is in flight.
 * @param onPatch   - Callback receiving the partial update object.
 * @param placeholder - Placeholder text, default "—".
 * @param mono      - Use monospace input style.
 * @param width     - Pixel width of the input.
 */
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

/**
 * InlineTextarea — textarea that PATCHes the song on blur if value changed.
 *
 * @param songSlug  - Song identifier.
 * @param field     - JSON field name to patch.
 * @param value     - Current field value.
 * @param disabled  - True while a save is in flight.
 * @param onPatch   - Callback receiving the partial update object.
 * @param rows      - Number of visible rows.
 */
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

/**
 * DetailField — labeled wrapper used inside the expanded detail row.
 *
 * @param label    - Short uppercase label rendered above the field.
 * @param children - The actual input element(s).
 */
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

/**
 * TH — compact table header cell.
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
 * TD — table data cell wrapper with consistent padding/alignment.
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
 * SortableTH — clickable header cell that toggles sort direction.
 *
 * @param field     - Sort key identifier.
 * @param label     - Display label.
 * @param width     - Optional fixed pixel width.
 * @param sortField - Currently active sort field.
 * @param sortDir   - Current sort direction.
 * @param onSort    - Callback to request sort by this field.
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
      }}
    >
      {label} {active ? (sortDir === "asc" ? "↑" : "↓") : <span style={{ opacity: 0.3 }}>↕</span>}
    </th>
  );
}

// ─── Pipeline page columns ────────────────────────────────────────────────────
// ▶ | Slug | Title PL | Title EN | Status | Album | Era | Year | Release |
// YT PL | YT EN | BG Hue | Actions
const COL_COUNT = 13;

// ─── Main component ───────────────────────────────────────────────────────────

export default function PipelinePage() {
  // All songs from the API (unreleased + released; we filter client-side)
  const [songs, setSongs]           = useState<Song[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  // Per-slug saving state (opacity dimming while PATCH in flight)
  const [saving, setSaving]         = useState<Record<string, boolean>>({});

  // Per-slug deleting state
  const [deleting, setDeleting]     = useState<Record<string, boolean>>({});

  // Per-slug syncing state (Sync button on released songs)
  const [syncing, setSyncing]       = useState<Record<string, boolean>>({});

  // Per-slug queuing state (→ Queue button)
  const [queuing, setQueuing]       = useState<Record<string, boolean>>({});

  // Per-slug custom queue date (defaults to tomorrow when not set)
  const [queueDates, setQueueDates] = useState<Record<string, string>>({});

  // Maps song_slug → release_queue entry ID (for already-queued songs)
  const [queueEntryIds, setQueueEntryIds] = useState<Record<string, number>>({});

  // Platform selection for pre-queue songs (render_done / ready_to_release)
  const [queuePlatforms, setQueuePlatforms] = useState<Record<string, Platform[]>>({});

  // Editable platforms for already-queued songs — populated from queue API, PATCHed on toggle
  const [entryPlatforms, setEntryPlatforms] = useState<Record<string, Platform[]>>({});

  // File check cache per slug — loaded on row expand (null = not yet fetched)
  const [fileStatus, setFileStatus] = useState<Record<string, {
    pl_mp4: boolean; en_mp4: boolean;
    feed_pl_mp4: boolean; feed_en_mp4: boolean;
    thumb: boolean; missing: string[];
  } | null>>({});

  // Which song row is expanded for rich content editing
  const [expandedSlug, setExpanded] = useState<string | null>(null);

  /**
   * Collapsed stage set — scaffold + released start collapsed; all others start expanded.
   * A stage slug in this set means its section is collapsed.
   */
  const [collapsed, setCollapsed]   = useState<Set<Stage>>(new Set<Stage>(["scaffold", "released"]));

  // Sort state — shared across all stage sections; each section sorts its own rows.
  const [sortField, setSortField]   = useState<string>("year_event");
  const [sortDir,   setSortDir]     = useState<"asc" | "desc">("asc");

  // Per-section search query — filters by slug, title_pl, title_en
  const [sectionSearch, setSectionSearch] = useState<Record<string, string>>({});

  // Toast notification: { msg, type }
  const [toast, setToast]           = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  /** Show a toast message that auto-dismisses after 3.5 s. */
  function showToast(msg: string, type: "ok" | "err" = "err") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  /** Toggle collapse state for a pipeline stage section. */
  function toggleCollapse(stage: Stage) {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(stage)) next.delete(stage);
      else next.add(stage);
      return next;
    });
  }

  /**
   * handleSort — toggles sort direction if the field is already active,
   * otherwise switches to the new field ascending.
   *
   * @param field - Sort key to activate.
   */
  function handleSort(field: string) {
    if (field === sortField) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  }

  /**
   * fetchSongs — loads all songs from /api/songs and active queue entries.
   * Filtering to unreleased is done client-side so we always have a fresh
   * full list (helps when status changes move songs to "released").
   */
  const fetchSongs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [songsRes, queueRes] = await Promise.all([
        fetch("/api/songs"),
        fetch("/api/release_queue"),
      ]);
      if (!songsRes.ok) throw new Error(`API ${songsRes.status}: ${songsRes.statusText}`);
      const data: Song[] = await songsRes.json();
      setSongs(Array.isArray(data) ? data : []);
      if (queueRes.ok) {
        const queueData: { id: number; song_slug: string; status: string; platforms: string[] }[] = await queueRes.json();
        const idMap: Record<string, number> = {};
        const platMap: Record<string, Platform[]> = {};
        for (const entry of queueData) {
          if (entry.status !== "released" && entry.status !== "failed") {
            idMap[entry.song_slug] = entry.id;
            platMap[entry.song_slug] = (entry.platforms ?? []) as Platform[];
          }
        }
        setQueueEntryIds(idMap);
        setEntryPlatforms(platMap);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load songs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSongs(); }, [fetchSongs]);

  /**
   * patchSong — optimistically updates local state, then PATCHes the API.
   * Reverts to prevSong and shows a toast if the API call fails.
   *
   * @param slug    - Song identifier.
   * @param update  - Partial Song fields to update.
   * @param prevSong - The prior Song state (used for revert on error).
   */
  async function patchSong(slug: string, update: Partial<Song>, prevSong: Song) {
    // Optimistic update — immediate UI feedback
    setSongs(prev => prev.map(s => s.slug === slug ? { ...s, ...update } : s));
    setSaving(prev => ({ ...prev, [slug]: true }));
    try {
      const res = await fetch(`/api/songs/${slug}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(update),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "" }));
        throw new Error(err.detail || res.statusText || `HTTP ${res.status} error`);
      }
      const updated: Song = await res.json();
      // Replace with confirmed server state
      setSongs(prev => prev.map(s => s.slug === slug ? updated : s));
    } catch (e) {
      // Revert optimistic update
      setSongs(prev => prev.map(s => s.slug === slug ? prevSong : s));
      showToast(`Error: ${e instanceof Error ? e.message : "Save failed"}`);
    } finally {
      setSaving(prev => ({ ...prev, [slug]: false }));
    }
  }

  /**
   * deleteSong — confirms with the user, then DELETEs /api/songs/:slug.
   * Removes the song from local state on 204 success.
   *
   * @param slug - Song identifier to delete.
   */
  async function deleteSong(slug: string) {
    if (!window.confirm(`Delete song "${slug}"? This cannot be undone.`)) return;
    setDeleting(prev => ({ ...prev, [slug]: true }));
    try {
      const res = await fetch(`/api/songs/${slug}`, { method: "DELETE" });
      // 204 No Content is a success response for DELETE
      if (!res.ok && res.status !== 204) throw new Error(`API ${res.status}`);
      setSongs(prev => prev.filter(s => s.slug !== slug));
      showToast(`"${slug}" deleted.`, "ok");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(prev => ({ ...prev, [slug]: false }));
    }
  }

  /**
   * triggerRelease — calls POST /api/release_queue/trigger to fire n8n webhook.
   * Passes queue_id to ensure n8n picks the exact entry, not an older pending one.
   * Shows a toast on error but does not throw — trigger failure is non-fatal.
   *
   * @param queueId - Specific queue entry ID to release; omit to let n8n auto-pick.
   */
  async function triggerRelease(queueId?: number) {
    try {
      const body = queueId != null ? JSON.stringify({ queue_id: queueId }) : undefined;
      const res = await fetch("/api/release_queue/trigger", {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "" }));
        showToast(`n8n trigger failed: ${err.detail || `HTTP ${res.status}`}`);
      }
    } catch {
      showToast("Could not reach n8n trigger endpoint");
    }
  }

  /**
   * queueSong — POSTs to /api/release_queue to schedule a song on the given date.
   * Shows a success or error toast; does not modify local pipeline state.
   *
   * @param slug        - Song identifier to queue.
   * @param scheduledAt - YYYY-MM-DD date string for the release.
   * @param triggerNow  - If true, also fires n8n webhook after queuing.
   */
  async function queueSong(slug: string, scheduledAt: string, triggerNow = false) {
    setQueuing(prev => ({ ...prev, [slug]: true }));
    try {
      const res = await fetch("/api/release_queue", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          song_slug:    slug,
          scheduled_at: scheduledAt,
          platforms:    queuePlatforms[slug] ?? [...ALL_PLATFORMS],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "" }));
        throw new Error(err.detail || res.statusText || `HTTP ${res.status} error`);
      }
      const entry = await res.json();
      showToast(`"${slug}" queued for ${scheduledAt}.`, "ok");
      setSongs(prev => prev.map(s => s.slug === slug ? { ...s, status: "queued" } : s));
      if (triggerNow) await triggerRelease(entry.id);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Queue failed");
    } finally {
      setQueuing(prev => ({ ...prev, [slug]: false }));
    }
  }

  /**
   * rescheduleEntry — PATCHes an existing release_queue entry to a new scheduled_at.
   * Used for songs already in "queued" status to move their release date.
   *
   * @param slug        - Song identifier.
   * @param scheduledAt - New YYYY-MM-DD date string.
   * @param triggerNow  - If true, also fires n8n webhook after rescheduling.
   */
  async function rescheduleEntry(slug: string, scheduledAt: string, triggerNow = false) {
    const entryId = queueEntryIds[slug];
    if (!entryId) {
      showToast(`No active queue entry found for "${slug}". Try refreshing.`);
      return;
    }
    setQueuing(prev => ({ ...prev, [slug]: true }));
    try {
      const res = await fetch(`/api/release_queue/${entryId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ scheduled_at: scheduledAt }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "" }));
        throw new Error(err.detail || res.statusText || `HTTP ${res.status} error`);
      }
      showToast(`"${slug}" rescheduled to ${scheduledAt}.`, "ok");
      if (triggerNow) await triggerRelease(entryId);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Reschedule failed");
    } finally {
      setQueuing(prev => ({ ...prev, [slug]: false }));
    }
  }

  /**
   * dequeueEntry — DELETEs the queue entry and reverts song status to ready_to_release.
   *
   * @param slug - Song identifier to dequeue.
   */
  async function dequeueEntry(slug: string) {
    const entryId = queueEntryIds[slug];
    if (!entryId) { showToast(`No queue entry found for "${slug}". Try refreshing.`); return; }
    if (!window.confirm(`Dequeue "${slug}"? Song will revert to ready_to_release.`)) return;
    setQueuing(prev => ({ ...prev, [slug]: true }));
    try {
      const res = await fetch(`/api/release_queue/${entryId}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const err = await res.json().catch(() => ({ detail: "" }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      setSongs(prev => prev.map(s => s.slug === slug ? { ...s, status: "ready_to_release" } : s));
      setQueueEntryIds(prev => { const n = { ...prev }; delete n[slug]; return n; });
      setEntryPlatforms(prev => { const n = { ...prev }; delete n[slug]; return n; });
      showToast(`"${slug}" dequeued.`, "ok");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Dequeue failed");
    } finally {
      setQueuing(prev => ({ ...prev, [slug]: false }));
    }
  }

  /**
   * syncSong — calls POST /api/revalidate to flush ISR cache for a released song.
   * Forces Next.js to immediately serve fresh data instead of the 5-min stale cache.
   *
   * @param slug - Song identifier to revalidate.
   */
  async function syncSong(slug: string) {
    setSyncing(prev => ({ ...prev, [slug]: true }));
    try {
      const paths = ["/pl", "/en", "/pl/timeline", "/en/timeline", `/pl/songs/${slug}`, `/en/songs/${slug}`];
      const res = await fetch("/api/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "" }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      showToast(`Site cache synced for "${slug}".`, "ok");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(prev => ({ ...prev, [slug]: false }));
    }
  }

  /**
   * toggleEntryPlatform — toggles a platform on/off for an already-queued entry.
   * PATCHes the queue entry; reverts on API error.
   *
   * @param slug     - Song identifier.
   * @param platform - Platform to toggle.
   */
  async function toggleEntryPlatform(slug: string, platform: Platform) {
    const entryId = queueEntryIds[slug];
    if (!entryId) return;
    const current = entryPlatforms[slug] ?? [];
    const next = current.includes(platform)
      ? current.filter(p => p !== platform)
      : [...current, platform];
    if (next.length === 0) { showToast("At least one platform required."); return; }
    setEntryPlatforms(prev => ({ ...prev, [slug]: next }));
    try {
      const res = await fetch(`/api/release_queue/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platforms: next }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "" }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
    } catch (e) {
      setEntryPlatforms(prev => ({ ...prev, [slug]: current }));
      showToast(e instanceof Error ? e.message : "Platform update failed");
    }
  }

  /**
   * fetchFileStatus — checks which release files exist for a song via the API.
   * Caches result in fileStatus state; no-ops if already cached.
   *
   * @param slug - Song identifier.
   */
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

  // ── Derived data ─────────────────────────────────────────────────────────────

  /**
   * Group all songs by stage (including released).
   * Songs whose status is not a recognised pipeline stage are omitted.
   */
  const grouped: Record<Stage, Song[]> = {
    scaffold:         [],
    audio_ready:      [],
    sync_done:        [],
    render_done:      [],
    ready_to_release: [],
    queued:           [],
    released:         [],
  };
  for (const song of songs) {
    if (song.status in grouped) {
      grouped[song.status as Stage].push(song);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Pipeline</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/songs/new">
            <button className="btn-primary" style={{ fontSize: 13, padding: "6px 14px" }}>
              + New Song
            </button>
          </Link>
          <button
            className="btn-primary"
            onClick={fetchSongs}
            style={{ fontSize: 13, padding: "6px 14px", background: "transparent",
                     border: "1px solid #3a3028", color: "#a89a92" }}
          >
            Refresh
          </button>
        </div>
      </div>

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
      {error   && <div className="error-box"><strong>Could not load songs — </strong>{error}</div>}

      {/* Empty pipeline message */}
      {!loading && !error && songs.length === 0 && (
        <div style={{
          textAlign: "center", color: "#a89a92",
          padding: "64px 32px", fontSize: 15,
          border: "1px solid #2a2018", borderRadius: 8,
        }}>
          No songs yet. Use <strong>+ New Song</strong> or import via API.
        </div>
      )}

      {/* Stage sections */}
      {!loading && !error && songs.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {PIPELINE_STAGES.map(stage => {
            const stageSongs  = grouped[stage];
            const isCollapsed = collapsed.has(stage);
            const dotColor    = STAGE_DOT_COLOR[stage];
            const badgeClass  = STATUS_BADGE[stage] ?? "badge-gray";

            // Sort this stage's songs independently using shared sort state.
            // year_event and bg_hue use numeric comparison; all other fields use locale string sort.
            const sorted = [...stageSongs].sort((a, b) => {
              let cmp = 0;
              if (sortField === "year_event") {
                cmp = (a.year_event ?? 0) - (b.year_event ?? 0);
              } else if (sortField === "bg_hue") {
                cmp = (Number(a.bg_hue) || 0) - (Number(b.bg_hue) || 0);
              } else {
                const aStr = (a[sortField as keyof Song] as string | null) ?? "";
                const bStr = (b[sortField as keyof Song] as string | null) ?? "";
                cmp = aStr.localeCompare(bStr);
              }
              return cmp * (sortDir === "asc" ? 1 : -1);
            });

            // Filter by search term — matches slug, title_pl, title_en (case-insensitive)
            const searchTerm = (sectionSearch[stage] ?? "").toLowerCase().trim();
            const filtered = searchTerm
              ? sorted.filter(s =>
                  s.slug.toLowerCase().includes(searchTerm) ||
                  s.title_pl.toLowerCase().includes(searchTerm) ||
                  s.title_en.toLowerCase().includes(searchTerm)
                )
              : sorted;

            return (
              <section key={stage}>

                {/* ── Section header ── */}
                <div
                  onClick={() => toggleCollapse(stage)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px",
                    background: "#1a1510",
                    border: "1px solid #2a2018",
                    borderRadius: isCollapsed ? 8 : "8px 8px 0 0",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  {/* Collapse / expand arrow */}
                  <span
                    aria-hidden="true"
                    style={{
                      display: "inline-block",
                      fontSize: 11,
                      color: "#a89a92",
                      transform: isCollapsed ? "rotate(0deg)" : "rotate(90deg)",
                      transition: "transform 0.15s",
                      minWidth: 12,
                    }}
                  >▶</span>

                  {/* Stage colour dot */}
                  <span
                    aria-hidden="true"
                    style={{
                      display: "inline-block",
                      width: 8, height: 8,
                      borderRadius: "50%",
                      background: dotColor,
                      flexShrink: 0,
                    }}
                  />

                  {/* Stage name */}
                  <span style={{ fontWeight: 600, fontSize: 12, letterSpacing: "0.06em", color: "#e8ddd5" }}>
                    {STAGE_LABEL[stage]}
                  </span>

                  {/* Song count badge */}
                  <span
                    className={`badge ${badgeClass}`}
                    style={{ marginLeft: 2, fontSize: 11 }}
                  >
                    {stageSongs.length} {stageSongs.length === 1 ? "song" : "songs"}
                  </span>
                </div>

                {/* ── Search bar (visible when expanded) ── */}
                {!isCollapsed && (
                  <div style={{
                    padding: "6px 12px",
                    background: "#150f12",
                    border: "1px solid #2a2018",
                    borderTop: "none",
                  }}>
                    <input
                      type="search"
                      value={sectionSearch[stage] ?? ""}
                      onChange={e => setSectionSearch(prev => ({ ...prev, [stage]: e.target.value }))}
                      placeholder="Search slug, title PL or EN…"
                      style={{
                        width: 280, fontSize: 12,
                        background: "#0d0a0b", border: "1px solid #3a3028",
                        color: "#e8ddd5", borderRadius: 4, padding: "4px 8px",
                        outline: "none",
                      }}
                      aria-label={`Search in ${stage} stage`}
                    />
                    {searchTerm && (
                      <span style={{ fontSize: 11, color: "#a89a92", marginLeft: 10 }}>
                        {filtered.length} / {stageSongs.length}
                      </span>
                    )}
                  </div>
                )}

                {/* ── Stage table (hidden when collapsed) ── */}
                {!isCollapsed && (
                  <div style={{ overflowX: "auto", border: "1px solid #2a2018", borderTop: "none", borderRadius: "0 0 8px 8px" }}>
                    <table className="data-table" style={{ minWidth: 1400 }}>
                      <thead>
                        <tr>
                          {/* Expand toggle — not sortable */}
                          <TH width={32}>{""}</TH>
                          <SortableTH field="slug"         label="Slug"       width={140} sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                          <SortableTH field="title_pl"     label="Title PL"   width={150} sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                          <SortableTH field="title_en"     label="Title EN"   width={150} sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                          {/* Status is the grouping dimension — not sortable */}
                          <TH width={115}>Status</TH>
                          <SortableTH field="album_slug"   label="Album"      width={110} sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                          <SortableTH field="era"          label="Era"        width={95}  sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                          <SortableTH field="year_event"   label="Year"       width={70}  sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                          <SortableTH field="release_date" label="Release"    width={105} sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                          <TH width={110}>YT PL</TH>
                          <TH width={110}>YT EN</TH>
                          <SortableTH field="bg_hue"       label="Hue"        width={75}  sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                          {/* Actions — not sortable */}
                          <TH width={320}>Actions</TH>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.length === 0 ? (
                          <tr>
                            <td
                              colSpan={COL_COUNT}
                              style={{ textAlign: "center", color: "#a89a92", padding: 24, fontSize: 13 }}
                            >
                              {searchTerm ? `No matches for "${searchTerm}".` : "No songs in this stage."}
                            </td>
                          </tr>
                        ) : (
                          filtered.map(song => {
                            const isExpanded = expandedSlug === song.slug;
                            const isSaving   = !!saving[song.slug];
                            const isDeleting = !!deleting[song.slug];
                            const isQueuing  = !!queuing[song.slug];
                            const isDisabled = isSaving || isDeleting;
                            // Convenience wrapper to call patchSong with the current song snapshot
                            const patch = (u: Partial<Song>) => patchSong(song.slug, u, song);

                            return (
                              <React.Fragment key={song.slug}>

                                {/* ── Main row ── */}
                                <tr style={{ opacity: isDisabled ? 0.6 : 1, transition: "opacity 0.15s" }}>

                                  {/* Expand button — reveals rich content row + file status */}
                                  <TD center>
                                    <button
                                      onClick={() => {
                                        const opening = expandedSlug !== song.slug;
                                        setExpanded(opening ? song.slug : null);
                                        if (opening) fetchFileStatus(song.slug);
                                      }}
                                      title="Edit rich content (subtitles, summaries) + file status"
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
                                    <InlineInput
                                      songSlug={song.slug} field="title_pl"
                                      value={song.title_pl} disabled={isDisabled}
                                      onPatch={patch} width={140}
                                    />
                                  </TD>

                                  {/* Title EN */}
                                  <TD>
                                    <InlineInput
                                      songSlug={song.slug} field="title_en"
                                      value={song.title_en} disabled={isDisabled}
                                      onPatch={patch} width={140}
                                    />
                                  </TD>

                                  {/* Status — select with badge colour; changing moves the row to new section */}
                                  <TD>
                                    <select
                                      value={song.status}
                                      disabled={isDisabled}
                                      className={`badge ${STATUS_BADGE[song.status] ?? "badge-gray"}`}
                                      style={{
                                        background: "transparent", border: "none",
                                        cursor: "pointer", fontFamily: "inherit",
                                        fontSize: "inherit", padding: 0, outline: "none",
                                      }}
                                      onChange={e => patch({ status: e.target.value })}
                                      aria-label={`Status for ${song.slug}`}
                                    >
                                      {VALID_STATUSES.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                      ))}
                                    </select>
                                  </TD>

                                  {/* Album slug */}
                                  <TD>
                                    <InlineInput
                                      songSlug={song.slug} field="album_slug"
                                      value={song.album_slug} disabled={isDisabled}
                                      onPatch={patch} mono placeholder="—" width={100}
                                    />
                                  </TD>

                                  {/* Era — select */}
                                  <TD>
                                    <select
                                      key={`era-${song.slug}-${song.era}`}
                                      defaultValue={song.era ?? ""}
                                      disabled={isDisabled}
                                      style={{ ...CELL_INPUT, width: 88 }}
                                      onChange={e => {
                                        const v = e.target.value || null;
                                        if (v !== song.era) patch({ era: v });
                                      }}
                                      aria-label={`Era for ${song.slug}`}
                                    >
                                      <option value="">—</option>
                                      {VALID_ERAS.map(e => (
                                        <option key={e} value={e}>{e}</option>
                                      ))}
                                    </select>
                                  </TD>

                                  {/* Year event — number */}
                                  <TD>
                                    <input
                                      key={`year_event-${song.slug}-${song.year_event}`}
                                      type="number"
                                      defaultValue={song.year_event ?? ""}
                                      placeholder="—"
                                      disabled={isDisabled}
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
                                    <InlineInput
                                      songSlug={song.slug} field="release_date"
                                      value={song.release_date} disabled={isDisabled}
                                      onPatch={patch} mono placeholder="YYYY-MM-DD" width={96}
                                    />
                                  </TD>

                                  {/* YouTube PL ID */}
                                  <TD>
                                    <InlineInput
                                      songSlug={song.slug} field="youtube_id_pl"
                                      value={song.youtube_id_pl} disabled={isDisabled}
                                      onPatch={patch} mono width={100}
                                    />
                                  </TD>

                                  {/* YouTube EN ID */}
                                  <TD>
                                    <InlineInput
                                      songSlug={song.slug} field="youtube_id_en"
                                      value={song.youtube_id_en} disabled={isDisabled}
                                      onPatch={patch} mono width={100}
                                    />
                                  </TD>

                                  {/* BG Hue (0-360) */}
                                  <TD>
                                    <InlineInput
                                      songSlug={song.slug} field="bg_hue"
                                      value={song.bg_hue} disabled={isDisabled}
                                      onPatch={patch} mono placeholder="28" width={60}
                                    />
                                  </TD>

                                  {/* Actions */}
                                  <TD>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>

                                      {QUEUE_ELIGIBLE_STAGES.has(stage) && (() => {
                                        const todayStr    = new Date().toISOString().slice(0, 10);
                                        const d = new Date(); d.setDate(d.getDate() + 1);
                                        const tomorrowStr = d.toISOString().slice(0, 10);
                                        const chosenDate  = queueDates[song.slug] ?? tomorrowStr;
                                        const isQueued    = stage === "queued";
                                        const doNow       = () => isQueued
                                          ? rescheduleEntry(song.slug, todayStr, true)
                                          : queueSong(song.slug, todayStr, true);
                                        const doScheduled = () => isQueued
                                          ? rescheduleEntry(song.slug, chosenDate)
                                          : queueSong(song.slug, chosenDate);

                                        // Platforms for pre-queue selection (non-queued stages)
                                        const selectedPlats = queuePlatforms[song.slug] ?? [...ALL_PLATFORMS];
                                        // Platforms for queued entry (editable via PATCH)
                                        const activeEntryPlats = entryPlatforms[song.slug] ?? [];

                                        return (
                                          <>
                                            {/* Platform toggles */}
                                            <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                                              {ALL_PLATFORMS.map(plat => {
                                                const active = isQueued
                                                  ? activeEntryPlats.includes(plat)
                                                  : selectedPlats.includes(plat);
                                                return (
                                                  <button
                                                    key={plat}
                                                    onClick={() => {
                                                      if (isQueued) {
                                                        toggleEntryPlatform(song.slug, plat);
                                                      } else {
                                                        const cur = queuePlatforms[song.slug] ?? [...ALL_PLATFORMS];
                                                        const next = cur.includes(plat)
                                                          ? cur.filter(p => p !== plat)
                                                          : [...cur, plat];
                                                        if (next.length > 0) setQueuePlatforms(prev => ({ ...prev, [song.slug]: next }));
                                                      }
                                                    }}
                                                    disabled={isQueuing || isDisabled}
                                                    title={plat}
                                                    style={{
                                                      fontSize: 10, padding: "2px 5px",
                                                      borderRadius: 3, cursor: "pointer",
                                                      border: active ? "1px solid #4acece88" : "1px solid #3a302888",
                                                      background: active ? "#0a2020" : "transparent",
                                                      color: active ? "#4acece" : "#5a5048",
                                                      transition: "all 0.1s",
                                                    }}
                                                  >
                                                    {PLATFORM_LABEL[plat]}
                                                  </button>
                                                );
                                              })}
                                            </div>

                                            {/* Queue / Reschedule row */}
                                            <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                                              {/* ▶ Now — release today */}
                                              <button
                                                onClick={doNow}
                                                disabled={isQueuing || isDisabled}
                                                title={`Release "${song.slug}" today (${todayStr})`}
                                                style={{
                                                  fontSize: 11, padding: "3px 8px",
                                                  background: "#0a2020",
                                                  border: "1px solid #4acece55",
                                                  color: "#4acece",
                                                  borderRadius: 4, cursor: "pointer",
                                                  opacity: (isQueuing || isDisabled) ? 0.5 : 1,
                                                  whiteSpace: "nowrap",
                                                }}
                                                aria-label={`Release ${song.slug} today`}
                                              >
                                                {isQueuing ? "…" : "▶ Now"}
                                              </button>

                                              {/* Custom date input */}
                                              <input
                                                type="date"
                                                value={chosenDate}
                                                min={todayStr}
                                                onChange={e => setQueueDates(prev => ({ ...prev, [song.slug]: e.target.value }))}
                                                disabled={isQueuing || isDisabled}
                                                style={{ ...MONO_INPUT, width: 112, padding: "2px 4px" }}
                                                aria-label={`Queue date for ${song.slug}`}
                                              />

                                              {/* → Queue / → Reschedule */}
                                              <button
                                                onClick={doScheduled}
                                                disabled={isQueuing || isDisabled}
                                                title={isQueued
                                                  ? `Reschedule "${song.slug}" to ${chosenDate}`
                                                  : `Queue "${song.slug}" for ${chosenDate}`}
                                                style={{
                                                  fontSize: 11, padding: "3px 8px",
                                                  background: "#1e2a1a",
                                                  border: "1px solid #2d4a27",
                                                  color: "#6dbf67",
                                                  borderRadius: 4, cursor: "pointer",
                                                  opacity: (isQueuing || isDisabled) ? 0.5 : 1,
                                                  whiteSpace: "nowrap",
                                                }}
                                                aria-label={isQueued ? `Reschedule ${song.slug}` : `Queue ${song.slug} for release`}
                                              >
                                                {isQueuing ? "…" : isQueued ? "→ Reschedule" : "→ Queue"}
                                              </button>

                                              {/* ↩ Dequeue — QUEUED stage only */}
                                              {isQueued && (
                                                <button
                                                  onClick={() => dequeueEntry(song.slug)}
                                                  disabled={isQueuing || isDisabled}
                                                  title={`Dequeue "${song.slug}" and revert to ready_to_release`}
                                                  style={{
                                                    fontSize: 11, padding: "3px 8px",
                                                    background: "transparent",
                                                    border: "1px solid #6b4a2a",
                                                    color: "#c8a84b",
                                                    borderRadius: 4, cursor: "pointer",
                                                    opacity: (isQueuing || isDisabled) ? 0.5 : 1,
                                                    whiteSpace: "nowrap",
                                                  }}
                                                  aria-label={`Dequeue ${song.slug}`}
                                                >
                                                  {isQueuing ? "…" : "↩ Dequeue"}
                                                </button>
                                              )}
                                            </div>
                                          </>
                                        );
                                      })()}

                                      {/* 🔄 Sync button — revalidates ISR cache (released songs only) */}
                                      {stage === "released" && (() => {
                                        const isSyncing = !!syncing[song.slug];
                                        return (
                                          <div>
                                            <button
                                              onClick={() => syncSong(song.slug)}
                                              disabled={isSyncing || isSaving}
                                              title={`Flush Next.js ISR cache for "${song.slug}"`}
                                              style={{
                                                fontSize: 11, padding: "3px 8px",
                                                background: "transparent",
                                                border: "1px solid #2a4a3a",
                                                color: "#4ade80",
                                                borderRadius: 4, cursor: "pointer",
                                                opacity: (isSyncing || isSaving) ? 0.5 : 1,
                                              }}
                                              aria-label={`Sync site cache for ${song.slug}`}
                                            >
                                              {isSyncing ? "…" : "↺ Sync"}
                                            </button>
                                          </div>
                                        );
                                      })()}

                                      {/* ✕ Delete button */}
                                      <div>
                                        <button
                                          onClick={() => deleteSong(song.slug)}
                                          disabled={isDeleting || isSaving}
                                          title={`Delete "${song.slug}" permanently`}
                                          style={{
                                            fontSize: 11, padding: "3px 8px",
                                            background: "transparent",
                                            border: "1px solid #5a2a2a",
                                            color: "#c87070",
                                            borderRadius: 4, cursor: "pointer",
                                            opacity: (isDeleting || isSaving) ? 0.5 : 1,
                                          }}
                                          aria-label={`Delete ${song.slug}`}
                                        >
                                          {isDeleting ? "…" : "✕ Delete"}
                                        </button>
                                      </div>

                                    </div>
                                  </TD>
                                </tr>

                                {/* ── Expanded rich-content row ── */}
                                {isExpanded && (
                                  <tr>
                                    <td
                                      colSpan={COL_COUNT}
                                      style={{
                                        background: "#1a1510",
                                        borderTop: "1px solid #3a3028",
                                        borderBottom: "2px solid #dc143c",
                                        padding: "16px 24px",
                                      }}
                                    >
                                      <div style={{
                                        display: "grid",
                                        gridTemplateColumns: "1fr 1fr",
                                        gap: "16px 32px",
                                      }}>

                                        <DetailField label="Subtitle PL">
                                          <InlineInput
                                            songSlug={song.slug} field="subtitle_pl"
                                            value={song.subtitle_pl} disabled={isSaving}
                                            onPatch={patch} width={380}
                                          />
                                        </DetailField>

                                        <DetailField label="Subtitle EN">
                                          <InlineInput
                                            songSlug={song.slug} field="subtitle_en"
                                            value={song.subtitle_en} disabled={isSaving}
                                            onPatch={patch} width={380}
                                          />
                                        </DetailField>

                                        <DetailField label="Summary PL">
                                          <InlineTextarea
                                            songSlug={song.slug} field="summary_pl"
                                            value={song.summary_pl} disabled={isSaving}
                                            onPatch={patch} rows={3}
                                          />
                                        </DetailField>

                                        <DetailField label="Summary EN">
                                          <InlineTextarea
                                            songSlug={song.slug} field="summary_en"
                                            value={song.summary_en} disabled={isSaving}
                                            onPatch={patch} rows={3}
                                          />
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
                                            const items: [string, boolean, string][] = [
                                              ["pl_mp4",      fs.pl_mp4,      `${song.slug}_pl.mp4`],
                                              ["en_mp4",      fs.en_mp4,      `${song.slug}_en.mp4`],
                                              ["feed_pl_mp4", fs.feed_pl_mp4, `${song.slug}-feed-pl.mp4`],
                                              ["feed_en_mp4", fs.feed_en_mp4, `${song.slug}-feed-en.mp4`],
                                              ["thumb",       fs.thumb,       `${song.slug}_thumb.jpg`],
                                            ];
                                            return (
                                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                                                {items.map(([, ok, filename]) => (
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
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
