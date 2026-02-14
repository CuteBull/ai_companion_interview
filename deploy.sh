#!/bin/bash
# deploy.sh

echo "=== 部署多模态对话系统 ==="

# 检查必需的环境变量
required_vars=(
    "AZURE_OPENAI_ENDPOINT"
    "AZURE_OPENAI_API_KEY"
    "AZURE_OPENAI_DEPLOYMENT"
    "CLOUDINARY_CLOUD_NAME"
    "CLOUDINARY_API_KEY"
    "CLOUDINARY_API_SECRET"
    "API_KEY"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "错误: $var 未设置"
        exit 1
    fi
done

# 检查可选变量，提供默认值
if [ -z "$AZURE_OPENAI_API_VERSION" ]; then
    export AZURE_OPENAI_API_VERSION="2025-03-01-preview"
    echo "提示: AZURE_OPENAI_API_VERSION 使用默认值: 2025-03-01-preview"
fi

if [ -z "$AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT" ]; then
    export AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT="gpt-4o-transcribe"
    echo "提示: AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT 使用默认值: gpt-4o-transcribe"
fi

if [ -z "$DATABASE_URL" ]; then
    echo "提示: DATABASE_URL 未设置，将使用SQLite本地数据库"
fi

# 安全配置检查
if [ -z "$RATE_LIMIT_ENABLED" ]; then
    export RATE_LIMIT_ENABLED=true
    echo "提示: RATE_LIMIT_ENABLED 使用默认值: true"
fi

if [ "$RATE_LIMIT_ENABLED" = "true" ] && [ -z "$REDIS_URL" ]; then
    echo "警告: RATE_LIMIT_ENABLED=true 但 REDIS_URL 未设置，将使用内存存储"
fi

if [ -z "$RATE_LIMIT_DEFAULT" ]; then
    export RATE_LIMIT_DEFAULT="100/minute"
    echo "提示: RATE_LIMIT_DEFAULT 使用默认值: 100/minute"
fi

echo "1. 推送代码到GitHub..."
CURRENT_BRANCH=$(git branch --show-current)
git push origin $CURRENT_BRANCH

echo "2. 创建Pull Request..."
gh pr create --title "多模态对话系统部署" --body "部署到Vercel和Render"

echo "3. 部署前端到Vercel..."
cd frontend
vercel --prod --confirm

echo "4. 部署后端到Render..."
cd ../backend
render deploy

echo "=== 部署完成 ==="
echo "前端: https://your-app.vercel.app"
echo "后端: https://your-api.onrender.com"
echo "API文档: https://your-api.onrender.com/docs"