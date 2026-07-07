import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('dg_cases', (table) => {
    table.string('un_number', 50).nullable();
    table.string('awb_number', 100).nullable();
    table.text('file_paths').nullable(); // JSON array of uploaded file paths
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('dg_cases', (table) => {
    table.dropColumn('un_number');
    table.dropColumn('awb_number');
    table.dropColumn('file_paths');
  });
}
