"use client";

/*
 * app/[locale]/albums/page.tsx — Albums grid
 *
 * Displays all albums from albums.json in a responsive grid.
 * Released albums show an SVG cover art. Unreleased albums show a
 * dimmed cover behind a live countdown timer.
 *
 * Client sub-components (defined inline, all require state or effects):
 *   AlbumCover      — SVG cover art generated from album hue
 *   CountdownDigits — live days/hours/min/sec countdown, updates every 1s
 *   AlbumCard       — full card with hover state, link, cover, meta section
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import albumsData from "@/data/albums.json";

/* ── Types ─────────────────────────────────────────────────────────────────── */

/**
 * Shape of a single entry in albums.json.
 * Locale-specific fields are keyed "PL" / "EN".
 */
interface Album {
  id: string;
  slug: string;
  title: { PL: string; EN: string };
  tagline: { PL: string; EN: string };
  songs: number;
  era: string;
  released: boolean;
  hue: number;
  coverLabel: string;
  coverImage: string | null;
  daysUntil: number | null;
  releaseDate: string | null;
}

/* ── AlbumCover ────────────────────────────────────────────────────────────── */

interface AlbumCoverProps {
  /** Album data — hue, id, title, coverLabel are used for the SVG */
  album: Album;
  /** Locale key for the title text burned into the cover */
  L: "PL" | "EN";
}

/**
 * SVG album cover generated from the album's hue value.
 * Renders a radial gradient, diagonal stripe pattern, terrain silhouette,
 * HUSARIABEATS wordmark, album title, and a placeholder watermark.
 *
 * @param album - album data
 * @param L     - locale key for the title field
 */
function AlbumCover({ album, L }: AlbumCoverProps) {
  const id = `cov-${album.id}`;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMid slice"
      style={{ display: "block", borderRadius: 4 }}
    >
      <defs>
        {/* Radial gradient — hue controls the colour mood */}
        <radialGradient id={`${id}-r`} cx="50%" cy="40%" r="80%">
          <stop offset="0%"   stopColor={`oklch(0.42 0.12 ${album.hue})`} />
          <stop offset="100%" stopColor={`oklch(0.08 0.02 ${album.hue})`} />
        </radialGradient>
        {/* 45° diagonal stripe texture */}
        <pattern
          id={`${id}-stripes`}
          width="12"
          height="12"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line
            x1="0" y1="0" x2="0" y2="12"
            stroke={`oklch(0.6 0.1 ${album.hue})`}
            strokeWidth="0.5"
            strokeOpacity="0.18"
          />
        </pattern>
      </defs>

      {/* Base gradient fill */}
      <rect width="400" height="400" fill={`url(#${id}-r)`} />
      {/* Stripe texture overlay */}
      <rect width="400" height="400" fill={`url(#${id}-stripes)`} />
      {/* Terrain silhouette */}
      <path
        d="M0 280 Q 100 220, 200 250 T 400 240 L 400 400 L 0 400 Z"
        fill="#000"
        opacity="0.55"
      />

      {/* HUSARIABEATS wordmark */}
      <text
        x="200" y="190"
        textAnchor="middle"
        fontFamily="Cormorant Garamond, serif"
        fontWeight="600"
        fontSize="28"
        letterSpacing="6"
        fill="#f5f5f0"
        opacity="0.95"
      >
        HUSARIABEATS
      </text>
      {/* Divider line below wordmark */}
      <line x1="120" y1="210" x2="280" y2="210" stroke="#dc143c" strokeWidth="0.6" opacity="0.7" />
      {/* Album title */}
      <text
        x="200" y="270"
        textAnchor="middle"
        fontFamily="Cormorant Garamond, serif"
        fontWeight="700"
        fontSize="56"
        letterSpacing="4"
        fill="#dc143c"
      >
        {album.title[L]}
      </text>

      {/* Placeholder watermark */}
      <g transform="translate(20, 20)" opacity="0.55">
        <rect
          width="180" height="18"
          fill="rgba(0,0,0,0.6)"
          stroke={`oklch(0.7 0.12 ${album.hue})`}
          strokeWidth="0.4"
        />
        <text
          x="8" y="13"
          fill={`oklch(0.85 0.08 ${album.hue})`}
          fontFamily="JetBrains Mono, monospace"
          fontSize="8"
          letterSpacing="1"
        >
          PLACEHOLDER · COVER ART
        </text>
      </g>
      {/* Cover label — descriptive placeholder text */}
      <text
        x="20" y="380"
        fill={`oklch(0.7 0.06 ${album.hue})`}
        fontFamily="JetBrains Mono, monospace"
        fontSize="9"
        opacity="0.6"
      >
        {album.coverLabel}
      </text>
    </svg>
  );
}

