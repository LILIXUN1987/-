import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('cargo_spaces', (table) => {
    table.string('uploaded_by', 36).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('cargo_spaces', (table) => {
    table.dropColumn('uploaded_by');
  });
}
