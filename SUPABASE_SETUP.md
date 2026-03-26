# Supabase 创建指南

## 第1步：注册 Supabase

1. 访问 https://supabase.com
2. 点击 **Start your project**
3. 使用 GitHub 账号登录（推荐）

## 第2步：创建组织

1. 登录后，点击 **New organization**
2. 填写组织名称（如：my-projects）
3. 点击 **Create organization**

## 第3步：创建项目

1. 点击 **New project**
2. 填写：
   - **Name**: xiaohongshu-ai
   - **Database Password**: 设置一个强密码（记住它！）
   - **Region**: 选择 Northeast Asia (Tokyo) 或 Southeast Asia (Singapore)
3. 点击 **Create new project**
4. 等待约 2 分钟创建完成

## 第4步：获取配置信息

1. 项目创建完成后，点击左侧 **Settings** (齿轮图标)
2. 点击 **API**
3. 复制以下信息：

### 项目 URL
在 **Project URL** 部分，复制类似这样的地址：
```
https://xxxxxxxxxxxxx.supabase.co
```
这就是 `COZE_SUPABASE_URL`

### anon public Key
在 **Project API keys** 部分，找到 **anon public**，复制类似这样的长字符串：
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZ...
```
这就是 `COZE_SUPABASE_ANON_KEY`

## 第5步：创建数据表（可选）

如果需要历史记录功能，在 Supabase SQL Editor 中执行：

```sql
CREATE TABLE history_records (
  id BIGSERIAL PRIMARY KEY,
  title TEXT,
  content TEXT,
  tags TEXT[],
  image_urls TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 启用行级安全策略
ALTER TABLE history_records ENABLE ROW LEVEL SECURITY;

-- 允许匿名读取
CREATE POLICY "Allow anonymous read" ON history_records
  FOR SELECT USING (true);

-- 允许匿名写入
CREATE POLICY "Allow anonymous insert" ON history_records
  FOR INSERT WITH CHECK (true);

-- 允许匿名更新
CREATE POLICY "Allow anonymous update" ON history_records
  FOR UPDATE USING (true);
```

---

## 免费额度

Supabase 免费版包含：
- 500MB 数据库存储
- 1GB 文件存储
- 50,000 月活用户
- 无限 API 请求

对于个人使用完全够用！
