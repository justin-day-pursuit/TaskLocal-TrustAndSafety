import { beforeEach, describe, expect, it, vi } from "vitest";

const { revalidatePath, resolveReview } = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  resolveReview: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/queries/reviews", () => ({ resolveReview }));

import { resolveReviewAction } from "@/app/actions/resolveReview";

describe("resolveReviewAction", () => {
  beforeEach(() => {
    revalidatePath.mockClear();
    resolveReview.mockReset();
  });

  it("revalidates dashboard, reviews, and analysis paths after success", async () => {
    resolveReview.mockResolvedValue({
      data: { id: "rev_abc", handled: true },
      error: null,
      failureKind: null,
    });

    await resolveReviewAction("rev_abc");

    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/reviews");
    expect(revalidatePath).toHaveBeenCalledWith("/analysis");
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
});
