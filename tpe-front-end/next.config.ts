import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove static export for now - we'll deploy as Node.js app
  images: {
    unoptimized: true
  },
  typescript: {
    // Skip TypeScript checking during build - handle separately with type-check script
    ignoreBuildErrors: true,
  },
  eslint: {
    // Skip ESLint during build - handle separately with lint script
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
