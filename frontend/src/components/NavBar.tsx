/*
 * components/NavBar.tsx — Sticky navigation bar
 *
 * Features:
 *   - Scroll-aware backdrop blur (intensifies after 8px scroll)
 *   - Albums hover dropdown with all album titles
 *   - PL/EN language toggle with flag SVGs
 *   - Active page indicator (crimson underline)
 *   - Uses next/link for client-side navigation
 *   - Uses next-intl useLocale + useTranslations for i18n
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { Logo, FlagPL, FlagGB } from "@/components/Logo";
import albums from "@/data/albums.json";

interface NavBarProps {
  /** Current locale from [locale] segment ("pl" | "en") */
  locale: string;
}

/**
 * Sticky top navbar with scroll-blur, albums dropdown, and language toggle.
 *
 * @param locale - active locale string
 */
export default function NavBar({ locale }: NavBarProps) {
  const t        = useTranslations("nav");
  const pathname = usePathname();

  const [scrolled,    setScrolled]    = useState(false);
  const [albumsOpen,  setAlbumsOpen]  = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track scroll position to switch navbar opacity
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Dropdown hover with delayed close to allow moving cursor to dropdown
  const openDropdown     = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setAlbumsOpen(true);
  };
  const scheduleClose    = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setAlbumsOpen(false), 180);
  };

  const otherLocale = locale === "pl" ? "en" : "pl";
  // Swap locale prefix in path for language toggle
  const toggleHref  = pathname.replace(`/${locale}`, `/${otherLocale}`);

  const links = [
    { id: "timeline", label: t("timeline"), href: `/${locale}` },
    { id: "albums",   label: t("albums"),   href: `/${locale}/albums`, dropdown: true },
    { id: "whatsnext",label: t("whatsNext"),href: `/${locale}/next` },
    { id: "about",    label: t("about"),    href: `/${locale}/about` },
  ];

  /** Is the given href the active page? */
  const isActive = (href: string) =>
    pathname === href || (href !== `/${locale}` && pathname.startsWith(href));

  const linkStyle = (active: boolean): React.CSSProperties => ({
    position:      "relative",
    padding:       "8px 2px",
    fontSize:       13,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color:          active ? "var(--cream)" : "var(--muted)",
    fontWeight:     500,
    transition:    "color 200ms",
    cursor:        "pointer",
    background:    "none",
    border:        "none",
    fontFamily:    "var(--sans)",
  });

  return (
    <nav style={{
      position:            "fixed",
      top: 0, left: 0, right: 0,
      zIndex:              100,
      backdropFilter:      "blur(16px) saturate(140%)",
      WebkitBackdropFilter:"blur(16px) saturate(140%)",
      background:           scrolled ? "rgba(10, 6, 8, 0.78)" : "rgba(10, 6, 8, 0.32)",
      borderBottom:        `1px solid ${scrolled ? "rgba(220,20,60,0.15)" : "transparent"}`,
      transition:          "background 240ms, border-color 240ms",
    }}>
      <div style={{
        maxWidth:       1440,
        margin:         "0 auto",
        padding:        "18px 36px",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        gap:             32,
      }}>
        {/* Logo → About page */}
        <Link href={`/${locale}/about`} style={{ display: "flex", alignItems: "center" }}>
          <Logo />
        </Link>

        {/* Desktop nav links */}
        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          {links.map((link) => {
            const active = isActive(link.href);

            if (link.dropdown) {
              return (
                <div
                  key={link.id}
                  onMouseEnter={openDropdown}
                  onMouseLeave={scheduleClose}
                  style={{ position: "relative" }}
                >
                  <Link href={link.href} style={linkStyle(active)}>
                    {link.label}
                    <span style={{ marginLeft: 6, fontSize: 9, opacity: 0.6 }}>▾</span>
                    {active && (
                      <div style={{
                        position:   "absolute",
                        left: 0, right: 0, bottom: -2,
                        height:      2,
                        background: "var(--gold)",
                        boxShadow:  "0 0 12px var(--gold-glow)",
                      }} />
                    )}
                  </Link>

                  {albumsOpen && (
                    <div
                      onMouseEnter={openDropdown}
                      onMouseLeave={scheduleClose}
                      style={{
                        position:        "absolute",
                        top:             "calc(100% + 12px)",
                        left:            -12,
                        minWidth:         280,
                        background:      "rgba(17,17,24,0.96)",
                        backdropFilter:  "blur(20px)",
                        border:          "1px solid rgba(220,20,60,0.18)",
                        borderRadius:     6,
                        boxShadow:       "0 24px 60px rgba(0,0,0,0.6)",
                        padding:         "10px 0",
                        zIndex:           200,
                      }}
                    >
                      {albums.map((album) => (
                        <Link
                          key={album.id}
                          href={`/${locale}/albums/${album.slug}`}
                          onClick={() => setAlbumsOpen(false)}
                          style={{
                            display:         "flex",
                            alignItems:      "center",
                            justifyContent:  "space-between",
                            width:           "100%",
                            padding:         "10px 18px",
                            fontSize:         13,
                            color:           "var(--cream-dim)",
                          }}
                        >
                          <span style={{ fontFamily: "var(--serif)", fontSize: 15, fontWeight: 600, letterSpacing: "0.04em" }}>
                            {locale === "pl" ? album.title.PL : album.title.EN}
                          </span>
                          {!album.released && (
                            <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--gold)", letterSpacing: "0.1em" }}>
                              SOON
                            </span>
                          )}
                        </Link>
                      ))}
                      <div style={{ height: 1, background: "rgba(220,20,60,0.12)", margin: "8px 0" }} />
                      <Link
                        href={`/${locale}/albums`}
                        onClick={() => setAlbumsOpen(false)}
                        style={{
                          display:       "block",
                          width:         "100%",
                          padding:       "10px 18px",
                          fontSize:       11,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          color:         "var(--gold)",
                          fontWeight:     500,
                        }}
                      >
                        {locale === "pl" ? "Wszystkie albumy" : "All albums"} →
                      </Link>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link key={link.id} href={link.href} style={linkStyle(active)}>
                {link.label}
                {active && (
                  <div style={{
                    position:   "absolute",
                    left: 0, right: 0, bottom: -2,
                    height:      2,
                    background: "var(--gold)",
                    boxShadow:  "0 0 12px var(--gold-glow)",
                  }} />
                )}
              </Link>
            );
          })}
        </div>

        {/* PL / EN language toggle */}
        <div style={{
          display:    "flex",
          alignItems: "center",
          gap:         0,
          border:     "1px solid rgba(220,20,60,0.25)",
          borderRadius:999,
          padding:     3,
          background: "rgba(0,0,0,0.3)",
        }}>
          {(["pl", "en"] as const).map((lng) => (
            <Link
              key={lng}
              href={lng === locale ? pathname : toggleHref}
              style={{
                display:       "flex",
                alignItems:    "center",
                gap:            7,
                padding:       "6px 12px",
                borderRadius:   999,
                background:     lng === locale ? "rgba(220,20,60,0.15)" : "transparent",
                color:          lng === locale ? "var(--cream)" : "var(--muted)",
                fontSize:       11,
                letterSpacing: "0.18em",
                fontWeight:     600,
                transition:    "background 160ms",
              }}
            >
              {lng === "pl" ? <FlagPL /> : <FlagGB />}
              {lng.toUpperCase()}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
