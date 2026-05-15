/*
 * admin/src/app/figures/page.tsx — Historical Figures Manager
 *
 * Displays a card grid of all historical figures stored in the DB.
 * Supports:
 *   - Inline edit area per card (bio_pl, bio_en, arc fields) via PATCH
 *   - "New Figure" inline form at the top via POST
 *   - Arc badges showing Western Betrayal and Communist Erasure arcs
 *
 * API endpoints used:
 *   GET   /api/figures          → Figure[]
 *   PATCH /api/figures/:slug    → updated Figure (body: partial fields)
 *   POST  /api/figures          → created Figure
 */

"use client";

import { useState, useCallback, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Figure {
  slug:        string;
  name_pl:     string;
  name_en:     string;
  birth_year:  number | null;
  death_year:  number | null;
  bio_pl:      string;
  bio_en:      string;
  arc_west_pl: string;
  arc_west_en: string;
  arc_east_pl: string;
  arc_east_en: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const GOLD      = "#c8a84b";
const RED       = "#dc143c";
const MUTED     = "#a89a92";
const CREAM     = "#f5f5f0";
const BG1       = "#161013";
const BG2       = "#1a1510";
const BORDER    = "#2e2125";
const GREEN     = "#40c060";
const WEST_COLOR = "#6aadee"; // Western Betrayal arc colour

// ── EditArea ──────────────────────────────────────────────────────────────────

/**
 * EditArea — inline edit form rendered below a figure card.
 * Fields: bio_pl, bio_en, arc_west_pl, arc_west_en, arc_east_pl, arc_east_en.
 *
 * @param figure  - the figure being edited (provides initial values)
 * @param onSave  - async callback: (slug, partial data) → void
 * @param onCancel - callback to close without saving
 */
function EditArea({
  figure,
  onSave,
  onCancel,
}: {
  figure:   Figure;
  onSave:   (slug: string, data: Partial<Figure>) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    bio_pl:      figure.bio_pl,
    bio_en:      figure.bio_en,
    arc_west_pl: figure.arc_west_pl,
    arc_west_en: figure.arc_west_en,
    arc_east_pl: figure.arc_east_pl,
    arc_east_en: figure.arc_east_en,
  });
  const [saving, setSaving] = useState(false);

  /** Submit form data via PATCH. */
  const handleSave = async () => {
    setSaving(true);
    await onSave(figure.slug, form);
    setSaving(false);
  };

  const textareaStyle: React.CSSProperties = {
    background: BG1, border: `1px solid ${BORDER}`,
    color: CREAM, fontFamily: "monospace", fontSize: 11,
    padding: "8px 10px", borderRadius: 3,
    resize: "vertical", width: "100%",
    boxSizing: "border-box", minHeight: 64,
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "monospace", fontSize: 9,
    letterSpacing: "0.2em", color: MUTED,
    textTransform: "uppercase", display: "block",
    marginBottom: 4,
  };

  /** Renders a labelled textarea for a given form field. */
  const Field = ({
    k, label, minH,
  }: {
    k: keyof typeof form; label: string; minH?: number;
  }) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <textarea
        value={form[k]}
        onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
        style={{ ...textareaStyle, minHeight: minH ?? 64 }}
      />
    </div>
  );

  return (
    <div style={{
      background: BG1,
      border: `1px solid ${GOLD}44`,
      borderTop: "none",
      borderRadius: "0 0 6px 6px",
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      {/* Bio fields */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field k="bio_pl" label="Bio PL" minH={80} />
        <Field k="bio_en" label="Bio EN" minH={80} />
      </div>

      {/* Western arc fields */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field k="arc_west_pl" label="Arc West PL" />
        <Field k="arc_west_en" label="Arc West EN" />
      </div>

      {/* Eastern arc fields */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field k="arc_east_pl" label="Arc East PL" />
        <Field k="arc_east_en" label="Arc East EN" />
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          onClick={onCancel}
          style={{
            background: "transparent", border: `1px solid ${BORDER}`,
            color: MUTED, padding: "6px 14px",
            fontFamily: "monospace", fontSize: 11,
            borderRadius: 3, cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: "transparent",
            border: `1px solid ${GOLD}`,
            color: saving ? MUTED : GOLD,
            padding: "6px 14px",
            fontFamily: "monospace", fontSize: 11,
            borderRadius: 3,
            cursor: saving ? "default" : "pointer",
          }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

// ── FigureCard ────────────────────────────────────────────────────────────────

/**
 * FigureCard — displays one figure with name, lifespan, bio preview, arc
 * badges, and an Edit button.  When isEditing, an EditArea is rendered below.
 *
 * @param figure     - figure data
 * @param isEditing  - whether the inline edit area is open
 * @param onEdit     - callback to toggle edit mode
 * @param onSave     - async save handler passed through to EditArea
 * @param onCancel   - callback to cancel editing
 */
function FigureCard({
  figure,
  isEditing,
  onEdit,
  onSave,
  onCancel,
}: {
  figure:    Figure;
  isEditing: boolean;
  onEdit:    () => void;
  onSave:    (slug: string, data: Partial<Figure>) => Promise<void>;
  onCancel:  () => void;
}) {
  // Determine which arc badges to show (only when arc text is non-empty)
  const hasWestArc = !!(figure.arc_west_pl || figure.arc_west_en);
  const hasEastArc = !!(figure.arc_east_pl || figure.arc_east_en);

  // Truncate bio to 150 chars for preview
  const bioPreview = figure.bio_pl
    ? figure.bio_pl.slice(0, 150) + (figure.bio_pl.length > 150 ? "…" : "")
    : "";

  // Format lifespan string e.g. "1901–1948"
  const lifespan = [figure.birth_year, figure.death_year]
    .filter(y => y != null)
    .join("–");

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Card body */}
      <div style={{
        background: BG2,
        border: `1px solid ${isEditing ? GOLD + "55" : BORDER}`,
        borderRadius: isEditing ? "6px 6px 0 0" : 6,
        padding: 20,
      }}>
        {/* Name */}
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 600, color: CREAM }}>
            {figure.name_pl}
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 12, color: MUTED, marginTop: 2 }}>
            {figure.name_en}
          </div>
        </div>

        {/* Lifespan */}
        {lifespan && (
          <div style={{ fontFamily: "monospace", fontSize: 11, color: MUTED, marginBottom: 10 }}>
            {lifespan}
          </div>
        )}

        {/* Bio preview */}
        {bioPreview && (
          <p style={{
            fontFamily: "monospace", fontSize: 11,
            color: MUTED, lineHeight: 1.6,
            margin: "0 0 12px",
          }}>
            {bioPreview}
          </p>
        )}

        {/* Arc badges */}
        {(hasWestArc || hasEastArc) && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {hasWestArc && (
              <span style={{
                fontFamily: "monospace", fontSize: 10,
                padding: "2px 8px", borderRadius: 12,
                background: WEST_COLOR + "22",
                border: `1px solid ${WEST_COLOR}55`,
                color: WEST_COLOR,
              }}>
                🌍 Western Betrayal
              </span>
            )}
            {hasEastArc && (
              <span style={{
                fontFamily: "monospace", fontSize: 10,
                padding: "2px 8px", borderRadius: 12,
                background: RED + "22",
                border: `1px solid ${RED}55`,
                color: RED,
              }}>
                ☭ Communist Erasure
              </span>
            )}
          </div>
        )}

        {/* Edit toggle */}
        <button
          onClick={onEdit}
          style={{
            background: "transparent",
            border: `1px solid ${isEditing ? GOLD : BORDER}`,
            color: isEditing ? GOLD : MUTED,
            padding: "5px 12px",
            fontFamily: "monospace", fontSize: 11,
            borderRadius: 3, cursor: "pointer",
          }}
        >
          {isEditing ? "Editing…" : "Edit"}
        </button>
      </div>

      {/* Inline edit area */}
      {isEditing && (
        <EditArea figure={figure} onSave={onSave} onCancel={onCancel} />
      )}
    </div>
  );
}

// ── NewFigureForm ─────────────────────────────────────────────────────────────

/**
 * NewFigureForm — inline form row at the top of the grid for creating a new
 * figure.  Inputs: slug, name_pl, name_en, birth_year, death_year.
 *
 * @param onSubmit - async callback: (formData) → void
 */
function NewFigureForm({ onSubmit }: {
  onSubmit: (data: Omit<Figure, "bio_pl" | "bio_en" | "arc_west_pl" | "arc_west_en" | "arc_east_pl" | "arc_east_en">) => Promise<void>;
}) {
  const [form, setForm] = useState({
    slug: "", name_pl: "", name_en: "",
    birth_year: "", death_year: "",
  });
  const [saving, setSaving] = useState(false);

  const isValid = form.slug.trim() !== "" && form.name_pl.trim() !== "";

  /** Submit via POST /api/figures. */
  const handleSubmit = async () => {
    if (!isValid) return;
    setSaving(true);
    await onSubmit({
      slug:       form.slug.trim(),
      name_pl:    form.name_pl.trim(),
      name_en:    form.name_en.trim(),
      birth_year: form.birth_year ? parseInt(form.birth_year, 10) : null,
      death_year: form.death_year ? parseInt(form.death_year, 10) : null,
    });
    setSaving(false);
    setForm({ slug: "", name_pl: "", name_en: "", birth_year: "", death_year: "" });
  };

  const inputStyle: React.CSSProperties = {
    background: BG1, border: `1px solid ${BORDER}`,
    color: CREAM, fontFamily: "monospace", fontSize: 12,
    padding: "8px 10px", borderRadius: 3,
  };

  const LabelInput = ({
    field, label, placeholder, width, type,
  }: {
    field: keyof typeof form; label: string;
    placeholder?: string; width?: number | string; type?: string;
  }) => (
    <div>
      <div style={{ fontFamily: "monospace", fontSize: 9, color: MUTED, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 4 }}>
        {label}
      </div>
      <input
        type={type ?? "text"}
        value={form[field]}
        onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
        placeholder={placeholder}
        style={{ ...inputStyle, width: width ?? "auto" }}
      />
    </div>
  );

  return (
    <div style={{
      background: BG2,
      border: `1px solid ${GOLD}44`,
      borderRadius: 6,
      padding: 16,
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
      alignItems: "flex-end",
    }}>
      <LabelInput field="slug"       label="slug *"     placeholder="slug"            />
      <LabelInput field="name_pl"    label="Name PL *"  placeholder="Imię Nazwisko"   />
      <LabelInput field="name_en"    label="Name EN"    placeholder="First Last"      />
      <LabelInput field="birth_year" label="Birth Year" placeholder="1901" width={72} type="number" />
      <LabelInput field="death_year" label="Death Year" placeholder="1948" width={72} type="number" />

      <button
        onClick={handleSubmit}
        disabled={saving || !isValid}
        style={{
          background: "transparent",
          border: `1px solid ${GOLD}`,
          color: (saving || !isValid) ? MUTED : GOLD,
          padding: "8px 16px",
          fontFamily: "monospace", fontSize: 11,
          borderRadius: 3,
          cursor: (saving || !isValid) ? "default" : "pointer",
        }}
      >
        {saving ? "Creating…" : "+ Create"}
      </button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function FiguresPage() {
  const [figures,     setFigures]     = useState<Figure[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [showNew,     setShowNew]     = useState(false);

  // ── Data loading ────────────────────────────────────────────────────────────

  /** Fetch all figures from GET /api/figures. */
  const loadFigures = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/figures");
      if (!res.ok) throw new Error(`${res.status}`);
      setFigures(await res.json());
    } catch {
      setError("Failed to load figures.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFigures(); }, [loadFigures]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  /**
   * Patch a figure via PATCH /api/figures/:slug.
   * Closes edit area and reloads on success.
   *
   * @param slug - figure slug
   * @param data - partial fields to update
   */
  const handleSave = useCallback(async (slug: string, data: Partial<Figure>) => {
    const res = await fetch(`/api/figures/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setEditingSlug(null);
      await loadFigures();
    }
  }, [loadFigures]);

  /**
   * Create a new figure via POST /api/figures.
   * Hides the new-figure form and reloads on success.
   *
   * @param data - new figure fields
   */
  const handleCreate = useCallback(async (data: Partial<Figure>) => {
    const res = await fetch("/api/figures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setShowNew(false);
      await loadFigures();
    }
  }, [loadFigures]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "40px 48px 80px", maxWidth: 1200 }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: "monospace", fontSize: 11, letterSpacing: "0.3em", color: MUTED, marginBottom: 12, textTransform: "uppercase" }}>
          Figures
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 8 }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 32, fontWeight: 600, color: CREAM, margin: 0 }}>
            Historical Figures
          </h1>
          <button
            onClick={() => setShowNew(v => !v)}
            style={{
              background: "transparent",
              border: `1px solid ${GOLD}`,
              color: GOLD,
              padding: "8px 16px",
              fontFamily: "monospace", fontSize: 11,
              borderRadius: 3, cursor: "pointer",
            }}
          >
            {showNew ? "✕ Cancel" : "+ New Figure"}
          </button>
        </div>
        <p style={{ color: MUTED, fontSize: 14 }}>
          Historical figures featured in HusariaBeats songs.
        </p>
      </div>

      {/* New figure form (toggled) */}
      {showNew && (
        <div style={{ marginBottom: 32 }}>
          <NewFigureForm onSubmit={handleCreate} />
        </div>
      )}

      {loading && (
        <div style={{ fontFamily: "monospace", fontSize: 13, color: MUTED }}>Loading…</div>
      )}
      {error && (
        <div style={{ fontFamily: "monospace", fontSize: 13, color: RED }}>{error}</div>
      )}

      {/* Card grid — 3 columns on wide screens, 1 on narrow */}
      {!loading && !error && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: 16,
          alignItems: "start",
        }}>
          {figures.map(fig => (
            <FigureCard
              key={fig.slug}
              figure={fig}
              isEditing={editingSlug === fig.slug}
              onEdit={() => setEditingSlug(s => s === fig.slug ? null : fig.slug)}
              onSave={handleSave}
              onCancel={() => setEditingSlug(null)}
            />
          ))}
          {figures.length === 0 && (
            <div style={{ fontFamily: "monospace", fontSize: 13, color: MUTED, gridColumn: "1/-1" }}>
              No figures found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
