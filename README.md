# 小红书AI爆款内容生成器

基于 Next.js 16 + React 19 + shadcn/ui 的智能内容生成平台，集成AI大模型，自动生成符合金融合规要求的小红书爆款内容。

## 核心功能

### 1. 输入模块
- **选题类型**：市场热点、小白科普、进阶投资、专业分析
- **用户标签**：小白投资者、进阶投资者、专业玩家
- **智能联动**：自动检查用户标签与选题类型的兼容性
- **今日爆款推荐**：AI自动捕捉实时热点，生成爆款内容
- **关键词输入**：自定义内容方向

### 2. 输出模块
- **整合视图**：一键生成标题+正文+标签+配图建议
- **流式输出**：实时展示AI生成过程，提升用户体验
- **一键换一批**：重新生成所有内容，保证内容核心统一
- **合规审查**：自动检查金融词汇合规性，避免违规风险

### 3. 交互体验
- **复制全文**：一键复制生成的内容
- **导出文件**：导出为TXT文件，方便使用
- **实时反馈**：生成过程可视化，状态清晰

### 4. AI能力
- **内容生成大模型**：生成高质量、原生感的小红书内容
- **金融词汇合规审查**：自动识别并提示违规词汇
- **热点捕捉**：实时获取市场热点，融入内容创作
- **图片生成**：自动生成配图建议

## 技术栈

- **框架**: Next.js 16.1.1 (App Router)
- **前端**: React 19 + TypeScript 5
- **UI组件**: shadcn/ui (基于 Radix UI)
- **样式**: Tailwind CSS v4
- **AI集成**: 
  - 内容生成与合规审查：支持OpenAI兼容API
  - 图片生成：支持图片生成API
- **流式输出**: Server-Sent Events (SSE)

## 本地部署指南

### 前置要求

- Node.js 18.0 或更高版本
- pnpm 9.0 或更高版本
- AI模型API密钥（支持OpenAI兼容接口）

### 安装步骤

#### 1. 克隆项目

```bash
git clone <your-repo-url>
cd <project-name>
```

#### 2. 安装依赖

```bash
# 使用 pnpm 安装依赖
pnpm install
```

#### 3. 配置环境变量

创建 `.env.local` 文件：

```bash
# AI API配置
CONTENT_API_KEY=your_api_key_here
IMAGE_API_BASE_URL=https://api.z.ai/api/paas/v4

# 应用配置
NEXT_PUBLIC_APP_NAME=小红书AI爆款内容生成器
```

**重要提示**：
- `CONTENT_API_KEY`: 用于内容生成和合规审查的API密钥
- `IMAGE_API_BASE_URL`: 图片生成API的基础URL
- 请确保API密钥的安全性，不要提交到Git仓库

#### 4. 启动开发服务器

```bash
# 方式1：使用 pnpm
pnpm dev

# 方式2：使用 coze CLI（如果已安装）
coze dev
```