/* ── CountdownDigits ───────────────────────────────────────────────────────── */

interface CountdownDigitsProps {
  /**
   * Number of days until release (offset from Date.now()).
   * Guards against null — component renders nothing if null.
   */
  days: number;
}

/**
 * Live countdown clock for unreleased albums.
 * Computes target = Date.now() + days * 86400000 and counts down
 * in days, hours, minutes, seconds. Updates every 1 second via setInterval.
 *
 * @param days - days until release (from album.daysUntil)
 */
function CountdownDigits({ days }: CountdownDigitsProps) {
  const [now, setNow] = useState(Date.now());

  // Tick every second
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Target timestamp derived from the days offset
  const target = Date.now() + days * 86400000;
  const left   = Math.max(0, target - now);

  const d = Math.floor(left / 86400000);
  const h = Math.floor((left % 86400000) / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);

  /**
   * Single countdown unit cell — large mono number + small label.
   * @param v     - numeric value
   * @param label - unit label ("DAYS", "HRS", etc.)
   */
  const Cell = ({ v, label }: { v: number; label: string }) => (
    <div style={{ textAlign: "center" }}>
      <div style={{
        fontFamily:    "var(--mono)",
        fontSize:      36,
        fontWeight:    700,
        color:         "var(--gold)",
        lineHeight:    1,
        textShadow:    "0 0 30px rgba(200,168,75,0.4)",
        letterSpacing: "-0.02em",
      }}>
        {String(v).padStart(2, "0")}
      </div>
      <div style={{
        fontFamily:    "var(--mono)",
        fontSize:      9,
        letterSpacing: "0.24em",
        color:         "var(--muted-2)",
        textTransform: "uppercase",
        marginTop:     6,
      }}>
        {label}
      </div>
    </div>
  );

  return (
    <div style={{
      display:        "flex",
      gap:            18,
      justifyContent: "center",
      alignItems:     "center",
    }}>
      <Cell v={d} label="DAYS" />
      <span style={{ color: "var(--muted-2)", fontFamily: "var(--mono)", fontSize: 24, marginTop: -12 }}>:</span>
      <Cell v={h} label="HRS" />
      <span style={{ color: "var(--muted-2)", fontFamily: "var(--mono)", fontSize: 24, marginTop: -12 }}>:</span>
      <Cell v={m} label="MIN" />
      <span style={{ color: "var(--muted-2)", fontFamily: "var(--mono)", fontSize: 24, marginTop: -12 }}>:</span>
      <Cell v={s} label="SEC" />
    </div>
  );
}

/* ── AlbumCard ─────────────────────────────────────────────────────────────── */

interface AlbumCardProps {
  album: Album;
  /** Resolved locale key — "PL" or "EN" */
  L: "PL" | "EN";
  /** Full locale slug for building the href */
  locale: string;
  t: ReturnType<typeof useTranslations>;
}

/**
 * Album card — a Next.js Link wrapping the entire card.
 * Released albums: plain AlbumCover SVG + "AVAILABLE" badge.
 * Unreleased albums: dimmed/blurred cover behind CountdownDigits + "IN PRODUCTION" badge.
 * Meta section below shows title, song count, tagline, era + open/tracklist CTA.
 *
 * @param album  - album data
 * @param L      - locale key
 * @param locale - locale slug for href
 * @param t      - translate function
 */
