import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('card_batches', (table) => {
    table.text('notes').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('card_batches', (table) => {
    table.dropColumn('notes');
  });
}
