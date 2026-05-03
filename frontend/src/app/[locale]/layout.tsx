/*
 * app/[locale]/layout.tsx — root locale layout
 *
 * Responsibilities:
 *   - Load Google Fonts (Cormorant Garamond, Inter, JetBrains Mono)
 *   - Import global CSS (design tokens, grain, vignette)
 *   - Wrap children in NextIntlClientProvider
 *   - Render NavBar + grain/vignette overlays + main content
 *   - Export page metadata
 */

import type { Metadata } from "next";
import { Cormorant_Garamond, Inter, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { ReactNode } from "react";

import NavBar     from "@/components/NavBar";
import Footer     from "@/components/Footer";
import TweaksPanel from "@/components/TweaksPanel";
import "@/styles/globals.css";

/* ── Google Fonts ────────────────────────────────────────────────────────────
 * next/font/google handles self-hosting automatically — no external request
 * at runtime; fonts are bundled into the build output.
 */
const cormorant = Cormorant_Garamond({
  subsets:  ["latin", "latin-ext"],
  weight:   ["400", "500", "600", "700"],
  style:    ["normal", "italic"],
  variable: "--font-cormorant",
  display:  "swap",
});

const inter = Inter({
  subsets:  ["latin"],
  weight:   ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display:  "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets:  ["latin"],
  weight:   ["400", "500", "700"],
  variable: "--font-mono",
  display:  "swap",
});

/* ── Page metadata ───────────────────────────────────────────────────────────
 * generateMetadata per-locale can be added to individual page files.
 * This root layout provides the fallback.
 */
export const metadata: Metadata = {
  title:       "husariabeats — Historia · Muzyka · Prawda",
  description: "Polish history told in beats. AI-generated melodic trap and rap spanning 600 years of Polish military history.",
  openGraph: {
    type:      "website",
    siteName:  "husariabeats",
    locale:    "pl_PL",
    alternateLocale: ["en_US"],
  },
};

/* ── Layout ──────────────────────────────────────────────────────────────────
 * Input:  children (page content), params.locale (from [locale] segment)
 * Output: full HTML shell with fonts, overlays, nav, and page content
 */
export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  // Load i18n messages server-side (next-intl)
  const messages = await getMessages();

  // Fetch albums for NavBar dropdown — ISR: refreshes every 5 min
  const apiUrl = process.env.INTERNAL_API_URL ?? "http://api:8000";
  let albums = [];
  try {
    const res = await fetch(`${apiUrl}/api/albums`, { next: { revalidate: 300 } });
    if (res.ok) albums = await res.json();
  } catch {
    // API unavailable at build time — NavBar renders empty dropdown; ISR populates later
  }

  return (
    <html
      lang={locale}
      className={`${cormorant.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        {/* Atmospheric overlays — sit beneath all content (z-index 1, 2) */}
        <div className="grain"    aria-hidden="true" />
        <div className="vignette" aria-hidden="true" />

        <NextIntlClientProvider messages={messages}>
          {/* Sticky top navigation — albums passed from server fetch above */}
          <NavBar locale={locale} albums={albums} />

          {/* Page content — z-index 3 via globals.css */}
          <main>{children}</main>

          <Footer locale={locale} />
          <TweaksPanel />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
