import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('search_logs', (table) => {
    table.string('id', 36).primary();
    table.string('user_id', 36).nullable();
    table.string('keyword', 200).nullable();
    table.string('category', 50).nullable();
    table.boolean('has_push').defaultTo(false);
    table.string('created_at', 30).defaultTo(knex.fn.now());
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('search_logs');
}
