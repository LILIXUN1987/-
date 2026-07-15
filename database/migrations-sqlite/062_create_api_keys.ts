import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('api_keys', (table) => {
    table.string('id', 36).primary();
    table.string('user_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('key_prefix', 8).notNullable(); // 前8位明文，用于识别
    table.string('key_hash', 128).notNullable(); // 完整key的hash
    table.string('name', 100).notNullable().defaultTo('默认密钥'); // 密钥名称
    table.string('status', 20).notNullable().defaultTo('active'); // active / revoked
    table.timestamp('last_used_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('api_keys');
}
