/**
 * Safe PostgREST `.or()` ILIKE filters for user-controlled search text.
 *
 * Values are always double-quoted so `,` `(` `)` cannot split clauses; embedded
 * `"` are escaped. ILIKE wildcard metacharacters `%`, `_`, and `\` are escaped
 * separately so user input stays literal inside the pattern.
 */

/** Escape SQL LIKE/ILIKE wildcard metacharacters in user text. */
export function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, (char) => `\\${char}`);
}

/** Wrap a PostgREST filter operand in quotes; escape embedded `"`. */
export function quotePostgrestFilterValue(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

/** Build a `%term%` ILIKE pattern from raw user search text. */
export function wrapIlikeSearchPattern(searchTerm: string): string {
  return `%${escapeIlikePattern(searchTerm)}%`;
}

/**
 * Build a PostgREST `.or()` filter: `field1.ilike."...",field2.ilike."..."`.
 * Each field gets the same quoted ILIKE pattern derived from `searchTerm`.
 */
export function buildIlikeOrFilter(
  fields: readonly string[],
  searchTerm: string
): string {
  const quotedPattern = quotePostgrestFilterValue(
    wrapIlikeSearchPattern(searchTerm)
  );
  return fields.map((field) => `${field}.ilike.${quotedPattern}`).join(",");
}

/**
 * Split a PostgREST `.or()` filter into top-level clauses, respecting quoted
 * operands. Exported for unit tests asserting injection-safe clause boundaries.
 */
export function splitPostgrestOrClauses(orFilter: string): string[] {
  const clauses: string[] = [];
  let current = "";
  let inQuotes = false;
  let escaped = false;

  for (const char of orFilter) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === "\\" && inQuotes) {
      current += char;
      escaped = true;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
      continue;
    }

    if (char === "," && !inQuotes) {
      clauses.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  if (current.length > 0) {
    clauses.push(current);
  }

  return clauses;
}
