// components/TimelineEntry.tsx — Single song card in the timeline
// Alternates layout left/right based on index (handled by parent CSS).
//
// Props:
//   song:   Song object from songs.json
//   locale: "pl" | "en"
"use client";

interface Song {
  id:         string;
  slug:       string;
  titlePL:    string;
  titleEN:    string;
  yearEvent:  number;
  era:        string;
  youtubeIdPL: string;
  youtubeIdEN: string;
  imagePath:  string;
  summaryPL:  string;
  summaryEN:  string;
  albumSlug:  string;
}

interface Props {
  song:   Song;
  locale: string;
}

/**
 * Timeline card: year badge, title, YouTube embed, summary text.
 * YouTube src switches based on locale (PL vs EN video ID).
 */
export default function TimelineEntry({ song, locale }: Props) {
  const isPL     = locale === "pl";
  const title    = isPL ? song.titlePL    : song.titleEN;
  const summary  = isPL ? song.summaryPL  : song.summaryEN;
  const ytId     = isPL ? song.youtubeIdPL : song.youtubeIdEN;

  return (
    <article>
      <span>{song.yearEvent}</span>
      <h2>{title}</h2>
      <iframe
        src={`https://www.youtube.com/embed/${ytId}`}
        title={title}
        allowFullScreen
        loading="lazy"
      />
      <p>{summary}</p>
    </article>
  );
}
