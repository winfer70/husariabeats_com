// components/AlbumCard.tsx — Album grid card
// Shows cover art + title for released albums.
// Shows countdown to releaseDate for planned albums.
//
// Props:
//   album:  Album object from albums.json
//   locale: "pl" | "en"
"use client";

import Link from "next/link";

interface Album {
  id:          string;
  slug:        string;
  titlePL:     string;
  titleEN:     string;
  coverImage:  string | null;
  status:      "released" | "in_production" | "planned";
  releaseDate: string | null;  // ISO date string for planned albums
}

interface Props {
  album:  Album;
  locale: string;
}

/**
 * Album card for grid layout.
 * Planned albums display countdown instead of cover image.
 */
export default function AlbumCard({ album, locale }: Props) {
  const title = locale === "pl" ? album.titlePL : album.titleEN;

  return (
    <Link href={`/${locale}/albums/${album.slug}`}>
      <article>
        {album.status === "planned" && album.releaseDate ? (
          <div>
            {/* TODO: swap with CountdownTimer component */}
            <span>Coming {album.releaseDate}</span>
          </div>
        ) : (
          album.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={album.coverImage} alt={title} />
          )
        )}
        <h3>{title}</h3>
        <span>{album.status}</span>
      </article>
    </Link>
  );
}
