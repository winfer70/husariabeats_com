/*
 * app/[locale]/about/page.tsx — About / Home page
 *
 * Responsibilities:
 *   - Render full-viewport hero with HeroBackground, logo mark, H1, CTA links
 *   - Stats strip (4 metrics)
 *   - Social platform cards grid (data from @/data/socials.json)
 *   - Newsletter subscribe form (stub — no API call)
 *
 * Reads socials from @/data/socials.json.
 * i18n via next-intl useTranslations("about").
 */
"use client";

import { useState, CSSProperties } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import socialsData from "@/data/socials.json";

/* ── Types ───────────────────────────────────────────────────────────────── */

interface Social {
  name:   string;
  handle: string;
  subs:   string;
  hue:    number;
  url:    string;
}

const SOCIALS: Social[] = socialsData as Social[];

/* ── SVG sub-components ──────────────────────────────────────────────────── */

/**
 * SocialIcon — platform-specific inline SVG icon.
 * @param name - platform name (YouTube | Spotify | Instagram | TikTok | Facebook)
 * @param size - width/height in px, default 28
 */
function SocialIcon({ name, size = 28 }: { name: string; size?: number }) {
  const common = {
    fill:            "none",
    stroke:          "var(--gold)",
    strokeWidth:     1.5,
    strokeLinecap:   "round" as const,
    strokeLinejoin:  "round" as const,
  };
  if (name === "YouTube") return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...common}>
      <rect x="2" y="5" width="20" height="14" rx="3"/>
      <path d="M10 9 L15 12 L10 15 Z" fill="var(--gold)"/>
    </svg>
  );
  if (name === "Spotify") return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...common}>
      <circle cx="12" cy="12" r="10"/>
      <path d="M7 10c3-1 7-1 10 1"/>
      <path d="M7.5 13c2.5-0.7 6-0.7 9 1"/>
      <path d="M8 16c2-0.5 5-0.5 7 0.7"/>
    </svg>
  );
  if (name === "Instagram") return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...common}>
      <rect x="3" y="3" width="18" height="18" rx="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="0.8" fill="var(--gold)" stroke="none"/>
    </svg>
  );
  if (name === "TikTok") return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...common}>
      <path d="M14 4 v10 a4 4 0 1 1 -4 -4"/>
      <path d="M14 4 c0.5 2.5 2.5 4.5 5 5"/>
    </svg>
  );
  if (name === "Facebook") return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke="none" fill="none">
      <path
        d="M14 8h2.5V5H14a3 3 0 0 0-3 3v3H8.5v3H11v6h3v-6h2.5V11H14V9a1 1 0 0 1 0-1z"
        fill="var(--gold)"
      />
    </svg>
  );
  return null;
}

/**
 * HeroBackground — abstract warm-tone SVG gradient with subtle stripe texture.
 * Uses hue 38 (golden amber) and horizon suggestion paths to add depth.
 * Positioned absolute, fills parent container.
 */
function HeroBackground() {
  return (
    <svg
      width="100%" height="100%"
      viewBox="0 0 1920 1080"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: "absolute", inset: 0 }}
      aria-hidden="true"
    >
      <defs>
        {/* Warm radial gradient centred in the upper half */}
        <radialGradient id="hero-bg-r" cx="50%" cy="45%" r="80%">
          <stop offset="0%"   stopColor="oklch(0.32 0.07 38)"/>
          <stop offset="55%"  stopColor="oklch(0.14 0.03 30)"/>
          <stop offset="100%" stopColor="#06060a"/>
        </radialGradient>
        {/* Diagonal fine stripe texture */}
        <pattern id="hero-bg-stripes" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="14" stroke="oklch(0.6 0.1 40)" strokeWidth="0.4" strokeOpacity="0.16"/>
        </pattern>
        {/* Top-to-bottom vignette */}
        <linearGradient id="hero-bg-vignette" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(10,10,12,0.3)"/>
          <stop offset="100%" stopColor="rgba(10,10,12,0.95)"/>
        </linearGradient>
      </defs>

      {/* Base gradient fill */}
      <rect width="1920" height="1080" fill="url(#hero-bg-r)"/>
      {/* Fine stripe overlay */}
      <rect width="1920" height="1080" fill="url(#hero-bg-stripes)"/>
      {/* Suggested horizon — mid layer */}
      <path
        d="M0 760 Q 400 680, 800 720 T 1600 700 Q 1800 690, 1920 720 L 1920 1080 L 0 1080 Z"
        fill="oklch(0.1 0.03 30)" opacity="0.85"
      />
      {/* Deep shadow base */}
      <path
        d="M0 860 Q 500 800, 1000 830 T 1920 820 L 1920 1080 L 0 1080 Z"
        fill="#000" opacity="0.65"
      />
      {/* Top-to-bottom vignette overlay */}
      <rect width="1920" height="1080" fill="url(#hero-bg-vignette)"/>
    </svg>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

