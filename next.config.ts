import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const targetUrl = (process.env.NEXT_PUBLIC_ERP_URL || "http://localhost:8080").replace(/\/$/, "");
    return [
      {
        source: "/api/method/:path*",
        destination: `${targetUrl}/api/method/:path*`,
      },
      {
        source: "/api/resource/:path*",
        destination: `${targetUrl}/api/resource/:path*`,
      },
    ];
  },
};

export default nextConfig;

