/*
 * admin/src/app/status/page.tsx — Song Status Dashboard
 *
 * Shows two sections:
 *   1. IN PRODUCTION — all songs not yet released, with phase progress bar.
 *      Clicking a row lazily fetches and toggles a file checklist (6 slots).
 *   2. RELEASED — analytics table with YouTube stats from platform_stats.
 *      "↺ Refresh Stats" triggers POST /api/stats/refresh-all then reloads.
 *
 * API endpoints used:
 *   GET  /api/songs                      → Song[]
 *   GET  /api/upload/{slug}/status       → FileStatus (lazy, on row expand)
 *   POST /api/stats/refresh-all          → triggers stats fetch
 */

"use client";

import { useState, useCallback, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PlatformStat {
  views:      number;
  likes:      number;
  comments:   number;
  fetched_at: string;
}

interface Song {
  slug:           string;
  title_pl:       string;
  title_en:       string;
  status:         string;
  release_date:   string | null;
  youtube_id_pl:  string | null;
  youtube_id_en:  string | null;
  platform_stats: Record<string, PlatformStat>;
}

interface FileEntry {
  filename: string;
  label:    string;
  kind:     string;
  exists:   boolean;
  size_mb:  number | null;
}

interface FileStatus {
  slug:     string;
  base_url: string;
  files:    FileEntry[];
  ready:    boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const GOLD   = "#c8a84b";
const RED    = "#dc143c";
const MUTED  = "#a89a92";
const CREAM  = "#f5f5f0";
const BG1    = "#161013";
const BG2    = "#1a1510";
const BORDER = "#2e2125";
const GREEN  = "#40c060";

/** Maps DB status values to their pipeline phase number (1–6). */
const PHASE: Record<string, number> = {
  scaffold:    1,
  audio_ready: 2,
  sync_done:   3,
  render_done: 4,
  scheduled:   5,
  queued:      6,
};

// ── Sub-components ────────────────────────────────────────────────────────────

/**
 * StatusBadge — small pill showing the song's current DB status.
 * @param status - DB status string (e.g. "audio_ready", "scheduled")
 */
function StatusBadge({ status }: { status: string }) {
  const color =
    status === "released"  ? GREEN :
    status === "scheduled" ? GOLD  :
    status === "queued"    ? "#4acece" :
    MUTED;
  return (
    <span style={{
      fontFamily: "monospace", fontSize: 10,
      padding: "2px 8px", borderRadius: 3,
      background: BG1,
      border: `1px solid ${color}44`,
      color,
      whiteSpace: "nowrap",
    }}>
      {status}
    </span>
  );
}

/**
 * ProgressBar — thin horizontal bar showing phase completion.
 * @param pct - 0–100 percentage
 */
function ProgressBar({ pct }: { pct: number }) {
  const color = pct >= 100 ? GREEN : GOLD;
  return (
    <div style={{ height: 3, background: BORDER, borderRadius: 2, flex: 1, minWidth: 80 }}>
      <div style={{
        height: "100%", width: `${pct}%`, background: color,
        borderRadius: 2, transition: "width 300ms",
      }} />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function StatusPage() {
  const [songs,       setSongs]       = useState<Song[]>([]);
  const [loading,     setLoading]     = useState(true);
  // expanded: which slugs have their file checklist open
  const [expanded,    setExpanded]    = useState<Record<string, boolean>>({});
  // fileStatus: cached result of GET /api/upload/{slug}/status per slug
  const [fileStatus,  setFileStatus]  = useState<Record<string, FileStatus | null>>({});
  // fileLoading: slugs currently fetching file status
  const [fileLoading, setFileLoading] = useState<Record<string, boolean>>({});
  const [refreshing,  setRefreshing]  = useState(false);

  // ── Data loading ────────────────────────────────────────────────────────────

  /** Fetch all songs from the API and update state. */
  const loadSongs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/songs");
      if (!res.ok) throw new Error(`${res.status}`);
      setSongs(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSongs(); }, [loadSongs]);

  // ── Row toggle (lazy file checklist) ────────────────────────────────────────

  /**
   * Toggle expand/collapse for a song row.
   * Lazily fetches file status the first time a row is opened.
   * @param slug - song slug
   */
  const toggleRow = useCallback(async (slug: string) => {
    const next = !expanded[slug];
    setExpanded(e => ({ ...e, [slug]: next }));
    // Only fetch if opening and not yet cached
    if (next && fileStatus[slug] === undefined) {
      setFileLoading(f => ({ ...f, [slug]: true }));
      try {
        const res = await fetch(`/api/upload/${slug}/status`);
        const data: FileStatus | null = res.ok ? await res.json() : null;
        setFileStatus(s => ({ ...s, [slug]: data }));
      } catch {
        setFileStatus(s => ({ ...s, [slug]: null }));
      } finally {
        setFileLoading(f => ({ ...f, [slug]: false }));
      }
    }
  }, [expanded, fileStatus]);

  // ── Stats refresh ───────────────────────────────────────────────────────────

  /**
   * Trigger a stats refresh for all released songs, then reload.
   * Calls POST /api/stats/refresh-all.
   */
  const refreshStats = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetch("/api/stats/refresh-all", { method: "POST" });
      await loadSongs();
    } finally {
      setRefreshing(false);
    }
  }, [loadSongs]);

  // ── Derived data ────────────────────────────────────────────────────────────

  const inProduction = songs.filter(s => s.status !== "released");
  const released     = songs.filter(s => s.status === "released");

  // Format helpers
  const fmtNum = (n?: number) =>
    n != null ? n.toLocaleString() : "—";

  const fmtDate = (d?: string | null) =>
    d ? d.slice(0, 10) : "—";

  const fmtFetched = (d?: string) =>
    d
      ? new Date(d).toLocaleString("en-GB", {
          month: "short", day: "numeric",
          hour: "2-digit", minute: "2-digit",
        })
      : "—";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "40px 48px 80px", maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontFamily: "monospace", fontSize: 11, letterSpacing: "0.3em", color: MUTED, marginBottom: 12, textTransform: "uppercase" }}>
          Status
        </div>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 32, fontWeight: 600, color: CREAM, marginBottom: 8 }}>
          Song Status
        </h1>
        <p style={{ color: MUTED, fontSize: 14 }}>
          Production pipeline progress and released song analytics.
        </p>
      </div>

      {loading && (
        <div style={{ fontFamily: "monospace", fontSize: 13, color: MUTED }}>Loading…</div>
      )}

      {!loading && (
        <>
          {/* ── IN PRODUCTION ─────────────────────────────────────────────── */}
          <section style={{ marginBottom: 56 }}>
            <h2 style={{
              fontFamily: "monospace", fontSize: 12,
              letterSpacing: "0.2em", color: GOLD,
              textTransform: "uppercase", marginBottom: 16,
            }}>
              In Production ({inProduction.length})
            </h2>

            {inProduction.length === 0 && (
              <div style={{ fontFamily: "monospace", fontSize: 13, color: MUTED, padding: "24px 0" }}>
                No songs in production.
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {inProduction.map(song => {
                const phase = PHASE[song.status] ?? 0;
                const pct   = Math.round((phase / 6) * 100);
                const isOpen  = expanded[song.slug];
                const fs      = fileStatus[song.slug];
                const fl      = fileLoading[song.slug];

                return (
                  <div key={song.slug}>
                    {/* Clickable row */}
                    <div
                      onClick={() => toggleRow(song.slug)}
                      style={{
                        display: "flex", alignItems: "center", gap: 16,
                        padding: "12px 16px",
                        background: isOpen ? BG1 : BG2,
                        border: `1px solid ${isOpen ? GOLD + "55" : BORDER}`,
                        borderRadius: isOpen ? "4px 4px 0 0" : 4,
                        cursor: "pointer",
                        transition: "background 150ms",
                      }}
                    >
                      {/* Title PL */}
                      <div style={{ fontFamily: "monospace", fontSize: 12, color: CREAM, minWidth: 120, flexShrink: 0 }}>
                        {song.title_pl}
                      </div>
                      {/* Title EN */}
                      <div style={{ fontFamily: "monospace", fontSize: 11, color: MUTED, flexShrink: 0 }}>
                        {song.title_en}
                      </div>
                      <div style={{ flex: 1 }} />
                      {/* Status badge */}
                      <StatusBadge status={song.status} />
                      {/* Release date */}
                      {song.release_date && (
                        <div style={{ fontFamily: "monospace", fontSize: 10, color: GOLD, flexShrink: 0 }}>
                          {song.release_date.slice(0, 10)}
                        </div>
                      )}
                      {/* Progress bar */}
                      <ProgressBar pct={pct} />
                      {/* Percentage label */}
                      <div style={{ fontFamily: "monospace", fontSize: 10, color: MUTED, minWidth: 36, textAlign: "right" }}>
                        {pct}%
                      </div>
                      {/* Toggle arrow */}
                      <div style={{ fontFamily: "monospace", fontSize: 11, color: MUTED }}>
                        {isOpen ? "▲" : "▼"}
                      </div>
                    </div>

                    {/* Expanded file checklist */}
                    {isOpen && (
                      <div style={{
                        background: BG1,
                        border: `1px solid ${GOLD}55`,
                        borderTop: "none",
                        borderRadius: "0 0 4px 4px",
                        padding: "12px 16px",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 12,
                      }}>
                        {fl && (
                          <span style={{ fontFamily: "monospace", fontSize: 11, color: MUTED }}>
                            Loading files…
                          </span>
                        )}
                        {!fl && fs && fs.files.map(f => (
                          <div
                            key={f.filename}
                            style={{
                              display: "flex", gap: 6, alignItems: "center",
                              fontFamily: "monospace", fontSize: 11,
                              color: f.exists ? GREEN : MUTED,
                            }}
                          >
                            <span>{f.exists ? "✅" : "⬜"}</span>
                            <span>{f.filename}</span>
                          </div>
                        ))}
                        {!fl && fs === null && (
                          <span style={{ fontFamily: "monospace", fontSize: 11, color: RED }}>
                            Failed to load file status.
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── RELEASED ──────────────────────────────────────────────────── */}
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <h2 style={{
                fontFamily: "monospace", fontSize: 12,
                letterSpacing: "0.2em", color: GREEN,
                textTransform: "uppercase", margin: 0,
              }}>
                Released ({released.length})
              </h2>

              {/* Refresh stats button */}
              <button
                onClick={refreshStats}
                disabled={refreshing}
                style={{
                  background: "transparent",
                  border: `1px solid ${BORDER}`,
                  color: refreshing ? MUTED : GOLD,
                  padding: "6px 14px",
                  fontFamily: "monospace", fontSize: 11,
                  borderRadius: 3,
                  cursor: refreshing ? "default" : "pointer",
                }}
              >
                {refreshing ? "Refreshing…" : "↺ Refresh Stats"}
              </button>
            </div>

            {released.length === 0 && (
              <div style={{ fontFamily: "monospace", fontSize: 13, color: MUTED, padding: "24px 0" }}>
                No released songs yet.
              </div>
            )}

            {released.length > 0 && (
              <div style={{ border: `1px solid ${BORDER}`, borderRadius: 4, overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: BG1 }}>
                      {["Song", "Release Date", "YT Views PL", "YT Views EN", "YT Likes PL", "YT Likes EN", "Fetched At"].map(h => (
                        <th key={h} style={{
                          padding: "10px 14px", textAlign: "left",
                          fontFamily: "monospace", fontSize: 10,
                          letterSpacing: "0.2em", color: MUTED,
                          textTransform: "uppercase",
                          borderBottom: `1px solid ${BORDER}`,
                          whiteSpace: "nowrap",
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {released.map((song, i) => {
                      // Pull stats from platform_stats JSONB dict
                      const pl = song.platform_stats?.youtube_pl;
                      const en = song.platform_stats?.youtube_en;
                      return (
                        <tr key={song.slug} style={{ background: i % 2 === 0 ? BG2 : BG1 }}>
                          <td style={{ padding: "10px 14px" }}>
                            <div style={{ fontFamily: "monospace", fontSize: 12, color: CREAM }}>
                              {song.title_pl}
                            </div>
                            <div style={{ fontFamily: "monospace", fontSize: 10, color: MUTED }}>
                              {song.title_en}
                            </div>
                          </td>
                          <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 12, color: MUTED, whiteSpace: "nowrap" }}>
                            {fmtDate(song.release_date)}
                          </td>
                          <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 12, color: CREAM }}>
                            {fmtNum(pl?.views)}
                          </td>
                          <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 12, color: CREAM }}>
                            {fmtNum(en?.views)}
                          </td>
                          <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 12, color: GOLD }}>
                            {fmtNum(pl?.likes)}
                          </td>
                          <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 12, color: GOLD }}>
                            {fmtNum(en?.likes)}
                          </td>
                          <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 11, color: MUTED, whiteSpace: "nowrap" }}>
                            {fmtFetched(pl?.fetched_at ?? en?.fetched_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
