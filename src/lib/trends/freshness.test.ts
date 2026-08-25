import { describe, expect, it } from "vitest";

import {
  computeFreshness,
  latestAcceptableCutoff,
  resolveFreshnessDisplayStatus,
} from "@/lib/trends/freshness";

describe("latestAcceptableCutoff", () => {
  const zone = "UTC";

  it("uses yesterday 09:00 when now is before 09:00 local", () => {
    const now = new Date("2024-06-15T08:59:00.000Z");
    const cutoff = latestAcceptableCutoff(now, zone);
    expect(cutoff.toISOString()).toBe("2024-06-14T09:00:00.000Z");
  });

  it("uses today 09:00 when now is exactly 09:00:00 local", () => {
    const now = new Date("2024-06-15T09:00:00.000Z");
    const cutoff = latestAcceptableCutoff(now, zone);
    expect(cutoff.toISOString()).toBe("2024-06-15T09:00:00.000Z");
  });

  it("uses today 09:00 when now is after 09:00 local", () => {
    const atOneSecond = new Date("2024-06-15T09:00:01.000Z");
    const afternoon = new Date("2024-06-15T15:30:00.000Z");

    expect(latestAcceptableCutoff(atOneSecond, zone).toISOString()).toBe(
      "2024-06-15T09:00:00.000Z"
    );
    expect(latestAcceptableCutoff(afternoon, zone).toISOString()).toBe(
      "2024-06-15T09:00:00.000Z"
    );
  });

  it("computes cutoff at local 09:00 for a DST timezone", () => {
    const zone = "America/New_York";

    const summerNow = new Date("2024-07-15T14:00:00.000Z");
    expect(latestAcceptableCutoff(summerNow, zone).toISOString()).toBe(
      "2024-07-15T13:00:00.000Z"
    );

    const winterNow = new Date("2024-01-15T15:00:00.000Z");
    expect(latestAcceptableCutoff(winterNow, zone).toISOString()).toBe(
      "2024-01-15T14:00:00.000Z"
    );

    const beforeCutoff = new Date("2024-07-15T12:59:00.000Z");
    expect(latestAcceptableCutoff(beforeCutoff, zone).toISOString()).toBe(
      "2024-07-14T13:00:00.000Z"
    );
  });
});

describe("computeFreshness", () => {
  const zone = "UTC";
  const now = new Date("2024-06-15T10:00:00.000Z");
  const latestCutoffISO = "2024-06-15T09:00:00.000Z";

  it("marks never-generated analysis as stale", () => {
    expect(computeFreshness({ lastSuccessAt: null, now, timeZone: zone })).toEqual({
      status: "stale",
      isStale: true,
      latestCutoffISO,
    });
  });

  it("is current when last success equals the cutoff and stale one second before", () => {
    const atCutoff = computeFreshness({
      lastSuccessAt: latestCutoffISO,
      now,
      timeZone: zone,
    });
    expect(atCutoff.status).toBe("current");
    expect(atCutoff.isStale).toBe(false);

    const oneSecondBefore = computeFreshness({
      lastSuccessAt: "2024-06-15T08:59:59.000Z",
      now,
      timeZone: zone,
    });
    expect(oneSecondBefore.status).toBe("stale");
    expect(oneSecondBefore.isStale).toBe(true);
  });

  it("keeps the persisted verdict when regeneration fails", () => {
    const lastSuccessAt = "2024-06-15T09:15:00.000Z";
    const beforeFailure = computeFreshness({ lastSuccessAt, now, timeZone: zone });
    const afterFailure = computeFreshness({ lastSuccessAt, now, timeZone: zone });

    expect(afterFailure).toEqual(beforeFailure);
    expect(afterFailure.status).toBe("current");
  });
});

describe("resolveFreshnessDisplayStatus", () => {
  const persistedCurrent = {
    status: "current" as const,
    isStale: false,
    latestCutoffISO: "2024-06-15T09:00:00.000Z",
  };
  const persistedStale = {
    status: "stale" as const,
    isStale: true,
    latestCutoffISO: "2024-06-15T09:00:00.000Z",
  };

  it("layers transient generating and generation_failed over persisted status", () => {
    expect(
      resolveFreshnessDisplayStatus(persistedCurrent, "generating")
    ).toBe("generating");
    expect(
      resolveFreshnessDisplayStatus(persistedStale, "generation_failed")
    ).toBe("generation_failed");
    expect(resolveFreshnessDisplayStatus(persistedCurrent, null)).toBe("current");
    expect(resolveFreshnessDisplayStatus(persistedStale, undefined)).toBe("stale");
  });
});
