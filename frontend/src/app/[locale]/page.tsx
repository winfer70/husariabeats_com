// app/[locale]/page.tsx — Timeline home page
// Renders chronological song entries from songs.json.
// Each entry shows: year, title (locale), YouTube embed, summary.
import { useTranslations } from "next-intl";
import TimelineEntry from "@/components/TimelineEntry";
import songs from "@/data/songs.json";

export default function TimelinePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = useTranslations("home");

  return (
    <div>
      <h1>{t("title")}</h1>
      <p>{t("subtitle")}</p>
      <section>
        {songs.map((song) => (
          <TimelineEntry key={song.id} song={song} locale={locale} />
        ))}
      </section>
    </div>
  );
}
