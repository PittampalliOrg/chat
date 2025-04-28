import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH,
  experimental: {
    ppr: true,
    turbo: {}
  },
  serverExternalPackages: ['@dapr/dapr', '@dapr/durabletask-js'],
  webpack: (config, { nextRuntime }) => {
    // Provide empty fallbacks *only* for the Edge build:
    if (nextRuntime === 'edge') {
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        stream: false,
        net: false,
        tls: false,
        zlib: false,
        http2: false,
        crypto: false,
        util: false,
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
    ],
  },
};

export default nextConfig;
