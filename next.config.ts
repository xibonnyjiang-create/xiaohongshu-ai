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
  // Turbopack 配置 - 在 Vercel 环境中使用 mock 模块
  turbopack: {
    resolveAlias: {
      // 在构建时检测环境
      'coze-coding-dev-sdk': 
        process.env.COZE_PROJECT_ENV || process.env.COZE_WORKSPACE_PATH
          ? 'coze-coding-dev-sdk'
          : './src/lib/coze-coding-dev-sdk.ts',
    },
  },
};

export default nextConfig;
