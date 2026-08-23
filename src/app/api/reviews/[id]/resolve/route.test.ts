import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { revalidatePath, resolveReview } = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  resolveReview: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/queries/reviews", () => ({ resolveReview }));

import { POST } from "@/app/api/reviews/[id]/resolve/route";

const SECRET = "test-dashboard-api-secret";
const originalSecret = process.env.DASHBOARD_API_SECRET;

function authorizedRequest(url: string): Request {
  return new Request(url, {
    method: "POST",
    headers: { authorization: `Bearer ${SECRET}` },
  });
}

describe("POST /api/reviews/[id]/resolve", () => {
  beforeEach(() => {
    process.env.DASHBOARD_API_SECRET = SECRET;
    revalidatePath.mockClear();
    resolveReview.mockReset();
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.DASHBOARD_API_SECRET;
    } else {
      process.env.DASHBOARD_API_SECRET = originalSecret;
    }
  });

  it("rejects callers without a valid bearer token before writing", async () => {
    const response = await POST(
      new Request("http://localhost/api/reviews/rev_abc/resolve", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "rev_abc" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ data: null, error: "Unauthorized" });
    expect(resolveReview).not.toHaveBeenCalled();
  });

  it("marks the review handled and revalidates list paths", async () => {
    resolveReview.mockResolvedValue({
      data: { id: "rev_abc", handled: true },
      error: null,
    });

    const response = await POST(
      authorizedRequest("http://localhost/api/reviews/rev_abc/resolve"),
      { params: Promise.resolve({ id: "rev_abc" }) }
    );
    const body = await response.json();

    expect(resolveReview).toHaveBeenCalledWith("rev_abc");
    expect(response.status).toBe(200);
    expect(body).toEqual({
      data: { id: "rev_abc", handled: true },
      error: null,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/action-needed");
    expect(revalidatePath).toHaveBeenCalledWith("/action-needed/rev_abc");
  });

  it("returns 400 for a blank id", async () => {
    const response = await POST(
      authorizedRequest("http://localhost/api/reviews/%20/resolve"),
      { params: Promise.resolve({ id: "   " }) }
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/required/i);
    expect(resolveReview).not.toHaveBeenCalled();
  });

  it("returns 404 when the review is missing", async () => {
    resolveReview.mockResolvedValue({ data: null, error: null });

    const response = await POST(
      authorizedRequest("http://localhost/api/reviews/rev_missing/resolve"),
      { params: Promise.resolve({ id: "rev_missing" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({
      data: null,
      error: "Review not found or already resolved.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
