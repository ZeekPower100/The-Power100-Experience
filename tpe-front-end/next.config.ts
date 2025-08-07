import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
