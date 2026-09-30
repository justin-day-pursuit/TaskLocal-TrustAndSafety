import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

describe("next.config redirects", () => {
  it("maps legacy routes to dashboard and analysis with permanent redirects", async () => {
    const redirects = await nextConfig.redirects!();

    expect(
      redirects.some(
        (rule) =>
          rule.source === "/flagged" && rule.destination === "/action-needed"
      )
    ).toBe(false);
    expect(
      redirects.some(
        (rule) =>
          rule.source === "/flagged/:id" &&
          rule.destination === "/action-needed/:id"
      )
    ).toBe(false);
    expect(redirects.every((rule) => rule.permanent === true)).toBe(true);

    expect(redirects).toEqual([
      {
        source: "/trends",
        destination: "/analysis",
        permanent: true,
      },
      {
        source: "/action-needed",
        destination: "/?view=unhandled",
        permanent: true,
      },
      {
        source: "/flagged",
        destination: "/?view=unhandled",
        permanent: true,
      },
      {
        source: "/action-needed/:id",
        destination: "/?view=unhandled&expanded=:id",
        permanent: true,
      },
      {
        source: "/flagged/:id",
        destination: "/?view=unhandled&expanded=:id",
        permanent: true,
      },
    ]);
  });
});
