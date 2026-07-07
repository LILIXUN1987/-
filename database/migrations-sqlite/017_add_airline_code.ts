import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('cargo_spaces', (table) => {
    table.string('airline_code', 10).nullable();
  });
  // SQLite 不支持 DROP COLUMN（旧版本），用 knex.raw 绕过
  await knex.raw('ALTER TABLE cargo_spaces DROP COLUMN warehouse_address');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('cargo_spaces', (table) => {
    table.dropColumn('airline_code');
    table.text('warehouse_address').nullable();
  });
}
