/*
 * admin/src/app/page.tsx
 *
 * Root index route for the HusariaBeats admin panel.
 * Immediately redirects the browser to /queue, which is the default
 * landing page for the admin UI.
 */

import { redirect } from "next/navigation";

/**
 * Home — performs a server-side redirect to the Queue management page.
 * No content is ever rendered at the root path.
 */
export default function Home() {
  redirect("/queue");
}
