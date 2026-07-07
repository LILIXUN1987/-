import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('dg_faqs', (table) => {
    table.string('id', 36).primary();
    table.string('type', 10).defaultTo('air');
    table.string('question', 500).notNullable();
    table.text('answer').notNullable();
    table.string('status', 20).defaultTo('pending'); // pending / approved
    table.string('created_by', 36).nullable().references('id').inTable('users').onDelete('SET NULL');
    table.string('answered_by', 36).nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('answered_at').nullable();
    table.index('status');
    table.index('type');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('dg_faqs');
}
