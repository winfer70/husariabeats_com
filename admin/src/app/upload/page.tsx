/*
 * admin/src/app/upload/page.tsx — Release File Upload Portal
 *
 * Allows uploading the 6 required release files per song directly through
 * the admin browser UI without needing SSH/SCP access to the server.
 *
 * Features:
 *   - Song selector (all songs with status render_done or later)
 *   - Per-file checklist showing which files already exist + sizes
 *   - Drag-and-drop + click-to-upload per file slot
 *   - Upload progress bar via XMLHttpRequest
 *   - Delete existing files
 *   - Refresh button to re-check server state
 *
 * API endpoints used:
 *   GET  /api/upload/{slug}/status          → FileStatusOut
 *   POST /api/upload/{slug}/{filename}      → UploadOut (multipart)
 *   DELETE /api/upload/{slug}/{filename}    → 204
 */

"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

interface Song {
  slug:     string;
  title_pl: string;
  title_en: string;
  status:   string;
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

const STATUSES_SHOWN = ["render_done", "scheduled", "released"];

// ── Helper ────────────────────────────────────────────────────────────────────

function Toast({ msg, type }: { msg: string; type: "ok" | "err" }) {
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 999,
      padding: "12px 20px", borderRadius: 6,
      background: type === "ok" ? "#0d2018" : "#200a0d",
      border: `1px solid ${type === "ok" ? "#1a5c3a" : "#5c1a22"}`,
      color: type === "ok" ? "#4acea8" : "#f0a0a8",
      fontFamily: "monospace", fontSize: 13,
    }}>
      {msg}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function UploadPage() {
  const [songs,      setSongs]      = useState<Song[]>([]);
  const [slug,       setSlug]       = useState<string>("");
  const [status,     setStatus]     = useState<FileStatus | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [toast,      setToast]      = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  // progress: { [filename]: 0-100 }
  const [progress,   setProgress]   = useState<Record<string, number>>({});
  const [uploading,  setUploading]  = useState<Record<string, boolean>>({});
  const [deleting,   setDeleting]   = useState<Record<string, boolean>>({});
  const [dragging,   setDragging]   = useState<string | null>(null);

  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Toast helper ────────────────────────────────────────────────────────────

  const showToast = useCallback((msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Fetch songs ─────────────────────────────────────────────────────────────

  const loadSongs = useCallback(async () => {
    try {
      const res = await fetch("/api/songs");
      if (!res.ok) throw new Error(`${res.status}`);
      const all: Song[] = await res.json();
      // Show render_done + scheduled + released songs
      setSongs(all.filter(s => STATUSES_SHOWN.includes(s.status)));
    } catch (e) {
      showToast("Failed to load songs", "err");
    }
  }, [showToast]);

  useEffect(() => { loadSongs(); }, [loadSongs]);

  // ── Fetch file status ───────────────────────────────────────────────────────

  const loadStatus = useCallback(async (s: string) => {
    if (!s) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/upload/${s}/status`);
      if (!res.ok) throw new Error(`${res.status}`);
      setStatus(await res.json());
    } catch (e) {
      showToast("Failed to load file status", "err");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const handleSlugChange = (newSlug: string) => {
    setSlug(newSlug);
    setStatus(null);
    setProgress({});
    setUploading({});
    if (newSlug) loadStatus(newSlug);
  };

  // ── Upload via XHR (for progress) ──────────────────────────────────────────

  const uploadFile = useCallback((filename: string, file: File) => {
    if (!slug) return;

    setUploading(p => ({ ...p, [filename]: true }));
    setProgress(p => ({ ...p, [filename]: 0 }));

    const form = new FormData();
    form.append("file", file, filename);

    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        setProgress(p => ({ ...p, [filename]: Math.round((e.loaded / e.total) * 100) }));
      }
    });
    xhr.addEventListener("load", () => {
      setUploading(p => ({ ...p, [filename]: false }));
      setProgress(p => ({ ...p, [filename]: 100 }));
      if (xhr.status === 201) {
        showToast(`✓ ${filename} uploaded`, "ok");
        loadStatus(slug);
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          showToast(err.detail ?? "Upload failed", "err");
        } catch {
          showToast(`Upload failed: ${xhr.status}`, "err");
        }
      }
    });
    xhr.addEventListener("error", () => {
      setUploading(p => ({ ...p, [filename]: false }));
      showToast(`Network error uploading ${filename}`, "err");
    });

    xhr.open("POST", `/api/upload/${slug}/${filename}`);
    xhr.send(form);
  }, [slug, showToast, loadStatus]);

  // ── Delete file ─────────────────────────────────────────────────────────────

  const deleteFile = useCallback(async (filename: string) => {
    if (!slug || !confirm(`Delete ${filename}?`)) return;
    setDeleting(p => ({ ...p, [filename]: true }));
    try {
      const res = await fetch(`/api/upload/${slug}/${filename}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        showToast(`Deleted ${filename}`, "ok");
        loadStatus(slug);
      } else {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        showToast(err.detail ?? "Delete failed", "err");
      }
    } catch {
      showToast("Delete failed", "err");
    } finally {
      setDeleting(p => ({ ...p, [filename]: false }));
    }
  }, [slug, showToast, loadStatus]);

  // ── Drag & drop ─────────────────────────────────────────────────────────────

  const handleDrop = useCallback((e: React.DragEvent, filename: string) => {
    e.preventDefault();
    setDragging(null);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(filename, file);
  }, [uploadFile]);

  const handleFileInput = useCallback((filename: string, files: FileList | null) => {
    if (files && files[0]) uploadFile(filename, files[0]);
  }, [uploadFile]);

  // ── Render ───────────────────────────────────────────────────────────────────

  const song = songs.find(s => s.slug === slug);

  return (
    <div style={{ padding: "40px 48px 80px", maxWidth: 900 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontFamily: "monospace", fontSize: 11, letterSpacing: "0.3em", color: MUTED, marginBottom: 12, textTransform: "uppercase" }}>
          Upload
        </div>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 32, fontWeight: 600, color: CREAM, marginBottom: 8 }}>
          Release Files
        </h1>
        <p style={{ color: MUTED, fontSize: 14 }}>
          Upload the 6 required files per song. Files are served at husariabeats.com/releases/{"{"}{"{"}slug{"}"}{"}"}/.
        </p>
      </div>

      {/* Song selector */}
      <div style={{ marginBottom: 32 }}>
        <label style={{ fontFamily: "monospace", fontSize: 11, letterSpacing: "0.2em", color: MUTED, textTransform: "uppercase", display: "block", marginBottom: 8 }}>
          Select Song
        </label>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <select
            value={slug}
            onChange={e => handleSlugChange(e.target.value)}
            style={{
              background: BG1, border: `1px solid ${BORDER}`, color: CREAM,
              padding: "10px 14px", fontFamily: "monospace", fontSize: 13,
              borderRadius: 4, width: 400, cursor: "pointer",
            }}
          >
            <option value="">— pick a song —</option>
            {songs.map(s => (
              <option key={s.slug} value={s.slug}>
                {s.slug}  ·  {s.title_pl}  [{s.status}]
              </option>
            ))}
          </select>
          {slug && (
            <button
              onClick={() => loadStatus(slug)}
              style={{
                background: "transparent", border: `1px solid ${BORDER}`, color: MUTED,
                padding: "10px 16px", fontFamily: "monospace", fontSize: 12,
                borderRadius: 4, cursor: "pointer",
              }}
            >
              ↺ Refresh
            </button>
          )}
        </div>
        {song && (
          <div style={{ marginTop: 8, fontFamily: "monospace", fontSize: 11, color: MUTED }}>
            {song.title_pl}  ·  {song.title_en}
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ fontFamily: "monospace", fontSize: 13, color: MUTED }}>Loading…</div>
      )}

      {/* File checklist */}
      {status && !loading && (
        <>
          {/* Ready badge */}
          <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              fontFamily: "monospace", fontSize: 12,
              padding: "6px 16px", borderRadius: 4,
              background: status.ready ? "#0d2018" : BG1,
              border: `1px solid ${status.ready ? "#1a5c3a" : BORDER}`,
              color: status.ready ? GREEN : MUTED,
            }}>
              {status.ready ? "✓ All 6 files present — ready to queue" : `${status.files.filter(f => f.exists).length}/6 files uploaded`}
            </div>
            <a href={status.base_url} target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: "monospace", fontSize: 11, color: MUTED, textDecoration: "none" }}>
              ↗ {status.base_url}
            </a>
          </div>

          {/* File rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {status.files.map((file) => {
              const isUploading = uploading[file.filename];
              const isDeleting  = deleting[file.filename];
              const prog        = progress[file.filename] ?? 0;
              const isDraggingOver = dragging === file.filename;

              return (
                <div key={file.filename}
                  style={{
                    border: `1px solid ${isDraggingOver ? GOLD : file.exists ? "#1a5c3a" : BORDER}`,
                    borderRadius: 6, background: BG2, overflow: "hidden",
                    transition: "border-color 150ms",
                  }}
                  onDragOver={e => { e.preventDefault(); setDragging(file.filename); }}
                  onDragLeave={() => setDragging(null)}
                  onDrop={e => handleDrop(e, file.filename)}
                >
                  <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 16 }}>

                    {/* Status icon */}
                    <div style={{ width: 20, flexShrink: 0, textAlign: "center", fontSize: 16 }}>
                      {isUploading ? "⏳" : file.exists ? "✅" : "⬜"}
                    </div>

                    {/* File info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "monospace", fontSize: 13, color: file.exists ? GREEN : CREAM, marginBottom: 2 }}>
                        {file.filename}
                      </div>
                      <div style={{ fontFamily: "monospace", fontSize: 11, color: MUTED }}>
                        {file.label}
                        {file.exists && file.size_mb !== null && (
                          <span style={{ marginLeft: 12, color: GOLD }}>{file.size_mb} MB</span>
                        )}
                        {!file.exists && !isUploading && (
                          <span style={{ marginLeft: 12, color: BORDER }}>drop file here or click Upload</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      {/* Upload button */}
                      {!isUploading && (
                        <>
                          <input
                            ref={el => { fileInputs.current[file.filename] = el; }}
                            type="file"
                            style={{ display: "none" }}
                            onChange={e => handleFileInput(file.filename, e.target.files)}
                          />
                          <button
                            onClick={() => fileInputs.current[file.filename]?.click()}
                            style={{
                              background: "transparent",
                              border: `1px solid ${file.exists ? BORDER : GOLD}`,
                              color: file.exists ? MUTED : GOLD,
                              padding: "6px 14px", fontFamily: "monospace", fontSize: 11,
                              borderRadius: 3, cursor: "pointer",
                            }}
                          >
                            {file.exists ? "Replace" : "Upload"}
                          </button>
                        </>
                      )}

                      {/* Delete button */}
                      {file.exists && !isUploading && (
                        <button
                          onClick={() => deleteFile(file.filename)}
                          disabled={isDeleting}
                          style={{
                            background: "transparent", border: `1px solid #5c1a22`,
                            color: isDeleting ? MUTED : "#f0a0a8",
                            padding: "6px 10px", fontFamily: "monospace", fontSize: 11,
                            borderRadius: 3, cursor: "pointer",
                          }}
                        >
                          {isDeleting ? "…" : "✕"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  {isUploading && (
                    <div style={{ height: 3, background: BORDER }}>
                      <div style={{
                        height: "100%", width: `${prog}%`,
                        background: GOLD, transition: "width 200ms",
                      }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Queue hint when all files ready */}
          {status.ready && (
            <div style={{ marginTop: 24, padding: "14px 18px", background: BG1, border: `1px solid #1a5c3a`, borderRadius: 4 }}>
              <p style={{ fontFamily: "monospace", fontSize: 12, color: GREEN, margin: 0 }}>
                ✓ All files uploaded. Go to{" "}
                <a href="/pipeline" style={{ color: GOLD }}>Pipeline</a>{" "}
                → find this song in RENDER DONE → click Queue to schedule release.
              </p>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!slug && !loading && (
        <div style={{ padding: "60px 0", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>📤</div>
          <p style={{ fontFamily: "monospace", fontSize: 13, color: MUTED }}>
            Select a song above to see its upload status.
          </p>
          <p style={{ fontFamily: "monospace", fontSize: 11, color: BORDER, marginTop: 8 }}>
            Only songs with status render_done, scheduled, or released are shown.
          </p>
        </div>
      )}
    </div>
  );
}
