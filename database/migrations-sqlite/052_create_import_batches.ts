import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('import_batches', (table) => {
    table.string('id', 36).primary();
    table.string('file_name', 300).nullable();         // 原始文件名
    table.integer('total').defaultTo(0);               // 总行数
    table.integer('success').defaultTo(0);             // 成功数
    table.integer('skipped').defaultTo(0);             // 跳过数
    table.integer('email_failed').defaultTo(0);        // 邮件失败数
    table.string('created_by', 36).nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('import_batches');
}
