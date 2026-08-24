import { beforeEach, describe, expect, it, vi } from "vitest";

const { revalidatePath, resolveReview } = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  resolveReview: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/queries/reviews", () => ({ resolveReview }));

import { resolveReviewAction } from "@/app/action-needed/actions";

describe("resolveReviewAction", () => {
  beforeEach(() => {
    revalidatePath.mockClear();
    resolveReview.mockReset();
  });

  it("revalidates dashboard, action-needed, reviews, and flagged alias paths", async () => {
    resolveReview.mockResolvedValue({
      data: { id: "rev_abc", handled: true },
      error: null,
      failureKind: null,
    });

    await resolveReviewAction("rev_abc");

    expect(revalidatePath).toHaveBeenCalledTimes(6);
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/action-needed");
    expect(revalidatePath).toHaveBeenCalledWith("/action-needed/rev_abc");
    expect(revalidatePath).toHaveBeenCalledWith("/reviews");
    expect(revalidatePath).toHaveBeenCalledWith("/flagged");
    expect(revalidatePath).toHaveBeenCalledWith("/flagged/rev_abc");
  });

  it("skips revalidation when resolve returns an error", async () => {
    resolveReview.mockResolvedValue({
      data: null,
      error: "db error",
      failureKind: "error",
    });

    const result = await resolveReviewAction("rev_missing");

    expect(result).toEqual({ error: "db error", failureKind: "error" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("passes through a timeout failure kind", async () => {
    resolveReview.mockResolvedValue({
      data: null,
      error: "The operation timed out.",
      failureKind: "timeout",
    });

    const result = await resolveReviewAction("rev_slow");

    expect(result).toEqual({
      error: "The operation timed out.",
      failureKind: "timeout",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
