"use client";

/*
 * app/[locale]/albums/AlbumsClientPage.tsx — Client-side albums grid rendering
 *
 * Receives albums fetched server-side by page.tsx.
 * Handles hover state and live countdown timers (require client-side JS).
 *
 * Client sub-components:
 *   AlbumCover      — SVG cover art generated from album hue
 *   CountdownDigits — live days/hours/min/sec countdown, updates every 1s
 *   AlbumCard       — full card with hover state, link, cover, meta section
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

/* ── Types ─────────────────────────────────────────────────────────────────── */

/**
 * Album data shape returned by GET /api/albums.
 */
export interface Album {
  slug:                   string;
  title_pl:               string | null;
  title_en:               string | null;
  tagline_pl:             string | null;
  tagline_en:             string | null;
  era:                    string | null;
  hue:                    number | null;
  cover_label:            string | null;
  status:                 string;
  release_date:           string | null;
  youtube_playlist_id_pl: string | null;
  youtube_playlist_id_en: string | null;
  songs_count:            number;
}

/** Whether the album has been published. */
const isReleased = (a: Album) => a.status === "released";

/** Locale-aware title accessor. */
const getTitle = (a: Album, L: "PL" | "EN") =>
  (L === "PL" ? a.title_pl : a.title_en) ?? "";

/** Locale-aware tagline accessor. */
const getTagline = (a: Album, L: "PL" | "EN") =>
  (L === "PL" ? a.tagline_pl : a.tagline_en) ?? "";

/**
 * Compute days until release from ISO date string.
 * Returns null if release_date is not set.
 */
const getDaysUntil = (a: Album): number | null => {
  if (!a.release_date) return null;
  return Math.round((new Date(a.release_date).getTime() - Date.now()) / 86400000);
};

/* ── AlbumCover ────────────────────────────────────────────────────────────── */

interface AlbumCoverProps {
  album:     Album;
  L:         "PL" | "EN";
  /** Optional image path — if provided, replaces generated SVG art */
  coverSrc?: string;
}

/**
 * SVG album cover generated from the album's hue value.
 * When `coverSrc` is given the generated art layers are replaced with the
 * real image; the HUSARIABEATS wordmark and album title text are always kept.
 * Renders a radial gradient, diagonal stripe pattern, terrain silhouette,
 * HUSARIABEATS wordmark, album title, and (when no image) a placeholder watermark.
 *
 * @param album    - album data
 * @param L        - locale key for the title field
 * @param coverSrc - optional image path replacing generated art
 */
function AlbumCover({ album, L, coverSrc }: AlbumCoverProps) {
  const id  = `cov-${album.slug}`;
  const hue = album.hue ?? 36;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMid slice"
      style={{ display: "block", borderRadius: 4 }}
    >
      <defs>
        <radialGradient id={`${id}-r`} cx="50%" cy="40%" r="80%">
          <stop offset="0%"   stopColor={`oklch(0.42 0.12 ${hue})`} />
          <stop offset="100%" stopColor={`oklch(0.08 0.02 ${hue})`} />
        </radialGradient>
        <linearGradient id={`${id}-l`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={`oklch(0.28 0.08 ${hue})`} stopOpacity="0.4" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.75" />
        </linearGradient>
        <pattern
          id={`${id}-stripes`}
          width="12"
          height="12"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line
            x1="0" y1="0" x2="0" y2="12"
            stroke={`oklch(0.6 0.1 ${hue})`}
            strokeWidth="0.5"
            strokeOpacity="0.18"
          />
        </pattern>
      </defs>

      {/* Background — real image or generated art */}
      {coverSrc ? (
        <image href={coverSrc} x="0" y="0" width="440" height="440" preserveAspectRatio="xMidYMid slice" />
      ) : (
        <>
          <rect width="400" height="400" fill={`url(#${id}-r)`} />
          <rect width="400" height="400" fill={`url(#${id}-stripes)`} />
          <path
            d="M0 280 Q 100 220, 200 250 T 400 240 L 400 400 L 0 400 Z"
            fill="#000"
            opacity="0.55"
          />
        </>
      )}

      {/* Overlay gradient — always present for text readability */}
      <rect width="400" height="400" fill={`url(#${id}-l)`} />

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
      <line x1="120" y1="210" x2="280" y2="210" stroke="#dc143c" strokeWidth="0.6" opacity="0.7" />
      <text
        x="200" y="270"
        textAnchor="middle"
        fontFamily="Cormorant Garamond, serif"
        fontWeight="700"
        fontSize="56"
        letterSpacing="4"
        fill="#dc143c"
      >
        {getTitle(album, L)}
      </text>

      {/* Placeholder watermark — only when no real image */}
      {!coverSrc && (
        <>
          <g transform="translate(20, 20)" opacity="0.55">
            <rect
              width="180" height="18"
              fill="rgba(0,0,0,0.6)"
              stroke={`oklch(0.7 0.12 ${hue})`}
              strokeWidth="0.4"
            />
            <text
              x="8" y="13"
              fill={`oklch(0.85 0.08 ${hue})`}
              fontFamily="JetBrains Mono, monospace"
              fontSize="8"
              letterSpacing="1"
            >
              PLACEHOLDER · COVER ART
            </text>
          </g>
          <text
            x="20" y="380"
            fill={`oklch(0.7 0.06 ${hue})`}
            fontFamily="JetBrains Mono, monospace"
            fontSize="9"
            opacity="0.6"
          >
            {album.cover_label ?? ""}
          </text>
        </>
      )}
    </svg>
  );
}

