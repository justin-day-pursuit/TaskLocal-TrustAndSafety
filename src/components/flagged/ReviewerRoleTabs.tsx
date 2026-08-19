import Link from "next/link";

import type { ReviewerRole } from "@/lib/types/database";

export type ReviewerRoleFilter = "all" | ReviewerRole;

interface ReviewerRoleTabsProps {
  active: ReviewerRoleFilter;
}

const tabs: { id: ReviewerRoleFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "customer", label: "About providers" },
  { id: "provider", label: "About customers" },
];

export function ReviewerRoleTabs({ active }: ReviewerRoleTabsProps) {
  return (
    <div
      className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100 p-1"
      role="tablist"
      aria-label="Filter by review direction"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        const href =
          tab.id === "all" ? "/flagged" : `/flagged?role=${tab.id}`;

        return (
          <Link
            key={tab.id}
            href={href}
            role="tab"
            aria-selected={isActive}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

function parseReviewerRoleFilter(
  role: string | string[] | undefined
): ReviewerRoleFilter {
  const value = Array.isArray(role) ? role[0] : role;

  if (value === "customer" || value === "provider") {
    return value;
  }

  return "all";
}

export function reviewerRoleFromFilter(
  filter: ReviewerRoleFilter
): ReviewerRole | undefined {
  return filter === "all" ? undefined : filter;
}

export { parseReviewerRoleFilter };
