import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
  async rewrites() {
    return [
      {
        source: '/blog',
        destination: `${process.env.BLOG_DOMAIN || 'http://localhost:3001'}/blog`,
      },
      {
        source: '/blog/:path*',
        destination: `${process.env.BLOG_DOMAIN || 'http://localhost:3001'}/blog/:path*`,
      }
    ];
  },
};

export default nextConfig;
