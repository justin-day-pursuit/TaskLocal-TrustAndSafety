import type { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  explanation?: string;
  conclusions?: string;
  children: ReactNode;
}

export function ChartCard({
  title,
  explanation,
  conclusions,
  children,
}: ChartCardProps) {
  return (
    <section className="rounded-[10px] border border-tl-border bg-white p-6 shadow-sm">
      <h3 className="text-lg font-medium text-tl-text">{title}</h3>
      <div className="mt-4">{children}</div>
      {explanation ? (
        <p className="mt-4 text-sm text-tl-muted">{explanation}</p>
      ) : null}
      {conclusions ? (
        <p className="mt-2 text-sm font-medium text-tl-text">{conclusions}</p>
      ) : null}
    </section>
  );
}
