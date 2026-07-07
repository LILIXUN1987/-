#!/bin/bash
# ═══════════════════════════════════════════
# 123共享外贸物流社区 - 服务器一键部署脚本
# 在服务器上运行：bash server_setup.sh
# ═══════════════════════════════════════════

set -e
DOMAIN="123cargo123.com"
APP_DIR="/home/ubuntu/logistics"

echo "=========================================="
echo "  开始部署 123共享外贸物流社区"
echo "  域名: ${DOMAIN}"
echo "  服务器: $(hostname -I | awk '{print $1}')"
echo "=========================================="

# ── 1. 系统更新 + 安装依赖 ──
echo ""
echo "[1/7] 安装系统依赖..."
sudo apt-get update -y
sudo apt-get install -y nginx postgresql postgresql-client git curl

# ── 2. 安装 Node.js 22 ──
echo ""
echo "[2/7] 安装 Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2 tsx
node -v
npm -v

# ── 3. 配置 PostgreSQL ──
echo ""
echo "[3/7] 配置 PostgreSQL..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

sudo -u postgres psql -c "CREATE USER logistics WITH PASSWORD 'logistics123';" 2>/dev/null || echo "用户已存在"
sudo -u postgres psql -c "CREATE DATABASE logistics OWNER logistics;" 2>/dev/null || echo "数据库已存在"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE logistics TO logistics;" 2>/dev/null || true
echo "✅ PostgreSQL 配置完成"

# ── 4. 创建应用目录 ──
echo ""
echo "[4/7] 创建应用目录..."
mkdir -p ${APP_DIR}/uploads
mkdir -p ${APP_DIR}/backend/data
mkdir -p ${APP_DIR}/frontend/dist

# ── 5. 配置 Nginx ──
echo ""
echo "[5/7] 配置 Nginx..."
sudo tee /etc/nginx/sites-available/${DOMAIN} > /dev/null << 'EOF'
server {
    listen 80;
    server_name 123cargo123.com www.123cargo123.com;
    client_max_body_size 20m;

    # gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_vary on;

    location /assets/ {
        root /home/ubuntu/logistics/frontend/dist;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    location /api/uploads/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        expires 1d;
    }

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

    location / {
        root /home/ubuntu/logistics/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && echo "✅ Nginx 配置正确"
sudo systemctl restart nginx

# ── 6. SSL 证书 ──
echo ""
echo "[6/7] 申请 SSL 证书..."
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos --email support@tiangaocargo.com || echo "⚠️ SSL 申请失败，稍后手动运行：sudo certbot --nginx -d ${DOMAIN}"

# ── 7. 写入 PM2 启动配置 ──
echo ""
echo "[7/7] 配置 PM2 启动脚本..."
cat > ${APP_DIR}/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'logistics-api',
    script: 'backend/src/index.ts',
    interpreter: 'tsx',
    cwd: '/home/ubuntu/logistics',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
    },
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
  }]
};
EOF

mkdir -p ${APP_DIR}/logs

echo ""
echo "=========================================="
echo "  ✅ 服务器环境部署完成！"
echo "=========================================="
echo ""
echo "下一步：上传代码并启动"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "【在本地电脑执行】"
echo ""
echo "步骤1：上传项目代码到服务器"
echo "  scp -r /d/国际物流/* ubuntu@122.152.219.223:${APP_DIR}/"
echo "  scp -r /d/国际物流/.env ubuntu@122.152.219.223:${APP_DIR}/ 2>/dev/null || true"
echo ""
echo "【在服务器执行】"
echo ""
echo "步骤2：安装依赖"
echo "  cd ${APP_DIR}"
echo "  npm install"
echo ""
echo "步骤3：构建前端"
echo "  cd ${APP_DIR}/frontend"
echo "  npm install"
echo "  npx vite build"
echo ""
echo "步骤4：运行数据库迁移"
echo "  cd ${APP_DIR}"
echo "  npx tsx node_modules/.bin/knex migrate:latest --knexfile backend/src/knexfile.ts"
echo ""
echo "步骤5：启动服务"
echo "  cd ${APP_DIR}"
echo "  pm2 start ecosystem.config.js"
echo "  pm2 save"
echo "  sudo env PATH=\$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu"
echo ""
echo "步骤6：重启 Nginx"
echo "  sudo systemctl restart nginx"
echo ""
echo "然后访问: https://${DOMAIN}"
echo ""
echo "数据迁移（从SQLite到PostgreSQL）"
echo "  执行以下Node脚本导入数据："
echo "  cd ${APP_DIR}"
echo "  npx tsx backend/src/scripts/migrate-sqlite-to-pg.ts"
echo ""
