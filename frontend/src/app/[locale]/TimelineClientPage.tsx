"use client";

/*
 * app/[locale]/TimelineClientPage.tsx — Client-side timeline rendering
 *
 * Receives songs fetched server-side by page.tsx, handles all interactivity:
 * era chip filtering, parallax scroll, expandable longText cards.
 *
 * Client sub-components (all require state or effects):
 *   EventCard        — year, title, summary, expandable longText + sources
 *   TimelineSection  — full-viewport section with per-entry parallax bg
 *   EraChips         — sticky era filter bar that gains blur on scroll
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslations } from "next-intl";
import HistBackground from "@/components/HistBackground";
import YouTubeCard from "@/components/YouTubeCard";

/* ── Types ─────────────────────────────────────────────────────────────────── */

/**
 * Song data shape returned by GET /api/songs.
 * All locale-specific fields are separate snake_case columns.
 */
export interface Song {
  slug:           string;
  title_pl:       string;
  title_en:       string;
  status:         string;
  album_slug:     string | null;
  era:            string | null;
  year_event:     number | null;
  year_label:     string | null;
  bg_hue:         number | null;
  bg_label:       string | null;
  subtitle_pl:    string | null;
  subtitle_en:    string | null;
  summary_pl:     string | null;
  summary_en:     string | null;
  long_text_pl:   string | null;
  long_text_en:   string | null;
  sources:        string[];
  youtube_id_pl:  string | null;
  youtube_id_en:  string | null;
}

/**
 * Ordered era slugs — matches "eras" namespace in messages files.
 * "coldwar" is the translation key; maps to DB era value "cold_war".
 */
const ERA_KEYS = [
  "all",
  "medieval",
  "partitions",
  "wwi",
  "wwii",
  "coldwar",
  "modern",
] as const;

/** Maps translation-key era slugs to DB era values where they differ. */
const ERA_KEY_TO_DB: Record<string, string> = { coldwar: "cold_war" };

/* ── EventCard ─────────────────────────────────────────────────────────────── */

interface EventCardProps {
  song:     Song;
  L:        "PL" | "EN";
  expanded: boolean;
  onToggle: () => void;
  t:        ReturnType<typeof useTranslations>;
}

/**
 * Card showing historical event details for a song entry.
 * Contains a large year number, heading, subtitle, summary, and an
 * expandable long-form text block with citations.
 *
 * @param song     - song data from API
 * @param L        - locale key ("PL" | "EN")
 * @param expanded - whether the longText block is open
 * @param onToggle - toggle callback
 * @param t        - translate function
 */
function EventCard({ song, L, expanded, onToggle, t }: EventCardProps) {
  const title    = (L === "PL" ? song.title_pl    : song.title_en)    ?? "";
  const subtitle = (L === "PL" ? song.subtitle_pl : song.subtitle_en) ?? "";
  const summary  = (L === "PL" ? song.summary_pl  : song.summary_en)  ?? "";
  const longText = (L === "PL" ? song.long_text_pl: song.long_text_en)?? "";
  const sources  = song.sources ?? [];

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
        {song.year_label ?? String(song.year_event ?? "")}
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
        {song.year_event ?? ""}
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
        {title}
      </h2>

      {/* Italic subtitle — gold */}
      {subtitle && (
        <div style={{
          fontFamily:   "var(--serif)",
          fontStyle:    "italic",
          fontSize:     22,
          color:        "var(--gold)",
          marginBottom: 24,
          fontWeight:   500,
        }}>
          — {subtitle}
        </div>
      )}

      {/* Summary paragraph */}
      {summary && (
        <p style={{
          fontSize:     16,
          lineHeight:   1.7,
          color:        "var(--cream-dim)",
          marginBottom: 20,
          maxWidth:     540,
        }}>
          {summary}
        </p>
      )}

      {/* Expandable longText block — max-height animates 0 → 600px */}
      {(longText || sources.length > 0) && (
        <>
          <div style={{
            maxHeight:  expanded ? 600 : 0,
            overflow:   "hidden",
            transition: "max-height 480ms ease, opacity 280ms",
            opacity:    expanded ? 1 : 0,
          }}>
            {/* Long-form text in gold-left-bordered block */}
            {longText && (
              <div style={{
                padding:      "18px 22px",
                background:   "rgba(200,168,75,0.04)",
                borderLeft:   "2px solid var(--gold)",
                marginBottom: 20,
                maxWidth:     560,
              }}>
                <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--cream-dim)" }}>
                  {longText}
                </p>
              </div>
            )}

            {/* Sources list */}
            {sources.length > 0 && (
              <div style={{ marginBottom: 24, maxWidth: 560 }}>
                <div style={{
                  fontFamily:    "var(--mono)",
                  fontSize:      10,
                  letterSpacing: "0.28em",
                  color:         "var(--muted-2)",
                  textTransform: "uppercase",
                  marginBottom:  10,
                }}>
                  {t("timeline.sources")}
                </div>
                {sources.map((source, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize:     13,
                      fontFamily:   "var(--serif)",
                      fontStyle:    "italic",
                      color:        "var(--cream-dim)",
                      padding:      "4px 0",
                      borderBottom: i < sources.length - 1
                        ? "1px solid rgba(200,168,75,0.08)"
                        : "none",
                    }}
                  >
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
            )}
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
            <span style={{
              display:    "inline-block",
              transform:  expanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 240ms",
            }}>
              →
            </span>
          </button>
        </>
      )}
    </div>
  );
}

