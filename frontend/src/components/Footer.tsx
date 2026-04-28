/*
 * components/Footer.tsx — Site-wide footer
 *
 * Responsibilities:
 *   - Render brand logo (left) with copyright line
 *   - Render navigation links + contact email (right)
 *   - Server component — no client-side state needed
 *
 * Props:
 *   locale — current locale string (e.g. "en", "pl")
 *
 * i18n: useTranslations("footer") — keys: rights, privacy, terms
 */

import { useTranslations } from "next-intl";
import { Logo } from "@/components/Logo";

/* ── Types ───────────────────────────────────────────────────────────────── */

interface FooterProps {
  /** Current locale string, e.g. "en" or "pl". Used for scoping links. */
  locale: string;
}

/* ── Component ───────────────────────────────────────────────────────────── */

/**
 * Footer — server component rendered at the bottom of every locale page.
 * @param locale - active locale, passed from the locale layout
 */
export default function Footer({ locale }: FooterProps) {
  const t = useTranslations("footer");

  return (
    <footer style={{
      padding:   "48px 36px 60px",
      /* Subtle gold border using the spec's exact colour */
      borderTop: "1px solid rgba(200,168,75,0.12)",
    }}>
      <div style={{
        maxWidth:       1440,
        margin:         "0 auto",
        display:        "flex",
        justifyContent: "space-between",
        alignItems:     "flex-end",
        flexWrap:       "wrap",
        gap:            24,
      }}>

        {/* ── Left: logo + copyright ── */}
        <div>
          {/* Logo mark + wordmark from shared component */}
          <Logo />

          {/* Copyright line — mono 10px muted-2 */}
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
        </div>

        {/* ── Right: links + contact email ── */}
        <div style={{
          fontFamily:    "var(--mono)",
          fontSize:      10,
          letterSpacing: "0.24em",
          color:         "var(--muted-2)",
          textTransform: "uppercase",
          textAlign:     "right",
        }}>
          {/* Privacy · Terms · Press nav row */}
          <div style={{ marginBottom: 6 }}>
            {t("privacy")} · {t("terms")} · Press
          </div>

          {/* Contact email */}
          <div>
            kontakt@husariabeats.com
          </div>
        </div>

      </div>
    </footer>
  );
}
