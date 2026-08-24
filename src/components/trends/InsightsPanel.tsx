import type { GeminiInsights } from "@/lib/trends/types";

interface InsightsPanelProps {
  insights: GeminiInsights;
  showChange: boolean;
}

function BulletList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-500">{empty}</p>;
  }

  return (
    <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-700">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function InsightsPanel({ insights, showChange }: InsightsPanelProps) {
  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-medium text-zinc-900">Executive brief</h3>
        <div className="mt-4 grid gap-6 lg:grid-cols-3">
          <div>
            <h4 className="text-sm font-semibold text-zinc-900">Going well</h4>
            <div className="mt-2">
              <BulletList
                items={insights.goingWell}
                empty="No strengths called out for this run."
              />
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-900">Still needs work</h4>
            <div className="mt-2">
              <BulletList
                items={insights.needsWork}
                empty="No issues called out for this run."
              />
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-900">Action plan</h4>
            <div className="mt-2">
              <BulletList
                items={insights.actionPlan}
                empty="No actions recommended for this run."
              />
            </div>
          </div>
        </div>
      </section>

      {showChange ? (
        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-medium text-zinc-900">
            What changed since last report
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            {insights.changeSinceLast.newReviewCount} new review
            {insights.changeSinceLast.newReviewCount === 1 ? "" : "s"} since the
            previous run.
          </p>
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <div>
              <h4 className="text-sm font-semibold text-zinc-900">Changes</h4>
              <div className="mt-2">
                <BulletList
                  items={insights.changeSinceLast.whatChanged}
                  empty="No material change described."
                />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-900">
                Emerging trends
              </h4>
              <div className="mt-2">
                <BulletList
                  items={insights.changeSinceLast.emergingTrends}
                  empty="No emerging trends described."
                />
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
