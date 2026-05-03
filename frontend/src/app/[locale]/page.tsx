/*
 * app/[locale]/page.tsx — Timeline home page (server wrapper)
 *
 * Fetches released songs from the API with ISR (revalidate: 300s).
 * Passes pre-sorted songs to TimelineClientPage which handles all
 * client-side interactivity (era filter, parallax, expand/collapse).
 *
 * Inputs:  params.locale — from [locale] URL segment
 * Outputs: TimelineClientPage with songs data
 */

import TimelineClientPage from "./TimelineClientPage";

/**
 * Server component — fetches songs from internal API and renders client page.
 *
 * @param params.locale - active locale ("pl" | "en")
 */
export default async function TimelinePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  // Use internal Docker network URL for server-side fetch (bypasses nginx/public proxy)
  const apiUrl = process.env.INTERNAL_API_URL ?? "http://api:8000";

  let songs = [];
  try {
    const res = await fetch(`${apiUrl}/api/songs?status=released`, {
      next: { revalidate: 300 },  // ISR: stale-while-revalidate every 5 min
    });
    if (res.ok) songs = await res.json();
  } catch {
    // API unavailable at build time — page renders empty; ISR will populate on first request
  }

  // Sort chronologically for timeline display (API returns year_event ASC, but ensure it)
  songs.sort(
    (a: { year_event: number | null }, b: { year_event: number | null }) =>
      (a.year_event ?? 0) - (b.year_event ?? 0),
  );

  return <TimelineClientPage songs={songs} locale={locale} />;
}
