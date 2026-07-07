import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('nav_links', (table) => {
    table.string('id', 36).primary();
    table.string('title', 300).notNullable();
    table.string('url', 1000).notNullable();
    table.string('category', 100).notNullable();
    table.string('description', 500).nullable();
    table.string('submitted_by', 36).nullable().references('id').inTable('users').onDelete('SET NULL');
    table.integer('vote_count').defaultTo(0);
    table.string('status', 20).defaultTo('approved');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('nav_links');
}
