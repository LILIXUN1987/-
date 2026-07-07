import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import logger from '../utils/logger';

async function seed() {
  const existing = await db('users').where({ username: 'admin' }).first();

  if (existing) {
    logger.info('Admin user already exists, skipping seed.');
    await db.destroy();
    return;
  }

  const passwordHash = await bcrypt.hash('admin123', 12);

  await db('users').insert({
    id: uuidv4(),
    username: 'admin',
    password_hash: passwordHash,
    display_name: '管理员',
  });

  logger.info('Admin user created: username=admin, password=admin123');
  await db.destroy();
}

seed().catch((err) => {
  logger.error('Seed failed:', err);
  process.exit(1);
});
