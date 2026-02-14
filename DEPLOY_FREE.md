# 免费部署方案（已适配本项目）

> 基于 2026-02-14 的官方文档信息整理。  
> 推荐组合：`Vercel (前端) + Render (后端) + Neon Postgres (数据库)`

## 为什么推荐这个组合

- 前端是 Vite React，Vercel Hobby 对静态前端部署最省事。
- 后端是 FastAPI，Render 原生支持 Python Web Service，和当前项目结构匹配。
- Render 免费 Postgres 会在 30 天后到期，不适合长期数据存储；用 Neon 免费层更稳妥。

## 0. 先准备

- 把代码托管到 GitHub。
- 确保默认分支是 `main`。

## 1. 部署后端（Render Free）

1. 在 Render 新建 `Web Service`，连接 GitHub 仓库。
2. Root Directory 设为 `backend`。
3. Build Command:
   - `pip install -r requirements.txt && alembic upgrade head`
4. Start Command:
   - `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. 环境变量至少配置：
   - `DATABASE_URL`（建议填 Neon 提供的连接串）
   - `AZURE_OPENAI_ENDPOINT`
   - `AZURE_OPENAI_API_KEY`
   - `AZURE_OPENAI_API_VERSION=2025-01-01-preview`
   - `AZURE_OPENAI_TRANSCRIBE_API_VERSION=2025-03-01-preview`
   - `AZURE_OPENAI_DEPLOYMENT=gpt-4o`
   - `AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT=gpt-4o-transcribe`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `CORS_ORIGINS=["https://你的前端域名.vercel.app"]`
6. 记下后端地址，如：`https://your-api.onrender.com`

## 2. 部署前端（Vercel Hobby）

1. 在 Vercel 导入同一个 GitHub 仓库。
2. Framework 选择 Vite。
3. Root Directory 设为 `frontend`。
4. Build Command:
   - `npm run build`
5. Output Directory:
   - `dist`
6. 环境变量：
   - `VITE_API_BASE_URL=https://你的后端地址.onrender.com`
   - `VITE_API_KEY`（如果后端启用了 API_KEY）

## 3. 自动化部署（本仓库已内置）

仓库已添加两个工作流：

- `/.github/workflows/ci.yml`
  - PR / Push 时自动跑前后端测试与构建
- `/.github/workflows/deploy.yml`
  - `CI` 在 `main` 分支成功后自动触发：
    - 触发 Vercel 和 Render 的 Deploy Hook
  - 也支持手动触发（`workflow_dispatch`）

### 你需要在 GitHub 仓库里添加 Secrets

- `VERCEL_DEPLOY_HOOK_URL`
- `RENDER_DEPLOY_HOOK_URL`

添加路径：`GitHub Repo -> Settings -> Secrets and variables -> Actions`

## 4. 免费层注意事项

- Render Free Web Service 有休眠（无请求一段时间后休眠，首次请求会冷启动）。
- Render 免费 PostgreSQL 会在 30 天后到期（官方文档说明），不建议存正式数据。
- Vercel Hobby 是个人免费层，适合个人项目和作品展示。

## 5. 一次配置后怎么用

1. 本地改代码
2. 提交并 push 到 `main`
3. GitHub Actions 先跑 `CI`，成功后自动触发部署
4. Vercel / Render 自动发布
