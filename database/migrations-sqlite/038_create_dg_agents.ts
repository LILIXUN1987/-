import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('dg_agents', (table) => {
    table.string('id', 36).primary();
    table.string('company_name', 300).notNullable();
    table.string('contact_person', 100).nullable();
    table.string('phone', 30).nullable();
    table.string('service_categories', 500).nullable();
    table.text('description').nullable();
    table.string('status', 20).defaultTo('approved');
    table.string('created_by', 36).nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('dg_agents');
}
