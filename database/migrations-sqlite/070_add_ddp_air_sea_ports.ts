import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('ddp_agents', (table) => {
    table.string('air_ports', 500).nullable();   // 可操作空运港口（逗号分隔）
    table.string('sea_ports', 500).nullable();   // 可操作海运港口（逗号分隔）
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('ddp_agents', (table) => {
    table.dropColumn('air_ports');
    table.dropColumn('sea_ports');
  });
}
