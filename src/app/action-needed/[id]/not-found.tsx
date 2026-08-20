import Link from "next/link";

export default function FlaggedReviewNotFound() {
  return (
    <div className="space-y-4">
      <Link
        href="/action-needed"
        className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
      >
        ← Back to queue
      </Link>
      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
        <h2 className="text-lg font-medium text-zinc-900">Review not found</h2>
        <p className="mt-2 text-sm text-zinc-500">
          This review ID does not exist or is no longer available.
        </p>
      </div>
    </div>
  );
}
