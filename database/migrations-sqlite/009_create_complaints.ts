import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('complaints', (table) => {
    table.string('id', 36).primary();
    table.string('complaint_company', 300).notNullable();
    table.string('target_company', 300).notNullable();
    table.string('complaint_person', 100).notNullable();
    table.string('target_person', 100).notNullable();
    table.text('reason').notNullable();
    table.string('created_by', 36).nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('complaints');
}
