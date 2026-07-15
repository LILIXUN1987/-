import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 先检查是否是 PostgreSQL（uuid 类型）
  const isPG = knex.client.config.client === 'pg';

  await knex.schema.createTable('customs_brokers', (table) => {
    if (isPG) { table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()')); }
    else { table.string('id', 36).primary(); }
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

  await knex.schema.createTable('monthly_subscriptions', (table) => {
    if (isPG) { table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()')); }
    else { table.string('id', 36).primary(); }
    if (isPG) { table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE'); }
    else { table.string('user_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE'); }
    table.string('status', 20).notNullable().defaultTo('active');
    table.string('current_month', 7).nullable();
    table.decimal('amount', 10, 2).notNullable().defaultTo(19.90);
    table.timestamp('last_paid_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index('user_id');
  });

  await knex.schema.createTable('customs_coupons', (table) => {
    if (isPG) { table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()')); }
    else { table.string('id', 36).primary(); }
    if (isPG) { table.uuid('subscription_id').nullable().references('id').inTable('monthly_subscriptions').onDelete('SET NULL'); }
    else { table.string('subscription_id', 36).nullable().references('id').inTable('monthly_subscriptions').onDelete('SET NULL'); }
    if (isPG) { table.uuid('forwarder_id').notNullable().references('id').inTable('users').onDelete('CASCADE'); }
    else { table.string('forwarder_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE'); }
    if (isPG) { table.uuid('trader_id').nullable().references('id').inTable('users').onDelete('SET NULL'); }
    else { table.string('trader_id', 36).nullable().references('id').inTable('users').onDelete('SET NULL'); }
    table.decimal('face_value', 10, 2).notNullable().defaultTo(50.00);
    table.string('month', 7).notNullable();
    table.string('status', 20).notNullable().defaultTo('issued');
    table.timestamp('sent_at').nullable();
    table.timestamp('used_at').nullable();
    table.string('order_number', 100).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index('forwarder_id');
    table.index('trader_id');
    table.index('status');
  });

  await knex.schema.createTable('coupon_usage_records', (table) => {
    if (isPG) { table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()')); }
    else { table.string('id', 36).primary(); }
    if (isPG) { table.uuid('coupon_id').notNullable().references('id').inTable('customs_coupons').onDelete('CASCADE'); }
    else { table.string('coupon_id', 36).notNullable().references('id').inTable('customs_coupons').onDelete('CASCADE'); }
    if (isPG) { table.uuid('broker_id').nullable().references('id').inTable('customs_brokers').onDelete('SET NULL'); }
    else { table.string('broker_id', 36).nullable().references('id').inTable('customs_brokers').onDelete('SET NULL'); }
    if (isPG) { table.uuid('trader_id').notNullable().references('id').inTable('users').onDelete('CASCADE'); }
    else { table.string('trader_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE'); }
    table.string('status', 20).notNullable().defaultTo('pending');
    table.string('customs_decl_number', 100).nullable();
    table.integer('item_count').nullable();
    table.decimal('extra_fee', 10, 2).nullable();
    table.decimal('inspection_fee', 10, 2).nullable();
    table.text('decl_info').nullable();
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
