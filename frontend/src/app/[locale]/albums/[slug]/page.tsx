/*
 * app/[locale]/albums/[slug]/page.tsx — Single album detail
 *
 * Fetches album metadata and its songs from the API with ISR (revalidate: 300s).
 * Shows album header, tagline, and a track list sorted by year_event.
 *
 * Inputs:  params.locale, params.slug
 * Outputs: Album detail page or 404
 */

import { notFound } from "next/navigation";
import Link         from "next/link";

interface Props {
  params: { locale: string; slug: string };
}

interface Album {
  slug:        string;
  title_pl:    string | null;
  title_en:    string | null;
  tagline_pl:  string | null;
  tagline_en:  string | null;
  era:         string | null;
  status:      string;
  songs_count: number;
}

interface Song {
  slug:        string;
  title_pl:    string;
  title_en:    string;
  year_event:  number | null;
  year_label:  string | null;
  subtitle_pl: string | null;
  subtitle_en: string | null;
}

export default async function AlbumDetailPage({ params: { locale, slug } }: Props) {
  const apiUrl = process.env.INTERNAL_API_URL ?? "http://api:8000";

  const [albumRes, songsRes] = await Promise.all([
    fetch(`${apiUrl}/api/albums/${slug}`,           { next: { revalidate: 300 } }),
    fetch(`${apiUrl}/api/songs?album_slug=${slug}`, { next: { revalidate: 300 } }),
  ]);

  if (!albumRes.ok) notFound();

  const album: Album  = await albumRes.json();
  const songs: Song[] = songsRes.ok ? await songsRes.json() : [];

  // Sort by chronological year for tracklist display
  songs.sort((a, b) => (a.year_event ?? 0) - (b.year_event ?? 0));

  const isPL    = locale === "pl";
  const title   = (isPL ? album.title_pl   : album.title_en)   ?? slug;
  const tagline = (isPL ? album.tagline_pl : album.tagline_en) ?? "";

  return (
    <div className="page-pad">

      {/* Breadcrumb */}
      <div style={{
        fontFamily:    "var(--mono)",
        fontSize:      11,
        letterSpacing: "0.3em",
        color:         "var(--muted-2)",
        marginBottom:  40,
        textTransform: "uppercase",
      }}>
        <Link href={`/${locale}/albums`} style={{ color: "var(--muted-2)" }}>
          {isPL ? "Albumy" : "Albums"}
        </Link>
        {" · "}
        <span style={{ color: "var(--gold)" }}>{title}</span>
      </div>

      {/* Album header */}
      <div style={{ marginBottom: 64 }}>
        <h1 style={{
          fontFamily:    "var(--serif)",
          fontSize:      "clamp(64px, 9vw, 128px)",
          fontWeight:    600,
          color:         "var(--cream)",
          lineHeight:    0.95,
          letterSpacing: "-0.02em",
          marginBottom:  16,
        }}>
          {title}
        </h1>
        {tagline && (
          <p style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 22, color: "var(--gold)", marginBottom: 8 }}>
            {tagline}
          </p>
        )}
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted-2)", letterSpacing: "0.24em" }}>
          {songs.length} {isPL ? "UTWORÓW" : "TRACKS"}
          {album.era && ` · ${album.era.toUpperCase()}`}
        </div>
      </div>

      {/* Track list */}
      {songs.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {songs.map((song, i) => {
            const trackTitle = (isPL ? song.title_pl   : song.title_en)   ?? "";
            const subtitle   = (isPL ? song.subtitle_pl: song.subtitle_en)?? "";
            return (
              <Link
                key={song.slug}
                href={`/${locale}/songs/${song.slug}`}
                style={{
                  display:    "flex",
                  alignItems: "center",
                  gap:        24,
                  padding:    "20px 24px",
                  background: "var(--bg-1)",
                  border:     "1px solid rgba(220,20,60,0.1)",
                  borderRadius: 4,
                  transition: "border-color 200ms, background 200ms",
                  textDecoration: "none",
                }}
              >
                <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--gold)", fontWeight: 700, minWidth: 28 }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                {song.year_event && (
                  <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--muted-2)", minWidth: 48 }}>
                    {song.year_event}
                  </span>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 600, color: "var(--cream)", lineHeight: 1.2 }}>
                    {trackTitle}
                  </div>
                  {subtitle && (
                    <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 14, color: "var(--gold)", marginTop: 2 }}>
                      {subtitle}
                    </div>
                  )}
                </div>
                <span style={{ color: "var(--muted)", fontSize: 14 }}>→</span>
              </Link>
            );
          })}
        </div>
      ) : (
        <p style={{
          fontFamily: "var(--serif)",
          fontStyle:  "italic",
          fontSize:   20,
          color:      "var(--muted)",
          textAlign:  "center",
          padding:    "60px 0",
        }}>
          {isPL ? "Tracklista wkrótce." : "Tracklist coming soon."}
        </p>
      )}
    </div>
  );
}
