import { describe, expect, it } from "vitest";

import {
  buildIlikeOrFilter,
  escapeIlikePattern,
  quotePostgrestFilterValue,
  splitPostgrestOrClauses,
  wrapIlikeSearchPattern,
} from "@/lib/postgrest/ilike-or-filter";

describe("escapeIlikePattern", () => {
  it("escapes ILIKE wildcard metacharacters", () => {
    expect(escapeIlikePattern("50% off")).toBe("50\\% off");
    expect(escapeIlikePattern("a_b")).toBe("a\\_b");
    expect(escapeIlikePattern("path\\to")).toBe("path\\\\to");
  });
});

describe("quotePostgrestFilterValue", () => {
  it("wraps values in double quotes and escapes embedded quotes", () => {
    expect(quotePostgrestFilterValue("plain")).toBe('"plain"');
    expect(quotePostgrestFilterValue('a"b')).toBe('"a\\"b"');
  });
});

describe("wrapIlikeSearchPattern", () => {
  it("wraps escaped user text with % wildcards", () => {
    expect(wrapIlikeSearchPattern("50%")).toBe("%50\\%%");
  });
});

describe("buildIlikeOrFilter", () => {
  const reviewFields = ["id", "bookingId"] as const;
  const bookingFields = [
    "id",
    "listingId",
    "customerId",
    "providerId",
  ] as const;

  it("quotes patterns so commas cannot inject extra OR clauses", () => {
    const payload = "foo,bookingId.eq.evil";
    const filter = buildIlikeOrFilter(reviewFields, payload);

    expect(filter).toBe(
      'id.ilike."%foo,bookingId.eq.evil%",bookingId.ilike."%foo,bookingId.eq.evil%"'
    );
    expect(splitPostgrestOrClauses(filter)).toHaveLength(reviewFields.length);
    for (const clause of splitPostgrestOrClauses(filter)) {
      expect(clause).toMatch(/^[\w.]+\.ilike\."%.*%"$/);
    }
  });

  it("quotes patterns so parentheses cannot inject extra OR clauses", () => {
    const payload = "foo)or(id.eq.evil";
    const filter = buildIlikeOrFilter(bookingFields, payload);

    expect(splitPostgrestOrClauses(filter)).toHaveLength(bookingFields.length);
    expect(filter).toContain('"%foo)or(id.eq.evil%"');
  });

  it("escapes embedded double quotes inside quoted ILIKE operands", () => {
    const payload = 'foo",id.eq.evil';
    const filter = buildIlikeOrFilter(reviewFields, payload);

    expect(filter).toBe(
      'id.ilike."%foo\\",id.eq.evil%",bookingId.ilike."%foo\\",id.eq.evil%"'
    );
    expect(splitPostgrestOrClauses(filter)).toHaveLength(reviewFields.length);
  });

  it("preserves ILIKE wildcard escaping inside quoted operands", () => {
    const filter = buildIlikeOrFilter(reviewFields, "50%_\\");

    expect(filter).toBe(
      'id.ilike."%50\\%\\_\\\\%",bookingId.ilike."%50\\%\\_\\\\%"'
    );
    expect(splitPostgrestOrClauses(filter)).toHaveLength(reviewFields.length);
  });

  it("produces one ilike clause per requested field", () => {
    const filter = buildIlikeOrFilter(bookingFields, "rev-123");
    const clauses = splitPostgrestOrClauses(filter);

    expect(clauses).toEqual([
      'id.ilike."%rev-123%"',
      'listingId.ilike."%rev-123%"',
      'customerId.ilike."%rev-123%"',
      'providerId.ilike."%rev-123%"',
    ]);
  });
});

describe("splitPostgrestOrClauses", () => {
  it("does not split on commas inside quoted operands", () => {
    expect(
      splitPostgrestOrClauses('a.ilike."x,y",b.ilike."x,y"')
    ).toEqual(['a.ilike."x,y"', 'b.ilike."x,y"']);
  });
});
