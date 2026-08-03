import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('customs_brokers', (table) => {
    table.string('air_ports', 500).nullable();    // 空运口岸（逗号分隔，最多5个）
    table.string('sea_ports', 500).nullable();    // 海运口岸（逗号分隔，最多5个）
    table.string('import_port', 10).nullable();   // 进口口岸（仅1个）
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('customs_brokers', (table) => {
    table.dropColumn('air_ports');
    table.dropColumn('sea_ports');
    table.dropColumn('import_port');
  });
}
