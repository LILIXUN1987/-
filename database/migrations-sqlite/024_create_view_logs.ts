import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('cargo_view_logs', (table) => {
    table.string('id', 36).primary();
    table.string('cargo_id', 36).notNullable();
    table.string('view_date', 20).notNullable(); // YYYY-MM-DD
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['cargo_id', 'view_date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('cargo_view_logs');
}
