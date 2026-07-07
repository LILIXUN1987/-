import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('cargo_spaces', (table) => {
    table.string('origin_port', 100).nullable();
    table.string('dest_port', 100).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('cargo_spaces', (table) => {
    table.dropColumn('origin_port');
    table.dropColumn('dest_port');
  });
}
