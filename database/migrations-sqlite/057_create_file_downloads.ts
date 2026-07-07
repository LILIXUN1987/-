import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('file_downloads', (table) => {
    table.string('id', 36).primary();
    table.string('file_id', 36).notNullable().references('id').inTable('uploaded_files').onDelete('CASCADE');
    table.string('user_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('file_name', 500).nullable();
    table.string('downloader_company', 300).nullable();
    table.string('downloader_name', 100).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 在 uploaded_files 表加下载计数字段
  await knex.schema.alterTable('uploaded_files', (table) => {
    table.integer('download_count').defaultTo(0);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('uploaded_files', (table) => {
    table.dropColumn('download_count');
  });
  await knex.schema.dropTableIfExists('file_downloads');
}
