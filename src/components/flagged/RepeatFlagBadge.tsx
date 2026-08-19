interface RepeatFlagBadgeProps {
  count: number;
}

export function RepeatFlagBadge({ count }: RepeatFlagBadgeProps) {
  const totalFlags = count + 1;
  const isRepeat = count > 0;

  return (
    <span
      className={`inline-flex min-w-[1.75rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
        isRepeat
          ? "bg-amber-100 text-amber-800"
          : "bg-zinc-100 text-zinc-600"
      }`}
      title={
        isRepeat
          ? `${totalFlags} open flags against this party`
          : "First open flag against this party"
      }
    >
      {totalFlags}
    </span>
  );
}
