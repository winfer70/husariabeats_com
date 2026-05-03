/*
 * admin/src/app/queue/page.tsx — Release Queue management page (client component).
 *
 * Fetches queue from /api/release_queue on mount.
 * Features:
 *   - "Add to Queue" form: song select + date + platform checkboxes → POST /api/release_queue
 *   - Scheduled date: inline date input per row → PATCH /api/release_queue/:id
 *   - Delete: per-row button → DELETE /api/release_queue/:id
 *   - Status badge: read-only (managed by n8n automation)
 */
"use client";

import { useEffect, useState, useCallback } from "react";

interface QueueEntry {
  id:            number;
  song_slug:     string;
  song_title_pl: string;
  song_title_en: string;
  scheduled_at:  string;  // YYYY-MM-DD
  platforms:     string[];
  status:        string;
}

interface SongOption {
  slug:     string;
  title_pl: string;
  status:   string;
}

const ALL_PLATFORMS = ["youtube", "facebook", "instagram", "tiktok"];

const STATUS_BADGE: Record<string, string> = {
  pending:   "badge-gray",
  releasing: "badge-purple",
  released:  "badge-green",
  failed:    "badge-red",
};

/**
 * SortableTH — clickable header cell that toggles sort direction.
 *
 * @param field     - Sort key identifier.
 * @param label     - Display label.
 * @param sortField - Currently active sort field.
 * @param sortDir   - Current sort direction.
 * @param onSort    - Callback to request sort by this field.
 */
function SortableTH({ field, label, sortField, sortDir, onSort }: {
  field: string; label: string;
  sortField: string; sortDir: "asc" | "desc";
  onSort: (field: string) => void;
}) {
  const active = sortField === field;
  return (
    <th
      onClick={() => onSort(field)}
      style={{
        fontSize: 11, padding: "6px 8px", whiteSpace: "nowrap",
        cursor: "pointer", userSelect: "none",
        color: active ? "#c8a84b" : undefined,
      }}
    >
      {label} {active ? (sortDir === "asc" ? "↑" : "↓") : <span style={{ opacity: 0.3 }}>↕</span>}
    </th>
  );
}

