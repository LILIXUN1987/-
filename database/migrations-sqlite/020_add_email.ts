import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // users 表加 email 字段
  await knex.schema.alterTable('users', (table) => {
    table.string('email', 200).nullable();
    table.boolean('email_verified').defaultTo(false);
  });

  // 验证码记录表
  await knex.schema.createTable('email_verifications', (table) => {
    table.string('id', 36).primary();
    table.string('email', 200).notNullable();
    table.string('code', 6).notNullable();
    table.timestamp('expires_at').notNullable();
    table.boolean('used').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index('email');
    table.index('code');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('email_verifications');
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('email');
    table.dropColumn('email_verified');
  });
}
