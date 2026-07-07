import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 海外DDP代理表
  await knex.schema.createTable('ddp_agents', (table) => {
    table.string('id', 36).primary();
    table.string('company_name', 300).notNullable();
    table.string('contact_person', 100).nullable();
    table.string('email', 200).nullable();
    table.string('phone', 30).nullable();
    table.string('country', 100).notNullable();           // 所在国家
    table.string('city', 100).nullable();                  // 所在城市
    table.string('service_ports', 500).nullable();         // 可操作港口（逗号分隔）
    table.string('service_types', 200).nullable();         // DDP,DDU,清关,派送,仓储
    table.text('description').nullable();                  // 业务介绍
    table.text('reference_price').nullable();              // 参考价格描述
    table.integer('completed_orders').defaultTo(0);        // 已完成单数
    table.string('status', 20).defaultTo('pending');       // pending / approved / rejected
    table.string('created_by', 36).nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // DDP询价记录表（用于需求热度统计）
  await knex.schema.createTable('ddp_inquiries', (table) => {
    table.string('id', 36).primary();
    table.string('country', 100).notNullable();            // 目的国
    table.string('port', 100).nullable();                  // 目的港
    table.text('goods_desc').nullable();                   // 货物描述
    table.decimal('weight_kg', 10, 2).nullable();          // 重量
    table.decimal('volume_cbm', 10, 2).nullable();         // 体积
    table.text('address').nullable();                      // 详细地址
    table.string('user_id', 36).nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('ddp_inquiries');
  await knex.schema.dropTableIfExists('ddp_agents');
}
