import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['*.dev.coze.site'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lf-coze-web-cdn.coze.cn',
        pathname: '/**',
      },
    ],
  },
  // Turbopack 配置
  turbopack: {
    resolveAlias: {
      'coze-coding-dev-sdk': 'coze-coding-dev-sdk-mock',
    },
  },
  // Webpack 配置 - 作为后备
  webpack: (config, { isServer }) => {
    config.resolve.alias['coze-coding-dev-sdk'] = './src/lib/coze-coding-dev-sdk.ts';
    return config;
  },
};

export default nextConfig;
