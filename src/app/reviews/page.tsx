export default function ReviewsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-900">Review Themes</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Future home for natural language analysis of reciprocal review
          comments.
        </p>
      </div>

      <section className="rounded-lg border border-dashed border-zinc-300 bg-white p-8">
        <h3 className="text-lg font-medium text-zinc-900">
          NLP analysis coming soon
        </h3>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600">
          This page will extract recurring themes from customer and provider
          reviews on the same booking — for example communication issues,
          punctuality, quality concerns, and positive reciprocation patterns.
        </p>
      </section>
    </div>
  );
}
