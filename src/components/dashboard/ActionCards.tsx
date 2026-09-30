"use client";

import { useRouter } from "next/navigation";

import { ActionCard } from "@/components/dashboard/ActionCard";
import { cardSignalForView } from "@/lib/dashboard/card-signals";
import {
  dashboardHref,
  mergeDashboardParams,
  type DashboardParams,
  type DashboardView,
} from "@/lib/dashboard/search-params";
import { toggleDashboardView } from "@/lib/dashboard/view-labels";

interface ActionCardsProps {
  params: DashboardParams;
  counts: {
    today: number | string;
    unhandled: number | string;
    highRisk: number | string;
  };
  countErrors: {
    today: boolean;
    unhandled: boolean;
    highRisk: boolean;
  };
  analysisStale: boolean;
  highRiskConfigured: boolean;
}

const CARDS: {
  view: DashboardView;
  label: string;
  description: string;
  iconLabel: string;
  countKey: keyof ActionCardsProps["counts"];
  errorKey: keyof ActionCardsProps["countErrors"];
}[] = [
  {
    view: "today",
    label: "New reports today",
    description: "Reported reviews created today in the app timezone",
    iconLabel: "Reports",
    countKey: "today",
    errorKey: "today",
  },
  {
    view: "unhandled",
    label: "Total unhandled reports",
    description: "Reported reviews not yet resolved",
    iconLabel: "Unresolved reports",
    countKey: "unhandled",
    errorKey: "unhandled",
  },
  {
    view: "highRisk",
    label: "High-risk case",
    description: "Reported reviews matching the latest high-risk analysis terms",
    iconLabel: "High risk",
    countKey: "highRisk",
    errorKey: "highRisk",
  },
];

export function ActionCards({
  params,
  counts,
  countErrors,
  analysisStale,
  highRiskConfigured,
}: ActionCardsProps) {
  const router = useRouter();

  function handleSelect(view: DashboardView) {
    const nextView = toggleDashboardView(params.view, view);
    const href = dashboardHref(
      mergeDashboardParams(params, { view: nextView, expanded: undefined })
    );
    router.push(href, { scroll: false });
  }

  return (
    <section aria-labelledby="dashboard-action-cards" className="space-y-3">
      <h3 id="dashboard-action-cards" className="sr-only">
        Action cards
      </h3>
      <div className="grid gap-4 md:grid-cols-3">
        {CARDS.map((card) => {
          const numericCount =
            typeof counts[card.countKey] === "number"
              ? (counts[card.countKey] as number)
              : 0;
          const signal = countErrors[card.errorKey]
            ? null
            : cardSignalForView(card.view, numericCount, {
                analysisStale,
                highRiskConfigured,
              });

          return (
            <ActionCard
              key={card.view}
              label={card.label}
              value={counts[card.countKey]}
              description={card.description}
              selected={params.view === card.view}
              signal={signal}
              iconLabel={card.iconLabel}
              onSelect={() => handleSelect(card.view)}
            />
          );
        })}
      </div>
    </section>
  );
}
