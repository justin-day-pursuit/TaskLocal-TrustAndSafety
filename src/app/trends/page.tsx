export default function TrendsPage() {
  const placeholders = [
    {
      title: "Flag Trends",
      description:
        "Track how many reviews are flagged over time and by category.",
    },
    {
      title: "Review Volume",
      description:
        "Monitor review activity across bookings, providers, and customers.",
    },
    {
      title: "Sentiment Trends",
      description:
        "Surface shifts in average ratings and negative review patterns.",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-900">Trends</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Placeholder sections for future charts and analytics.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {placeholders.map((item) => (
          <section
            key={item.title}
            className="rounded-lg border border-dashed border-zinc-300 bg-white p-6"
          >
            <h3 className="text-lg font-medium text-zinc-900">{item.title}</h3>
            <p className="mt-2 text-sm text-zinc-500">{item.description}</p>
            <div className="mt-6 h-32 rounded-md bg-zinc-50" />
          </section>
        ))}
      </div>
    </div>
  );
}
