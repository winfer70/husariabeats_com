/*
 * admin/src/app/songs/new/page.tsx — New Song creation form page.
 *
 * Renders a full-featured form to add a new song record to the database.
 * Submits a POST /api/songs JSON request; on success shows a toast and
 * redirects to /songs after 1.5 s. On error stays on the form with a toast.
 *
 * Features:
 *   - Auto-generates slug from title_pl (lowercase, spaces → hyphens) with
 *     manual override (once edited manually, auto-generation stops).
 *   - Required-field highlighting on submit attempt.
 *   - Grouped layout: core metadata, text content, YouTube IDs, streaming URLs.
 *   - Matches the dark theme (#1a1510 bg, #dc143c accents) of the Songs list page.
 */
"use client";

import React, { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_STATUSES = [
  "scaffold", "audio_ready", "sync_done", "render_done", "ready_to_release", "queued", "released",
];

const VALID_ERAS = [
  "medieval", "partitions", "wwi", "wwii", "cold_war", "modern",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a Polish title string to a URL-friendly slug.
 * Replaces accented characters with ASCII equivalents, lowercases,
 * and substitutes any run of non-alphanumeric chars with a hyphen.
 *
 * Input:  raw — raw title string.
 * Output: slug string (e.g. "Husaria pod Wiedniem" → "husaria-pod-wiedniem").
 */
function titleToSlug(raw: string): string {
  const map: Record<string, string> = {
    ą: "a", ć: "c", ę: "e", ł: "l", ń: "n",
    ó: "o", ś: "s", ź: "z", ż: "z",
    Ą: "a", Ć: "c", Ę: "e", Ł: "l", Ń: "n",
    Ó: "o", Ś: "s", Ź: "z", Ż: "z",
  };
  return raw
    .split("")
    .map(c => map[c] ?? c)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")  // collapse non-alphanumeric runs to hyphens
    .replace(/^-+|-+$/g, "");      // trim leading/trailing hyphens
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Reusable label + input/select wrapper matching the songs page field style. */
function Field({
  label, required, children,
}: {
  label:     string;
  required?: boolean;
  children:  React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{
        fontSize: 10, color: "#a89a92",
        textTransform: "uppercase", letterSpacing: "0.05em",
      }}>
        {label}{required && <span style={{ color: "#dc143c", marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

/** Shared text-input style object — matches the songs expanded-row inputs. */
const inputStyle = (invalid?: boolean): React.CSSProperties => ({
  background:   "transparent",
  border:       `1px solid ${invalid ? "#dc143c" : "#3a3028"}`,
  color:        "#e8ddd5",
  borderRadius: 4,
  padding:      "6px 10px",
  fontSize:     13,
  width:        "100%",
  boxSizing:    "border-box",
  outline:      "none",
});

/** Shared select style — same dark palette. */
const selectStyle = (invalid?: boolean): React.CSSProperties => ({
  ...inputStyle(invalid),
  background: "#1a1510",
  cursor:     "pointer",
  fontFamily: "inherit",
});

/** Shared textarea style. */
const textareaStyle: React.CSSProperties = {
  ...inputStyle(),
  resize:    "vertical",
  minHeight: 80,
};

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function NewSongPage() {
  const router = useRouter();

  // ── Form state ────────────────────────────────────────────────────────────
  const [slug,            setSlug]           = useState("");
  const [titlePl,         setTitlePl]        = useState("");
  const [titleEn,         setTitleEn]        = useState("");
  const [albumSlug,       setAlbumSlug]       = useState("");
  const [era,             setEra]             = useState("");
  const [yearEvent,       setYearEvent]       = useState("");
  const [status,          setStatus]          = useState("scaffold");
  const [releaseDate,     setReleaseDate]     = useState("");
  const [subtitlePl,      setSubtitlePl]      = useState("");
  const [subtitleEn,      setSubtitleEn]      = useState("");
  const [summaryPl,       setSummaryPl]       = useState("");
  const [summaryEn,       setSummaryEn]       = useState("");
  const [youtubePl,       setYoutubePl]       = useState("");
  const [youtubeEn,       setYoutubeEn]       = useState("");
  const [spotifyUrl,      setSpotifyUrl]      = useState("");
  const [appleMusicUrl,   setAppleMusicUrl]   = useState("");
  const [amazonUrl,       setAmazonUrl]       = useState("");
  const [youtubeMusicUrl, setYoutubeMusicUrl] = useState("");
  const [itunesUrl,       setItunesUrl]       = useState("");

  // ── UI state ──────────────────────────────────────────────────────────────
  const [submitting,    setSubmitting]   = useState(false);
  const [toast,         setToast]        = useState<string | null>(null);
  const [toastType,     setToastType]    = useState<"success" | "error">("error");
  const [attempted,     setAttempted]    = useState(false); // tracks submit attempt for validation

  // Tracks whether the user manually edited the slug field; stops auto-generation when true
  const slugManual = useRef(false);

  // ── Toast helper ──────────────────────────────────────────────────────────

  /** Display a transient toast message for 3 seconds. */
  function showToast(msg: string, type: "success" | "error" = "error") {
    setToastType(type);
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  // ── Slug auto-generation ──────────────────────────────────────────────────

  /**
   * Handle title_pl changes: update state and auto-derive slug unless the
   * user has already manually edited the slug field.
   *
   * Input: value — new title_pl string from the input event.
   */
  const handleTitlePl = useCallback((value: string) => {
    setTitlePl(value);
    if (!slugManual.current) {
      setSlug(titleToSlug(value));
    }
  }, []);

  /** Mark slug as manually controlled and update its value. */
  const handleSlugChange = useCallback((value: string) => {
    slugManual.current = true;
    setSlug(value);
  }, []);

  // ── Validation ────────────────────────────────────────────────────────────

  /** Returns true if all required fields are non-empty. */
  function isValid(): boolean {
    return slug.trim() !== "" && titlePl.trim() !== "" && titleEn.trim() !== "";
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  /**
   * Submit the form: POST /api/songs with JSON body.
   * On success: toast + redirect to /songs after 1.5 s.
   * On error: toast, stay on form.
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAttempted(true);

    if (!isValid()) {
      showToast("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);

    // Build payload — omit empty optional strings (send null instead)
    const nullIfEmpty = (v: string) => v.trim() || null;

    const body = {
      slug:               slug.trim(),
      title_pl:           titlePl.trim(),
      title_en:           titleEn.trim(),
      status,
      album_slug:         nullIfEmpty(albumSlug),
      era:                nullIfEmpty(era),
      year_event:         yearEvent ? parseInt(yearEvent, 10) : null,
      release_date:       nullIfEmpty(releaseDate),
      subtitle_pl:        nullIfEmpty(subtitlePl),
      subtitle_en:        nullIfEmpty(subtitleEn),
      summary_pl:         nullIfEmpty(summaryPl),
      summary_en:         nullIfEmpty(summaryEn),
      youtube_id_pl:      nullIfEmpty(youtubePl),
      youtube_id_en:      nullIfEmpty(youtubeEn),
      spotify_url:        nullIfEmpty(spotifyUrl),
      apple_music_url:    nullIfEmpty(appleMusicUrl),
      amazon_url:         nullIfEmpty(amazonUrl),
      youtube_music_url:  nullIfEmpty(youtubeMusicUrl),
      itunes_url:         nullIfEmpty(itunesUrl),
    };

    try {
      const res = await fetch("/api/songs", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });

      if (!res.ok) {
        // Try to extract FastAPI detail message; fall back to status text
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? res.statusText);
      }

      showToast(`Song '${slug.trim()}' created successfully!`, "success");

      // Redirect to songs list after a short delay so the user sees the toast
      setTimeout(() => router.push("/songs"), 1500);

    } catch (e) {
      showToast(`Error: ${e instanceof Error ? e.message : "Failed to create song"}`);
      setSubmitting(false);
    }
  }

  // ── Derived validation flags (only shown after first submit attempt) ──────
  const slugInvalid    = attempted && slug.trim()    === "";
  const titlePlInvalid = attempted && titlePl.trim() === "";
  const titleEnInvalid = attempted && titleEn.trim() === "";

  // ── Grid section helper ───────────────────────────────────────────────────
  const sectionGrid = (cols = 2): React.CSSProperties => ({
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gap:    "16px 24px",
    marginBottom: 24,
  });

  const sectionHeading: React.CSSProperties = {
    fontSize:      11,
    color:         "#dc143c",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom:  12,
    marginTop:     8,
    borderBottom:  "1px solid #3a3028",
    paddingBottom: 6,
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Add New Song</h1>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => router.push("/songs")}
          disabled={submitting}
          style={{ fontSize: 13, padding: "6px 14px" }}
        >
          ← Cancel
        </button>
      </div>

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toast && (
        <div
          className={toastType === "success" ? "success-box" : "error-box"}
          style={{ marginBottom: 16 }}
        >
          {toast}
        </div>
      )}

      {/* ── Form ─────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} noValidate>
        <div style={{
          background:   "#1a1510",
          border:       "1px solid #3a3028",
          borderRadius: 8,
          padding:      "24px 28px",
        }}>

          {/* ── Core Identity ─────────────────────────────────────────── */}
          <p style={sectionHeading}>Core Identity</p>

          {/* Slug + status on same row */}
          <div style={sectionGrid(2)}>
            <Field label="Slug" required>
              <input
                type="text"
                value={slug}
                onChange={e => handleSlugChange(e.target.value)}
                placeholder="husaria-pod-wiedniem"
                disabled={submitting}
                style={{ ...inputStyle(slugInvalid), fontFamily: "monospace" }}
                aria-label="Song slug"
                aria-invalid={slugInvalid}
              />
              {slugInvalid && (
                <span style={{ fontSize: 11, color: "#dc143c" }}>Slug is required</span>
              )}
            </Field>

            <Field label="Status">
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                disabled={submitting}
                style={selectStyle()}
                aria-label="Song status"
              >
                {VALID_STATUSES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Titles */}
          <div style={sectionGrid(2)}>
            <Field label="Title (Polish)" required>
              <input
                type="text"
                value={titlePl}
                onChange={e => handleTitlePl(e.target.value)}
                placeholder="Husaria pod Wiedniem"
                disabled={submitting}
                style={inputStyle(titlePlInvalid)}
                aria-label="Polish title"
                aria-invalid={titlePlInvalid}
              />
              {titlePlInvalid && (
                <span style={{ fontSize: 11, color: "#dc143c" }}>Polish title is required</span>
              )}
            </Field>

            <Field label="Title (English)" required>
              <input
                type="text"
                value={titleEn}
                onChange={e => setTitleEn(e.target.value)}
                placeholder="Hussars at Vienna"
                disabled={submitting}
                style={inputStyle(titleEnInvalid)}
                aria-label="English title"
                aria-invalid={titleEnInvalid}
              />
              {titleEnInvalid && (
                <span style={{ fontSize: 11, color: "#dc143c" }}>English title is required</span>
              )}
            </Field>
          </div>

          {/* Subtitles */}
          <div style={sectionGrid(2)}>
            <Field label="Subtitle (Polish)">
              <input
                type="text"
                value={subtitlePl}
                onChange={e => setSubtitlePl(e.target.value)}
                placeholder="Optional subtitle"
                disabled={submitting}
                style={inputStyle()}
                aria-label="Polish subtitle"
              />
            </Field>

            <Field label="Subtitle (English)">
              <input
                type="text"
                value={subtitleEn}
                onChange={e => setSubtitleEn(e.target.value)}
                placeholder="Optional subtitle"
                disabled={submitting}
                style={inputStyle()}
                aria-label="English subtitle"
              />
            </Field>
          </div>

          {/* ── Historical Metadata ───────────────────────────────────── */}
          <p style={sectionHeading}>Historical Metadata</p>

          <div style={sectionGrid(3)}>
            <Field label="Album Slug">
              <input
                type="text"
                value={albumSlug}
                onChange={e => setAlbumSlug(e.target.value)}
                placeholder="album-slug"
                disabled={submitting}
                style={{ ...inputStyle(), fontFamily: "monospace" }}
                aria-label="Album slug"
              />
            </Field>

            <Field label="Era">
              <select
                value={era}
                onChange={e => setEra(e.target.value)}
                disabled={submitting}
                style={selectStyle()}
                aria-label="Era"
              >
                <option value="">— none —</option>
                {VALID_ERAS.map(e => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </Field>

            <Field label="Year (Event)">
              <input
                type="number"
                value={yearEvent}
                onChange={e => setYearEvent(e.target.value)}
                placeholder="1683"
                disabled={submitting}
                style={inputStyle()}
                aria-label="Historical year"
              />
            </Field>

            <Field label="Release Date">
              <input
                type="text"
                value={releaseDate}
                onChange={e => setReleaseDate(e.target.value)}
                placeholder="YYYY-MM-DD"
                disabled={submitting}
                style={{ ...inputStyle(), fontFamily: "monospace" }}
                aria-label="Release date"
              />
            </Field>
          </div>

          {/* ── Descriptions ─────────────────────────────────────────── */}
          <p style={sectionHeading}>Descriptions</p>

          <div style={sectionGrid(2)}>
            <Field label="Summary (Polish)">
              <textarea
                value={summaryPl}
                onChange={e => setSummaryPl(e.target.value)}
                placeholder="Krótki opis po polsku…"
                disabled={submitting}
                style={textareaStyle}
                aria-label="Polish summary"
              />
            </Field>

            <Field label="Summary (English)">
              <textarea
                value={summaryEn}
                onChange={e => setSummaryEn(e.target.value)}
                placeholder="Short description in English…"
                disabled={submitting}
                style={textareaStyle}
                aria-label="English summary"
              />
            </Field>
          </div>

          {/* ── YouTube IDs ───────────────────────────────────────────── */}
          <p style={sectionHeading}>YouTube</p>

          <div style={sectionGrid(2)}>
            <Field label="YouTube ID (Polish)">
              <input
                type="text"
                value={youtubePl}
                onChange={e => setYoutubePl(e.target.value)}
                placeholder="dQw4w9WgXcQ"
                disabled={submitting}
                style={{ ...inputStyle(), fontFamily: "monospace" }}
                aria-label="YouTube ID Polish"
              />
            </Field>

            <Field label="YouTube ID (English)">
              <input
                type="text"
                value={youtubeEn}
                onChange={e => setYoutubeEn(e.target.value)}
                placeholder="dQw4w9WgXcQ"
                disabled={submitting}
                style={{ ...inputStyle(), fontFamily: "monospace" }}
                aria-label="YouTube ID English"
              />
            </Field>
          </div>

          {/* ── Streaming URLs ────────────────────────────────────────── */}
          <p style={sectionHeading}>Streaming URLs</p>

          <div style={sectionGrid(2)}>
            <Field label="Spotify URL">
              <input
                type="url"
                value={spotifyUrl}
                onChange={e => setSpotifyUrl(e.target.value)}
                placeholder="https://open.spotify.com/…"
                disabled={submitting}
                style={inputStyle()}
                aria-label="Spotify URL"
              />
            </Field>

            <Field label="Apple Music URL">
              <input
                type="url"
                value={appleMusicUrl}
                onChange={e => setAppleMusicUrl(e.target.value)}
                placeholder="https://music.apple.com/…"
                disabled={submitting}
                style={inputStyle()}
                aria-label="Apple Music URL"
              />
            </Field>

            <Field label="Amazon Music URL">
              <input
                type="url"
                value={amazonUrl}
                onChange={e => setAmazonUrl(e.target.value)}
                placeholder="https://music.amazon.com/…"
                disabled={submitting}
                style={inputStyle()}
                aria-label="Amazon Music URL"
              />
            </Field>

            <Field label="YouTube Music URL">
              <input
                type="url"
                value={youtubeMusicUrl}
                onChange={e => setYoutubeMusicUrl(e.target.value)}
                placeholder="https://music.youtube.com/…"
                disabled={submitting}
                style={inputStyle()}
                aria-label="YouTube Music URL"
              />
            </Field>

            <Field label="iTunes URL">
              <input
                type="url"
                value={itunesUrl}
                onChange={e => setItunesUrl(e.target.value)}
                placeholder="https://music.apple.com/…"
                disabled={submitting}
                style={inputStyle()}
                aria-label="iTunes URL"
              />
            </Field>
          </div>

        </div>

        {/* ── Action buttons ───────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 12, marginTop: 20, justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => router.push("/songs")}
            disabled={submitting}
            style={{ fontSize: 13, padding: "8px 18px" }}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
            style={{ fontSize: 13, padding: "8px 18px" }}
          >
            {submitting ? "Adding…" : "Add to Database"}
          </button>
        </div>

      </form>
    </>
  );
}
