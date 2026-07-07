import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 分类筛选性能优化
  await knex.schema.alterTable('raw_messages', (table) => {
    table.index('category', 'idx_raw_messages_category');
    table.index('uploaded_by', 'idx_raw_messages_uploaded_by');
    table.index('created_at', 'idx_raw_messages_created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('raw_messages', (table) => {
    table.dropIndex('category', 'idx_raw_messages_category');
    table.dropIndex('uploaded_by', 'idx_raw_messages_uploaded_by');
    table.dropIndex('created_at', 'idx_raw_messages_created_at');
  });
}
