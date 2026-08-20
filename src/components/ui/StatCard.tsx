import Link from "next/link";

interface StatCardProps {
  label: string;
  value: number | string;
  description?: string;
  href?: string;
}

const cardClassName =
  "rounded-lg border border-zinc-200 bg-white p-5 shadow-sm";

const linkClassName = `${cardClassName} block transition-colors hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900`;

export function StatCard({ label, value, description, href }: StatCardProps) {
  const content = (
    <>
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-zinc-900">{value}</p>
      {description ? (
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={linkClassName}>
        {content}
      </Link>
    );
  }

  return <div className={cardClassName}>{content}</div>;
}
