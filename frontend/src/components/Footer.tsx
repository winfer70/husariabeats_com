/*
 * components/Footer.tsx — Site-wide footer
 *
 * Three-column layout: logo + copyright | social icons | legal links
 * Server component — no client-side state needed.
 *
 * Props:
 *   locale — current locale string (e.g. "en", "pl")
 *
 * i18n: useTranslations("footer") — keys: rights, privacy, terms
 */

import { useTranslations } from "next-intl";
import Link from "next/link";
import { Logo } from "@/components/Logo";

/* ── Types ───────────────────────────────────────────────────────────────── */

interface FooterProps {
  /** Current locale string, e.g. "en" or "pl". Used for scoping links. */
  locale: string;
}

/* ── Social icon SVGs ────────────────────────────────────────────────────── */

/** YouTube icon (24×24) */
function IconYouTube() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/>
    </svg>
  );
}

/** Spotify icon (24×24) */
function IconSpotify() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.52 17.28c-.24.36-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.12-.78-.18-.9-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.48.66.3 1.02zm1.44-3.3c-.3.42-.84.54-1.26.24-3.18-1.98-8.04-2.52-11.82-1.38-.48.12-.96-.12-1.08-.6-.12-.48.12-.96.6-1.08 4.32-1.32 9.66-.66 13.32 1.56.42.3.54.84.24 1.26zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.3c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.54.3.72.96.42 1.5-.3.42-.96.6-1.5.3z"/>
    </svg>
  );
}

/** TikTok icon */
function IconTikTok() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/>
    </svg>
  );
}

/** Instagram icon */
function IconInstagram() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
    </svg>
  );
}

/** Facebook icon */
function IconFacebook() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

/* ── Link style helper ───────────────────────────────────────────────────── */
const linkStyle: React.CSSProperties = {
  color:          "var(--muted-2)",
  textDecoration: "none",
  transition:     "color 150ms",
};

/* ── Component ───────────────────────────────────────────────────────────── */

/**
 * Footer — server component rendered at the bottom of every locale page.
 * @param locale - active locale, passed from the locale layout
 */
export default function Footer({ locale }: FooterProps) {
  const t = useTranslations("footer");
  const isPL = locale === "pl";

  return (
    <footer style={{
      padding:    "56px 36px 64px",
      borderTop:  "1px solid rgba(200,168,75,0.12)",
      background: "var(--bg-0)",
    }}>
      <div className="footer-grid">

        {/* ── Left: logo + copyright ── */}
        <div>
          <Logo />
          <div style={{
            fontFamily:    "var(--mono)",
            fontSize:      10,
            letterSpacing: "0.2em",
            color:         "var(--muted-2)",
            marginTop:     18,
            textTransform: "uppercase",
          }}>
            © 2026 husariabeats.com · {t("rights")}
          </div>

          {/* Contact */}
          <a
            href="mailto:kontakt@husariabeats.com"
            style={{ ...linkStyle, fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.2em", display: "block", marginTop: 8 }}
          >
            kontakt@husariabeats.com
          </a>
        </div>

        {/* ── Centre: social icons ── */}
        <div style={{
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          gap:            16,
        }}>
          <div style={{
            fontFamily:    "var(--mono)",
            fontSize:      9,
            letterSpacing: "0.36em",
            color:         "var(--muted-2)",
            textTransform: "uppercase",
          }}>
            {isPL ? "Obserwuj" : "Follow"}
          </div>

          {/* Social icon row */}
          <div style={{ display: "flex", gap: 20 }}>
            {[
              { href: "https://youtube.com/@husariabeats", icon: <IconYouTube />, label: "YouTube" },
              { href: "https://open.spotify.com/artist/0iTZ9rwsAATUClWjynjF0r", icon: <IconSpotify />, label: "Spotify" },
              { href: "https://tiktok.com/@husariabeats", icon: <IconTikTok />, label: "TikTok" },
              { href: "https://instagram.com/husariabeats", icon: <IconInstagram />, label: "Instagram" },
              { href: "https://www.facebook.com/profile.php?id=61579521757181", icon: <IconFacebook />, label: "Facebook" },
            ].map(({ href, icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                style={{
                  color:      "var(--muted-2)",
                  transition: "color 150ms",
                  display:    "flex",
                }}
              >
                {icon}
              </a>
            ))}
          </div>
        </div>

        {/* ── Right: legal links ── */}
        <div style={{
          fontFamily:    "var(--mono)",
          fontSize:      10,
          letterSpacing: "0.24em",
          color:         "var(--muted-2)",
          textTransform: "uppercase",
          textAlign:     "right",
          display:       "flex",
          flexDirection: "column",
          gap:           10,
          alignItems:    "flex-end",
        }}>
          <Link href={`/${locale}/privacy`} style={linkStyle}>
            {t("privacy")}
          </Link>
          <Link href={`/${locale}/terms`} style={linkStyle}>
            {t("terms")}
          </Link>
          <a href="mailto:kontakt@husariabeats.com" style={linkStyle}>
            Press
          </a>
        </div>

      </div>
    </footer>
  );
}
