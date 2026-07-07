import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 添加去重索引：同一用户+同一内容不允许重复
  await knex.schema.alterTable('raw_messages', (table) => {
    table.index(['uploaded_by', 'content'], 'idx_raw_messages_dedup');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('raw_messages', (table) => {
    table.dropIndex('idx_raw_messages_dedup');
  });
}
