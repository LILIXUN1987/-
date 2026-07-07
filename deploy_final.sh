#!/bin/bash
set -e

echo "=========================================="
echo "  🚀 123共享外贸物流社区 - 一键部署"
echo "=========================================="

cd /home/ubuntu/logistics

# 配置环境变量（使用SQLite）
sed -i '/^DATABASE_CLIENT/d' .env
echo "✅ 使用 SQLite 数据库"

# 创建 uploads 目录
mkdir -p /home/ubuntu/logistics/backend/uploads
echo "✅ uploads 目录已创建"

# 安装 PM2（如果没有）
if ! command -v pm2 &>/dev/null; then
  echo "安装 PM2..."
  sudo npm install -g pm2 tsx
fi

# 启动服务
echo "🚀 启动 API 服务..."
pm2 delete logistics-api 2>/dev/null || true
pm2 start backend/src/index.ts --name logistics-api --interpreter tsx --update-env
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>/dev/null || true

# 重启 Nginx
echo "🔄 重启 Nginx..."
sudo nginx -t && sudo systemctl restart nginx

# 测试
sleep 3
echo ""
echo "=== 测试 API ==="
curl -s http://localhost:3001/api/health
echo ""
echo "=========================================="
echo "  ✅ 部署完成！"
echo "=========================================="
echo "访问: http://123cargo123.com"
