import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
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
    ];
  },
};

export default nextConfig;
