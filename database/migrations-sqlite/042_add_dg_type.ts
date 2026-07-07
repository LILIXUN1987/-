import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('dg_agents', (table) => {
    table.string('type', 10).defaultTo('air');
  });
  await knex.schema.alterTable('dg_cases', (table) => {
    table.string('type', 10).defaultTo('air');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('dg_agents', (table) => {
    table.dropColumn('type');
  });
  await knex.schema.alterTable('dg_cases', (table) => {
    table.dropColumn('type');
  });
}
