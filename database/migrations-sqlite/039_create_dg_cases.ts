import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('dg_cases', (table) => {
    table.string('id', 36).primary();
    table.string('agent_id', 36).nullable().references('id').inTable('dg_agents').onDelete('SET NULL');
    table.string('agent_name', 200).nullable();
    table.string('title', 300).notNullable();
    table.text('content').notNullable();
    table.string('status', 20).defaultTo('pending'); // pending / approved / rejected
    table.string('created_by', 36).nullable().references('id').inTable('users').onDelete('SET NULL');
    table.string('approved_by', 36).nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('processed_at').nullable();
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('dg_cases');
}
