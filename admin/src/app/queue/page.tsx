/*
 * admin/src/app/queue/page.tsx — Release management page (client component).
 *
 * Three sections:
 *   1. READY TO RELEASE — songs with status=render_done → Release Now / Schedule
 *   2. SCHEDULED        — pending queue entries with countdown + cancel
 *   3. HISTORY          — released/failed entries
 *
 * API calls:
 *   GET  /api/release/ready           — render_done songs
 *   GET  /api/release_queue           — all queue entries
 *   POST /api/release/trigger/{slug}  — immediate release
 *   POST /api/release_queue           — schedule release
 *   DELETE /api/release_queue/{id}    — cancel scheduled
 */
"use client";

import { useEffect, useState, useCallback } from "react";

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface ReadySong {
  slug:        string;
  title_pl:    string;
  title_en:    string;
  era:         string | null;
  album_slug:  string | null;
  year_label:  string | null;
}

interface QueueEntry {
  id:                     number;
  song_slug:              string;
  song_title_pl:          string;
  song_title_en:          string;
  scheduled_at:           string;
  platforms:              string[];
  status:                 string;
  topic_id:               number | null;
  upload_post_request_id: string | null;
  released_at:            string | null;
}

const ALL_PLATFORMS = ["youtube", "instagram", "tiktok", "facebook"];

const STATUS_COLOUR: Record<string, string> = {
  pending:   "#a89a92",
  releasing: "#9b7fd4",
  released:  "#5fb4a2",
  failed:    "#c84b4b",
};

const PLATFORM_ICON: Record<string, string> = {
  youtube:   "▶",
  instagram: "◈",
  tiktok:    "♪",
  facebook:  "f",
};

/* ── Helpers ────────────────────────────────────────────────────────────────── */

/**
 * formatScheduled — formats a UTC ISO string to local Warsaw-style display.
 * @param iso - ISO datetime string from API
 * @returns e.g. "1 Jun 2026, 10:00"
 */
function formatScheduled(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pl-PL", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
      timeZone: "Europe/Warsaw",
    });
  } catch {
    return iso;
  }
}

/**
 * countdown — returns a human-readable countdown string to a future datetime.
 * @param iso - ISO datetime string
 * @returns e.g. "in 3 days 4h" or "overdue"
 */
