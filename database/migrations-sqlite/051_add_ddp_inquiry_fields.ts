import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('ddp_inquiries', (table) => {
    table.string('hs_code', 50).nullable();              // HS CODE
    table.text('notes').nullable();                        // 备注（件数/重量/尺寸详情）
    table.text('file_paths').nullable();                   // 上传文件路径（JSON数组）
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('ddp_inquiries', (table) => {
    table.dropColumn('hs_code');
    table.dropColumn('notes');
    table.dropColumn('file_paths');
  });
}
