/*
 * admin/src/components/SidebarNav.tsx
 *
 * Client component that renders the sidebar navigation links for the
 * HusariaBeats admin panel.  Must be a Client Component so it can read
 * the current pathname from next/navigation and apply the active class.
 *
 * Links: Queue (/queue), Songs (/songs), Voting (/voting), Settings (/settings).
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Navigation entry definition */
interface NavItem {
  href: string;
  label: string;
  icon: string;
}

/** Ordered list of top-level nav items shown in the sidebar */
const NAV_ITEMS: NavItem[] = [
  { href: "/queue",    label: "Release Queue", icon: "⏱" },
  { href: "/songs",    label: "Songs",         icon: "🎵" },
  { href: "/voting",   label: "Voting",        icon: "🗳" },
  { href: "/settings", label: "Settings",      icon: "⚙" },
];

/**
 * SidebarNav — renders anchor tags with active-state styling based on
 * the current Next.js pathname.
 *
 * @returns A <nav> element containing all admin panel links.
 */
export default function SidebarNav() {
  // usePathname returns the current URL path (e.g. "/queue")
  const pathname = usePathname();

  return (
    <nav className="sidebar-nav">
      <div className="sidebar-nav-label">Navigation</div>
      {NAV_ITEMS.map((item) => {
        // Mark as active when the pathname starts with the link href
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link${isActive ? " active" : ""}`}
          >
            <span aria-hidden="true" style={{ fontSize: "14px" }}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
