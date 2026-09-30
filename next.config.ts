import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/bom',
        destination: '/warehouse',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
