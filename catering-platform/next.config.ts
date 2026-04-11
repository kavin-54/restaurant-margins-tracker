import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "resteraunt-margins-tracker.firebasestorage.app",
      },
    ],
  },
};

export default nextConfig;
