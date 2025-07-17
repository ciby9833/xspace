#!/bin/bash

# 前端部署脚本 上传到服务器命令 sh deploy-frontend.sh
echo "🚀 开始部署前端..."

# 检查是否在正确的目录
if [ ! -f "frontend/package.json" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
fi

# 进入前端目录
cd frontend

# 安装依赖
echo "📦 安装依赖..."
npm install

# 构建生产版本
echo "🔨 构建生产版本..."
npm run build

# 检查构建是否成功
if [ ! -d "dist" ]; then
    echo "❌ 构建失败：dist目录不存在"
    exit 1
fi

# 返回项目根目录
cd ..

# 设置变量
FRONTEND_DIST_DIR="$(pwd)/frontend/dist"
REMOTE_USER="root"
REMOTE_IP="8.215.34.35"
REMOTE_PATH="/var/www/xspace/frontend"
SSH_KEY="$HOME/.ssh/id_ed25519_xspace"

echo "📦 构建产物目录: $FRONTEND_DIST_DIR"
echo "🚀 正在上传前端构建文件..."

# 上传文件到服务器
rsync -avz --delete -e "ssh -i $SSH_KEY -p 22" "$FRONTEND_DIST_DIR/" "$REMOTE_USER@$REMOTE_IP:$REMOTE_PATH"

# 设置服务器端权限
echo "🔐 设置文件权限..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_IP" "sudo chown -R www-data:www-data $REMOTE_PATH && sudo chmod -R 755 $REMOTE_PATH"

# 验证部署
echo "✅ 验证部署..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_IP" "ls -la $REMOTE_PATH/ | head -5"

echo "🎉 前端部署完成！"
echo "🌐 访问地址: http://$REMOTE_IP"