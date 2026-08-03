import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.string('port_city', 100).nullable();       // 公司所在城市
    table.string('port_code', 10).nullable();         // 所在口岸三字代码
    table.string('operable_ports', 500).nullable();   // 可操作口岸/城市（逗号分隔，最多10个）
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('port_city');
    table.dropColumn('port_code');
    table.dropColumn('operable_ports');
  });
}
