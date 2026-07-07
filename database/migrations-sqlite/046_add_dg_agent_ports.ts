import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('dg_agents', (table) => {
    table.string('ports', 500).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('dg_agents', (table) => {
    table.dropColumn('ports');
  });
}
