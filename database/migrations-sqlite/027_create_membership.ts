import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('membership_plans', (table) => {
    table.string('id', 36).primary();
    table.string('name', 100).notNullable();
    table.integer('days').notNullable();
    table.decimal('price', 10, 2).notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('renewal_records', (table) => {
    table.string('id', 36).primary();
    table.string('user_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('plan_id', 36).nullable().references('id').inTable('membership_plans').onDelete('SET NULL');
    table.integer('days').notNullable();
    table.decimal('amount', 10, 2).defaultTo(0);
    table.string('remark', 200).nullable();
    table.string('created_by', 36).nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index('user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('renewal_records');
  await knex.schema.dropTableIfExists('membership_plans');
}
