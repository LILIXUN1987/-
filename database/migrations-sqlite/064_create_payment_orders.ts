import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

export async function up(knex: Knex): Promise<void> {
  // 1. 支付订单表
  const hasOrders = await knex.schema.hasTable('payment_orders');
  if (!hasOrders) {
    await knex.schema.createTable('payment_orders', (table) => {
      table.string('id', 36).primary();
      table.string('user_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('plan_id', 36).nullable().references('id').inTable('membership_plans').onDelete('SET NULL');
      table.decimal('amount', 10, 2).notNullable();
      table.integer('days').notNullable();
      table.string('status', 20).notNullable().defaultTo('pending'); // pending / paid / expired
      table.string('remark', 500).nullable(); // 外部交易号
      table.string('channel', 20).nullable(); // alipay / shouqianba
      table.string('pay_trade_no', 100).nullable(); // 第三方交易号
      table.timestamp('paid_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.index('user_id');
      table.index('status');
    });
  }

  // 2. 种子默认套餐（含 1元3天测试套餐）
  const existingPlans = await knex('membership_plans').count('* as total').first();
  if (existingPlans && Number((existingPlans as any).total) === 0) {
    const plans = [
      { id: uuidv4(), name: '体验套餐', days: 3, price: 1.00, is_active: true },
      { id: uuidv4(), name: '月卡', days: 30, price: 19.90, is_active: true },
      { id: uuidv4(), name: '季卡', days: 90, price: 49.90, is_active: true },
      { id: uuidv4(), name: '年卡', days: 365, price: 169.00, is_active: true },
    ];
    for (const p of plans) {
      await knex('membership_plans').insert({
        ...p,
        created_at: new Date().toISOString(),
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('payment_orders');
}
