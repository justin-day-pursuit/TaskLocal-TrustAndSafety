import type {
  GeminiKeywordTheme,
  KeywordCount,
  KeywordThemeCategory,
} from "@/lib/trends/types";

export const WORD_CLOUD_LAYOUT = {
  size: 440,
  padding: 28,
  minFont: 13,
  maxFont: 32,
  charWidth: 0.62,
  lineHeight: 1.2,
  collisionEpsilon: 2,
  radiusStep: 6,
  minOutwardRadius: 48,
} as const;

export const CATEGORY_SECTORS: Record<
  KeywordThemeCategory,
  { start: number; end: number }
> = {
  praise: { start: 0, end: Math.PI / 2 },
  task: { start: Math.PI / 2, end: Math.PI },
  issue: { start: Math.PI, end: (3 * Math.PI) / 2 },
  sentiment: { start: (3 * Math.PI) / 2, end: Math.PI * 2 },
};

export interface CloudWordInput {
  term: string;
  count: number;
  category: KeywordThemeCategory;
}

export interface CloudWordBox {
  term: string;
  count: number;
  category: KeywordThemeCategory;
  x: number;
  y: number;
  fontSize: number;
  width: number;
  height: number;
  angle: number;
  radius: number;
}

export function measureWordBox(
  term: string,
  fontSize: number
): { width: number; height: number } {
  return {
    width: Math.max(term.length, 1) * fontSize * WORD_CLOUD_LAYOUT.charWidth,
    height: fontSize * WORD_CLOUD_LAYOUT.lineHeight,
  };
}

export function boxesOverlap(
  a: Pick<CloudWordBox, "x" | "y" | "width" | "height">,
  b: Pick<CloudWordBox, "x" | "y" | "width" | "height">,
  epsilon: number = WORD_CLOUD_LAYOUT.collisionEpsilon
): boolean {
  const overlapX = (a.width + b.width) / 2 - Math.abs(a.x - b.x);
  const overlapY = (a.height + b.height) / 2 - Math.abs(a.y - b.y);
  return overlapX > epsilon && overlapY > epsilon;
}

