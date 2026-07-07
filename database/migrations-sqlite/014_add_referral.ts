import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 为每个用户生成唯一的推广码
  await knex.schema.alterTable('users', (table) => {
    table.string('referral_code', 20).nullable().unique();
  });

  // 推荐记录表
  await knex.schema.createTable('referrals', (table) => {
    table.string('id', 36).primary();
    table.string('referrer_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('referee_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('bonus_days').defaultTo(3);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['referee_id']);
    table.index('referrer_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('referrals');
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('referral_code');
  });
}
