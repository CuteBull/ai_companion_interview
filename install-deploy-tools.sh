#!/bin/bash
# Install deployment tools for Multimodal Chat System

echo "=== 安装部署工具 ==="

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew 未安装，请先安装 Homebrew: https://brew.sh"
    exit 1
fi

echo "✅ Homebrew 已安装"

# Update Homebrew
echo "更新 Homebrew..."
brew update

# Install GitHub CLI
echo "安装 GitHub CLI..."
if brew list gh &> /dev/null; then
    echo "✅ GitHub CLI 已安装"
else
    brew install gh
    echo "✅ GitHub CLI 安装完成"
fi

# Install Vercel CLI
echo "安装 Vercel CLI..."
if command -v vercel &> /dev/null; then
    echo "✅ Vercel CLI 已安装"
else
    npm install -g vercel
    echo "✅ Vercel CLI 安装完成"
fi

# Install Render CLI
echo "安装 Render CLI..."
if command -v render &> /dev/null; then
    echo "✅ Render CLI 已安装"
else
    brew tap render-oss/tap
    brew install render
    echo "✅ Render CLI 安装完成"
fi

# Verify installations
echo ""
echo "=== 工具验证 ==="

tools=("git" "gh" "vercel" "render")
all_installed=true

for tool in "${tools[@]}"; do
    if command -v $tool &> /dev/null; then
        echo "✅ $tool 已安装"
    else
        echo "❌ $tool 未安装"
        all_installed=false
    fi
done

echo ""
if [ "$all_installed" = true ]; then
    echo "✅ 所有部署工具已安装完成"
    echo ""
    echo "下一步："
    echo "1. 登录 GitHub: gh auth login"
    echo "2. 登录 Vercel: vercel login"
    echo "3. 登录 Render: render login"
else
    echo "⚠️  部分工具未安装成功"
    exit 1
fi