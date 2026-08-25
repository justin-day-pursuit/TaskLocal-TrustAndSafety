export const CHART_LAYOUT = {
  width: 640,
  height: 240,
  padding: { top: 20, right: 16, bottom: 48, left: 64 },
  yAxisTitleX: 12,
  plotInsetX: 24,
  maxBarWidth: 44,
  minGap: 16,
  yHeadroom: 0.18,
  barRadius: 8,
} as const;

export const CHART_COLORS = {
  bar: "#6d28d9",
  line: "#aa3bff",
  text: "#1a1825",
  muted: "#6b6375",
  grid: "#e5e4e7",
  surface: "#f6f5f8",
} as const;

export type PlotRect = {
  width: number;
  height: number;
  padding: (typeof CHART_LAYOUT)["padding"];
  innerWidth: number;
  innerHeight: number;
  plotLeft: number;
  plotWidth: number;
  plotRight: number;
  plotTop: number;
};

export type LaidOutBar = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function getPlotRect(
  overrides: Partial<{
    width: number;
    height: number;
    plotInsetX: number;
  }> = {}
): PlotRect {
  const width = overrides.width ?? CHART_LAYOUT.width;
  const height = overrides.height ?? CHART_LAYOUT.height;
  const plotInsetX = overrides.plotInsetX ?? CHART_LAYOUT.plotInsetX;
  const { padding } = CHART_LAYOUT;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const plotLeft = padding.left + plotInsetX;
  const plotWidth = Math.max(innerWidth - plotInsetX * 2, 0);
  const plotRight = plotLeft + plotWidth;

  return {
    width,
    height,
    padding,
    innerWidth,
    innerHeight,
    plotLeft,
    plotWidth,
    plotRight,
    plotTop: padding.top,
  };
}

export function scaleMaxWithHeadroom(
  dataMax: number,
  headroom: number = CHART_LAYOUT.yHeadroom
): number {
  const baseline = Math.max(dataMax, 0);
  if (baseline === 0) {
    return 1;
  }
  return baseline * (1 + headroom);
}

const COUNT_STEP_CANDIDATES = [1, 2, 2.5, 5, 10] as const;
const INTEGER_COUNT_STEP_CANDIDATES = [1, 2, 4, 5, 6, 8, 10] as const;

function niceCountStep(roughStep: number, integerTicks: boolean): number {
  if (roughStep <= 0) {
    return 1;
  }
  const exp = Math.floor(Math.log10(roughStep));
  const magnitude = 10 ** exp;
  const normalized = roughStep / magnitude;
  const candidates = integerTicks ? INTEGER_COUNT_STEP_CANDIDATES : COUNT_STEP_CANDIDATES;
  const nice = candidates.find((value) => normalized <= value) ?? 10;
  const step = nice * magnitude;
  return integerTicks ? Math.max(step, 1) : step;
}

export function niceCountScale(
  dataMax: number,
  headroom: number = CHART_LAYOUT.yHeadroom
): { yMax: number; ticks: number[] } {
  const baseline = Math.max(dataMax, 0);
  if (baseline === 0) {
    return { yMax: 1, ticks: [0, 1] };
  }

  const target = baseline * (1 + headroom);
  const integerTicks = baseline >= 2;
  const step = niceCountStep(target / 2, integerTicks);
  const intervals = Math.max(1, Math.ceil(target / step - 1e-9));
  const yMax = intervals * step;
  const ticks = Array.from({ length: intervals + 1 }, (_, index) =>
    Number((index * step).toPrecision(12))
  );
  return { yMax, ticks };
}

export function niceCountMax(
  dataMax: number,
  headroom: number = CHART_LAYOUT.yHeadroom
): number {
  return niceCountScale(dataMax, headroom).yMax;
}

export function formatChartCount(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }

  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);

  const compact = (n: number, suffix: string) => {
    const rounded = Math.round(n * 10) / 10;
    const body = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    return `${sign}${body}${suffix}`;
  };

  if (abs >= 1_000_000_000) {
    return compact(abs / 1_000_000_000, "B");
  }
  if (abs >= 1_000_000) {
    return compact(abs / 1_000_000, "M");
  }
  if (abs >= 1_000) {
    return compact(abs / 1_000, "K");
  }

  const nearestInt = Math.round(abs);
  if (Math.abs(abs - nearestInt) < 1e-6) {
    return `${sign}${nearestInt}`;
  }

  return `${sign}${(Math.round(abs * 10) / 10).toFixed(1)}`;
}

export function formatChartCountExact(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return Math.round(value).toLocaleString("en-US");
}

export function layoutBars(
  values: number[],
  options: Partial<{
    width: number;
    height: number;
    plotInsetX: number;
    maxBarWidth: number;
    minGap: number;
    yHeadroom: number;
  }> = {}
): {
  yMax: number;
  ticks: number[];
  barWidth: number;
  bandWidth: number;
  plot: PlotRect;
  bars: LaidOutBar[];
} {
  const plot = getPlotRect(options);
  const maxBarWidth = options.maxBarWidth ?? CHART_LAYOUT.maxBarWidth;
  const minGap = options.minGap ?? CHART_LAYOUT.minGap;
  const dataMax = values.length === 0 ? 0 : Math.max(...values, 0);
  const { yMax, ticks } = niceCountScale(dataMax, options.yHeadroom);
  const count = values.length;

  if (count === 0 || plot.plotWidth <= 0) {
    return { yMax, ticks, barWidth: 0, bandWidth: 0, plot, bars: [] };
  }

  const bandWidth = plot.plotWidth / count;
  const barWidth = Math.min(maxBarWidth, Math.max(2, bandWidth - minGap));

  const bars = values.map((value) => {
    const height = yMax <= 0 ? 0 : (value / yMax) * plot.innerHeight;
    const y = plot.plotTop + plot.innerHeight - height;
    return { x: 0, y, width: barWidth, height };
  });

  for (let index = 0; index < count; index += 1) {
    const bandStart = plot.plotLeft + index * bandWidth;
    bars[index]!.x = bandStart + (bandWidth - barWidth) / 2;
  }

  return { yMax, ticks, barWidth, bandWidth, plot, bars };
}

export function layoutLineXs(count: number, plot: PlotRect = getPlotRect()): number[] {
  if (count <= 0) {
    return [];
  }
  if (count === 1) {
    return [plot.plotLeft + plot.plotWidth / 2];
  }
  return Array.from(
    { length: count },
    (_, index) => plot.plotLeft + (index / (count - 1)) * plot.plotWidth
  );
}

export function valueToY(
  value: number,
  yMin: number,
  yMax: number,
  plot: PlotRect = getPlotRect()
): number {
  const range = Math.max(yMax - yMin, 0.1);
  return plot.plotTop + plot.innerHeight - ((value - yMin) / range) * plot.innerHeight;
}
