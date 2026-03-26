import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // outputFileTracingRoot: path.resolve(__dirname, '../../'),  // Uncomment and add 'import path from "path"' if needed
  /* config options here */
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
  // 在 Vercel 环境（无 COZE_PROJECT_ENV）使用 mock 模块
  webpack: (config, { isServer }) => {
    // 检测是否在沙箱环境
    const isSandbox = process.env.COZE_PROJECT_ENV || process.env.COZE_WORKSPACE_PATH;
    
    if (!isSandbox && isServer) {
      // Vercel 环境：使用 mock 模块替代 coze-coding-dev-sdk
      config.resolve = config.resolve || {};
      config.resolve.alias = config.resolve.alias || {};
      config.resolve.alias['coze-coding-dev-sdk'] = require.resolve('./src/lib/coze-coding-dev-sdk.ts');
    }
    
    return config;
  },
};

export default nextConfig;
