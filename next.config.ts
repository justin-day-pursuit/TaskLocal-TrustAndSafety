import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
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
    ];
  },
};

export default nextConfig;