/* ── CountdownDigits ───────────────────────────────────────────────────────── */

/**
 * Live countdown clock for unreleased albums.
 * Counts down in days/hours/minutes/seconds, updates every 1s.
 *
 * @param days - days until release (computed from album.release_date)
 */
function CountdownDigits({ days }: { days: number }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const target = Date.now() + days * 86400000;
  const left   = Math.max(0, target - now);

  const d = Math.floor(left / 86400000);
  const h = Math.floor((left % 86400000) / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);

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
    <div style={{ display: "flex", gap: 18, justifyContent: "center", alignItems: "center" }}>
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
  album:  Album;
  L:      "PL" | "EN";
  locale: string;
  t:      ReturnType<typeof useTranslations>;
}

/**
 * Album card — a Next.js Link wrapping the entire card.
 * Released albums: full-opacity cover + "AVAILABLE" badge.
 * Unreleased albums: dimmed/blurred cover behind CountdownDigits + "IN PRODUCTION" badge.
 *
 * @param album  - album data from API
 * @param L      - locale key
 * @param locale - locale slug for href
 * @param t      - translate function
 */
function AlbumCard({ album, L, locale, t }: AlbumCardProps) {
  const [hover, setHover] = useState(false);

  const released  = isReleased(album);
  const title     = getTitle(album, L);
  const tagline   = getTagline(album, L);
  const daysUntil = getDaysUntil(album);

  return (
    <Link
      href={`/${locale}/albums/${album.slug}`}
      style={{ display: "block", textDecoration: "none" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={{
        position:     "relative",
        background:   "var(--bg-1)",
        border:       `1px solid ${hover ? "rgba(200,168,75,0.35)" : "rgba(200,168,75,0.12)"}`,
        borderRadius: 6,
        overflow:     "hidden",
        transition:   "transform 320ms, box-shadow 320ms, border-color 320ms",
        transform:    hover ? "translateY(-4px)" : "translateY(0)",
        boxShadow:    hover
          ? "0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(200,168,75,0.3)"
          : "0 8px 24px rgba(0,0,0,0.4)",
        cursor: "pointer",
      }}>

        {/* Cover area */}
        <div style={{ position: "relative", aspectRatio: "1", background: "#000", overflow: "hidden" }}>
          {released ? (
            <AlbumCover album={album} L={L} coverSrc={`/images/albums/${album.slug}.jpg`} />
          ) : (
            <>
              <div style={{ position: "absolute", inset: 0, opacity: 0.35, filter: "blur(2px)" }}>
                <AlbumCover album={album} L={L} coverSrc={`/images/albums/${album.slug}.jpg`} />
              </div>
              <div style={{ position: "absolute", inset: 0, background: "rgba(10,10,12,0.6)" }} />

              <div style={{
                position:       "absolute",
                inset:          0,
                display:        "flex",
                flexDirection:  "column",
                alignItems:     "center",
                justifyContent: "center",
                padding:        24,
              }}>
                <div style={{
                  fontFamily:    "var(--serif)",
                  fontWeight:    700,
                  fontSize:      32,
                  letterSpacing: "0.08em",
                  color:         "var(--cream)",
                  textAlign:     "center",
                  marginBottom:  8,
                }}>
                  {title}
                </div>
                <div style={{
                  fontFamily:    "var(--mono)",
                  fontSize:      9,
                  letterSpacing: "0.3em",
                  color:         "var(--gold)",
                  textTransform: "uppercase",
                  marginBottom:  28,
                }}>
                  {t("albums.releasesIn", { d: daysUntil ?? 0 })}
                </div>
                {daysUntil !== null && <CountdownDigits days={daysUntil} />}
              </div>

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

          {released && (
            <div style={{
              position:       "absolute",
              top:            14,
              left:           14,
              padding:        "5px 10px",
              background:     "rgba(10,10,12,0.75)",
              backdropFilter: "blur(6px)",
              border:         "1px solid rgba(232,217,181,0.2)",
              borderRadius:   2,
              fontFamily:     "var(--mono)",
              fontSize:       9,
              letterSpacing:  "0.24em",
              color:          "var(--cream)",
              textTransform:  "uppercase",
            }}>
              ▶ {t("albums.available")}
            </div>
          )}
        </div>

        {/* Meta section */}
        <div style={{ padding: "22px 24px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <h3 style={{
              fontFamily:    "var(--serif)",
              fontSize:      28,
              fontWeight:    600,
              color:         "var(--cream)",
              letterSpacing: "0.02em",
              lineHeight:    1,
            }}>
              {title}
            </h3>
            {album.songs_count > 0 && (
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted-2)", letterSpacing: "0.18em" }}>
                {t("albums.songCount", { n: album.songs_count })}
              </span>
            )}
          </div>

          <p style={{
            fontFamily:   "var(--serif)",
            fontStyle:    "italic",
            fontSize:     15,
            color:        "var(--gold)",
            marginBottom: 16,
            fontWeight:   500,
          }}>
            {tagline}
          </p>

          <div style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            paddingTop:     14,
            borderTop:      "1px solid rgba(200,168,75,0.1)",
          }}>
            <span style={{
              fontFamily:    "var(--mono)",
              fontSize:      9,
              letterSpacing: "0.3em",
              color:         "var(--muted-2)",
              textTransform: "uppercase",
            }}>
              {album.era ?? ""}
            </span>
            <span style={{
              fontSize:      11,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color:         hover ? "var(--gold)" : "var(--muted)",
              transition:    "color 200ms",
              fontWeight:    600,
            }}>
              {released ? t("albums.open") : t("albums.tracklist")} →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ── AlbumsClientPage ──────────────────────────────────────────────────────── */

interface AlbumsClientPageProps {
  albums: Album[];
  locale: string;
}

/**
 * Client-rendered albums grid page.
 * Receives pre-fetched albums from the server component.
 *
 * @param albums - albums from API
 * @param locale - active locale ("pl" | "en")
 */
export default function AlbumsClientPage({ albums, locale }: AlbumsClientPageProps) {
  const t = useTranslations();
  const L = (locale === "pl" ? "PL" : "EN") as "PL" | "EN";

  return (
    <div style={{ padding: "140px 36px 120px", maxWidth: 1440, margin: "0 auto" }}>

      {/* Page header */}
      <div style={{ marginBottom: 64 }}>
        <div style={{
          fontFamily:    "var(--mono)",
          fontSize:      11,
          letterSpacing: "0.4em",
          color:         "var(--gold)",
          marginBottom:  20,
        }}>
          {t("albums.badge")}
        </div>

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

      {/* Album grid */}
      <div style={{
        display:             "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
        gap:                 28,
      }}>
        {albums.map((album) => (
          <AlbumCard key={album.slug} album={album} L={L} locale={locale} t={t} />
        ))}
      </div>
    </div>
  );
}
