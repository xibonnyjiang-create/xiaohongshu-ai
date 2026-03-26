# Vercel 部署指南

本指南将帮助您将小红书AI爆款内容生成器部署到 Vercel 永久环境。

---

## 前置准备

### 1. 注册账号

| 服务 | 用途 | 注册地址 |
|------|------|----------|
| **GitHub** | 代码托管 | https://github.com |
| **Vercel** | 应用部署 | https://vercel.com |
| **Supabase** | 数据库 | https://supabase.com |
| **DeepSeek** | 文本生成 | https://platform.deepseek.com |

### 2. 获取API密钥

#### DeepSeek API Key
1. 访问 https://platform.deepseek.com
2. 注册/登录账号
3. 进入 API Keys 页面
4. 创建新的 API Key

#### Supabase 配置
1. 创建新项目
2. 在项目设置 > API 中获取：
   - Project URL → `COZE_SUPABASE_URL`
   - anon public key → `COZE_SUPABASE_ANON_KEY`

---

## 部署步骤

### Step 1: 上传代码到 GitHub

```bash
# 1. 初始化Git仓库（如果还没有）
git init

# 2. 添加所有文件
git add .

# 3. 提交更改
git commit -m "Initial commit: 小红书AI爆款内容生成器"

# 4. 添加远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/你的用户名/你的仓库名.git

# 5. 推送到GitHub
git push -u origin main
```

### Step 2: 在 Vercel 导入项目

1. 登录 [Vercel](https://vercel.com)
2. 点击 "Add New..." → "Project"
3. 选择 "Import Git Repository"
4. 授权 GitHub 并选择你的仓库
5. 点击 "Import"

### Step 3: 配置项目

在 Vercel 项目设置中：

| 设置项 | 值 |
|--------|-----|
| Framework Preset | Next.js |
| Root Directory | ./ |
| Build Command | `pnpm run build` |
| Install Command | `pnpm install` |
| Output Directory | .next |

### Step 4: 配置环境变量

在 Vercel 项目设置 > Environment Variables 中添加：

```
# 必需
DEEPSEEK_API_KEY=你的DeepSeek API Key
DEEPSEEK_BASE_URL=https://api.deepseek.com
COZE_SUPABASE_URL=你的Supabase项目URL
COZE_SUPABASE_ANON_KEY=你的Supabase anon key

# 图片生成（至少配置一个）
TENCENT_SECRET_ID=你的腾讯云SecretId
TENCENT_SECRET_KEY=你的腾讯云SecretKey

# 搜索服务（可选，用于热点榜）
SERP_API_KEY=你的SerpAPI Key
```

### Step 5: 部署

1. 点击 "Deploy" 按钮
2. 等待构建完成（约2-3分钟）
3. 部署成功后，Vercel 会提供一个永久访问地址

---

## 图片生成服务配置

### 方案一：腾讯混元（推荐）

1. 注册 [腾讯云](https://cloud.tencent.com) 账号
2. 开通 混元大模型服务
3. 在访问管理 > API密钥管理 中创建密钥
4. 将 SecretId 和 SecretKey 配置到环境变量

### 方案二：使用占位图

如果暂时不配置图片生成API，系统会自动使用占位图，不影响其他功能使用。

---

## 搜索服务配置（热点榜功能）

### 方案一：SerpAPI（推荐）

1. 访问 https://serpapi.com
2. 注册账号（免费版每月100次）
3. 获取 API Key 并配置到环境变量

### 方案二：使用模拟数据

如果不配置搜索API，热点榜会显示模拟数据，不影响其他功能。

---

## 常见问题

### Q: 部署后页面空白？
A: 检查环境变量是否正确配置，特别是 DeepSeek API Key。

### Q: 图片生成失败？
A: 
1. 确认已配置图片生成API密钥
2. 检查API额度是否充足
3. 系统会自动降级使用占位图

### Q: 历史记录无法保存？
A: 检查 Supabase 配置是否正确。

### Q: 如何绑定自定义域名？
A: 在 Vercel 项目设置 > Domains 中添加你的域名。

---

## 费用估算

| 服务 | 免费额度 | 超出费用 |
|------|----------|----------|
| Vercel | 100GB带宽/月 | $20/月起 |
| DeepSeek | 首月送500万tokens | ¥1/百万tokens |
| Supabase | 500MB数据库 | $25/月起 |
| 腾讯混元 | 新用户免费试用 | 按次计费 |

**预估**：个人使用场景下，月费用约 ¥0-50。

---

## 技术支持

如遇问题，请检查：
1. Vercel 部署日志
2. 浏览器控制台错误信息
3. API 服务状态页面
