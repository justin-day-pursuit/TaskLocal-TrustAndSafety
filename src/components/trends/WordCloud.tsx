import type { KeywordCount } from "@/lib/trends/types";

interface WordCloudProps {
  keywords: KeywordCount[];
}

export function WordCloud({ keywords }: WordCloudProps) {
  if (keywords.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No repeated comment keywords to display yet.
      </p>
    );
  }

  const maxCount = Math.max(...keywords.map((item) => item.count), 1);

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 rounded-md bg-zinc-50 px-4 py-6">
      {keywords.map((item) => {
        const weight = item.count / maxCount;
        const fontSize = 12 + weight * 22;
        const opacity = 0.55 + weight * 0.45;
        return (
          <span
            key={item.term}
            title={`${item.term}: ${item.count}`}
            className="font-medium text-zinc-900"
            style={{ fontSize: `${fontSize}px`, opacity }}
          >
            {item.term}
          </span>
        );
      })}
    </div>
  );
}
