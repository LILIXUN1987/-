#!/bin/bash
set -e

echo "=========================================="
echo "  🚀 123共享外贸物流社区 - 生产部署"
echo "=========================================="

cd /home/ubuntu/logistics

# ═══ 前置安全检查 ═══
echo ""
echo "🔐 检查环境变量配置..."
if [ ! -f .env ]; then
  echo "❌ .env 文件不存在！请先创建 .env 文件并填入所有必需值。"
  echo "   参考模板: .env.example"
  exit 1
fi

# 检查关键密钥是否已设置（不是空值）
for KEY in JWT_SECRET DEEPSEEK_API_KEY VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY SMTP_USER SMTP_PASS; do
  if ! grep -q "^${KEY}=.\\+" .env 2>/dev/null; then
    echo "⚠️  警告: ${KEY} 未设置或为空，相关功能可能不可用"
  fi
done
echo "✅ 环境变量检查完成"

# ═══ 系统依赖 ═══
echo ""
echo "📦 安装依赖..."
cd backend && npm install --production && cd ..
cd frontend && npm install && cd ..

# ═══ 构建 ═══
echo ""
echo "🔨 编译后端 TypeScript..."
cd backend && npm run build && cd ..
echo "🔨 构建前端..."
cd frontend && npm run build && cd ..

# ═══ 目录 ═══
mkdir -p /home/ubuntu/logistics/backend/uploads
mkdir -p /home/ubuntu/logistics/logs

# ═══ PM2 ═══
if ! command -v pm2 &>/dev/null; then
  echo "安装 PM2..."
  sudo npm install -g pm2
fi

echo ""
echo "🚀 启动服务..."
pm2 delete logistics-api 2>/dev/null || true
pm2 start ecosystem.config.js --update-env
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>/dev/null || true

# ═══ Nginx ═══
echo ""
echo "🔄 重启 Nginx..."
sudo nginx -t && sudo systemctl restart nginx

# ═══ 健康检查 ═══
sleep 3
echo ""
echo "=== 健康检查 ==="
curl -s http://localhost:3001/api/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3001/api/health
echo ""
echo "=========================================="
echo "  ✅ 部署完成！"
echo "  https://123cargo123.com"
echo "=========================================="
echo ""
echo "📋 首次部署后检查清单:"
echo "  1. 访问 https://123cargo123.com 确认页面正常"
echo "  2. 测试注册流程（验证码能否收到）"
echo "  3. 测试登录 + AI录入"
echo "  4. 检查 PM2 日志: pm2 logs logistics-api"
echo "  5. 检查 Nginx 日志: sudo tail -f /var/log/nginx/access.log"
