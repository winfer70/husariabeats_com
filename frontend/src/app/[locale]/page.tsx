"use client";

/*
 * app/[locale]/page.tsx — Timeline home page
 *
 * Full-bleed parallax history timeline. Each entry has a YouTube embed
 * and an event card with expandable longText and sources. Sticky era chips
 * filter the visible entries.
 *
 * Client sub-components (defined inline, all require state or effects):
 *   EventCard        — year, title, summary, expandable longText + sources
 *   TimelineSection  — full-viewport section with per-entry parallax bg
 *   EraChips         — sticky era filter bar that gains blur on scroll
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslations } from "next-intl";
import HistBackground from "@/components/HistBackground";
import YouTubeCard from "@/components/YouTubeCard";
import timelineData from "@/data/timeline.json";

/* ── Types ─────────────────────────────────────────────────────────────────── */

/**
 * Shape of a single entry in timeline.json.
 * Locale-specific fields are keyed "PL" / "EN".
 */
interface TimelineEntry {
  id: string;
  era: string;
  year: string;
  yearLabel: string;
  albumSlug: string;
  bg: { hue: number; label: string };
  title: { PL: string; EN: string };
  subtitle: { PL: string; EN: string };
  summary: { PL: string; EN: string };
  longText: { PL: string; EN: string };
  sources: string[];
  plVideoId: string | null;
  enVideoId: string | null;
  plays: string | null;
  duration: string | null;
}

/** Ordered era slugs — matches the "eras" namespace in messages files. */
const ERA_KEYS = [
  "all",
  "medieval",
  "partitions",
  "wwi",
  "wwii",
  "coldwar",
  "modern",
] as const;

/* ── EventCard ─────────────────────────────────────────────────────────────── */

interface EventCardProps {
  /** Timeline data entry */
  entry: TimelineEntry;
  /** Resolved locale key — "PL" or "EN" */
  L: "PL" | "EN";
  /** Whether the longText block is currently expanded */
  expanded: boolean;
  /** Callback to toggle expanded state */
  onToggle: () => void;
  /** next-intl translate function passed from parent */
  t: ReturnType<typeof useTranslations>;
}

/**
 * Card showing the historical event details for a timeline entry.
 * Contains a large year number, heading, subtitle, summary, and an
 * expandable long-form text block with citations.
 *
 * @param entry    - timeline entry data
 * @param L        - locale key ("PL" | "EN")
 * @param expanded - whether the longText block is open
 * @param onToggle - toggle callback
 * @param t        - translate function
 */
