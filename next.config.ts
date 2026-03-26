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
  turbopack: {},
  // Webpack 配置 - 在 Vercel 环境中使用 mock 模块
  webpack: (config, { isServer }) => {
    // 只在非沙箱环境（Vercel）中替换 SDK
    if (!process.env.COZE_PROJECT_ENV && !process.env.COZE_WORKSPACE_PATH) {
      config.resolve.alias['coze-coding-dev-sdk'] = require('path').resolve(__dirname, 'src/lib/coze-coding-dev-sdk.ts');
    }
    return config;
  },
};

export default nextConfig;
