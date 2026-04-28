// components/NavBar.tsx — Sticky top navigation with language toggle
// Props:
//   locale: string — current locale ("pl" | "en")
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

interface NavBarProps {
  locale: string;
}

/**
 * Sticky navigation bar with locale-aware links and PL/EN toggle.
 * Active link determined by current pathname.
 */
export default function NavBar({ locale }: NavBarProps) {
  const t        = useTranslations("nav");
  const pathname = usePathname();

  const otherLocale = locale === "pl" ? "en" : "pl";
  // Swap locale prefix in pathname for language toggle
  const toggleHref  = pathname.replace(`/${locale}`, `/${otherLocale}`);

  const links = [
    { href: `/${locale}`,        label: t("timeline") },
    { href: `/${locale}/albums`, label: t("albums")   },
    { href: `/${locale}/next`,   label: t("next")     },
    { href: `/${locale}/about`,  label: t("about")    },
  ];

  return (
    <nav>
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
      <Link href={toggleHref}>{otherLocale.toUpperCase()}</Link>
    </nav>
  );
}
