import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

describe("next.config redirects", () => {
  it("maps /flagged and /flagged/:id to action-needed with permanent redirects", async () => {
    const redirects = await nextConfig.redirects!();

    expect(redirects).toEqual([
      {
        source: "/flagged",
        destination: "/action-needed",
        permanent: true,
      },
      {
        source: "/flagged/:id",
        destination: "/action-needed/:id",
        permanent: true,
      },
    ]);
  });
});
