import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Track referral link clicks (for conversion tracking)
  await knex.schema.createTable('referral_clicks', (table) => {
    table.string('id', 36).primary();
    table.string('referral_code', 20).notNullable();
    table.string('ip', 45).nullable();
    table.string('referrer_url', 500).nullable();
    table.string('user_agent', 500).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('referral_clicks');
}
