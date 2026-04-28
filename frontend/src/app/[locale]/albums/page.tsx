// app/[locale]/albums/page.tsx — Albums grid
// Shows all albums from albums.json with status badge.
// Planned albums show countdown instead of cover art.
import { useTranslations } from "next-intl";
import AlbumCard from "@/components/AlbumCard";
import albums from "@/data/albums.json";

export default function AlbumsPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = useTranslations("albums");

  return (
    <div>
      <h1>{t("title")}</h1>
      <div>
        {albums.map((album) => (
          <AlbumCard key={album.id} album={album} locale={locale} />
        ))}
      </div>
    </div>
  );
}
