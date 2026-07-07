import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('suggestions', (table) => {
    table.string('id', 36).primary();
    table.string('suggester_name', 100).notNullable();
    table.string('suggester_company', 300).notNullable();
    table.text('content').notNullable();
    table.string('status', 20).defaultTo('pending');
    table.string('created_by', 36).nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('suggestions');
}
