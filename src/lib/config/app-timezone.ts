const DEFAULT_TIME_ZONE = "UTC";

/**
 * Returns a valid IANA timezone identifier, or `"UTC"` when input is unset,
 * empty, whitespace-only, or invalid (PRD §5.1).
 */
export function resolveAppTimeZone(raw?: string): string {
  const candidate = raw?.trim();
  if (!candidate) {
    return DEFAULT_TIME_ZONE;
  }

  if (!isValidIanaTimeZone(candidate)) {
    return DEFAULT_TIME_ZONE;
  }

  return candidate;
}

/** Reads `APP_TIME_ZONE` from the process environment with UTC fallback. */
export function getAppTimeZone(): string {
  return resolveAppTimeZone(process.env.APP_TIME_ZONE);
}

function isValidIanaTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}
