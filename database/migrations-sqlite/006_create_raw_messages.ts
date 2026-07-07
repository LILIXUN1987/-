import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('raw_messages', (table) => {
    table.string('id', 36).primary();
    table.text('content').notNullable();          // 管理员录入的原始完整文本
    table.string('keywords', 500).nullable();     // 自动提取的关键词，用逗号分隔
    table.string('uploaded_by', 36).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('raw_messages');
}
