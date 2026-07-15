import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── 1. 合作报关行 ──
  await knex.schema.createTable('customs_brokers', (table) => {
    table.string('id', 36).primary();
    table.string('company_name', 200).notNullable();
    table.string('contact_person', 100).nullable();
    table.string('phone', 50).nullable();
    table.string('port_code', 10).notNullable().defaultTo('5141');
    table.string('port_name', 200).nullable().defaultTo('广州白云机场');
    table.decimal('unit_price', 10, 2).notNullable().defaultTo(50.00);
    table.integer('daily_limit').notNullable().defaultTo(50);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ── 2. 货代月费订阅 ──
  await knex.schema.createTable('monthly_subscriptions', (table) => {
    table.string('id', 36).primary();
    table.string('user_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('status', 20).notNullable().defaultTo('active'); // active / cancelled
    table.string('current_month', 7).nullable(); // YYYY-MM 当前已付月份
    table.decimal('amount', 10, 2).notNullable().defaultTo(19.90);
    table.timestamp('last_paid_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index('user_id');
  });

  // ── 3. 报关券 ──
  await knex.schema.createTable('customs_coupons', (table) => {
    table.string('id', 36).primary();
    table.string('subscription_id', 36).nullable().references('id').inTable('monthly_subscriptions').onDelete('SET NULL');
    table.string('forwarder_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('trader_id', 36).nullable().references('id').inTable('users').onDelete('SET NULL');
    table.decimal('face_value', 10, 2).notNullable().defaultTo(50.00);
    table.string('month', 7).notNullable(); // YYYY-MM
    table.string('status', 20).notNullable().defaultTo('issued'); // issued / sent / used / expired
    table.timestamp('sent_at').nullable();
    table.timestamp('used_at').nullable();
    table.string('order_number', 100).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index('forwarder_id');
    table.index('trader_id');
    table.index('status');
  });

  // ── 4. 券使用记录（结算用） ──
  await knex.schema.createTable('coupon_usage_records', (table) => {
    table.string('id', 36).primary();
    table.string('coupon_id', 36).notNullable().references('id').inTable('customs_coupons').onDelete('CASCADE');
    table.string('broker_id', 36).nullable().references('id').inTable('customs_brokers').onDelete('SET NULL');
    table.string('trader_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('status', 20).notNullable().defaultTo('pending'); // pending / completed / disputed
    table.string('customs_decl_number', 100).nullable();
    table.integer('item_count').nullable();
    table.decimal('extra_fee', 10, 2).nullable(); // 续页费
    table.decimal('inspection_fee', 10, 2).nullable(); // 查验代理费
    table.text('decl_info').nullable(); // 报关基本信息（JSON）
    table.timestamp('completed_at').nullable();
    table.boolean('settled').notNullable().defaultTo(false);
    table.timestamp('settled_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index('coupon_id');
    table.index('broker_id');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('coupon_usage_records');
  await knex.schema.dropTableIfExists('customs_coupons');
  await knex.schema.dropTableIfExists('monthly_subscriptions');
  await knex.schema.dropTableIfExists('customs_brokers');
}
