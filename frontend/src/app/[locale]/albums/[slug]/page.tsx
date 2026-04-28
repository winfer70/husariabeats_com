// app/[locale]/albums/[slug]/page.tsx — Single album detail
// Shows album cover, tracklist (songs filtered by albumSlug),
// and embedded YouTube players for each song.
import albums from "@/data/albums.json";
import songs from "@/data/songs.json";
import { notFound } from "next/navigation";

interface Props {
  params: { locale: string; slug: string };
}

export default function AlbumDetailPage({ params: { locale, slug } }: Props) {
  const album = albums.find((a) => a.slug === slug);
  if (!album) notFound();

  const trackList = songs.filter((s) => s.albumSlug === slug);

  return (
    <div>
      <h1>{locale === "pl" ? album.titlePL : album.titleEN}</h1>
      {/* TODO: replace with designed AlbumDetail component */}
      <ul>
        {trackList.map((s) => (
          <li key={s.id}>{locale === "pl" ? s.titlePL : s.titleEN}</li>
        ))}
      </ul>
    </div>
  );
}

// Static params for all album slugs
export function generateStaticParams() {
  return albums.map((a) => ({ slug: a.slug }));
}
