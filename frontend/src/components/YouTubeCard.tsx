/*
 * components/YouTubeCard.tsx — Real YouTube iframe embed
 *
 * Renders a 16:9 iframe with YouTube's embed URL.
 * Falls back to a styled placeholder when videoId is null
 * (used until the YouTube scraper populates the data).
 *
 * Props:
 *   videoId - YouTube video ID string, or null for placeholder
 *   title   - Video title for aria-label + placeholder display
 *   hue     - oklch hue for placeholder gradient (matches entry bg.hue)
 *   year    - Year label for placeholder display
 */
"use client";

import { useState } from "react";

interface YouTubeCardProps {
  /** YouTube video ID (e.g. "dQw4w9WgXcQ") or null for placeholder */
  videoId: string | null;
  /** Video title — used as iframe title and placeholder text */
  title:   string;
  /** oklch hue for placeholder gradient styling */
  hue:     number;
  /** Year label shown in placeholder */
  year:    string;
}

/**
 * 16:9 YouTube embed card with gold glow border.
 * When videoId is null, shows a styled placeholder with play button.
 * Real iframe loads lazily via loading="lazy".
 *
 * @param videoId - YouTube ID or null
 * @param title   - accessible title + placeholder label
 * @param hue     - colour mood for placeholder
 * @param year    - year label for placeholder
 */
export default function YouTubeCard({ videoId, title, hue, year }: YouTubeCardProps) {
  const [hover, setHover] = useState(false);

  const cardStyle: React.CSSProperties = {
    position:     "relative",
    aspectRatio:  "16 / 9",
    borderRadius: 14,
    overflow:     "hidden",
    background:   "#000",
    boxShadow:    hover
      ? "0 0 0 1px rgba(220,20,60,0.6), 0 0 60px rgba(220,20,60,0.35), 0 24px 60px rgba(0,0,0,0.7)"
      : "0 0 0 1px rgba(220,20,60,0.35), 0 0 40px rgba(220,20,60,0.18), 0 24px 60px rgba(0,0,0,0.7)",
    transition:   "box-shadow 280ms",
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {videoId ? (
        /* ── Real embed ──────────────────────────────────────────────────── */
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          style={{
            position: "absolute",
            inset:    0,
            width:    "100%",
            height:   "100%",
            border:   0,
          }}
        />
      ) : (
        /* ── Placeholder (no videoId yet) ────────────────────────────────── */
        <>
          {/* Painterly thumbnail */}
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 800 450"
            preserveAspectRatio="xMidYMid slice"
            style={{ position: "absolute", inset: 0 }}
          >
            <defs>
              <radialGradient id={`yt-${hue}`} cx="50%" cy="55%" r="70%">
                <stop offset="0%"   stopColor={`oklch(0.4 0.1 ${hue})`} />
                <stop offset="100%" stopColor={`oklch(0.08 0.02 ${hue})`} />
              </radialGradient>
            </defs>
            <rect width="800" height="450" fill={`url(#yt-${hue})`} />
            <path d="M0 320 Q 200 260, 400 290 T 800 270 L 800 450 L 0 450 Z" fill="#000" opacity="0.55" />
            <text x="400" y="200" textAnchor="middle" fill="#f5f5f0" fontFamily="Cormorant Garamond, serif"
              fontWeight="600" fontSize="56" letterSpacing="2" opacity="0.92">
              {title.toUpperCase()}
            </text>
            <text x="400" y="240" textAnchor="middle" fill="#dc143c"
              fontFamily="JetBrains Mono, monospace" fontSize="14" letterSpacing="6" opacity="0.85">
              {year} · HUSARIABEATS
            </text>
          </svg>

          {/* Play button */}
          <div style={{
            position:        "absolute",
            inset:           0,
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
          }}>
            <div style={{
              width:        hover ? 88 : 72,
              height:       hover ? 88 : 72,
              borderRadius: "50%",
              background:   "rgba(220,20,60,0.9)",
              display:      "flex",
              alignItems:   "center",
              justifyContent: "center",
              boxShadow:    hover ? "0 0 60px rgba(220,20,60,0.6)" : "0 8px 28px rgba(0,0,0,0.5)",
              transition:   "all 240ms cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#0a0608" style={{ marginLeft: 4 }}>
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{
            position:   "absolute",
            left: 0, right: 0, bottom: 0,
            padding:    "14px 16px",
            background: "linear-gradient(to top, rgba(0,0,0,0.92), transparent)",
          }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.2em", color: "var(--gold)", marginBottom: 4 }}>
              ▶ COMING SOON
            </div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600, color: "var(--cream)" }}>
              {title}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
