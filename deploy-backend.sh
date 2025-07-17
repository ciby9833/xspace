#!/bin/bash  ./deploy-backend.sh      # 上传后端代码

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/backend" && pwd)"
REMOTE_USER="root"
REMOTE_IP="8.215.34.35"
REMOTE_PATH="/var/www/xspace/backend"
SSH_KEY="$HOME/.ssh/id_ed25519_xspace"

echo "🚀 正在上传后端代码..."
rsync -avz --delete -e "ssh -i $SSH_KEY -p 22" "$BACKEND_DIR/" "$REMOTE_USER@$REMOTE_IP:$REMOTE_PATH"
echo "✅ 后端上传完成"