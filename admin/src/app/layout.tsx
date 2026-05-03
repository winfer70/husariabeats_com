/*
 * admin/src/app/layout.tsx
 *
 * Root layout for the HusariaBeats admin panel.
 * Renders the persistent sidebar navigation and wraps all page content.
 * Authentication is handled externally by Cloudflare Zero Trust Access —
 * no auth logic is needed here.
 *
 * Sidebar links: Queue, Songs, Voting, Settings.
 * Active link highlighting is driven by the current pathname via a
 * thin client component (SidebarNav) so the layout itself stays a
 * Server Component.
 */

import type { Metadata } from "next";
import "./globals.css";
import SidebarNav from "@/components/SidebarNav";

export const metadata: Metadata = {
  title: "HusariaBeats Admin",
  description: "Internal admin panel — protected by Cloudflare Zero Trust",
};

/**
 * RootLayout — wraps every page with the sidebar shell.
 *
 * @param children - Page content injected by Next.js App Router.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="admin-layout">
          {/* Fixed left sidebar with brand mark and navigation links */}
          <aside className="sidebar">
            <div className="sidebar-logo">
              <div className="logo-title">HusariaBeats</div>
              <div className="logo-sub">Admin Panel</div>
            </div>
            {/* Client component handles active-link detection */}
            <SidebarNav />
          </aside>

          {/* Primary content area — offset by sidebar width */}
          <main className="main-content">{children}</main>
        </div>
      </body>
    </html>
  );
}
