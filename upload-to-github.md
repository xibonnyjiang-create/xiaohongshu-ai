# 如何上传代码到 GitHub

## 方法一：网页上传（推荐新手）

### 步骤1：下载项目代码
由于沙箱环境限制，请按照以下方式操作：

1. 在当前对话中，我可以帮您生成关键文件内容
2. 您复制粘贴到本地文件

### 步骤2：创建 GitHub 仓库
1. 登录 https://github.com
2. 点击右上角 **+** → **New repository**
3. 填写：
   - Repository name: `xiaohongshu-ai-generator`
   - 选择 **Public**
   - **不要**勾选任何选项
4. 点击 **Create repository**

### 步骤3：上传文件
1. 在新创建的仓库页面，点击 **uploading an existing file**
2. 将以下文件夹拖拽上传：
   - `src/` 文件夹（整个文件夹）
   - `public/` 文件夹
   - `package.json`
   - `next.config.ts`
   - `postcss.config.mjs`
   - `eslint.config.mjs`
   - `tsconfig.json`
   - `.gitignore`
   - `.env.example`
   - `vercel.json`
   - `DEPLOY.md`
   - `README.md`
3. 在下方 Commit 信息填写：`Initial commit`
4. 点击 **Commit changes**

---

## 方法二：使用 Git 命令（适合有Git基础的用户）

### 在本地电脑操作：

```bash
# 1. 创建项目文件夹
mkdir xiaohongshu-ai-generator
cd xiaohongshu-ai-generator

# 2. 初始化Git
git init

# 3. 创建文件（需要从沙箱复制内容）

# 4. 添加所有文件
git add .

# 5. 提交
git commit -m "Initial commit"

# 6. 关联远程仓库
git remote add origin https://github.com/你的用户名/xiaohongshu-ai-generator.git

# 7. 推送
git push -u origin main
```

---

## 需要上传的文件列表

### 核心配置文件
- package.json
- next.config.ts
- tsconfig.json
- postcss.config.mjs
- eslint.config.mjs
- .gitignore
- vercel.json
- .env.example

### 源代码
- src/app/ （整个文件夹）
- src/components/ （整个文件夹）
- src/lib/ （整个文件夹）
- src/hooks/ （如果有）
- src/storage/ （整个文件夹）
- public/ （整个文件夹）

### 文档
- README.md
- DEPLOY.md
