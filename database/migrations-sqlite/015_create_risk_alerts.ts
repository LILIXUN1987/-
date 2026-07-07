import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('risk_alerts', (table) => {
    table.string('id', 36).primary();
    table.string('target_company', 300).notNullable();
    table.integer('complaint_count').notNullable();
    table.string('status', 20).defaultTo('pending'); // pending / approved / rejected
    table.string('created_by', 36).nullable().references('id').inTable('users');
    table.string('approved_by', 36).nullable().references('id').inTable('users');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('processed_at').nullable();
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('risk_alerts');
}