function countdown(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return "overdue";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `in ${d}d ${h}h`;
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${m}m`;
}

/* ── Schedule modal ─────────────────────────────────────────────────────────── */

/**
 * ScheduleModal — inline scheduling form overlay.
 *
 * @param song     - song to schedule
 * @param onSubmit - callback with scheduled_at + platforms
 * @param onClose  - close callback
 * @param loading  - submit in progress
 */
function ScheduleModal({ song, onSubmit, onClose, loading }: {
  song:       ReadySong;
  onSubmit:   (scheduled_at: string, platforms: string[]) => void;
  onClose:    () => void;
  loading:    boolean;
}) {
  const tomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  };

  const [dt,        setDt]        = useState(tomorrow());
  const [platforms, setPlatforms] = useState<string[]>(ALL_PLATFORMS);

  function togglePlatform(p: string) {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  }

  return (
    <div style={{
      position:       "fixed", inset: 0, zIndex: 200,
      background:     "rgba(10,6,8,0.85)", backdropFilter: "blur(8px)",
      display:        "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background:   "#1c1418", border: "1px solid #3a2c30",
        borderRadius: 8, padding: "32px", width: 400, maxWidth: "90vw",
      }}>
        <div style={{ fontSize: 11, color: "#a89a92", letterSpacing: "0.2em", marginBottom: 6 }}>
          SCHEDULE RELEASE
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: "#e8ddd5", marginBottom: 24 }}>
          {song.title_pl}
        </div>

        <label style={{ display: "block", fontSize: 11, color: "#a89a92", marginBottom: 4 }}>
          RELEASE DATE & TIME (Warsaw)
        </label>
        <input
          type="datetime-local"
          value={dt}
          onChange={e => setDt(e.target.value)}
          min={new Date().toISOString().slice(0, 16)}
          style={{
            width: "100%", background: "#0a0608", border: "1px solid #3a2c30",
            color: "#e8ddd5", borderRadius: 4, padding: "8px 10px",
            fontSize: 14, marginBottom: 20, boxSizing: "border-box",
          }}
        />

        <label style={{ display: "block", fontSize: 11, color: "#a89a92", marginBottom: 8 }}>
          PLATFORMS
        </label>
        <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
          {ALL_PLATFORMS.map(p => (
            <label key={p} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 4, cursor: "pointer",
              background:  platforms.includes(p) ? "rgba(220,20,60,0.15)" : "#0a0608",
              border:      platforms.includes(p) ? "1px solid rgba(220,20,60,0.5)" : "1px solid #3a2c30",
              color:       platforms.includes(p) ? "#dc143c" : "#a89a92",
              fontSize:    13, userSelect: "none",
            }}>
              <input
                type="checkbox"
                checked={platforms.includes(p)}
                onChange={() => togglePlatform(p)}
                style={{ display: "none" }}
              />
              {PLATFORM_ICON[p]} {p}
            </label>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => onSubmit(dt, platforms)}
            disabled={loading || platforms.length === 0}
            style={{
              flex: 1, padding: "10px", background: "#dc143c", color: "#fff",
              border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600,
              cursor: loading ? "wait" : "pointer", letterSpacing: "0.1em",
            }}
          >
            {loading ? "Scheduling…" : "Schedule"}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: "10px 20px", background: "transparent",
              border: "1px solid #3a2c30", color: "#a89a92",
              borderRadius: 4, fontSize: 13, cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────────────────────── */

/**
 * QueuePage — full release management page with three sections.
 */
export default function QueuePage() {
  const [ready,          setReady]          = useState<ReadySong[]>([]);
  const [queue,          setQueue]          = useState<QueueEntry[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [toast,          setToast]          = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [triggering,     setTriggering]     = useState<Record<string, boolean>>({});
  const [cancelling,     setCancelling]     = useState<Record<number, boolean>>({});
  const [schedSong,      setSchedSong]      = useState<ReadySong | null>(null);
  const [schedLoading,   setSchedLoading]   = useState(false);

  function showToast(msg: string, type: "ok" | "err" = "err") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  /** Fetch ready songs + queue entries. */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rRes, qRes] = await Promise.all([
        fetch("/api/release/ready"),
        fetch("/api/release_queue"),
      ]);
      if (!rRes.ok) throw new Error(`Ready API ${rRes.status}`);
      if (!qRes.ok) throw new Error(`Queue API ${qRes.status}`);
      const rData = await rRes.json();
      const qData = await qRes.json();
      setReady(Array.isArray(rData) ? rData : []);
      setQueue(Array.isArray(qData) ? qData : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /**
   * triggerRelease — POST /api/release/trigger/{slug} for immediate release.
   * @param slug - song slug
   */
  async function triggerRelease(slug: string) {
    if (!confirm(`Release "${slug}" immediately to all platforms?`)) return;
    setTriggering(prev => ({ ...prev, [slug]: true }));
    try {
      const res = await fetch(`/api/release/trigger/${slug}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? res.statusText);
      showToast(
        data.webhook_called
          ? `✓ "${slug}" queued — n8n workflow triggered`
          : `✓ "${slug}" queued — webhook not configured yet`,
        "ok",
      );
      await fetchAll();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Trigger failed");
    } finally {
      setTriggering(prev => ({ ...prev, [slug]: false }));
    }
  }

  /**
   * scheduleRelease — POST /api/release_queue with datetime + platforms.
   * @param scheduled_at - ISO datetime string
   * @param platforms    - platform list
   */
  async function scheduleRelease(scheduled_at: string, platforms: string[]) {
    if (!schedSong) return;
    setSchedLoading(true);
    try {
      const res = await fetch("/api/release_queue", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ song_slug: schedSong.slug, scheduled_at, platforms }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? res.statusText);
      showToast(`✓ "${schedSong.slug}" scheduled for ${formatScheduled(scheduled_at)}`, "ok");
      setSchedSong(null);
      await fetchAll();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Schedule failed");
    } finally {
      setSchedLoading(false);
    }
  }

  /**
   * cancelEntry — DELETE /api/release_queue/{id}.
   * @param id - queue entry id
   */
  async function cancelEntry(id: number) {
    if (!confirm("Cancel this scheduled release?")) return;
    setCancelling(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/release_queue/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error(`API ${res.status}`);
      setQueue(prev => prev.filter(e => e.id !== id));
      showToast("Scheduled release cancelled.", "ok");
      await fetchAll();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setCancelling(prev => ({ ...prev, [id]: false }));
    }
  }

  /* Split queue into sections */
  const scheduled = queue.filter(e => e.status === "pending" || e.status === "releasing");
  const history   = queue.filter(e => e.status === "released" || e.status === "failed");

  /* Shared cell style */
  const td = (extra?: React.CSSProperties): React.CSSProperties => ({
    padding: "10px 8px", fontSize: 13, color: "#e8ddd5",
    borderBottom: "1px solid #2a1e22", ...extra,
  });

  return (
    <>
      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Release</h1>
        <button className="btn-secondary" onClick={fetchAll} style={{ fontSize: 13, padding: "6px 14px" }}>
          Refresh
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={toast.type === "ok" ? "success-box" : "error-box"} style={{ marginBottom: 20 }}>
          {toast.msg}
        </div>
      )}

      {loading && <div style={{ color: "#a89a92", fontSize: 14 }}>Loading…</div>}
      {error   && <div className="error-box">{error}</div>}

      {/* ── Section 1: Ready to release ────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ fontSize: 11, color: "#dc143c", letterSpacing: "0.28em", marginBottom: 16 }}>
          ◆ READY TO RELEASE
        </div>

        {ready.length === 0 && !loading && (
          <div className="card" style={{ color: "#a89a92", fontSize: 14, padding: "20px 24px" }}>
            No songs with status <code>render_done</code>
          </div>
        )}

        {ready.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {ready.map(song => (
              <div key={song.slug} className="card" style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 20px", gap: 16, flexWrap: "wrap",
              }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#e8ddd5", marginBottom: 2 }}>
                    {song.title_pl}
                  </div>
                  <div style={{ fontSize: 11, color: "#a89a92", letterSpacing: "0.1em" }}>
                    {song.slug}
                    {song.era        && <span style={{ marginLeft: 12 }}>{song.era}</span>}
                    {song.album_slug && <span style={{ marginLeft: 12 }}>album: {song.album_slug}</span>}
                    {song.year_label && <span style={{ marginLeft: 12 }}>{song.year_label}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setSchedSong(song)}
                    className="btn-secondary"
                    style={{ fontSize: 12, padding: "6px 14px" }}
                  >
                    Schedule
                  </button>
                  <button
                    onClick={() => triggerRelease(song.slug)}
                    disabled={triggering[song.slug]}
                    className="btn-primary"
                    style={{ fontSize: 12, padding: "6px 14px", background: "#dc143c", borderColor: "#dc143c" }}
                  >
                    {triggering[song.slug] ? "Triggering…" : "⚡ Release Now"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Section 2: Scheduled ───────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ fontSize: 11, color: "#dc143c", letterSpacing: "0.28em", marginBottom: 16 }}>
          ◆ SCHEDULED ({scheduled.length})
        </div>

        {scheduled.length === 0 && !loading && (
          <div className="card" style={{ color: "#a89a92", fontSize: 14, padding: "20px 24px" }}>
            No scheduled releases
          </div>
        )}

        {scheduled.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #3a2c30" }}>
                {["SONG", "SCHEDULED", "COUNTDOWN", "PLATFORMS", "STATUS", ""].map(h => (
                  <th key={h} style={{ fontSize: 10, color: "#a89a92", letterSpacing: "0.2em",
                    padding: "6px 8px", textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scheduled.map(entry => (
                <tr key={entry.id}>
                  <td style={td()}>
                    <div style={{ fontWeight: 600 }}>{entry.song_title_pl}</div>
                    <div style={{ fontSize: 11, color: "#6f6258" }}>{entry.song_slug}</div>
                  </td>
                  <td style={td({ color: "#c8a84b" })}>{formatScheduled(entry.scheduled_at)}</td>
                  <td style={td({ color: "#a89a92", fontFamily: "monospace", fontSize: 12 })}>
                    {countdown(entry.scheduled_at)}
                  </td>
                  <td style={td()}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {entry.platforms.map(p => (
                        <span key={p} style={{
                          fontSize: 10, padding: "2px 6px",
                          background: "rgba(220,20,60,0.1)",
                          border: "1px solid rgba(220,20,60,0.25)",
                          borderRadius: 3, color: "#dc143c",
                        }}>
                          {PLATFORM_ICON[p]} {p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={td()}>
                    <span style={{ color: STATUS_COLOUR[entry.status] ?? "#a89a92", fontSize: 12 }}>
                      ● {entry.status}
                    </span>
                  </td>
                  <td style={td()}>
                    <button
                      onClick={() => cancelEntry(entry.id)}
                      disabled={cancelling[entry.id] || entry.status === "releasing"}
                      style={{
                        fontSize: 11, padding: "4px 10px", background: "transparent",
                        border: "1px solid #3a2c30", color: "#c84b4b",
                        borderRadius: 3, cursor: "pointer",
                        opacity: entry.status === "releasing" ? 0.4 : 1,
                      }}
                    >
                      {cancelling[entry.id] ? "…" : "Cancel"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ── Section 3: History ─────────────────────────────── */}
      <section>
        <div style={{ fontSize: 11, color: "#dc143c", letterSpacing: "0.28em", marginBottom: 16 }}>
          ◆ HISTORY ({history.length})
        </div>

        {history.length === 0 && !loading && (
          <div className="card" style={{ color: "#a89a92", fontSize: 14, padding: "20px 24px" }}>
            No release history yet
          </div>
        )}

        {history.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #3a2c30" }}>
                {["SONG", "SCHEDULED", "RELEASED AT", "PLATFORMS", "STATUS"].map(h => (
                  <th key={h} style={{ fontSize: 10, color: "#a89a92", letterSpacing: "0.2em",
                    padding: "6px 8px", textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...history].reverse().map(entry => (
                <tr key={entry.id} style={{ opacity: entry.status === "failed" ? 0.7 : 1 }}>
                  <td style={td()}>
                    <div style={{ fontWeight: 600 }}>{entry.song_title_pl}</div>
                    <div style={{ fontSize: 11, color: "#6f6258" }}>{entry.song_slug}</div>
                  </td>
                  <td style={td({ color: "#6f6258" })}>{formatScheduled(entry.scheduled_at)}</td>
                  <td style={td({ color: "#a89a92" })}>
                    {entry.released_at ? formatScheduled(entry.released_at) : "—"}
                  </td>
                  <td style={td()}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {entry.platforms.map(p => (
                        <span key={p} style={{
                          fontSize: 10, padding: "2px 6px",
                          background: "rgba(100,100,100,0.1)",
                          border: "1px solid #3a2c30",
                          borderRadius: 3, color: "#6f6258",
                        }}>
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={td()}>
                    <span style={{ color: STATUS_COLOUR[entry.status] ?? "#a89a92", fontSize: 12 }}>
                      ● {entry.status}
                    </span>
                    {entry.upload_post_request_id && (
                      <div style={{ fontSize: 10, color: "#6f6258", marginTop: 2 }}>
                        req: {entry.upload_post_request_id}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Schedule modal */}
      {schedSong && (
        <ScheduleModal
          song={schedSong}
          onSubmit={scheduleRelease}
          onClose={() => setSchedSong(null)}
          loading={schedLoading}
        />
      )}
    </>
  );
}
