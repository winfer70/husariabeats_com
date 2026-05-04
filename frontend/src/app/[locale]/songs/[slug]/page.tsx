/* app/[locale]/songs/[slug]/page.tsx
 *
 * Song detail page — displays full story, sources, and YouTube embeds.
 * Server component: fetches from INTERNAL_API_URL, ISR revalidate 300s.
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

interface Props {
  params: { locale: string; slug: string };
}

interface Song {
  slug: string;
  title_pl: string;
  title_en: string;
  status: string;
  subtitle_pl: string | null;
  subtitle_en: string | null;
  summary_pl: string | null;
  summary_en: string | null;
  long_text_pl: string | null;
  long_text_en: string | null;
  year_event: number | null;
  year_label: string | null;
  era: string | null;
  album_slug: string | null;
  youtube_id_pl: string | null;
  youtube_id_en: string | null;
  spotify_url: string | null;
  bg_hue: number | null;
  sources: string[];
  release_date: string | null;
}

export async function generateMetadata({ params: { locale, slug } }: Props) {
  const apiUrl = process.env.INTERNAL_API_URL ?? "http://api:8000";
  try {
    const res = await fetch(`${apiUrl}/api/songs/${slug}`, { next: { revalidate: 300 } });
    if (!res.ok) return {};
    const song: Song = await res.json();
    const isPL = locale === "pl";
    const title = (isPL ? song.title_pl : song.title_en) ?? slug;
    const description = (isPL ? song.summary_pl : song.summary_en) ?? "";
    return {
      title: `${title} | HusariaBeats`,
      description,
      openGraph: { title: `${title} | HusariaBeats`, description },
    };
  } catch {
    return {};
  }
}

export default async function SongDetailPage({ params: { locale, slug } }: Props) {
  const apiUrl = process.env.INTERNAL_API_URL ?? "http://api:8000";
  const t = await getTranslations("songDetail");

  const res = await fetch(`${apiUrl}/api/songs/${slug}`, { next: { revalidate: 300 } });
  if (!res.ok) notFound();

  const song: Song = await res.json();
  const isPL = locale === "pl";

  const title    = isPL ? song.title_pl     : song.title_en;
  const subtitle = isPL ? song.subtitle_pl  : song.subtitle_en;
  const summary  = isPL ? song.summary_pl   : song.summary_en;
  const longText = isPL ? song.long_text_pl : song.long_text_en;
  const ytId     = isPL ? song.youtube_id_pl : song.youtube_id_en;

  // bg_hue accent — fallback to gold (45)
  const hue = song.bg_hue ?? 45;
  const accentColor = `hsl(${hue}, 70%, 55%)`;

  return (
    <div style={{ padding: "140px 36px 120px", maxWidth: 1440, margin: "0 auto" }}>

      {/* Breadcrumb */}
      <nav style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.3em", color: "var(--muted-2)", marginBottom: 48, textTransform: "uppercase" }}>
        <Link href={`/${locale}`} style={{ color: "var(--muted-2)", textDecoration: "none" }}>
          {isPL ? "Oś czasu" : "Timeline"}
        </Link>
        {song.album_slug && (
          <>
            {" · "}
            <Link href={`/${locale}/albums/${song.album_slug}`} style={{ color: "var(--muted-2)", textDecoration: "none" }}>
              {isPL ? "Album" : "Album"}
            </Link>
          </>
        )}
        {" · "}
        <span style={{ color: accentColor }}>{title}</span>
      </nav>

      {/* Hero */}
      <div style={{ marginBottom: 72, maxWidth: 900 }}>
        {/* Year badge */}
        {(song.year_label || song.year_event) && (
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.4em", color: accentColor, marginBottom: 16, textTransform: "uppercase" }}>
            {song.year_label ?? String(song.year_event)}
            {song.era && ` · ${song.era.replace("_", " ").toUpperCase()}`}
          </div>
        )}

        {/* Title */}
        <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(48px, 7vw, 108px)", fontWeight: 600, color: "var(--cream)", lineHeight: 0.95, letterSpacing: "-0.02em", marginBottom: 20 }}>
          {title}
        </h1>

        {/* Subtitle */}
        {subtitle && (
          <p style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: "clamp(18px, 2vw, 24px)", color: accentColor, marginBottom: 8, lineHeight: 1.4 }}>
            {subtitle}
          </p>
        )}

        {/* Summary */}
        {summary && (
          <p style={{ fontFamily: "var(--serif)", fontSize: 18, color: "var(--muted)", lineHeight: 1.7, marginTop: 24, maxWidth: 760 }}>
            {summary}
          </p>
        )}
      </div>

      {/* Two-column layout: long text + YouTube */}
      <div className={`song-detail-grid ${ytId ? "song-detail-grid--with-video" : "song-detail-grid--no-video"}`}>

        {/* Long text */}
        {longText && (
          <div>
            <div style={{ width: 48, height: 2, background: accentColor, marginBottom: 32 }} />
            <div style={{ fontFamily: "var(--serif)", fontSize: 17, color: "var(--cream)", lineHeight: 1.85, whiteSpace: "pre-line" }}>
              {longText}
            </div>
          </div>
        )}

        {/* YouTube embed */}
        {ytId && (
          <div style={{ position: "sticky", top: 120 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.3em", color: "var(--muted-2)", marginBottom: 12, textTransform: "uppercase" }}>
              {t("watchOn")} YouTube
            </div>
            <div style={{ position: "relative", paddingBottom: "56.25%", background: "var(--bg-1)", borderRadius: 4, overflow: "hidden", border: `1px solid hsl(${hue}, 40%, 20%)` }}>
              <iframe
                src={`https://www.youtube.com/embed/${ytId}`}
                title={title ?? ""}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
              />
            </div>
            {/* Spotify link if available */}
            {song.spotify_url && (
              <a href={song.spotify_url} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, padding: "10px 16px", background: "#1db954", borderRadius: 4, color: "#000", fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", textDecoration: "none", textTransform: "uppercase" }}>
                ♫ {t("listenSpotify")}
              </a>
            )}
          </div>
        )}
      </div>

      {/* Sources / Citations */}
      {song.sources && song.sources.length > 0 && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 48, marginBottom: 64 }}>
          <h3 style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.4em", color: accentColor, marginBottom: 24, textTransform: "uppercase" }}>
            {t("sources")}
          </h3>
          <ol style={{ padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
            {song.sources.map((src: string, i: number) => (
              <li key={i} style={{ display: "flex", gap: 16, fontFamily: "var(--serif)", fontSize: 14, color: "var(--muted)", lineHeight: 1.5 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: accentColor, minWidth: 20, paddingTop: 2 }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{src}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Back navigation */}
      <div style={{ display: "flex", gap: 24 }}>
        <Link href={`/${locale}`}
          style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.3em", color: "var(--muted-2)", textDecoration: "none", textTransform: "uppercase" }}>
          ← {isPL ? "Wróć do osi czasu" : "Back to Timeline"}
        </Link>
        {song.album_slug && (
          <Link href={`/${locale}/albums/${song.album_slug}`}
            style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.3em", color: "var(--muted-2)", textDecoration: "none", textTransform: "uppercase" }}>
            ← {isPL ? "Wróć do albumu" : "Back to Album"}
          </Link>
        )}
      </div>
    </div>
  );
}
