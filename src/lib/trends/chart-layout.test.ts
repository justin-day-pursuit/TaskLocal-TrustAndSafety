import { describe, expect, it } from "vitest";

import {
  CHART_LAYOUT,
  getPlotRect,
  layoutBars,
  layoutLineXs,
  scaleMaxWithHeadroom,
  valueToY,
} from "@/lib/trends/chart-layout";

describe("chart layout", () => {
  it("caps bar width and insets bars from both plot edges for a sparse 2-category series", () => {
    const { bars, barWidth, plot } = layoutBars([3, 1]);

    expect(bars).toHaveLength(2);
    expect(barWidth).toBeLessThanOrEqual(48);
    expect(barWidth).toBeGreaterThanOrEqual(40);
    expect(bars[0]!.width).toBe(barWidth);
    expect(bars[1]!.width).toBe(barWidth);

    expect(bars[0]!.x).toBeGreaterThan(plot.padding.left);
    expect(bars[0]!.x).toBeGreaterThan(plot.plotLeft);
    expect(bars[1]!.x + bars[1]!.width).toBeLessThan(plot.plotRight);
    expect(bars[1]!.x + bars[1]!.width).toBeLessThan(
      plot.width - plot.padding.right
    );

    const gap = bars[1]!.x - (bars[0]!.x + bars[0]!.width);
    expect(gap).toBeGreaterThanOrEqual(CHART_LAYOUT.minGap);
  });

  it("adds y-axis headroom so the tallest bar does not touch the top of the plot", () => {
    const { bars, yMax, plot } = layoutBars([3, 1]);

    expect(yMax).toBeCloseTo(3 * (1 + CHART_LAYOUT.yHeadroom));
    expect(yMax).toBeGreaterThan(3);
    expect(bars[0]!.y).toBeGreaterThan(plot.plotTop);
    expect(bars[0]!.y + bars[0]!.height).toBeCloseTo(
      plot.plotTop + plot.innerHeight
    );
  });

  it("centers each bar in its band", () => {
    const { bars, bandWidth, plot } = layoutBars([2, 4]);
    const firstBandCenter = plot.plotLeft + bandWidth / 2;
    const secondBandCenter = plot.plotLeft + bandWidth + bandWidth / 2;

    expect(bars[0]!.x + bars[0]!.width / 2).toBeCloseTo(firstBandCenter);
    expect(bars[1]!.x + bars[1]!.width / 2).toBeCloseTo(secondBandCenter);
  });

  it("does not inflate an explicit 1–5 rating domain", () => {
    expect(scaleMaxWithHeadroom(5)).toBeCloseTo(5 * (1 + CHART_LAYOUT.yHeadroom));

    const plot = getPlotRect();
    const top = valueToY(5, 1, 5, plot);
    const bottom = valueToY(1, 1, 5, plot);

    expect(top).toBeCloseTo(plot.plotTop);
    expect(bottom).toBeCloseTo(plot.plotTop + plot.innerHeight);
  });

  it("insets line points from both plot edges when there are two categories", () => {
    const plot = getPlotRect();
    const xs = layoutLineXs(2, plot);

    expect(xs).toHaveLength(2);
    expect(xs[0]).toBe(plot.plotLeft);
    expect(xs[1]).toBe(plot.plotRight);
    expect(xs[0]).toBeGreaterThan(plot.padding.left);
    expect(xs[1]).toBeLessThan(plot.width - plot.padding.right);
  });
});
