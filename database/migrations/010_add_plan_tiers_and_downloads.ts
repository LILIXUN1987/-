import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasPlanTier = await knex.schema.hasColumn('users', 'plan_tier');
  if (!hasPlanTier) {
    await knex.schema.alterTable('users', (t) => {
      t.string('plan_tier', 20).defaultTo('standard');
      t.timestamp('plan_updated_at').nullable();
    });
  }

  const hasDownloads = await knex.schema.hasTable('contact_downloads');
  if (!hasDownloads) {
    await knex.schema.createTable('contact_downloads', (t) => {
      t.string('id', 36).primary();
      t.string('user_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE');
      t.string('payment_id', 36).nullable();
      t.decimal('amount', 10, 2).notNullable().defaultTo(10.00);
      t.integer('contact_count').nullable();
      t.timestamp('created_at').defaultTo(knex.fn.now());
      t.index('user_id');
    });
  }

  const now = new Date().toISOString();
  await knex('users')
    .where('trial_end', '>=', now.split('T')[0])
    .whereNull('plan_tier')
    .update({ plan_tier: 'standard' });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('plan_tier');
    t.dropColumn('plan_updated_at');
  });
  await knex.schema.dropTableIfExists('contact_downloads');
}
