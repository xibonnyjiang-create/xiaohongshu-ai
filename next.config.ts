import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['*.dev.coze.site'],
  serverExternalPackages: ['coze-coding-dev-sdk'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lf-coze-web-cdn.coze.cn',
        pathname: '/**',
      },
    ],
  },
  turbopack: {
    resolveAlias: {},
  },
};

export default nextConfig;
