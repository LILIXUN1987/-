import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('port_services', (table) => {
    table.string('id', 36).primary();
    table.string('port_code', 10).notNullable();           // 三字代码
    table.string('port_name', 200).nullable();              // 口岸名称
    table.string('service_type', 50).notNullable();         // 报关行 / 车队 / 报关行+车队
    table.string('company_name', 300).notNullable();
    table.string('contact_person', 100).nullable();
    table.string('phone', 50).nullable();
    table.text('description').nullable();
    table.string('submitted_by', 36).nullable().references('id').inTable('users').onDelete('SET NULL');
    table.string('status', 20).defaultTo('approved');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index('port_code');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('port_services');
}
