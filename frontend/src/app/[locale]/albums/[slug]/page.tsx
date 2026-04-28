/*
 * app/[locale]/albums/[slug]/page.tsx — Single album detail
 *
 * Shows album cover, track list filtered from timeline.json by albumSlug,
 * and links to individual timeline entries.
 *
 * Inputs:  params.locale, params.slug
 * Outputs: Album detail page or 404
 */

import { notFound }   from "next/navigation";
import Link           from "next/link";
import albums         from "@/data/albums.json";
import timeline       from "@/data/timeline.json";

interface Props {
  params: { locale: string; slug: string };
}

/** Generate static params for all album slugs at build time */
export function generateStaticParams() {
  return albums.map((a) => ({ slug: a.slug }));
}

export default function AlbumDetailPage({ params: { locale, slug } }: Props) {
  const album  = albums.find((a) => a.slug === slug);
  if (!album) notFound();

  const isPL     = locale === "pl";
  const title    = isPL ? album.title.PL    : album.title.EN;
  const tagline  = isPL ? album.tagline.PL  : album.tagline.EN;
  const tracks   = timeline.filter((t) => t.albumSlug === slug);

  return (
    <div style={{ padding: "140px 36px 120px", maxWidth: 1440, margin: "0 auto" }}>

      {/* Breadcrumb */}
      <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.3em", color: "var(--muted-2)", marginBottom: 40, textTransform: "uppercase" }}>
        <Link href={`/${locale}/albums`} style={{ color: "var(--muted-2)" }}>
          {isPL ? "Albumy" : "Albums"}
        </Link>
        {" · "}
        <span style={{ color: "var(--gold)" }}>{title}</span>
      </div>

      {/* Album header */}
      <div style={{ marginBottom: 64 }}>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(64px, 9vw, 128px)", fontWeight: 600, color: "var(--cream)", lineHeight: 0.95, letterSpacing: "-0.02em", marginBottom: 16 }}>
          {title}
        </h1>
        <p style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 22, color: "var(--gold)", marginBottom: 8 }}>
          {tagline}
        </p>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted-2)", letterSpacing: "0.24em" }}>
          {album.songs} {isPL ? "UTWORÓW" : "TRACKS"} · {album.era.toUpperCase()}
        </div>
      </div>

      {/* Track list */}
      {tracks.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {tracks.map((track, i) => {
            const trackTitle = isPL ? track.title.PL : track.title.EN;
            const subtitle   = isPL ? track.subtitle.PL : track.subtitle.EN;
            return (
              <Link
                key={track.id}
                href={`/${locale}#${track.id}`}
                style={{
                  display:         "flex",
                  alignItems:      "center",
                  gap:              24,
                  padding:         "20px 24px",
                  background:      "var(--bg-1)",
                  border:          "1px solid rgba(220,20,60,0.1)",
                  borderRadius:     4,
                  transition:      "border-color 200ms, background 200ms",
                }}
              >
                <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--gold)", fontWeight: 700, minWidth: 28 }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--muted-2)", minWidth: 48 }}>
                  {track.year}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 600, color: "var(--cream)", lineHeight: 1.2 }}>
                    {trackTitle}
                  </div>
                  <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 14, color: "var(--gold)", marginTop: 2 }}>
                    {subtitle}
                  </div>
                </div>
                {track.duration && (
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted-2)" }}>
                    {track.duration}
                  </span>
                )}
                <span style={{ color: "var(--muted)", fontSize: 14 }}>→</span>
              </Link>
            );
          })}
        </div>
      ) : (
        <p style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 20, color: "var(--muted)", textAlign: "center", padding: "60px 0" }}>
          {isPL ? "Tracklista wkrótce." : "Tracklist coming soon."}
        </p>
      )}
    </div>
  );
}
