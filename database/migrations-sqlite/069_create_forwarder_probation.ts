import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('forwarder_probation', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('month_number').notNullable(); // 1, 2, or 3
    table.integer('target_cargos').notNullable().defaultTo(15);  // 发布舱位数
    table.integer('target_queries').notNullable().defaultTo(20); // 查询舱位数
    table.integer('actual_cargos').notNullable().defaultTo(0);
    table.integer('actual_queries').notNullable().defaultTo(0);
    table.string('status', 20).notNullable().defaultTo('active'); // active/passed/failed
    table.string('probation_month', 7).notNullable(); // 2026-08
    table.string('evaluated_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index('user_id');
    table.index('status');
    table.index('probation_month');
  });

  // Enroll the first 200 forwarder users (by registration order)
  const forwarders = await knex('users')
    .where('role', 'forwarder')
    .whereNotNull('trial_end')
    .orderBy('created_at', 'asc')
    .limit(200)
    .select('id', 'created_at');

  if (forwarders.length > 0) {
    const now = new Date().toISOString();
    const thisMonth = now.slice(0, 7);

    const rows = forwarders.map((u: any, i: number) => ({
      id: crypto.randomUUID(),
      user_id: u.id,
      month_number: 1,
      target_cargos: 15,
      target_queries: 20,
      actual_cargos: 0,
      actual_queries: 0,
      status: 'active',
      probation_month: thisMonth,
      created_at: now,
      updated_at: now,
    }));

    await knex('forwarder_probation').insert(rows);
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('forwarder_probation');
}
