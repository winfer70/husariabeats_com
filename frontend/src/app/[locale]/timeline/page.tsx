/*
 * app/[locale]/timeline/page.tsx — Timeline page (server wrapper)
 *
 * Fetches released songs from the internal API with ISR (revalidate: 300s),
 * sorted by year_event ASC. Passes data to TimelineClientPage which handles
 * era filtering, parallax scroll, and expandable event cards.
 *
 * Inputs:  params.locale — from [locale] URL segment
 * Outputs: TimelineClientPage with songs data
 */

import TimelineClientPage from "../TimelineClientPage";

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
  const apiUrl = process.env.INTERNAL_API_URL ?? "http://api:8000";

  let songs = [];
  try {
    const res = await fetch(`${apiUrl}/api/songs?status=released`, {
      next: { revalidate: 300 },
    });
    if (res.ok) songs = await res.json();
  } catch {
    // API unavailable at build time — ISR will populate on first request
  }

  return <TimelineClientPage songs={songs} locale={locale} />;
}