/* ── TimelineSection ───────────────────────────────────────────────────────── */

interface TimelineSectionProps {
  song:     Song;
  L:        "PL" | "EN";
  index:    number;
  expanded: boolean;
  onToggle: () => void;
  t:        ReturnType<typeof useTranslations>;
}

/**
 * Full-viewport section for one song entry.
 * Tracks scroll progress via a passive scroll listener for parallax.
 * Even-index entries: [Video | Event]; odd-index: [Event | Video].
 *
 * @param song     - song data from API
 * @param L        - locale key
 * @param index    - list position
 * @param expanded - whether this entry's longText is open
 * @param onToggle - toggle callback
 * @param t        - translate function
 */
function TimelineSection({ song, L, index, expanded, onToggle, t }: TimelineSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      if (!ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = 1 - (r.top + r.height / 2) / vh;
      setProgress(Math.max(0, Math.min(1, p)));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  const videoId = L === "PL" ? song.youtube_id_pl : song.youtube_id_en;
  const flipped = index % 2 === 1;
  const hue     = song.bg_hue ?? 36;
  const label   = song.bg_label ?? "";
  const title   = (L === "PL" ? song.title_pl : song.title_en) ?? "";

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
        <HistBackground hue={hue} label={label} parallax={progress} src={`/images/songs/${song.slug}.jpg`} />
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
        {flipped ? (
          <>
            <EventCard song={song} L={L} expanded={expanded} onToggle={onToggle} t={t} />
            <YouTubeCard videoId={videoId} title={title} hue={hue} year={String(song.year_event ?? "")} />
          </>
        ) : (
          <>
            <YouTubeCard videoId={videoId} title={title} hue={hue} year={String(song.year_event ?? "")} />
            <EventCard song={song} L={L} expanded={expanded} onToggle={onToggle} t={t} />
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
        Track {String(index + 1).padStart(2, "0")} · {song.era ?? ""}
      </div>
    </section>
  );
}

/* ── EraChips ──────────────────────────────────────────────────────────────── */

interface EraChipsProps {
  activeEra: string;
  onChange:  (era: string) => void;
  t:         ReturnType<typeof useTranslations>;
}

/**
 * Sticky era-filter chip bar.
 * Gains backdrop-blur after 100px scroll ("stuck" state).
 *
 * @param activeEra - currently selected era slug (translation key)
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
              {t(`eras.${era}` as Parameters<typeof t>[0])}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── TimelineClientPage ────────────────────────────────────────────────────── */

interface TimelineClientPageProps {
  /** Songs fetched server-side by page.tsx, sorted by year_event ASC. */
  songs:  Song[];
  /** Active locale from [locale] segment. */
  locale: string;
}

/**
 * Client-rendered timeline page.
 * Receives pre-fetched songs from the server component, adds era filtering
 * and expand/collapse state for each entry.
 *
 * @param songs  - songs from API
 * @param locale - active locale ("pl" | "en")
 */
export default function TimelineClientPage({ songs, locale }: TimelineClientPageProps) {
  const t = useTranslations();

  const [activeEra, setActiveEra] = useState<string>("all");
  const [expanded,  setExpanded]  = useState<Record<string, boolean>>({});

  const L = (locale === "pl" ? "PL" : "EN") as "PL" | "EN";

  // Filter by era; map translation key → DB era value for comparison
  const filtered = useMemo(() => {
    if (activeEra === "all") return songs;
    const dbEra = ERA_KEY_TO_DB[activeEra] ?? activeEra;
    return songs.filter((s) => s.era === dbEra);
  }, [songs, activeEra]);

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
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <HistBackground hue={36} label="Hero — composite of eras" parallax={0} />
          <div style={{
            position:   "absolute",
            inset:      0,
            background: "linear-gradient(180deg, rgba(10,10,12,0.4) 0%, rgba(10,10,12,0.95) 100%)",
          }} />
        </div>

        <div style={{
          position: "relative",
          zIndex:   2,
          maxWidth: 1440,
          margin:   "0 auto",
          width:    "100%",
        }}>
          <div style={{
            fontFamily:    "var(--mono)",
            fontSize:      11,
            letterSpacing: "0.4em",
            color:         "var(--gold)",
            marginBottom:  24,
          }}>
            {t("timeline.badge")}
          </div>

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
      {filtered.map((song, i) => (
        <TimelineSection
          key={song.slug}
          song={song}
          L={L}
          index={i}
          expanded={!!expanded[song.slug]}
          onToggle={() =>
            setExpanded((s) => ({ ...s, [song.slug]: !s[song.slug] }))
          }
          t={t}
        />
      ))}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
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
