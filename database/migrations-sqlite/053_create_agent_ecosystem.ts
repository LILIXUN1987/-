import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 合作记录表：货代与海外代理的合作
  await knex.schema.createTable('cooperations', (table) => {
    table.string('id', 36).primary();
    table.string('agent_user_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('forwarder_user_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('agent_company', 300).nullable();
    table.string('forwarder_company', 300).nullable();
    table.string('service_type', 100).nullable();       // 合作类型：清关/派送/DDP等
    table.text('description').nullable();                 // 合作描述
    table.string('status', 20).defaultTo('pending');     // pending / confirmed / disputed
    table.timestamp('confirmed_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['agent_user_id', 'forwarder_user_id'], { indexName: 'idx_coop_pair' });
  });

  // 争议调解表
  await knex.schema.createTable('dispute_cases', (table) => {
    table.string('id', 36).primary();
    table.string('cooperation_id', 36).nullable().references('id').inTable('cooperations').onDelete('SET NULL');
    table.string('filed_by', 36).notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('respondent_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('title', 300).notNullable();
    table.text('description').notNullable();
    table.text('evidence').nullable();                    // JSON: 文件路径数组
    table.string('status', 20).defaultTo('pending');     // pending / under_review / resolved / dismissed
    table.text('verdict').nullable();
    table.string('resolved_by', 36).nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('resolved_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('dispute_cases');
  await knex.schema.dropTableIfExists('cooperations');
}
