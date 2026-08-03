module.exports = {
  apps: [{
    name: 'logistics-api',
    script: 'backend/dist/index.js',
    cwd: '/home/ubuntu/logistics',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      LOG_LEVEL: 'info',
    },
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    // 生产部署前先执行 build:
    // cd /home/ubuntu/logistics/backend && npm run build
    // 开发模式（直接运行 TS）:
    // interpreter: 'tsx', script: 'backend/src/index.ts',
  }]
};
