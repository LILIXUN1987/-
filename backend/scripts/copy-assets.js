/**
 * 构建后复制非 TS 资源文件到 dist 目录
 */
const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../database/migrations-sqlite');
const destDir = path.resolve(__dirname, '../dist/database/migrations-sqlite');

if (fs.existsSync(srcDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  const files = fs.readdirSync(srcDir);
  for (const file of files) {
    if (file.endsWith('.sql')) {
      fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
      console.log(`  copied: database/migrations-sqlite/${file}`);
    }
  }
  console.log('✅ Assets copied to dist/');
} else {
  console.log('⏭️  No assets to copy');
}
