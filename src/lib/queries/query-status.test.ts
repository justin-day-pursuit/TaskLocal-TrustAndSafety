import { describe, expect, it } from "vitest";

import {
  classifyQueryFailure,
  copyForFailure,
  httpStatusForQueryFailure,
  isTimeoutFailure,
  QUERY_COPY,
  toQueryFailure,
  withTimeout,
} from "@/lib/queries/query-status";

describe("classifyQueryFailure", () => {
  it("classifies AbortError as timeout", () => {
    const error = new Error("The user aborted a request.");
    error.name = "AbortError";

    expect(isTimeoutFailure(error)).toBe(true);
    expect(classifyQueryFailure(error)).toEqual({
      kind: "timeout",
      message: "The user aborted a request.",
    });
  });

  it("classifies TimeoutError as timeout", () => {
    const error = new Error("The operation timed out.");
    error.name = "TimeoutError";

    expect(classifyQueryFailure(error).kind).toBe("timeout");
  });

  it("classifies timeout wording in a string as timeout", () => {
    expect(classifyQueryFailure("The request timed out while loading reviews").kind).toBe(
      "timeout"
    );
  });

  it("classifies generic errors as error", () => {
    expect(classifyQueryFailure("permission denied")).toEqual({
      kind: "error",
      message: "permission denied",
    });
    expect(isTimeoutFailure("Review not found")).toBe(false);
  });

  it("uses fallback when the error has no message", () => {
    expect(toQueryFailure({}, "Failed to load reviews")).toEqual({
      error: "Request failed.",
      failureKind: "error",
    });
  });
});

describe("httpStatusForQueryFailure", () => {
  it("returns 504 for timeout and 500 otherwise", () => {
    expect(httpStatusForQueryFailure("timeout")).toBe(504);
    expect(httpStatusForQueryFailure("error")).toBe(500);
    expect(httpStatusForQueryFailure(null)).toBe(500);
  });
});

describe("copyForFailure", () => {
  it("returns timeout vs error copy for a call", () => {
    expect(copyForFailure("reviewsCatalog", "timeout")).toBe(
      QUERY_COPY.reviewsCatalog.timeout
    );
    expect(copyForFailure("reviewsCatalog", "error")).toBe(
      QUERY_COPY.reviewsCatalog.error
    );
  });
});

describe("withTimeout", () => {
  it("rejects with TimeoutError when the promise is too slow", async () => {
    await expect(
      withTimeout(new Promise(() => undefined), 10)
    ).rejects.toMatchObject({ name: "TimeoutError" });
  });

  it("resolves when the promise finishes in time", async () => {
    await expect(withTimeout(Promise.resolve("ok"), 1_000)).resolves.toBe("ok");
  });
});
