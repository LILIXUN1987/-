#!/bin/bash
set -e

# ══════════════════════════════════════════════
# 123共享外贸物流社区 - 服务器部署脚本
# 适用系统: Ubuntu 24.04 LTS
# ══════════════════════════════════════════════

DOMAIN="123cargo123.com"
APP_DIR="/home/ubuntu/logistics"
DB_NAME="logistics"
DB_USER="logistics"
DB_PASS="your-db-password"

echo "=========================================="
echo " 开始部署 123共享外贸物流社区"
echo "=========================================="

# ── 1. 安装系统依赖 ──
echo "[1/8] 安装系统依赖..."
sudo apt-get update -y
sudo apt-get install -y nginx postgresql postgresql-client nodejs npm git certbot python3-certbot-nginx
sudo npm install -g n pm2
sudo n 20
sudo apt-get install -y nodejs

echo "[2/8] 安装 Node.js 22..."
sudo npm install -g n
sudo n 22
node -v

# ── 2. 配置 PostgreSQL ──
echo "[3/8] 配置 PostgreSQL..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 创建数据库和用户
sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" 2>/dev/null || true

# ── 3. 克隆/传输代码 ──
echo "[4/8] 创建应用目录..."
mkdir -p ${APP_DIR}

# ── 4. 配置环境变量 ──
echo "[5/8] 配置环境变量..."
cat > ${APP_DIR}/.env << 'ENVEOF'
NODE_ENV=production
PORT=3001
DATABASE_CLIENT=pg
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=logistics
DATABASE_USER=logistics
DATABASE_PASSWORD=logistics123
JWT_SECRET=change-me-to-a-random-string-123456
JWT_EXPIRES_IN=24h
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=your-deepseek-api-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
FRONTEND_URL=https://${DOMAIN}
UPLOAD_DIR=./uploads
UPLOAD_MAX_SIZE_MB=20
SMTP_HOST=smtp.qiye.aliyun.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@company.com
SMTP_PASS=your-smtp-password
SMTP_FROM_NAME=123共享外贸物流社区
ENVEOF

# ── 5. 配置 Nginx ──
echo "[6/8] 配置 Nginx..."
sudo tee /etc/nginx/sites-available/${DOMAIN} > /dev/null << 'NGINXEOF'
server {
    listen 80;
    server_name 123cargo123.com www.123cargo123.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name 123cargo123.com www.123cargo123.com;

    # SSL证书（稍后通过 certbot 自动获取）
    ssl_certificate /etc/letsencrypt/live/123cargo123.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/123cargo123.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # 前端静态文件（缓存7天）
    root /home/ubuntu/logistics/frontend/dist;
    index index.html;

    # gzip压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 1024;
    gzip_comp_level 6;

    # 静态文件缓存
    location /assets/ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    location /vite.svg {
        expires 7d;
    }

    # 上传文件（头像/名片/卡片）
    location /api/uploads/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        expires 1d;
    }

    # API 请求转发
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }

    # SPA 路由（所有非API请求返回 index.html）
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }
}
NGINXEOF

sudo ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t

# ── 6. 申请 SSL 证书 ──
echo "[7/8] 申请 SSL 证书..."
sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos --email your-email@company.com || echo "⚠️ SSL证书申请失败，请手动运行: sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"

# ── 7. 安装项目依赖 ──
echo "[8/8] 请将项目代码上传至 ${APP_DIR} 后，运行以下命令完成部署："
echo ""
echo "  cd ${APP_DIR}"
echo "  npm install"
echo "  cd frontend && npm install && npx vite build && cd .."
echo "  pm2 start backend/src/index.ts --name logistics --interpreter tsx"
echo "  pm2 save"
echo "  sudo systemctl restart nginx"
echo ""

echo "=========================================="
echo " 部署脚本执行完毕！"
echo "=========================================="
echo ""
echo "剩余手动步骤："
echo "1. 将本地项目文件上传到服务器:"
echo "   scp -r d:/国际物流/* ubuntu@122.152.219.223:${APP_DIR}/"
echo "2. SSH登录服务器，运行:"
echo "   cd ${APP_DIR} && npm install"
echo "3. 构建前端:"
echo "   cd ${APP_DIR}/frontend && npm install && npx vite build"
echo "4. 数据库迁移:"
echo "   cd ${APP_DIR} && npx tsx node_modules/knex/bin/cli.js migrate:latest --knexfile backend/src/knexfile.ts"
echo "5. 启动服务:"
echo "   cd ${APP_DIR} && pm2 start backend/src/index.ts --name logistics --interpreter tsx"
echo "   pm2 save"
echo "6. 重启Nginx:"
echo "   sudo systemctl restart nginx"
echo ""
echo "访问 https://${DOMAIN} 即可打开系统"
