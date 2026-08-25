interface ChartCaptionProps {
  id: string;
  children: string;
}

export function ChartCaption({ id, children }: ChartCaptionProps) {
  return (
    <p id={id} className="mt-2 text-sm leading-relaxed text-tl-muted">
      {children}
    </p>
  );
}
