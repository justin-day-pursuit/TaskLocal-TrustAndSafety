interface PostgrestCapNoteProps {
  visible: boolean;
}

export function PostgrestCapNote({ visible }: PostgrestCapNoteProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      Results may be capped at 1,000 rows because a booking-side filter loaded
      the maximum PostgREST page. Narrow your search or filters for a complete
      view.
    </div>
  );
}