function AlbumCard({ album, L, locale, t }: AlbumCardProps) {
  const [hover, setHover] = useState(false);

  return (
    /* Link wraps the entire card — renders as <a> */
    <Link
      href={`/${locale}/albums/${album.slug}`}
      style={{ display: "block", textDecoration: "none" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={{
        position:    "relative",
        background:  "var(--bg-1)",
        border:      `1px solid ${hover ? "rgba(200,168,75,0.35)" : "rgba(200,168,75,0.12)"}`,
        borderRadius: 6,
        overflow:    "hidden",
        transition:  "transform 320ms, box-shadow 320ms, border-color 320ms",
        transform:   hover ? "translateY(-4px)" : "translateY(0)",
        boxShadow:   hover
          ? "0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(200,168,75,0.3)"
          : "0 8px 24px rgba(0,0,0,0.4)",
        cursor: "pointer",
      }}>

        {/* ── Cover area (1:1 aspect ratio) ────────────────────────────── */}
        <div style={{
          position:    "relative",
          aspectRatio: "1",
          background:  "#000",
          overflow:    "hidden",
        }}>
          {album.released ? (
            /* Released — show full-opacity cover */
            <AlbumCover album={album} L={L} />
          ) : (
            /* Unreleased — dimmed/blurred cover behind countdown */
            <>
              {/* Dimmed background cover */}
              <div style={{ position: "absolute", inset: 0, opacity: 0.35, filter: "blur(2px)" }}>
                <AlbumCover album={album} L={L} />
              </div>
              {/* Dark scrim over the blurred cover */}
              <div style={{ position: "absolute", inset: 0, background: "rgba(10,10,12,0.6)" }} />

              {/* Countdown overlay */}
              <div style={{
                position:       "absolute",
                inset:          0,
                display:        "flex",
                flexDirection:  "column",
                alignItems:     "center",
                justifyContent: "center",
                padding:        24,
              }}>
                {/* Album title above countdown */}
                <div style={{
                  fontFamily:    "var(--serif)",
                  fontWeight:    700,
                  fontSize:      32,
                  letterSpacing: "0.08em",
                  color:         "var(--cream)",
                  textAlign:     "center",
                  marginBottom:  8,
                }}>
                  {album.title[L]}
                </div>
                {/* "Releasing in X days" label */}
                <div style={{
                  fontFamily:    "var(--mono)",
                  fontSize:      9,
                  letterSpacing: "0.3em",
                  color:         "var(--gold)",
                  textTransform: "uppercase",
                  marginBottom:  28,
                }}>
                  {/* t("albums.releasesIn", { d: album.daysUntil }) */}
                  {t("albums.releasesIn", { d: album.daysUntil ?? 0 })}
                </div>
                {/* Live countdown — only rendered when daysUntil is present */}
                {album.daysUntil !== null && (
                  <CountdownDigits days={album.daysUntil} />
                )}
              </div>

              {/* "IN PRODUCTION" badge — top right */}
              <div style={{
                position:      "absolute",
                top:           14,
                right:         14,
                padding:       "5px 10px",
                border:        "1px solid var(--gold)",
                borderRadius:  2,
                background:    "rgba(200,168,75,0.1)",
                fontFamily:    "var(--mono)",
                fontSize:      9,
                letterSpacing: "0.24em",
                color:         "var(--gold)",
                textTransform: "uppercase",
                fontWeight:    600,
              }}>
                ◉ {t("albums.inProduction")}
              </div>
            </>
          )}

          {/* "AVAILABLE" badge — top left, released albums only */}
          {album.released && (
            <div style={{
              position:     "absolute",
              top:          14,
              left:         14,
              padding:      "5px 10px",
              background:   "rgba(10,10,12,0.75)",
              backdropFilter: "blur(6px)",
              border:       "1px solid rgba(232,217,181,0.2)",
              borderRadius: 2,
              fontFamily:   "var(--mono)",
              fontSize:     9,
              letterSpacing: "0.24em",
              color:        "var(--cream)",
              textTransform: "uppercase",
            }}>
              ▶ {t("albums.available")}
            </div>
          )}
        </div>

        {/* ── Meta section ─────────────────────────────────────────────── */}
        <div style={{ padding: "22px 24px 24px" }}>
          {/* Title row + song count */}
          <div style={{
            display:         "flex",
            justifyContent:  "space-between",
            alignItems:      "baseline",
            marginBottom:    6,
          }}>
            <h3 style={{
              fontFamily:    "var(--serif)",
              fontSize:      28,
              fontWeight:    600,
              color:         "var(--cream)",
              letterSpacing: "0.02em",
              lineHeight:    1,
            }}>
              {album.title[L]}
            </h3>
            {/* "{n} tracks" — interpolated via next-intl */}
            <span style={{
              fontFamily:    "var(--mono)",
              fontSize:      10,
              color:         "var(--muted-2)",
              letterSpacing: "0.18em",
            }}>
              {t("albums.songCount", { n: album.songs })}
            </span>
          </div>

          {/* Tagline — italic gold */}
          <p style={{
            fontFamily:   "var(--serif)",
            fontStyle:    "italic",
            fontSize:     15,
            color:        "var(--gold)",
            marginBottom: 16,
            fontWeight:   500,
          }}>
            {album.tagline[L]}
          </p>

          {/* Footer row — era label + open/tracklist CTA */}
          <div style={{
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "space-between",
            paddingTop:      14,
            borderTop:       "1px solid rgba(200,168,75,0.1)",
          }}>
            <span style={{
              fontFamily:    "var(--mono)",
              fontSize:      9,
              letterSpacing: "0.3em",
              color:         "var(--muted-2)",
              textTransform: "uppercase",
            }}>
              {album.era}
            </span>
            {/* CTA label changes on hover — "Open →" for released, "Tracklist →" for upcoming */}
            <span style={{
              fontSize:      11,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color:         hover ? "var(--gold)" : "var(--muted)",
              transition:    "color 200ms",
              fontWeight:    600,
            }}>
              {album.released ? t("albums.open") : t("albums.tracklist")} →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────────── */

/**
 * Albums grid page — server params, client-rendered body.
 * Renders a page header and a responsive album grid.
 *
 * @param params.locale - active locale ("pl" | "en")
 */
export default function AlbumsPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = useTranslations();

  // Map Next.js locale slug to data key
  const L = (locale === "pl" ? "PL" : "EN") as "PL" | "EN";

  const albums = albumsData as Album[];

  return (
    <div style={{ padding: "140px 36px 120px", maxWidth: 1440, margin: "0 auto" }}>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 64 }}>
        {/* Mono badge */}
        <div style={{
          fontFamily:    "var(--mono)",
          fontSize:      11,
          letterSpacing: "0.4em",
          color:         "var(--gold)",
          marginBottom:  20,
        }}>
          {t("albums.badge")}
        </div>

        {/* Main heading */}
        <h1 style={{
          fontFamily:    "var(--serif)",
          fontSize:      "clamp(64px, 9vw, 128px)",
          fontWeight:    600,
          color:         "var(--cream)",
          lineHeight:    0.95,
          letterSpacing: "-0.02em",
          marginBottom:  20,
        }}>
          {t("albums.title")}
        </h1>

        {/* Italic subtitle */}
        <p style={{
          fontFamily: "var(--serif)",
          fontStyle:  "italic",
          fontSize:   "clamp(18px, 1.6vw, 24px)",
          color:      "var(--cream-dim)",
          maxWidth:   620,
          lineHeight: 1.4,
        }}>
          {t("albums.subtitle")}
        </p>
      </div>

      {/* ── Album grid ───────────────────────────────────────────────────── */}
      <div style={{
        display:             "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
        gap:                 28,
      }}>
        {albums.map((album) => (
          <AlbumCard
            key={album.id}
            album={album}
            L={L}
            locale={locale}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}
