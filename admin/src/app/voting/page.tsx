/*
 * admin/src/app/voting/page.tsx — Voting dashboard page (client component).
 *
 * Fetches all topics from /api/topics on mount.
 * Inline edits:
 *   - Status: <select> onChange → PATCH /api/topics/:id
 *   - Planned release: <input> onBlur → PATCH /api/topics/:id
 *
 * Sorted by vote count descending. Optimistic UI with rollback on error.
 */
"use client";

import { useEffect, useState, useCallback } from "react";

interface Topic {
  id:               number;
  title:            string;
  description:      string | null;
  status:           string;
  vote_count:       number;
  planned_release?: string | null;
}

const VALID_STATUSES = ["open", "in_development", "released"];

const STATUS_BADGE: Record<string, string> = {
  open:           "badge-blue",
  in_development: "badge-yellow",
  released:       "badge-green",
};

export default function VotingPage() {
  const [topics, setTopics]   = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [saving, setSaving]   = useState<Record<number, boolean>>({});
  const [toast, setToast]     = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  function showToast(msg: string, type: "ok" | "err" = "err") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  /** Fetch all voting topics from /api/topics. */
  const fetchTopics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/topics");
      if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
      const data: Topic[] = await res.json();
      setTopics(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load topics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTopics(); }, [fetchTopics]);

  /**
   * PATCH a topic's status or planned_release.
   * Optimistic update; reverts on API error.
   *
   * @param id        - Topic ID.
   * @param update    - Fields to update.
   * @param prevTopic - Previous state for rollback.
   */
  async function patchTopic(id: number, update: Partial<Topic>, prevTopic: Topic) {
    setTopics(prev => prev.map(t => t.id === id ? { ...t, ...update } : t));
    setSaving(prev => ({ ...prev, [id]: true }));

    try {
      const res = await fetch(`/api/topics/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(update),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? res.statusText);
      }
      const updated: Topic = await res.json();
      setTopics(prev => prev.map(t => t.id === id ? updated : t));
      showToast("Saved.", "ok");
    } catch (e) {
      setTopics(prev => prev.map(t => t.id === id ? prevTopic : t));
      showToast(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(prev => ({ ...prev, [id]: false }));
    }
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Voting Dashboard</h1>
        <button
          className="btn-primary"
          onClick={fetchTopics}
          style={{ fontSize: 13, padding: "6px 14px" }}
        >
          Refresh
        </button>
      </div>

      {toast && (
        <div className={toast.type === "ok" ? "success-box" : "error-box"} style={{ marginBottom: 16 }}>
          {toast.msg}
        </div>
      )}
      {loading && <p style={{ color: "#a89a92" }}>Loading…</p>}
      {error   && <div className="error-box"><strong>Could not load topics — </strong>{error}</div>}

      {!loading && !error && (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Status</th>
                <th>Votes</th>
                <th>Planned Release</th>
              </tr>
            </thead>
            <tbody>
              {topics.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "#a89a92", padding: 32 }}>
                    No voting topics found.
                  </td>
                </tr>
              ) : (
                topics.map(topic => (
                  <tr key={topic.id} style={{ opacity: saving[topic.id] ? 0.6 : 1, transition: "opacity 0.15s" }}>
                    <td style={{ color: "#a89a92", fontFamily: "monospace", fontSize: 12 }}>
                      {topic.id}
                    </td>
                    <td style={{ maxWidth: 300 }}>{topic.title}</td>
                    {/* Status — inline select → PATCH on change */}
                    <td>
                      <select
                        value={topic.status}
                        disabled={saving[topic.id]}
                        className={`badge ${STATUS_BADGE[topic.status] ?? "badge-gray"}`}
                        style={{ background: "transparent", border: "none", cursor: "pointer",
                                 fontFamily: "inherit", fontSize: "inherit", padding: 0, outline: "none" }}
                        onChange={e => patchTopic(topic.id, { status: e.target.value }, topic)}
                        aria-label={`Status for topic ${topic.id}`}
                      >
                        {VALID_STATUSES.map(s => (
                          <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ fontWeight: 600, textAlign: "right" }}>
                      {topic.vote_count ?? 0}
                    </td>
                    {/* Planned release — inline text input → PATCH on blur */}
                    <td>
                      <input
                        key={`pr-${topic.id}-${topic.planned_release}`}
                        defaultValue={topic.planned_release ?? ""}
                        placeholder="e.g. Jun 2026"
                        disabled={saving[topic.id]}
                        style={{ width: 110, fontSize: 12, background: "transparent",
                                 border: "1px solid #3a3028", color: "#e8ddd5",
                                 borderRadius: 4, padding: "2px 6px" }}
                        onBlur={e => {
                          const val = e.target.value.trim() || null;
                          if (val !== (topic.planned_release ?? null)) {
                            patchTopic(topic.id, { planned_release: val }, topic);
                          }
                        }}
                        aria-label={`Planned release for topic ${topic.id}`}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
