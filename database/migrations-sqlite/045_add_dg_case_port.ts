import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('dg_cases', (table) => {
    table.string('port', 100).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('dg_cases', (table) => {
    table.dropColumn('port');
  });
}
