import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('peer_invitations', (table) => {
    table.string('id', 36).primary();
    table.string('inviter_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('referee_name', 100).notNullable();
    table.string('referee_email', 200).notNullable();
    table.string('referee_company', 300).nullable();
    table.string('referee_username', 100).nullable();  // 自动生成的用户名
    table.string('referee_password', 100).nullable();  // 自动生成的密码（明文，仅首次展示）
    table.string('referee_id', 36).nullable().references('id').inTable('users').onDelete('SET NULL');
    table.string('status', 20).defaultTo('pending');   // pending / registered
    table.integer('bonus_days').defaultTo(0);          // 实际发放的奖励天数
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('peer_invitations');
}