function EventCard({ entry, L, expanded, onToggle, t }: EventCardProps) {
  return (
    <div style={{ position: "relative", padding: "4px 8px" }}>

      {/* Year label row — gold rule line + yearLabel in mono */}
      <div style={{
        fontFamily:    "var(--mono)",
        fontSize:      11,
        letterSpacing: "0.36em",
        color:         "var(--gold)",
        marginBottom:  18,
        display:       "flex",
        alignItems:    "center",
        gap:           14,
      }}>
        <span style={{
          display:    "inline-block",
          width:      32,
          height:     1,
          background: "var(--gold)",
        }} />
        {entry.yearLabel}
      </div>

      {/* Large year number */}
      <div style={{
        fontFamily:    "var(--mono)",
        fontSize:      80,
        fontWeight:    700,
        color:         "var(--gold)",
        lineHeight:    0.9,
        letterSpacing: "-0.02em",
        marginBottom:  16,
        textShadow:    "0 0 60px rgba(200,168,75,0.3)",
      }}>
        {entry.year}
      </div>

      {/* Event title — large serif */}
      <h2 style={{
        fontFamily:    "var(--serif)",
        fontSize:      64,
        fontWeight:    600,
        color:         "var(--cream)",
        lineHeight:    1,
        letterSpacing: "-0.01em",
        marginBottom:  8,
      }}>
        {entry.title[L]}
      </h2>

      {/* Italic subtitle — gold */}
      <div style={{
        fontFamily:   "var(--serif)",
        fontStyle:    "italic",
        fontSize:     22,
        color:        "var(--gold)",
        marginBottom: 24,
        fontWeight:   500,
      }}>
        — {entry.subtitle[L]}
      </div>

      {/* Summary paragraph */}
      <p style={{
        fontSize:     16,
        lineHeight:   1.7,
        color:        "var(--cream-dim)",
        marginBottom: 20,
        maxWidth:     540,
      }}>
        {entry.summary[L]}
      </p>

      {/* Expandable longText block — max-height animates 0 → 600px */}
      <div style={{
        maxHeight:  expanded ? 600 : 0,
        overflow:   "hidden",
        transition: "max-height 480ms ease, opacity 280ms",
        opacity:    expanded ? 1 : 0,
      }}>
        {/* Long-form text in gold-left-bordered block */}
        <div style={{
          padding:      "18px 22px",
          background:   "rgba(200,168,75,0.04)",
          borderLeft:   "2px solid var(--gold)",
          marginBottom: 20,
          maxWidth:     560,
        }}>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--cream-dim)" }}>
            {entry.longText[L]}
          </p>
        </div>

        {/* Sources list — shown only when expanded */}
        <div style={{ marginBottom: 24, maxWidth: 560 }}>
          <div style={{
            fontFamily:    "var(--mono)",
            fontSize:      10,
            letterSpacing: "0.28em",
            color:         "var(--muted-2)",
            textTransform: "uppercase",
            marginBottom:  10,
          }}>
            {/* t("timeline.sources") → "Citations" / "Źródła" */}
            {t("timeline.sources")}
          </div>
          {entry.sources.map((source, i) => (
            <div
              key={i}
              style={{
                fontSize:     13,
                fontFamily:   "var(--serif)",
                fontStyle:    "italic",
                color:        "var(--cream-dim)",
                padding:      "4px 0",
                borderBottom: i < entry.sources.length - 1
                  ? "1px solid rgba(200,168,75,0.08)"
                  : "none",
              }}
            >
              {/* Numeric prefix in mono */}
              <span style={{
                color:       "var(--gold)",
                marginRight: 8,
                fontFamily:  "var(--mono)",
                fontStyle:   "normal",
                fontSize:    10,
              }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              {source}
            </div>
          ))}
        </div>
      </div>

      {/* Read more / Collapse toggle button */}
      <button
        onClick={onToggle}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--gold)";
          e.currentTarget.style.color = "#0a0a0c";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(200,168,75,0.04)";
          e.currentTarget.style.color = "var(--gold)";
        }}
        style={{
          display:       "inline-flex",
          alignItems:    "center",
          gap:           10,
          padding:       "12px 20px",
          border:        "1px solid var(--gold)",
          borderRadius:  2,
          color:         "var(--gold)",
          fontSize:      11,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          fontWeight:    500,
          background:    "rgba(200,168,75,0.04)",
          transition:    "all 220ms",
          cursor:        "pointer",
        }}
      >
        {expanded ? t("timeline.collapse") : t("timeline.readMore")}
        {/* Arrow rotates 90° when expanded */}
        <span style={{
          display:    "inline-block",
          transform:  expanded ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform 240ms",
        }}>
          →
        </span>
      </button>
    </div>
  );
}

/* ── TimelineSection ───────────────────────────────────────────────────────── */

interface TimelineSectionProps {
  entry: TimelineEntry;
  L: "PL" | "EN";
  /** Zero-based position in the filtered list — drives layout direction */
  index: number;
  expanded: boolean;
  onToggle: () => void;
  t: ReturnType<typeof useTranslations>;
}

/**
 * Full-viewport section for one timeline entry.
 * Tracks its own scroll progress via a ResizeObserver-free scroll listener
 * and feeds the value to HistBackground as the parallax offset.
 * Even-index entries: [Video | Event]; odd-index: [Event | Video].
 *
 * @param entry    - timeline entry data
 * @param L        - locale key
 * @param index    - list position
 * @param expanded - whether this entry's longText is open
 * @param onToggle - toggle callback
 * @param t        - translate function
 */
