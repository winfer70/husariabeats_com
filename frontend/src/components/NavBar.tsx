/*
 * components/NavBar.tsx — Sticky navigation bar
 *
 * Features:
 *   - Scroll-aware backdrop blur (intensifies after 8px scroll)
 *   - Albums hover dropdown with all album titles (receives albums as prop)
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

// Social platform links shown in the mobile overlay footer
const SOCIAL_LINKS = [
  { href: "https://youtube.com/@husariabeats",                       label: "YouTube",   icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/></svg> },
  { href: "https://open.spotify.com/artist/0iTZ9rwsAATUClWjynjF0r",  label: "Spotify",   icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.52 17.28c-.24.36-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.12-.78-.18-.9-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.48.66.3 1.02zm1.44-3.3c-.3.42-.84.54-1.26.24-3.18-1.98-8.04-2.52-11.82-1.38-.48.12-.96-.12-1.08-.6-.12-.48.12-.96.6-1.08 4.32-1.32 9.66-.66 13.32 1.56.42.3.54.84.24 1.26zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.3c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.54.3.72.96.42 1.5-.3.42-.96.6-1.5.3z"/></svg> },
  { href: "https://tiktok.com/@husariabeats",                        label: "TikTok",    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/></svg> },
  { href: "https://instagram.com/husariabeats",                      label: "Instagram", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg> },
  { href: "https://www.facebook.com/profile.php?id=61579521757181",  label: "Facebook",  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
];

/** Minimal album shape needed for the nav dropdown. */
interface NavAlbum {
  slug:      string;
  title_pl:  string | null;
  title_en:  string | null;
  status:    string;
}

interface NavBarProps {
  /** Current locale from [locale] segment ("pl" | "en") */
  locale: string;
  /** Albums list fetched server-side by layout.tsx */
  albums: NavAlbum[];
}

/**
 * Sticky top navbar with scroll-blur, albums dropdown, and language toggle.
 *
 * @param locale - active locale string
 * @param albums - album list passed from layout server component
 */
export default function NavBar({ locale, albums }: NavBarProps) {
  const t        = useTranslations("nav");
  const pathname = usePathname();

  const [scrolled,    setScrolled]    = useState(false);
  const [albumsOpen,  setAlbumsOpen]  = useState(false);
  const [menuOpen,    setMenuOpen]    = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastY      = useRef<number>(0);
  const [navHidden, setNavHidden]    = useState(false);

  // Track scroll position to switch navbar opacity
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll-hide: hide on scroll down, reveal on scroll up
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 80)                        setNavHidden(false);
      else if (y > lastY.current + 10)   setNavHidden(true);
      else if (y < lastY.current - 8)    setNavHidden(false);
      lastY.current = y;
    };
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
    <>
    <nav style={{
      position:            "fixed",
      top: 0, left: 0, right: 0,
      zIndex:              100,
      backdropFilter:      "blur(16px) saturate(140%)",
      WebkitBackdropFilter:"blur(16px) saturate(140%)",
      background:           scrolled ? "rgba(10, 6, 8, 0.78)" : "rgba(10, 6, 8, 0.32)",
      borderBottom:        `1px solid ${scrolled ? "rgba(220,20,60,0.15)" : "transparent"}`,
      transform:            navHidden && !menuOpen ? "translateY(-100%)" : "translateY(0)",
      transition:          "background 240ms, border-color 240ms, transform 280ms ease",
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

        {/* Desktop nav links — hidden on mobile via nav-links-desktop */}
        <div className="nav-links-desktop" style={{ alignItems: "center", gap: 36 }}>
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
                          key={album.slug}
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
                            {locale === "pl" ? album.title_pl : album.title_en}
                          </span>
                          {album.status !== "released" && (
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

        {/* Hamburger button — visible only on mobile via nav-hamburger class */}
        <button
          className="nav-hamburger"
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Menu"
          style={{
            background:    "none",
            border:        "none",
            cursor:        "pointer",
            color:         "var(--cream)",
            padding:        8,
            display:       "flex",
            flexDirection: "column",
            gap:            5,
          }}
        >
          {/* Three horizontal lines, or ✕ when open */}
          {menuOpen ? (
            <span style={{ fontFamily: "var(--mono)", fontSize: 20, lineHeight: 1 }}>✕</span>
          ) : (
            <>
              <span style={{ display: "block", width: 22, height: 1.5, background: "var(--cream)" }} />
              <span style={{ display: "block", width: 22, height: 1.5, background: "var(--cream)" }} />
              <span style={{ display: "block", width: 22, height: 1.5, background: "var(--cream)" }} />
            </>
          )}
        </button>

        {/* PL / EN language toggle */}
        <div className="nav-locale-desktop" style={{ display: "flex", alignItems: "center" }}>
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
      </div>
    </nav>

    {/* Mobile full-screen overlay — rendered as Fragment sibling, outside nav's transform stacking context */}
    {menuOpen && (
      <div style={{
        position:            "fixed",
        inset:               0,
        zIndex:              98,
        background:          "rgba(10,6,8,0.82)",
        backdropFilter:      "blur(24px) saturate(140%)",
        WebkitBackdropFilter:"blur(24px) saturate(140%)",
        display:             "flex",
        flexDirection:       "column",
        alignItems:          "center",
        justifyContent:      "center",
        padding:             "80px 32px 48px",
        overflowY:           "auto",
      }}>
        {/* Nav links */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0, width: "100%", maxWidth: 320 }}>
          {links.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.id}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                style={{
                  fontFamily:    "var(--serif)",
                  fontSize:       26,
                  fontWeight:     600,
                  color:          active ? "var(--cream)" : "var(--muted)",
                  padding:       "14px 0",
                  borderBottom:  "1px solid var(--line)",
                  letterSpacing: "0.02em",
                  display:       "flex",
                  alignItems:    "center",
                  justifyContent:"space-between",
                }}
              >
                {link.label}
                {active && (
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gold)" }} />
                )}
              </Link>
            );
          })}
        </div>

        {/* Locale toggle */}
        <div style={{ display: "flex", gap: 10, marginTop: 28, width: "100%", maxWidth: 320 }}>
          {(["pl", "en"] as const).map((lng) => (
            <Link
              key={lng}
              href={lng === locale ? pathname : toggleHref}
              onClick={() => setMenuOpen(false)}
              style={{
                display:      "flex",
                alignItems:   "center",
                gap:           8,
                padding:      "10px 18px",
                borderRadius:  999,
                background:    lng === locale ? "rgba(220,20,60,0.15)" : "transparent",
                border:       `1px solid ${lng === locale ? "rgba(220,20,60,0.35)" : "rgba(255,255,255,0.08)"}`,
                color:         lng === locale ? "var(--cream)" : "var(--muted)",
                fontSize:      12,
                letterSpacing: "0.18em",
                fontWeight:    600,
              }}
            >
              {lng === "pl" ? <FlagPL /> : <FlagGB />}
              {lng.toUpperCase()}
            </Link>
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "var(--line)", margin: "28px 0", width: "100%", maxWidth: 320 }} />

        {/* Social icons */}
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", maxWidth: 320 }}>
          {SOCIAL_LINKS.map(({ href, label, icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              style={{ color: "var(--muted)", display: "flex" }}
            >
              {icon}
            </a>
          ))}
        </div>
      </div>
    )}
  </>
  );
}
