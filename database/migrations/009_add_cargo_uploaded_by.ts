import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('cargo_spaces', (table) => {
    table.uuid('uploaded_by').nullable().references('id').inTable('users').onDelete('SET NULL');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('cargo_spaces', (table) => {
    table.dropColumn('uploaded_by');
  });
}
