import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('customs_brokers', (table) => {
    table.decimal('export_fee', 10, 2).nullable();   // 出口报关费
    table.decimal('import_fee', 10, 2).nullable();   // 进口报关费
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('customs_brokers', (table) => {
    table.dropColumn('export_fee');
    table.dropColumn('import_fee');
  });
}