function TimelineSection({
  entry,
  L,
  index,
  expanded,
  onToggle,
  t,
}: TimelineSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);

  // Recalculate parallax progress on every scroll tick
  useEffect(() => {
    const update = () => {
      if (!ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const vh = window.innerHeight;
      // Progress 0 = section centre at viewport bottom; 1 = centre at top
      const p = 1 - (r.top + r.height / 2) / vh;
      setProgress(Math.max(0, Math.min(1, p)));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  // Select video ID for active locale
  const videoId = L === "PL" ? entry.plVideoId : entry.enVideoId;
  const flipped = index % 2 === 1;

  return (
    <section
      ref={ref}
      style={{
        position:  "relative",
        minHeight: "100vh",
        padding:   "140px 36px 100px",
        overflow:  "hidden",
      }}
    >
      {/* Parallax background layer */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        {/* HistBackground shifts vertically at 60% of scroll speed */}
        <HistBackground
          hue={entry.bg.hue}
          label={entry.bg.label}
          parallax={progress}
        />
        {/* Dark overlay to keep text legible */}
        <div style={{
          position:   "absolute",
          inset:      0,
          background: "linear-gradient(180deg, rgba(10,10,12,0.55) 0%, rgba(10,10,12,0.4) 50%, rgba(10,10,12,0.85) 100%)",
        }} />
      </div>

      {/* 2-column content grid */}
      <div style={{
        position:            "relative",
        zIndex:              2,
        maxWidth:            1440,
        margin:              "0 auto",
        display:             "grid",
        gridTemplateColumns: "1fr 1fr",
        gap:                 80,
        alignItems:          "center",
        minHeight:           "calc(100vh - 240px)",
      }}>
        {/* Alternate: even → Video left / Event right; odd → Event left / Video right */}
        {flipped ? (
          <>
            <EventCard entry={entry} L={L} expanded={expanded} onToggle={onToggle} t={t} />
            <YouTubeCard
              videoId={videoId}
              title={entry.title[L]}
              hue={entry.bg.hue}
              year={entry.year}
            />
          </>
        ) : (
          <>
            <YouTubeCard
              videoId={videoId}
              title={entry.title[L]}
              hue={entry.bg.hue}
              year={entry.year}
            />
            <EventCard entry={entry} L={L} expanded={expanded} onToggle={onToggle} t={t} />
          </>
        )}
      </div>

      {/* Side rail — "Track 01 · era" rotated -90° */}
      <div style={{
        position:        "absolute",
        left:            36,
        top:             "50%",
        transform:       "translateY(-50%) rotate(-90deg)",
        transformOrigin: "left center",
        fontFamily:      "var(--mono)",
        fontSize:        10,
        letterSpacing:   "0.4em",
        color:           "var(--muted-2)",
        textTransform:   "uppercase",
        zIndex:          2,
        whiteSpace:      "nowrap",
      }}>
        Track {String(index + 1).padStart(2, "0")} · {entry.era}
      </div>
    </section>
  );
}

/* ── EraChips ──────────────────────────────────────────────────────────────── */

interface EraChipsProps {
  activeEra: string;
  onChange: (era: string) => void;
  t: ReturnType<typeof useTranslations>;
}

/**
 * Sticky era-filter chip bar.
 * Once the user scrolls past 100px the bar gains a backdrop-blur
 * background and a subtle gold border-bottom ("stuck" state).
 *
 * @param activeEra - currently selected era slug
 * @param onChange  - callback to update selected era
 * @param t         - translate function
 */
function EraChips({ activeEra, onChange, t }: EraChipsProps) {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 100);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{
      position:             "sticky",
      top:                  78,
      zIndex:               50,
      padding:              stuck ? "14px 36px" : "20px 36px",
      transition:           "padding 240ms",
      // Backdrop and border activate after scroll
      background:           stuck ? "rgba(10,10,12,0.65)" : "transparent",
      backdropFilter:       stuck ? "blur(14px)" : "none",
      WebkitBackdropFilter: stuck ? "blur(14px)" : "none",
      borderBottom:         stuck
        ? "1px solid rgba(200,168,75,0.12)"
        : "1px solid transparent",
    }}>
      <div style={{
        maxWidth:   1440,
        margin:     "0 auto",
        display:    "flex",
        gap:        8,
        flexWrap:   "wrap",
        alignItems: "center",
      }}>
        {/* "Filter era ↓" label */}
        <span style={{
          fontFamily:    "var(--mono)",
          fontSize:      10,
          letterSpacing: "0.3em",
          color:         "var(--muted-2)",
          textTransform: "uppercase",
          marginRight:   14,
        }}>
          {t("timeline.filterEra")} ↓
        </span>

        {/* One pill chip per era key */}
        {ERA_KEYS.map((era) => {
          const active = activeEra === era;
          return (
            <button
              key={era}
              onClick={() => onChange(era)}
              style={{
                padding:        "8px 16px",
                borderRadius:   999,
                border:         `1px solid ${active ? "var(--gold)" : "rgba(200,168,75,0.2)"}`,
                // Active: gold bg + dark text; inactive: semi-transparent + cream-dim text
                background:     active ? "var(--gold)" : "rgba(17,17,24,0.6)",
                color:          active ? "#0a0a0c" : "var(--cream-dim)",
                fontSize:       11,
                letterSpacing:  "0.16em",
                textTransform:  "uppercase",
                fontWeight:     600,
                transition:     "all 200ms",
                backdropFilter: "blur(8px)",
                cursor:         "pointer",
              }}
            >
              {/* t("eras.all"), t("eras.medieval"), t("eras.coldwar") … */}
              {t(`eras.${era}` as Parameters<typeof t>[0])}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────────── */

/**
 * Timeline home page — receives locale from the [locale] segment,
 * uses it to pick the correct localised fields from each timeline entry.
 *
 * State:
 *   activeEra — currently filtered era slug (default "all")
 *   expanded  — map of entry.id → boolean for longText visibility
 *
 * @param params.locale - active locale ("pl" | "en")
 */
export default function TimelinePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = useTranslations();

  const [activeEra, setActiveEra] = useState<string>("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Map Next.js locale slug ("pl" / "en") to data key ("PL" / "EN")
  const L = (locale === "pl" ? "PL" : "EN") as "PL" | "EN";

  const entries = timelineData as TimelineEntry[];

  // Derived: filter entries by selected era; "all" returns full list
  const filtered = useMemo(() => {
    if (activeEra === "all") return entries;
    return entries.filter((e) => e.era === activeEra);
  }, [entries, activeEra]);

  return (
    <div>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section style={{
        position:       "relative",
        minHeight:      "72vh",
        padding:        "160px 36px 80px",
        display:        "flex",
        flexDirection:  "column",
        justifyContent: "flex-end",
        overflow:       "hidden",
      }}>
        {/* Background — static (parallax=0) for hero */}
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <HistBackground hue={36} label="Hero — composite of eras" parallax={0} />
          <div style={{
            position:   "absolute",
            inset:      0,
            background: "linear-gradient(180deg, rgba(10,10,12,0.4) 0%, rgba(10,10,12,0.95) 100%)",
          }} />
        </div>

        {/* Hero text */}
        <div style={{
          position: "relative",
          zIndex:   2,
          maxWidth: 1440,
          margin:   "0 auto",
          width:    "100%",
        }}>
          {/* Mono badge */}
          <div style={{
            fontFamily:    "var(--mono)",
            fontSize:      11,
            letterSpacing: "0.4em",
            color:         "var(--gold)",
            marginBottom:  24,
          }}>
            {t("timeline.badge")}
          </div>

          {/* Main heading */}
          <h1 style={{
            fontFamily:    "var(--serif)",
            fontSize:      "clamp(72px, 11vw, 168px)",
            fontWeight:    600,
            lineHeight:    0.9,
            letterSpacing: "-0.02em",
            color:         "var(--cream)",
            marginBottom:  24,
          }}>
            {t("timeline.title")}
          </h1>

          {/* Italic subtitle */}
          <p style={{
            fontFamily: "var(--serif)",
            fontStyle:  "italic",
            fontSize:   "clamp(20px, 2vw, 28px)",
            color:      "var(--cream-dim)",
            maxWidth:   680,
            lineHeight: 1.4,
          }}>
            {t("timeline.subtitle")}
          </p>
        </div>

        {/* Scroll cue — centred at bottom of hero */}
        <div style={{
          position:      "absolute",
          bottom:        24,
          left:          "50%",
          transform:     "translateX(-50%)",
          fontFamily:    "var(--mono)",
          fontSize:      10,
          letterSpacing: "0.36em",
          color:         "var(--muted)",
          textTransform: "uppercase",
          zIndex:        2,
          whiteSpace:    "nowrap",
        }}>
          {t("timeline.scrollCue")}
        </div>
      </section>

      {/* ── Era filter chips ──────────────────────────────────────────────── */}
      <EraChips activeEra={activeEra} onChange={setActiveEra} t={t} />

      {/* ── Timeline entries ──────────────────────────────────────────────── */}
      {filtered.map((entry, i) => (
        <TimelineSection
          key={entry.id}
          entry={entry}
          L={L}
          index={i}
          expanded={!!expanded[entry.id]}
          onToggle={() =>
            setExpanded((s) => ({ ...s, [entry.id]: !s[entry.id] }))
          }
          t={t}
        />
      ))}

      {/* ── Empty state — shown when era filter yields no entries ─────────── */}
      {filtered.length === 0 && (
        <div style={{ padding: "120px 36px", textAlign: "center" }}>
          <p style={{
            fontFamily: "var(--serif)",
            fontStyle:  "italic",
            fontSize:   24,
            color:      "var(--muted)",
          }}>
            {t("timeline.noTracks")}
          </p>
        </div>
      )}
    </div>
  );
}
