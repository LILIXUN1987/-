import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('cargo_spaces', (table) => {
    table.integer('view_count').defaultTo(0);
    table.integer('inquiry_count').defaultTo(0);
  });
  await knex.schema.alterTable('messages', (table) => {
    table.timestamp('read_at').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('cargo_spaces', (table) => {
    table.dropColumn('view_count');
    table.dropColumn('inquiry_count');
  });
  await knex.schema.alterTable('messages', (table) => {
    table.dropColumn('read_at');
  });
}