启动后，访问 [http://localhost:5000](http://localhost:5000) 查看应用。

#### 5. 构建生产版本

```bash
# 构建
pnpm build

# 启动生产服务器
pnpm start
```

### API配置说明

#### 内容生成API

本项目支持OpenAI兼容接口，可以接入多种大语言模型：

**支持的API格式**：
```typescript
// OpenAI兼容格式
POST https://api.openai.com/v1/chat/completions
Headers:
  Authorization: Bearer YOUR_API_KEY
  Content-Type: application/json
Body:
  {
    "model": "gpt-3.5-turbo",
    "messages": [...],
    "stream": true
  }
```

**配置自定义API**：

编辑 `src/app/api/generate/route.ts`，修改API调用部分：

```typescript
// 修改API endpoint
const response = await fetch('YOUR_API_ENDPOINT', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model: 'your-model-name',
    messages: [...],
    stream: true,
  }),
});
```

#### 图片生成API

支持标准图片生成接口：

```typescript
POST ${IMAGE_API_BASE_URL}/images/generations
Headers:
  Authorization: Bearer YOUR_API_KEY
  Content-Type: application/json
Body:
  {
    "prompt": "图片描述",
    "n": 1,
    "size": "1024x1024"
  }
```

### 生产环境部署

#### 方式1：Vercel部署（推荐）

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel

# 配置环境变量
# 在 Vercel Dashboard 中设置环境变量
```

#### 方式2：Docker部署

创建 `Dockerfile`：

```dockerfile
FROM node:18-alpine AS base

# 安装 pnpm
RUN npm install -g pnpm

# 依赖阶段
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 构建阶段
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 设置环境变量
ENV NEXT_TELEMETRY_DISABLED 1

RUN pnpm build

# 运行阶段
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 5000

ENV PORT 5000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

构建并运行：

```bash
# 构建镜像
docker build -t xiaohongshu-generator .

# 运行容器
docker run -p 5000:5000 \
  -e CONTENT_API_KEY=your_api_key \
  -e IMAGE_API_BASE_URL=https://api.z.ai/api/paas/v4 \
  xiaohongshu-generator
```

#### 方式3：传统服务器部署

```bash
# 1. 构建项目
pnpm build

# 2. 使用PM2管理进程
npm install -g pm2
pm2 start pnpm --name "xiaohongshu-generator" -- start

# 3. 配置Nginx反向代理
# nginx.conf
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 常见问题

#### 1. API调用失败

**问题**：生成内容时提示"生成失败"

**解决方案**：
- 检查API密钥是否正确配置
- 确认API endpoint可访问
- 查看控制台日志获取详细错误信息

#### 2. 流式输出不显示

**问题**：生成内容时没有实时显示

**解决方案**：
- 检查浏览器是否支持Server-Sent Events
- 确认API返回格式正确（SSE格式）
- 查看Network面板确认数据流

#### 3. 图片生成失败

**问题**：配图建议区域为空

**解决方案**：
- 检查图片生成API配置
- 确认API密钥有效
- 查看后端日志获取详细错误

#### 4. 端口冲突

**问题**：启动时提示端口被占用

**解决方案**：
```bash
# 查找占用端口的进程
lsof -i :5000

# 杀死进程
kill -9 <PID>

# 或修改端口
PORT=3000 pnpm dev
```

## 项目结构

```
src/
├── app/
│   ├── api/
│   │   └── generate/
│   │       └── route.ts          # AI内容生成API（流式输出）
│   ├── layout.tsx                 # 根布局
│   ├── page.tsx                   # 主页面
│   └── globals.css                # 全局样式
├── components/
│   └── ui/                        # shadcn/ui组件
├── lib/
│   ├── types.ts                   # TypeScript类型定义
│   ├── constants.ts               # 常量配置
│   └── utils.ts                   # 工具函数
└── hooks/                         # 自定义Hooks

```

## 开发指南

### 添加新的选题类型

编辑 `src/lib/constants.ts`：

```typescript
export const TOPIC_TYPE_OPTIONS = [
  // 添加新类型
  {
    value: 'your_new_type',
    label: '新类型',
    description: '类型描述',
  },
  // ...
];
```

### 自定义合规审查规则

编辑 `src/app/api/generate/route.ts` 中的 `checkCompliance` 函数：

```typescript
async function checkCompliance(title: string, tags: string) {
  const prompt = `
    // 自定义审查规则
    检查以下内容：
    1. 你的规则1
    2. 你的规则2
    ...
  `;
  // ...
}
```

### 优化生成提示词

在 `src/app/api/generate/route.ts` 中修改对应的prompt：

```typescript
// 优化标题生成
async function generateTitle(...) {
  const prompt = `
    // 自定义标题生成提示词
    ...
  `;
  // ...
}
```

## 性能优化建议

1. **启用缓存**：对热点内容启用Redis缓存
2. **CDN加速**：静态资源使用CDN分发
3. **API限流**：防止API被滥用
4. **并发控制**：限制同时生成的任务数

## 安全建议

1. **API密钥保护**：不要在客户端暴露API密钥
2. **输入验证**：对用户输入进行严格验证
3. **内容过滤**：对生成内容进行二次审查
4. **HTTPS**：生产环境必须使用HTTPS

## 许可证

MIT License

## 联系方式

如有问题或建议，欢迎提交Issue或Pull Request。
