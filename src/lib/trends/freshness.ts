export type FreshnessPersistedStatus = "current" | "stale";

export type FreshnessTransientState = "generating" | "generation_failed";

export type FreshnessDisplayStatus =
  | FreshnessPersistedStatus
  | FreshnessTransientState;

export interface FreshnessResult {
  status: FreshnessPersistedStatus;
  isStale: boolean;
  latestCutoffISO: string;
}

interface ZonedDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const CUTOFF_HOUR = 9;

/**
 * Calendar cutoff for analysis freshness (PRD §5.1).
 * Before 09:00 local → yesterday 09:00; at or after 09:00 → today 09:00.
 */
export function latestAcceptableCutoff(now: Date, timeZone: string): Date {
  const local = getZonedDateParts(now, timeZone);
  const cutoffDay =
    local.hour < CUTOFF_HOUR
      ? subtractCalendarDays(local.year, local.month, local.day, 1)
      : { year: local.year, month: local.month, day: local.day };

  return zonedLocalDateTimeToUtc(
    {
      ...cutoffDay,
      hour: CUTOFF_HOUR,
      minute: 0,
      second: 0,
    },
    timeZone
  );
}

export function computeFreshness({
  lastSuccessAt,
  now,
  timeZone,
}: {
  lastSuccessAt: string | null;
  now: Date;
  timeZone: string;
}): FreshnessResult {
  const cutoff = latestAcceptableCutoff(now, timeZone);
  const latestCutoffISO = cutoff.toISOString();

  if (lastSuccessAt === null) {
    return {
      status: "stale",
      isStale: true,
      latestCutoffISO,
    };
  }

  const isStale = new Date(lastSuccessAt).getTime() < cutoff.getTime();

  return {
    status: isStale ? "stale" : "current",
    isStale,
    latestCutoffISO,
  };
}

/**
 * Layer transient pipeline states over persisted freshness without changing
 * `lastSuccessAt`. Callers pass the prior success timestamp to `computeFreshness`
 * even while generation is running or after a failure.
 */
export function resolveFreshnessDisplayStatus(
  persisted: FreshnessResult,
  transient: FreshnessTransientState | null | undefined
): FreshnessDisplayStatus {
  if (transient === "generating") {
    return "generating";
  }
  if (transient === "generation_failed") {
    return "generation_failed";
  }
  return persisted.status;
}

function getZonedDateParts(date: Date, timeZone: string): ZonedDateParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
}

function subtractCalendarDays(
  year: number,
  month: number,
  day: number,
  days: number
): Pick<ZonedDateParts, "year" | "month" | "day"> {
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() - days);
  return {
    year: utcDate.getUTCFullYear(),
    month: utcDate.getUTCMonth() + 1,
    day: utcDate.getUTCDate(),
  };
}

function zonedLocalDateTimeToUtc(
  local: ZonedDateParts,
  timeZone: string
): Date {
  const desiredUtcMs = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
    local.second
  );

  let guessMs = desiredUtcMs;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = getZonedDateParts(new Date(guessMs), timeZone);
    const actualUtcMs = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second
    );
    const deltaMs = desiredUtcMs - actualUtcMs;
    if (deltaMs === 0) {
      break;
    }
    guessMs += deltaMs;
  }

  return new Date(guessMs);
}
