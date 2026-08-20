import { describe, expect, it } from "vitest";

import { generateId } from "@/lib/utils/ids";

describe("generateId", () => {
  it("returns an id with the correct entity prefix", () => {
    const id = generateId("review");

    expect(id).toMatch(/^rev_[0-9a-f]{8}$/);
  });
});
