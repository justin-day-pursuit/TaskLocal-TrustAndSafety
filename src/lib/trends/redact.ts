const REDACTED = "[redacted]";

/** Emails: local@domain.tld (including + and dots in local part). */
const EMAIL_RE =
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

/**
 * Phone numbers: international (+1 …), US dashed/spaced/parenthesized,
 * and similar digit groups with separators. Requires enough digits to
 * look like a phone (at least 7 digits total).
 */
const PHONE_RE =
  /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)\d{2,4}[\s.-]?\d{2,4}(?:[\s.-]?\d{1,4})?/g;

/** URLs with scheme, and bare domains like example.com/path. */
const URL_RE =
  /\b(?:https?:\/\/|www\.)[^\s<>"']+|(?:\b[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+\b(?:\/[^\s<>"']*)?)/gi;

/** @handles (Twitter/Instagram-style). */
const HANDLE_RE = /@[A-Za-z0-9_]{2,}/g;

/** Long digit runs (IDs, cards, SSN-like): 7+ consecutive digits. */
const LONG_DIGITS_RE = /\b\d{7,}\b/g;

function looksLikePhone(match: string): boolean {
  const trimmed = match.trim();
  // Avoid treating ISO-like dates (2026-04-01) as phone numbers.
  if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(trimmed)) {
    return false;
  }
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Remove structured identifiers from free text before analysis.
 * Replaces emails, phones, URLs/domains, @handles, and long digit runs
 * with a [redacted] token. Does not attempt to remove names in prose.
 */
export function redactFreeText(text: string): string {
  if (!text) {
    return text;
  }

  let result = text;
  result = result.replace(EMAIL_RE, REDACTED);
  result = result.replace(URL_RE, REDACTED);
  result = result.replace(HANDLE_RE, REDACTED);
  result = result.replace(PHONE_RE, (match) =>
    looksLikePhone(match) ? REDACTED : match
  );
  result = result.replace(LONG_DIGITS_RE, REDACTED);
  // Collapse runs of redacted tokens left by overlapping patterns.
  result = result.replace(/(?:\[redacted\]\s*){2,}/g, `${REDACTED} `);
  return result.replace(/\s{2,}/g, " ").trim();
}
