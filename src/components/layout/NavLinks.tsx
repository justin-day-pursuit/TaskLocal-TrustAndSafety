"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/reviews", label: "Reviews" },
  { href: "/analysis", label: "Analysis" },
] as const;

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export const NAV_ITEM_LABELS = NAV_ITEMS.map((item) => item.label);
export const NAV_ITEM_HREFS = NAV_ITEMS.map((item) => item.href);

/** Pure helper for Analysis nav stale attention (PRD §5.1); hidden while Analysis is active. */
export function shouldShowAnalysisStaleAttention(
  pathname: string,
  analysisStale: boolean
): boolean {
  return analysisStale && !isNavActive(pathname, "/analysis");
}

interface NavLinksProps {
  /** When true, show icon + text attention on the Analysis nav item (PRD §5.1). */
  analysisStale?: boolean;
}

export function NavLinks({ analysisStale = false }: NavLinksProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive = isNavActive(pathname, item.href);
        const showStaleAttention =
          item.href === "/analysis" &&
          shouldShowAnalysisStaleAttention(pathname, analysisStale);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            }`}
          >
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span>{item.label}</span>
              {showStaleAttention ? (
                <span className="inline-flex items-center gap-1 text-xs font-normal text-amber-900">
                  <span aria-hidden="true">!</span>
                  <span>Analysis due</span>
                </span>
              ) : null}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
