import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('dg_cases', (table) => {
    table.text('checklist').nullable(); // JSON array of {step, title, description}
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('dg_cases', (table) => {
    table.dropColumn('checklist');
  });
}
