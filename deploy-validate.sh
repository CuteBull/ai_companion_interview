#!/bin/bash
# deploy-validate.sh - 验证部署配置而不实际部署

echo "=== 部署配置验证 ==="

# 加载环境变量（如果.env文件存在）
if [ -f "backend/.env" ]; then
    echo "加载 backend/.env 文件"
    export $(grep -v '^#' backend/.env | xargs)
elif [ -f "backend/.env.production.test" ]; then
    echo "加载 backend/.env.production.test 文件"
    export $(grep -v '^#' backend/.env.production.test | xargs)
else
    echo "警告: 未找到环境变量文件"
fi

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

all_ok=true
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ 错误: $var 未设置"
        all_ok=false
    else
        echo "✅ $var 已设置"
    fi
done

# 检查可选变量
if [ -z "$AZURE_OPENAI_API_VERSION" ]; then
    echo "⚠️  提示: AZURE_OPENAI_API_VERSION 未设置，将使用默认值"
fi

if [ -z "$AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT" ]; then
    echo "⚠️  提示: AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT 未设置，将使用默认值"
fi

if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  提示: DATABASE_URL 未设置，将使用SQLite本地数据库"
fi

# 安全配置检查
if [ -z "$RATE_LIMIT_ENABLED" ]; then
    echo "⚠️  提示: RATE_LIMIT_ENABLED 未设置，将使用默认值: true"
fi

if [ "$RATE_LIMIT_ENABLED" = "true" ]; then
    echo "✅ 速率限制已启用"
    if [ -z "$REDIS_URL" ]; then
        echo "⚠️  警告: RATE_LIMIT_ENABLED=true 但 REDIS_URL 未设置，将使用内存存储"
    else
        echo "✅ Redis URL 已设置"
    fi

    if [ -z "$RATE_LIMIT_DEFAULT" ]; then
        echo "⚠️  提示: RATE_LIMIT_DEFAULT 未设置，将使用默认值: 100/minute"
    fi
else
    echo "⚠️  速率限制已禁用"
fi

# 检查前端配置
if [ -f "frontend/.env.production" ]; then
    echo "✅ 前端生产环境配置文件存在"
else
    echo "⚠️  警告: 前端生产环境配置文件不存在"
fi

# 检查部署工具
echo ""
echo "=== 部署工具检查 ==="

if command -v git &> /dev/null; then
    echo "✅ Git 已安装"
else
    echo "❌ Git 未安装"
    all_ok=false
fi

if command -v gh &> /dev/null; then
    echo "✅ GitHub CLI 已安装"
else
    echo "⚠️  GitHub CLI 未安装 (需要创建PR)"
fi

if command -v vercel &> /dev/null; then
    echo "✅ Vercel CLI 已安装"
else
    echo "⚠️  Vercel CLI 未安装 (需要部署前端)"
fi

if command -v render &> /dev/null; then
    echo "✅ Render CLI 已安装"
else
    echo "⚠️  Render CLI 未安装 (需要部署后端)"
fi

# 总结
echo ""
echo "=== 验证结果 ==="
if [ "$all_ok" = true ]; then
    echo "✅ 所有必需配置验证通过"
    echo "📋 部署准备就绪"
    echo ""
    echo "运行完整部署:"
    echo "  ./deploy.sh"
else
    echo "❌ 存在配置错误，请修复上述问题"
    exit 1
fi