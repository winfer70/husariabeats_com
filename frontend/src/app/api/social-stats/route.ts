/*
 * app/api/social-stats/route.ts — Live social platform stats endpoint
 *
 * Fetches live counts from:
 *   - YouTube Data API v3  (subscriber count — YOUTUBE_API_KEY)
 *   - Spotify Web API      (follower count  — SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET)
 * Reads env vars for platforms without direct API access:
 *   - NEXT_PUBLIC_STATS_INSTAGRAM, NEXT_PUBLIC_STATS_TIKTOK, NEXT_PUBLIC_STATS_FACEBOOK
 *
 * Response is cached for 1 hour via Next.js fetch revalidation.
 * All failures are silent — falls back to empty string so UI hides the count.
 */

import { NextResponse } from "next/server";

/* Force dynamic execution — route calls external APIs, must not be statically cached */
export const dynamic = "force-dynamic";

const YT_CHANNEL_ID    = "UC2PnrumRbzKoDu3dnrR08rA";
const SPOTIFY_ARTIST_ID = "0iTZ9rwsAATUClWjynjF0r";

/**
 * Exchange Spotify client credentials for a bearer token.
 * Uses Client Credentials flow — no user login required.
 * @param clientId     - Spotify app client ID
 * @param clientSecret - Spotify app client secret
 * @returns access_token string
 */
async function getSpotifyToken(clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method:  "POST",
    headers: {
      "Content-Type":  "application/x-www-form-urlencoded",
      "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  const data = await res.json();
  return data.access_token as string;
}

/**
 * Format a raw integer count into a compact human-readable string.
 * @param n - raw count
 * @returns e.g. "1.2M", "412K", "842"
 */
function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${Math.round(n / 1_000)}K`;
  return String(n);
}

/**
 * GET /api/social-stats
 * Returns { youtube, spotify, instagram, tiktok, facebook } counts as strings.
 * Empty string means count unavailable — UI should hide the stat.
 */
export async function GET() {
  const stats: Record<string, string> = {
    youtube:   "",
    spotify:   "",
    instagram: process.env.NEXT_PUBLIC_STATS_INSTAGRAM ?? "",
    tiktok:    process.env.NEXT_PUBLIC_STATS_TIKTOK    ?? "",
    facebook:  process.env.NEXT_PUBLIC_STATS_FACEBOOK  ?? "",
  };

  /* ── YouTube ─────────────────────────────────────────────────────────────── */
  try {
    const key = process.env.YOUTUBE_API_KEY;
    if (key) {
      const res  = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${YT_CHANNEL_ID}&key=${key}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      const raw  = data?.items?.[0]?.statistics?.subscriberCount;
      if (raw) stats.youtube = formatCount(parseInt(raw, 10));
    }
  } catch { /* silent fallback */ }

  /* ── Spotify ─────────────────────────────────────────────────────────────── */
  try {
    const clientId     = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    if (clientId && clientSecret) {
      const token = await getSpotifyToken(clientId, clientSecret);
      const res   = await fetch(
        `https://api.spotify.com/v1/artists/${SPOTIFY_ARTIST_ID}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache:   "no-store",
        }
      );
      const data = await res.json();
      /* followers.total may be absent on limited Client Credentials response */
      if (data?.followers?.total != null) stats.spotify = formatCount(data.followers.total);
    }
  } catch { /* silent fallback */ }

  return NextResponse.json(stats, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600" },
  });
}
