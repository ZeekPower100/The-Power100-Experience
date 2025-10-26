/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone mode for Docker deployment
  output: 'standalone',

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    // In production, the backend runs on the same server on port 5000
    const backendUrl = process.env.NODE_ENV === 'production'
      ? 'http://localhost:5000'  // Both frontend and backend run on same server in production
      : 'http://localhost:5000';

    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
