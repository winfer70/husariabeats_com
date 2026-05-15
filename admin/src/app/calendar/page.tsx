/*
 * admin/src/app/calendar/page.tsx — Release Calendar
 *
 * Renders a month-view calendar grid populated from the release queue.
 * Each scheduled song appears as a coloured chip on its scheduled date.
 * Supports month navigation via ← / → buttons.
 *
 * Queue entry shape:
 *   { id, song_slug, song_title_pl, song_title_en, scheduled_at, status }
 *
 * Status colours:
 *   pending = GOLD, releasing = MUTED, released = GREEN, failed = RED
 *
 * API endpoints used:
 *   GET /api/release_queue → QueueEntry[]
 */

"use client";

import { useState, useCallback, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface QueueEntry {
  id:            number;
  song_slug:     string;
  song_title_pl: string;
  song_title_en: string;
  scheduled_at:  string; // ISO date string
  status:        string; // pending | releasing | released | failed
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

/** Full month names indexed 0–11. */
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Monday-first weekday header labels. */
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Return the CSS colour for a queue entry status.
 * @param status - "pending" | "releasing" | "released" | "failed"
 */
function statusColor(status: string): string {
  switch (status) {
    case "pending":   return GOLD;
    case "releasing": return MUTED;
    case "released":  return GREEN;
    case "failed":    return RED;
    default:          return MUTED;
  }
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [entries,     setEntries]     = useState<QueueEntry[]>([]);
  const [loading,     setLoading]     = useState(true);
  // currentDate controls which month is displayed (day value ignored)
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  // ── Data loading ────────────────────────────────────────────────────────────

  /** Fetch the full release queue from GET /api/release_queue. */
  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/release_queue");
      if (!res.ok) throw new Error(`${res.status}`);
      setEntries(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  // ── Month navigation ────────────────────────────────────────────────────────

  /** Step back one calendar month. */
  const prevMonth = () =>
    setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));

  /** Step forward one calendar month. */
  const nextMonth = () =>
    setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  // ── Calendar grid construction ──────────────────────────────────────────────

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay    = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Monday-first offset: Date.getDay() gives 0=Sun…6=Sat; shift so Mon=0
  const startOffset = (firstDay.getDay() + 6) % 7;

  // Build flat array of day numbers with leading null cells for padding
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad tail to complete the final week row
  while (cells.length % 7 !== 0) cells.push(null);

  // Index queue entries by their day number for the current month
  const entriesByDay: Record<number, QueueEntry[]> = {};
  for (const entry of entries) {
    const d = new Date(entry.scheduled_at);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!entriesByDay[day]) entriesByDay[day] = [];
      entriesByDay[day].push(entry);
    }
  }

  // Used to highlight today's cell
  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() &&
    year  === today.getFullYear();

  // ── Render ────────────────────────────────────────────────────────────────

  const navBtnStyle: React.CSSProperties = {
    background: "transparent",
    border: `1px solid ${BORDER}`,
    color: MUTED,
    width: 32, height: 32,
    fontFamily: "monospace", fontSize: 16,
    borderRadius: 3, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  };

  return (
    <div style={{ padding: "40px 48px 80px", maxWidth: 1000 }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: "monospace", fontSize: 11, letterSpacing: "0.3em", color: MUTED, marginBottom: 12, textTransform: "uppercase" }}>
          Calendar
        </div>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 32, fontWeight: 600, color: CREAM, marginBottom: 8 }}>
          Release Calendar
        </h1>
        <p style={{ color: MUTED, fontSize: 14 }}>
          Scheduled release queue by month.
        </p>
      </div>

      {loading && (
        <div style={{ fontFamily: "monospace", fontSize: 13, color: MUTED }}>Loading…</div>
      )}

      {!loading && (
        <>
          {/* Month navigation */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <button onClick={prevMonth} style={navBtnStyle} aria-label="Previous month">
              ←
            </button>
            <div style={{
              fontFamily: "Georgia, serif", fontSize: 20,
              color: CREAM, minWidth: 200, textAlign: "center",
            }}>
              {MONTH_NAMES[month]} {year}
            </div>
            <button onClick={nextMonth} style={navBtnStyle} aria-label="Next month">
              →
            </button>
          </div>

          {/* Calendar grid */}
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 6, overflow: "hidden" }}>

            {/* Weekday header row */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              background: BG1,
              borderBottom: `1px solid ${BORDER}`,
            }}>
              {DAY_NAMES.map(d => (
                <div key={d} style={{
                  padding: "8px 0", textAlign: "center",
                  fontFamily: "monospace", fontSize: 10,
                  letterSpacing: "0.15em", color: MUTED,
                  textTransform: "uppercase",
                }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
              {cells.map((day, idx) => {
                const dayEntries     = day ? (entriesByDay[day] ?? []) : [];
                const todayHighlight = !!(day && isToday(day));

                return (
                  <div
                    key={idx}
                    style={{
                      minHeight: 90,
                      padding: "8px 10px",
                      background: day ? BG2 : BG1,
                      // Use negative margin trick to collapse double-borders inside a grid
                      border: `1px solid ${todayHighlight ? GOLD : BORDER}`,
                      margin: "-1px 0 0 -1px",
                    }}
                  >
                    {day && (
                      <>
                        {/* Day number */}
                        <div style={{
                          fontFamily: "monospace", fontSize: 11,
                          color: todayHighlight ? GOLD : MUTED,
                          fontWeight: todayHighlight ? 700 : 400,
                          marginBottom: 6,
                        }}>
                          {day}
                        </div>

                        {/* Song chips for this day */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          {dayEntries.map(entry => {
                            const chipColor = statusColor(entry.status);
                            return (
                              <div
                                key={entry.id}
                                /* Navigate to /songs page when chip is clicked */
                                onClick={() => { window.location.href = "/songs"; }}
                                title={`${entry.song_title_pl} · ${entry.song_title_en} [${entry.status}]`}
                                style={{
                                  fontFamily: "monospace", fontSize: 10,
                                  padding: "2px 6px", borderRadius: 3,
                                  background: chipColor + "22",
                                  border: `1px solid ${chipColor}55`,
                                  color: chipColor,
                                  cursor: "pointer",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {entry.song_slug}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status legend */}
          <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
            {(
              [
                ["pending",   GOLD],
                ["releasing", MUTED],
                ["released",  GREEN],
                ["failed",    RED],
              ] as [string, string][]
            ).map(([label, color]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: 2,
                  background: color + "44",
                  border: `1px solid ${color}77`,
                }} />
                <span style={{ fontFamily: "monospace", fontSize: 10, color: MUTED, textTransform: "uppercase" }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
