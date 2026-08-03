import { Knex } from 'knex';
import fs from 'fs';
import path from 'path';

/**
 * 初始数据库迁移
 * 从现有 SQLite 数据库导出的完整 schema
 * 之后的新增迁移请使用 Knex schema builder
 */
export async function up(knex: Knex): Promise<void> {
  // 关闭外键约束以允许任意顺序建表
  await knex.raw('PRAGMA foreign_keys = OFF');

  const sqlPath = path.resolve(__dirname, '001_initial_schema.sql');
  const rawSQL = fs.readFileSync(sqlPath, 'utf-8');

  // 按分号分割，逐个执行（跳过注释行和空行）
  const statements = rawSQL
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  for (const stmt of statements) {
    await knex.raw(stmt);
  }

  await knex.raw('PRAGMA foreign_keys = ON');
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('PRAGMA foreign_keys = OFF');

  // 获取所有用户表（排除系统表）
  const tables = await knex
    .select('name')
    .from('sqlite_master')
    .where('type', 'table')
    .whereNot('name', 'like', 'sqlite_%')
    .whereNot('name', 'like', 'knex_%');

  for (const { name } of tables as { name: string }[]) {
    await knex.schema.dropTableIfExists(name);
  }

  await knex.raw('PRAGMA foreign_keys = ON');
}
