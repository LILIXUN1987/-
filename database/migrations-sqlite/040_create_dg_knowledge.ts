import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('dg_knowledge', (table) => {
    table.string('id', 36).primary();
    table.string('title', 300).notNullable();
    table.text('content').notNullable();
    table.integer('sort_order').defaultTo(0);
    table.string('created_by', 36).nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('dg_knowledge');
}