function localCountForTerm(
  term: string,
  counts: Map<string, number>
): number | null {
  const exact = counts.get(term.toLowerCase());
  if (exact !== undefined) {
    return exact;
  }

  const subtokens = term
    .toLowerCase()
    .split(/[\s-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  let max: number | null = null;
  for (const token of subtokens) {
    const count = counts.get(token);
    if (count !== undefined && (max === null || count > max)) {
      max = count;
    }
  }
  return max;
}

export function semanticCloudItems(
  themes: GeminiKeywordTheme[],
  topKeywords: KeywordCount[]
): CloudWordInput[] {
  const counts = new Map(
    topKeywords.map((item) => [item.term.toLowerCase(), item.count])
  );

  return themes.flatMap((theme) => {
    if (!theme.category || theme.term.trim().length === 0) {
      return [];
    }
    const count = localCountForTerm(theme.term, counts);
    if (count === null) {
      return [];
    }
    return [
      {
        term: theme.term,
        category: theme.category,
        count,
      },
    ];
  });
}

function fontSizeForCount(count: number, minCount: number, maxCount: number): number {
  if (maxCount <= minCount) {
    return (WORD_CLOUD_LAYOUT.minFont + WORD_CLOUD_LAYOUT.maxFont) / 2;
  }
  const t = (count - minCount) / (maxCount - minCount);
  return WORD_CLOUD_LAYOUT.minFont + t * (WORD_CLOUD_LAYOUT.maxFont - WORD_CLOUD_LAYOUT.minFont);
}

function radiusForCount(
  count: number,
  minCount: number,
  maxCount: number,
  maxRadius: number
): number {
  if (maxCount <= minCount) {
    return WORD_CLOUD_LAYOUT.minOutwardRadius + (maxRadius - WORD_CLOUD_LAYOUT.minOutwardRadius) * 0.4;
  }
  const t = (maxCount - count) / (maxCount - minCount);
  return WORD_CLOUD_LAYOUT.minOutwardRadius + t * (maxRadius - WORD_CLOUD_LAYOUT.minOutwardRadius);
}

function angleForCategory(
  category: KeywordThemeCategory,
  siblingIndex: number,
  siblingCount: number
): number {
  const { start, end } = CATEGORY_SECTORS[category];
  const span = end - start;
  const usable = span * 0.72;
  const pad = (span - usable) / 2;
  if (siblingCount <= 1) {
    return start + span / 2;
  }
  const t = siblingIndex / (siblingCount - 1);
  return start + pad + t * usable;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Largest radius along `angle` where the box stays inside the padded canvas. */
function maxRadiusOnCanvas(
  angle: number,
  width: number,
  height: number,
  size: number,
  padding: number
): number {
  const cx = size / 2;
  const cy = size / 2;
  const hw = width / 2;
  const hh = height / 2;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  let maxR = Number.POSITIVE_INFINITY;

  if (Math.abs(cos) > 1e-9) {
    maxR = Math.min(
      maxR,
      cos > 0
        ? (size - padding - hw - cx) / cos
        : (cx - padding - hw) / -cos
    );
  }
  if (Math.abs(sin) > 1e-9) {
    maxR = Math.min(
      maxR,
      sin > 0
        ? (size - padding - hh - cy) / sin
        : (cy - padding - hh) / -sin
    );
  }

  return Math.max(0, maxR);
}

function anglesToTry(
  category: KeywordThemeCategory,
  baseAngle: number
): number[] {
  const { start, end } = CATEGORY_SECTORS[category];
  const span = end - start;
  const edgePad = Math.min(0.04, span * 0.08);
  const lo = start + edgePad;
  const hi = end - edgePad;
  const deltas = [0];
  for (let i = 1; i <= 10; i += 1) {
    const d = span * 0.06 * i;
    deltas.push(d, -d);
  }

  const angles: number[] = [];
  for (const delta of deltas) {
    const angle = clamp(baseAngle + delta, lo, hi);
    if (!angles.some((existing) => Math.abs(existing - angle) < 1e-6)) {
      angles.push(angle);
    }
  }
  return angles;
}

export function layoutCircularWordCloud(
  items: CloudWordInput[],
  size: number = WORD_CLOUD_LAYOUT.size
): CloudWordBox[] {
  if (items.length === 0) {
    return [];
  }

  const sorted = [...items].sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return a.term.localeCompare(b.term);
  });

  const counts = sorted.map((item) => item.count);
  const maxCount = Math.max(...counts);
  const minCount = Math.min(...counts);
  const cx = size / 2;
  const cy = size / 2;
  const { padding } = WORD_CLOUD_LAYOUT;

  const outward = sorted.slice(1);
  const siblingIndex = new Map<KeywordThemeCategory, number>();
  const siblingCount: Record<KeywordThemeCategory, number> = {
    praise: 0,
    task: 0,
    issue: 0,
    sentiment: 0,
  };
  for (const item of outward) {
    siblingCount[item.category] += 1;
  }

  const placed: CloudWordBox[] = [];

  function overlapsAny(candidate: CloudWordBox): boolean {
    return placed.some((existing) => boxesOverlap(candidate, existing));
  }

  function placeAt(
    item: CloudWordInput,
    baseAngle: number,
    preferredRadius: number
  ): CloudWordBox | null {
    const baseFont = fontSizeForCount(item.count, minCount, maxCount);

    // Center glyph: always place at origin (nothing else is placed yet).
    if (preferredRadius === 0 && placed.length === 0) {
      const box = measureWordBox(item.term, baseFont);
      return {
        ...item,
        ...box,
        fontSize: baseFont,
        angle: baseAngle,
        radius: 0,
        x: cx,
        y: cy,
      };
    }

    const fontSizes: number[] = [baseFont];
    for (let shrink = 1; shrink <= 5; shrink += 1) {
      const next = baseFont - shrink * 2;
      if (next < 10) {
        break;
      }
      fontSizes.push(next);
    }

    const angles = anglesToTry(item.category, baseAngle);

    for (const fontSize of fontSizes) {
      const box = measureWordBox(item.term, fontSize);
      for (const angle of angles) {
        const maxR = maxRadiusOnCanvas(
          angle,
          box.width,
          box.height,
          size,
          padding
        );
        if (maxR <= 0) {
          continue;
        }

        const startRadius = Math.min(preferredRadius, maxR);
        // Search outward along the wedge ray, then inward.
        const radii: number[] = [];
        for (
          let r = startRadius;
          r <= maxR + 1e-9;
          r += WORD_CLOUD_LAYOUT.radiusStep
        ) {
          radii.push(Math.min(r, maxR));
        }
        for (
          let r = startRadius - WORD_CLOUD_LAYOUT.radiusStep;
          r >= WORD_CLOUD_LAYOUT.minOutwardRadius * 0.4;
          r -= WORD_CLOUD_LAYOUT.radiusStep
        ) {
          radii.push(r);
        }

        for (const radius of radii) {
          const candidate: CloudWordBox = {
            ...item,
            ...box,
            fontSize,
            angle,
            radius,
            x: cx + Math.cos(angle) * radius,
            y: cy + Math.sin(angle) * radius,
          };
          if (!overlapsAny(candidate)) {
            return candidate;
          }
        }
      }
    }

    // Last resort: omit rather than render an overlap.
    return null;
  }

  const center = sorted[0]!;
  const centerBox = placeAt(center, 0, 0);
  if (centerBox) {
    placed.push(centerBox);
  }

  const maxRadius = size / 2 - padding;
  for (const item of outward) {
    const index = siblingIndex.get(item.category) ?? 0;
    siblingIndex.set(item.category, index + 1);
    const angle = angleForCategory(
      item.category,
      index,
      siblingCount[item.category]
    );
    const radius = radiusForCount(item.count, minCount, maxCount, maxRadius);
    const box = placeAt(item, angle, radius);
    if (box) {
      placed.push(box);
    }
  }

  return placed;
}
