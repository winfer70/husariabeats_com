/*
 * app/[locale]/albums/page.tsx — Albums grid (server wrapper)
 *
 * Fetches all albums from the API with ISR (revalidate: 300s).
 * Passes data to AlbumsClientPage which handles hover state and countdowns.
 *
 * Inputs:  params.locale — from [locale] URL segment
 * Outputs: AlbumsClientPage with albums data
 */

import AlbumsClientPage from "./AlbumsClientPage";

/**
 * Server component — fetches albums from internal API and renders client page.
 *
 * @param params.locale - active locale ("pl" | "en")
 */
export default async function AlbumsPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const apiUrl = process.env.INTERNAL_API_URL ?? "http://api:8000";

  let albums = [];
  try {
    const res = await fetch(`${apiUrl}/api/albums`, {
      next: { revalidate: 300 },
    });
    if (res.ok) albums = await res.json();
  } catch {
    // API unavailable at build time — ISR will populate on first request
  }

  return <AlbumsClientPage albums={albums} locale={locale} />;
}
