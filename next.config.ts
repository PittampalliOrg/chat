import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheHandler:
    process.env.NODE_ENV === "production" ? "./cache-handler.mjs" : undefined,
  cacheMaxMemorySize: 0,
  output: 'standalone',
  experimental: {
    ppr: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
    ],
  },
    logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;
