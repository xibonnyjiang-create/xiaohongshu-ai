#!/bin/bash
# 在 GitHub Codespaces 中运行此脚本

echo "正在创建项目文件..."

# 创建目录结构
mkdir -p src/app/api/{generate,generate-image,generate-content,generate-tags,generate-title,hot-topics,regenerate-images,fetch-pdf,compliance-fix,history}
mkdir -p src/components/ui
mkdir -p src/lib
mkdir -p src/hooks
mkdir -p src/storage/database/shared
mkdir -p public

# 创建 package.json
cat > package.json << 'PACKAGE_EOF'
{
  "name": "xiaohongshu-ai-generator",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@hookform/resolvers": "^5.2.2",
    "@radix-ui/react-checkbox": "^1.3.3",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-label": "^2.1.8",
    "@radix-ui/react-select": "^2.2.6",
    "@radix-ui/react-separator": "^1.1.8",
    "@radix-ui/react-slot": "^1.2.4",
    "@radix-ui/react-switch": "^1.2.6",
    "@radix-ui/react-scroll-area": "^1.2.10",
    "@supabase/supabase-js": "2.95.3",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.468.0",
    "next": "16.1.1",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "sonner": "^2.0.7",
    "tailwind-merge": "^2.6.0",
    "zod": "^4.3.5"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
PACKAGE_EOF

# 创建 next.config.ts
cat > next.config.ts << 'NEXT_EOF'
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
NEXT_EOF

# 创建 tsconfig.json
cat > tsconfig.json << 'TS_EOF'
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
TS_EOF

# 创建 postcss.config.mjs
cat > postcss.config.mjs << 'POSTCSS_EOF'
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
POSTCSS_EOF

# 创建 .gitignore
cat > .gitignore << 'GITIGNORE_EOF'
# dependencies
node_modules
.pnpm-store

# next.js
.next
out
build

# env
.env
.env.local
.env*.local

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
GITIGNORE_EOF

# 创建 vercel.json
cat > vercel.json << 'VERCEL_EOF'
{
  "buildCommand": "pnpm run build",
  "installCommand": "npm install",
  "framework": "nextjs"
}
VERCEL_EOF

# 创建 .env.example
cat > .env.example << 'ENV_EOF'
# DeepSeek API (必需)
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com

# Supabase 数据库 (必需)
COZE_SUPABASE_URL=your_supabase_url
COZE_SUPABASE_ANON_KEY=your_supabase_anon_key

# 图片生成 (可选)
TENCENT_SECRET_ID=your_tencent_secret_id
TENCENT_SECRET_KEY=your_tencent_secret_key

# 搜索服务 (可选)
SERP_API_KEY=your_serp_api_key
ENV_EOF

echo "基础配置文件已创建！"
echo "接下来需要创建源代码文件..."
echo ""
echo "请在 Codespaces 终端继续运行以下命令安装依赖："
echo "npm install"
