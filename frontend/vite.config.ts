import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // 基础框架：不常变，独立缓存
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // 图标库：体积大(约1MB)，单独打包
          'vendor-icons': ['lucide-react'],
          // 图表库：仅在运营看板使用
          'vendor-charts': ['recharts'],
          // Excel处理：仅在导入/导出时使用
          'vendor-xlsx': ['xlsx'],
          // 状态管理
          'vendor-state': ['zustand'],
          // HTTP客户端
          'vendor-http': ['axios'],
        },
      },
    },
    // 启用gzip压缩报告
    reportCompressedSize: true,
    // 警告阈值提高到1MB
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
