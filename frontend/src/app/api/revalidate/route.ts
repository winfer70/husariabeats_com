/**
 * app/api/revalidate/route.ts — On-demand ISR revalidation endpoint
 *
 * Called by n8n after a song release to immediately flush the Next.js ISR cache
 * for the affected pages. Without this, ISR pages refresh on their own schedule
 * (revalidate: 300s). This makes the site update within seconds of a release.
 *
 * Inputs:  POST body { secret: string, paths: string[] }
 *          - secret: must match REVALIDATE_SECRET env var
 *          - paths: array of Next.js paths to revalidate, e.g. ["/pl", "/pl/albums/godzina-w"]
 * Outputs: { revalidated: true, paths: string[] } on success
 *          { error: string } on failure (401 bad secret, 400 bad body)
 *
 * n8n usage: HTTP Request node → POST https://husariabeats.com/api/revalidate
 *   Headers: Content-Type: application/json
 *   Body: { "secret": "{{ $env.REVALIDATE_SECRET }}", "paths": ["/pl", "/en", "/pl/albums/{{ $json.song.album_slug }}", "/en/albums/{{ $json.song.album_slug }}"] }
 */

import { revalidatePath }    from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let body: { secret?: string; paths?: string[] };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate secret — prevents arbitrary cache poisoning
  const expectedSecret = process.env.REVALIDATE_SECRET;
  if (!expectedSecret || body.secret !== expectedSecret) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  // Validate paths array
  if (!Array.isArray(body.paths) || body.paths.length === 0) {
    return NextResponse.json({ error: "paths must be a non-empty array" }, { status: 400 });
  }

  // Revalidate each requested path
  // revalidatePath flushes the ISR cache for that route segment
  for (const p of body.paths) {
    revalidatePath(p);
  }

  return NextResponse.json({ revalidated: true, paths: body.paths });
}