export default function QueuePage() {
  const [entries, setEntries]       = useState<QueueEntry[]>([]);
  const [songs, setSongs]           = useState<SongOption[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [deleting, setDeleting]     = useState<Record<number, boolean>>({});
  const [saving, setSaving]         = useState<Record<number, boolean>>({});
  const [toast, setToast]           = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [showForm, setShowForm]     = useState(false);
  // Sort state for the queue table
  const [sortField, setSortField]   = useState<string>("scheduled_at");
  const [sortDir,   setSortDir]     = useState<"asc" | "desc">("asc");
  // Add-to-queue form state
  const [formSlug, setFormSlug]     = useState("");
  const [formDate, setFormDate]     = useState("");
  const [formPlatforms, setFormPlatforms] = useState<string[]>(ALL_PLATFORMS);
  const [formSubmitting, setFormSubmitting] = useState(false);

  function showToast(msg: string, type: "ok" | "err" = "err") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
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

  /** Fetch queue entries from /api/release_queue. */
  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [qRes, sRes] = await Promise.all([
        fetch("/api/release_queue"),
        fetch("/api/songs"),
      ]);
      if (!qRes.ok) throw new Error(`Queue API ${qRes.status}`);
      const qData: QueueEntry[] = await qRes.json();
      setEntries(Array.isArray(qData) ? qData : []);
      if (sRes.ok) {
        const sData: SongOption[] = await sRes.json();
        setSongs(Array.isArray(sData) ? sData : []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  /** Delete a queue entry by id. */
  async function deleteEntry(id: number) {
    if (!confirm("Remove this entry from the release queue?")) return;
    setDeleting(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/release_queue/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error(`API ${res.status}`);
      setEntries(prev => prev.filter(e => e.id !== id));
      showToast("Entry removed.", "ok");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(prev => ({ ...prev, [id]: false }));
    }
  }

  /** Update scheduled_at for a queue entry. */
  async function updateDate(entry: QueueEntry, newDate: string) {
    if (!newDate || newDate === entry.scheduled_at) return;
    setSaving(prev => ({ ...prev, [entry.id]: true }));
    // Optimistic update
    setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, scheduled_at: newDate } : e));
    try {
      const res = await fetch(`/api/release_queue/${entry.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ scheduled_at: newDate }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? res.statusText);
      }
    } catch (e) {
      setEntries(prev => prev.map(e => e.id === entry.id ? entry : e));
      showToast(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(prev => ({ ...prev, [entry.id]: false }));
    }
  }

  /** Toggle a platform in the form's platform selection. */
  function togglePlatform(p: string) {
    setFormPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  }

  /** Submit the add-to-queue form → POST /api/release_queue. */
  async function submitAddToQueue(e: React.FormEvent) {
    e.preventDefault();
    if (!formSlug || !formDate || formPlatforms.length === 0) {
      showToast("Song, date, and at least one platform required.");
      return;
    }
    setFormSubmitting(true);
    try {
      const res = await fetch("/api/release_queue", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ song_slug: formSlug, scheduled_at: formDate, platforms: formPlatforms }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? res.statusText);
      }
      const created: QueueEntry = await res.json();
      setEntries(prev => [...prev, created]);
      setShowForm(false);
      setFormSlug("");
      setFormDate("");
      setFormPlatforms(ALL_PLATFORMS);
      showToast("Song added to queue.", "ok");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Add failed");
    } finally {
      setFormSubmitting(false);
    }
  }

  // Default form date = tomorrow
  function getDefaultDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Release Queue</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-secondary" onClick={fetchQueue} style={{ fontSize: 13, padding: "6px 14px" }}>
            Refresh
          </button>
          <button
            className="btn-primary"
            onClick={() => { setShowForm(v => !v); if (!formDate) setFormDate(getDefaultDate()); }}
            style={{ fontSize: 13, padding: "6px 14px" }}
          >
            {showForm ? "Cancel" : "+ Add to Queue"}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={toast.type === "ok" ? "success-box" : "error-box"} style={{ marginBottom: 16 }}>
          {toast.msg}
        </div>
      )}

      {/* Add-to-queue form */}
      {showForm && (
        <form onSubmit={submitAddToQueue} className="card" style={{ marginBottom: 24, display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
          {/* Song select */}
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", fontSize: 11, color: "#a89a92", marginBottom: 4 }}>
              SONG
            </label>
            <select
              value={formSlug}
              onChange={e => setFormSlug(e.target.value)}
              required
              style={{ width: "100%", background: "#1e1a17", border: "1px solid #3a3028",
                       color: "#e8ddd5", borderRadius: 4, padding: "6px 8px", fontSize: 13 }}
            >
              <option value="">— select song —</option>
              {songs
                .filter(s => s.status === "render_done" || s.status === "scheduled")
                .map(s => (
                  <option key={s.slug} value={s.slug}>{s.slug} — {s.title_pl}</option>
                ))
              }
            </select>
          </div>
          {/* Date */}
          <div style={{ flex: "1 1 150px" }}>
            <label style={{ display: "block", fontSize: 11, color: "#a89a92", marginBottom: 4 }}>
              RELEASE DATE
            </label>
            <input
              type="date"
              value={formDate}
              onChange={e => setFormDate(e.target.value)}
              required
              min={new Date().toISOString().slice(0, 10)}
              style={{ width: "100%", background: "#1e1a17", border: "1px solid #3a3028",
                       color: "#e8ddd5", borderRadius: 4, padding: "6px 8px", fontSize: 13 }}
            />
          </div>
          {/* Platforms */}
          <div style={{ flex: "1 1 280px" }}>
            <label style={{ display: "block", fontSize: 11, color: "#a89a92", marginBottom: 6 }}>
              PLATFORMS
            </label>
            <div style={{ display: "flex", gap: 12 }}>
              {ALL_PLATFORMS.map(p => (
                <label key={p} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={formPlatforms.includes(p)}
                    onChange={() => togglePlatform(p)}
                  />
                  {p}
                </label>
              ))}
            </div>
          </div>
          {/* Submit */}
          <button
            type="submit"
            className="btn-primary"
            disabled={formSubmitting}
            style={{ alignSelf: "flex-end", fontSize: 13, padding: "8px 20px" }}
          >
            {formSubmitting ? "Adding…" : "Add"}
          </button>
        </form>
      )}

      {loading && <p style={{ color: "#a89a92" }}>Loading…</p>}
      {error   && <div className="error-box"><strong>Could not load queue — </strong>{error}</div>}

      {!loading && !error && (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <SortableTH field="song_slug"    label="Song"   sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableTH field="scheduled_at" label="Date"   sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                {/* Platforms — not sortable */}
                <th>Platforms</th>
                <SortableTH field="status"       label="Status" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "#a89a92", padding: 32 }}>
                    Queue is empty. Add a song above.
                  </td>
                </tr>
              ) : (() => {
                // Sort entries by active sort field (all three sortable fields are strings).
                const sorted = [...entries].sort((a, b) => {
                  const aStr = (a[sortField as keyof QueueEntry] as string) ?? "";
                  const bStr = (b[sortField as keyof QueueEntry] as string) ?? "";
                  return aStr.localeCompare(bStr) * (sortDir === "asc" ? 1 : -1);
                });
                return sorted.map(entry => (
                  <tr key={entry.id} style={{ opacity: (deleting[entry.id] || saving[entry.id]) ? 0.5 : 1 }}>
                    <td>
                      <div>{entry.song_title_pl}</div>
                      <div style={{ fontSize: 11, color: "#a89a92", fontFamily: "monospace" }}>{entry.song_slug}</div>
                    </td>
                    {/* Scheduled date — inline date input → PATCH on change */}
                    <td>
                      <input
                        type="date"
                        defaultValue={entry.scheduled_at}
                        disabled={saving[entry.id] || entry.status === "released"}
                        style={{ background: "transparent", border: "1px solid #3a3028",
                                 color: "#e8ddd5", borderRadius: 4, padding: "2px 6px", fontSize: 13 }}
                        onBlur={e => updateDate(entry, e.target.value)}
                        aria-label={`Scheduled date for ${entry.song_slug}`}
                      />
                    </td>
                    <td style={{ fontSize: 12, color: "#a89a92" }}>
                      {entry.platforms.join(", ")}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[entry.status] ?? "badge-gray"}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td>
                      {entry.status !== "released" && (
                        <button
                          className="btn-danger"
                          disabled={deleting[entry.id]}
                          onClick={() => deleteEntry(entry.id)}
                          style={{ fontSize: 12, padding: "3px 10px" }}
                          aria-label={`Delete queue entry for ${entry.song_slug}`}
                        >
                          {deleting[entry.id] ? "…" : "Remove"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              })()}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