/**
 * AboutPage — full home / about page with hero, stats strip, socials, newsletter.
 */
export default function AboutPage() {
  const t      = useTranslations("about");
  const locale = useLocale();

  const [email,       setEmail]       = useState("");
  const [subscribed,  setSubscribed]  = useState(false);
  const [hoverSocial, setHoverSocial] = useState<string | null>(null);

  /* Stats labels come from i18n; the values are fixed content. */
  const statsLabels = t.raw("statsLabel") as string[];
  const stats: [string, string][] = [
    ["38",     statsLabels[0]],
    ["1.8M",   statsLabels[1]],
    ["12",     statsLabels[2]],
    ["1410→",  statsLabels[3]],
  ];

  /**
   * Handle newsletter subscribe form.
   * Stub — shows success state for 4 seconds; no API call.
   */
  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setTimeout(() => { setSubscribed(false); setEmail(""); }, 4000);
  };

  /* Shared label style for mono uppercase captions */
  const monoLabel = (extra?: CSSProperties): CSSProperties => ({
    fontFamily:    "var(--mono)",
    fontSize:      10,
    letterSpacing: "0.32em",
    textTransform: "uppercase",
    ...extra,
  });

  return (
    <div>

      {/* ════════════════════════════════════════════
          HERO — full-viewport, centred content
          ════════════════════════════════════════════ */}
      <section style={{
        position:        "relative",
        minHeight:       "100vh",
        display:         "flex",
        flexDirection:   "column",
        justifyContent:  "center",
        padding:         "120px 36px 80px",
        overflow:        "hidden",
      }}>
        {/* Absolute background layer */}
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <HeroBackground />
        </div>

        <div style={{
          position:  "relative",
          zIndex:    2,
          maxWidth:  1280,
          margin:    "0 auto",
          width:     "100%",
          textAlign: "center",
        }}>

          {/* Drop countdown pill badge */}
          <div style={{
            display:         "inline-flex",
            alignItems:      "center",
            gap:             14,
            padding:         "8px 16px",
            border:          "1px solid rgba(200,168,75,0.3)",
            borderRadius:    999,
            background:      "rgba(0,0,0,0.4)",
            backdropFilter:  "blur(8px)",
            marginBottom:    48,
            ...monoLabel({ color: "var(--gold)" }),
          }}>
            {/* Gold pulsing dot */}
            <span style={{
              display:     "inline-block",
              width:       6,
              height:      6,
              borderRadius: "50%",
              background:  "var(--gold)",
              boxShadow:   "0 0 10px var(--gold)",
            }}/>
            {t("nextDrop", { d: 43, album: "ZAPOMNIANI" })}
          </div>

          {/* Large logo mark — 120×120 SVG (mark only, no wordmark) */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 36 }}>
            <svg width="120" height="120" viewBox="0 0 48 48">
              <defs>
                <linearGradient id="hero-logo-gold" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%"   stopColor="#f04060"/>
                  <stop offset="100%" stopColor="#b01030"/>
                </linearGradient>
              </defs>
              <circle cx="24" cy="24" r="22" fill="none" stroke="url(#hero-logo-gold)" strokeWidth="0.6"/>
              <path d="M14 32 Q14 18, 24 12 Q34 18, 34 32" fill="none" stroke="url(#hero-logo-gold)" strokeWidth="1.2" strokeLinecap="round"/>
              <line x1="18" y1="30" x2="18" y2="20" stroke="url(#hero-logo-gold)" strokeWidth="0.8" strokeLinecap="round"/>
              <line x1="22" y1="32" x2="22" y2="16" stroke="url(#hero-logo-gold)" strokeWidth="0.8" strokeLinecap="round"/>
              <line x1="26" y1="32" x2="26" y2="16" stroke="url(#hero-logo-gold)" strokeWidth="0.8" strokeLinecap="round"/>
              <line x1="30" y1="30" x2="30" y2="20" stroke="url(#hero-logo-gold)" strokeWidth="0.8" strokeLinecap="round"/>
              <circle cx="24" cy="34" r="1.4" fill="url(#hero-logo-gold)"/>
            </svg>
          </div>

          {/* Main H1: "husaria" + italic gold "beats" */}
          <h1 style={{
            fontFamily:    "var(--serif)",
            fontSize:      "clamp(80px,15vw,220px)",
            fontWeight:    600,
            color:         "var(--cream)",
            lineHeight:    0.85,
            letterSpacing: "-0.03em",
            marginBottom:  28,
          }}>
            husaria<span style={{ color: "var(--gold)", fontStyle: "italic" }}>beats</span>
          </h1>

          {/* "Historia · Muzyka · Prawda" gold line with flanking dividers */}
          <div style={{
            display:        "flex",
            justifyContent: "center",
            alignItems:     "center",
            gap:            20,
            marginBottom:   40,
          }}>
            <div style={{ height: 1, width: 80, background: "var(--gold)", opacity: 0.6 }}/>
            <div style={{
              fontFamily:    "var(--serif)",
              fontStyle:     "italic",
              fontSize:      "clamp(20px,2.4vw,32px)",
              color:         "var(--gold)",
              fontWeight:    500,
              letterSpacing: "0.04em",
            }}>
              Historia · Muzyka · Prawda
            </div>
            <div style={{ height: 1, width: 80, background: "var(--gold)", opacity: 0.6 }}/>
          </div>

          {/* Mission paragraph — i18n italic */}
          <p style={{
            fontFamily: "var(--serif)",
            fontSize:   "clamp(20px,1.8vw,26px)",
            color:      "var(--cream-dim)",
            maxWidth:   760,
            margin:     "0 auto 56px",
            lineHeight: 1.5,
            fontStyle:  "italic",
          }}>
            {t("mission")}
          </p>

          {/* CTA button row */}
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>

            {/* Primary CTA — gold fill, links to timeline */}
            <Link
              href={`/${locale}/timeline`}
              style={{
                display:       "inline-block",
                padding:       "18px 32px",
                background:    "var(--gold)",
                color:         "#0a0a0c",
                fontFamily:    "var(--sans)",
                fontSize:      11,
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                fontWeight:    700,
                borderRadius:  2,
                textDecoration: "none",
                boxShadow:     "0 0 40px rgba(200,168,75,0.25)",
                transition:    "transform 200ms, box-shadow 200ms",
              }}
            >
              ▶ {t("enterTimeline")}
            </Link>

            {/* Ghost CTA — links to albums */}
            <Link
              href={`/${locale}/albums`}
              style={{
                display:        "inline-block",
                padding:        "18px 32px",
                background:     "transparent",
                border:         "1px solid rgba(232,217,181,0.4)",
                color:          "var(--cream)",
                fontFamily:     "var(--sans)",
                fontSize:       11,
                letterSpacing:  "0.32em",
                textTransform:  "uppercase",
                fontWeight:     600,
                borderRadius:   2,
                textDecoration: "none",
              }}
            >
              {t("seeAlbums")} →
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          STATS STRIP — 4 metrics bar
          ════════════════════════════════════════════ */}
      <section style={{
        borderTop:    "1px solid rgba(200,168,75,0.12)",
        borderBottom: "1px solid rgba(200,168,75,0.12)",
        background:   "var(--bg-1)",
        padding:      "40px 36px",
      }}>
        <div style={{
          maxWidth:            1280,
          margin:              "0 auto",
          display:             "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap:                 32,
        }}>
          {stats.map(([num, label]) => (
            <div key={label} style={{ textAlign: "center" }}>
              {/* Large serif gold number */}
              <div style={{
                fontFamily:    "var(--serif)",
                fontWeight:    600,
                fontSize:      48,
                color:         "var(--gold)",
                lineHeight:    1,
                marginBottom:  8,
                letterSpacing: "-0.02em",
              }}>
                {num}
              </div>
              {/* Mono muted label */}
              <div style={monoLabel({ color: "var(--muted)" })}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════
          SOCIALS — 5-col platform grid
          ════════════════════════════════════════════ */}
      <section style={{ padding: "120px 36px", maxWidth: 1280, margin: "0 auto" }}>
        {/* Section header */}
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={monoLabel({ color: "var(--gold)", marginBottom: 18, display: "block" })}>
            ◆ {t("followBadge")} ◆
          </div>
          <h2 style={{
            fontFamily:    "var(--serif)",
            fontSize:      "clamp(44px,6vw,84px)",
            fontWeight:    600,
            color:         "var(--cream)",
            letterSpacing: "-0.02em",
            lineHeight:    1,
          }}>
            {t("followTitle")}
          </h2>
        </div>

        {/* Social cards grid */}
        <div style={{
          display:             "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap:                 14,
        }}>
          {SOCIALS.map((s) => {
            const isHov = hoverSocial === s.name;
            return (
              <a
                key={s.name}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                onMouseEnter={() => setHoverSocial(s.name)}
                onMouseLeave={() => setHoverSocial(null)}
                style={{
                  display:        "flex",
                  flexDirection:  "column",
                  alignItems:     "center",
                  padding:        "28px 20px",
                  background:     "var(--bg-1)",
                  border:         `1px solid ${isHov ? "var(--gold)" : "rgba(200,168,75,0.12)"}`,
                  borderRadius:   6,
                  textDecoration: "none",
                  transition:     "all 240ms",
                  transform:      isHov ? "translateY(-4px)" : "translateY(0)",
                  boxShadow:      isHov
                    ? "0 16px 40px rgba(0,0,0,0.5), 0 0 30px rgba(200,168,75,0.15)"
                    : "0 4px 12px rgba(0,0,0,0.3)",
                }}
              >
                {/* Platform icon circle */}
                <div style={{
                  width:          56,
                  height:         56,
                  borderRadius:   "50%",
                  background:     "rgba(200,168,75,0.08)",
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  marginBottom:   16,
                }}>
                  <SocialIcon name={s.name} />
                </div>

                {/* Platform name */}
                <div style={{
                  fontFamily:   "var(--serif)",
                  fontSize:     18,
                  fontWeight:   600,
                  color:        "var(--cream)",
                  marginBottom: 4,
                }}>
                  {s.name}
                </div>

                {/* Handle */}
                <div style={monoLabel({ color: "var(--muted-2)", marginBottom: 10, display: "block" })}>
                  {s.handle}
                </div>

                {/* Subscriber / follower count */}
                <div style={{
                  fontFamily:    "var(--mono)",
                  fontSize:      11,
                  color:         "var(--gold)",
                  fontWeight:    700,
                  letterSpacing: "0.04em",
                }}>
                  {s.subs}
                </div>
              </a>
            );
          })}
        </div>
      </section>

      {/* ════════════════════════════════════════════
          NEWSLETTER — centred card with radial glow
          ════════════════════════════════════════════ */}
      <section style={{ padding: "80px 36px 140px" }}>
        <div style={{
          maxWidth:   780,
          margin:     "0 auto",
          padding:    "56px 48px",
          background: "var(--bg-1)",
          border:     "1px solid rgba(200,168,75,0.2)",
          borderRadius: 6,
          textAlign:  "center",
          position:   "relative",
          overflow:   "hidden",
        }}>
          {/* Radial glow decoration (pointer-events: none) */}
          <div style={{
            position:      "absolute",
            top:           -100,
            left:          "50%",
            transform:     "translateX(-50%)",
            width:         400,
            height:        400,
            background:    "radial-gradient(circle, rgba(200,168,75,0.08) 0%, transparent 70%)",
            pointerEvents: "none",
          }}/>

          <div style={{ position: "relative" }}>
            {/* "✉ NEWSLETTER" label */}
            <div style={monoLabel({ color: "var(--gold)", marginBottom: 18, display: "block" })}>
              ✉ NEWSLETTER
            </div>

            {/* Newsletter H3 */}
            <h3 style={{
              fontFamily:    "var(--serif)",
              fontSize:      36,
              fontWeight:    600,
              color:         "var(--cream)",
              lineHeight:    1.1,
              marginBottom:  14,
              letterSpacing: "-0.005em",
            }}>
              {t("newsletter")}
            </h3>

            {/* Italic subtitle — no spam */}
            <p style={{
              fontFamily:   "var(--serif)",
              fontStyle:    "italic",
              color:        "var(--muted)",
              fontSize:     16,
              marginBottom: 32,
            }}>
              {t("newsletterSub")}
            </p>

            {/* Subscribe form — stub (no API call) */}
            <form
              onSubmit={handleSubscribe}
              style={{ display: "flex", gap: 8, maxWidth: 520, margin: "0 auto" }}
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ty@example.com"
                style={{
                  flex:        1,
                  padding:     "15px 18px",
                  background:  "rgba(0,0,0,0.4)",
                  border:      "1px solid rgba(200,168,75,0.2)",
                  borderRadius: 2,
                  color:       "var(--cream)",
                  fontSize:    14,
                  fontFamily:  "var(--sans)",
                  outline:     "none",
                }}
              />
              <button
                type="submit"
                disabled={subscribed}
                style={{
                  padding:       "15px 24px",
                  background:    subscribed ? "rgba(95,180,162,0.15)" : "var(--gold)",
                  color:         subscribed ? "#5fb4a2" : "#0a0a0c",
                  fontFamily:    "var(--sans)",
                  fontSize:      11,
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  fontWeight:    700,
                  borderRadius:  2,
                  whiteSpace:    "nowrap",
                  border:        subscribed ? "1px solid #5fb4a2" : "1px solid var(--gold)",
                  cursor:        subscribed ? "default" : "pointer",
                  transition:    "all 220ms",
                }}
              >
                {subscribed ? `✓ ${t("subscribed")}` : t("subscribe")}
              </button>
            </form>

            {/* Contact footer */}
            <div style={{
              marginTop:   36,
              paddingTop:  28,
              borderTop:   "1px solid rgba(200,168,75,0.1)",
              ...monoLabel({ color: "var(--muted-2)" }),
            }}>
              {t("contact")} · <span style={{ color: "var(--cream-dim)" }}>kontakt@husariabeats.com</span>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
