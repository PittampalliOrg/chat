import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: "standalone",
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
};

// Enable Vercel toolbar in development
let config = nextConfig;
if (process.env.NODE_ENV === 'development') {
  const withVercelToolbar = require('@vercel/toolbar/plugins/next')();
  config = withVercelToolbar(nextConfig);
}

export default config;
