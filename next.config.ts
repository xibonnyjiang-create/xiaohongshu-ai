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
  // Turbopack 配置 - 忽略 SDK 中非 JS 文件
  turbopack: {
    resolveAlias: {
      // 忽略 LICENSE.txt 导入问题
    },
  },
};

export default nextConfig;
