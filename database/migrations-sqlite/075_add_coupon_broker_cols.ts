import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('customs_coupons', (table) => {
    table.string('broker_id', 36).nullable();
    table.string('port_city', 100).nullable();
    table.string('transport_mode', 20).nullable();
    table.text('claim_trace').nullable();
    table.string('coupon_target', 10).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('customs_coupons', (table) => {
    table.dropColumn('broker_id');
    table.dropColumn('port_city');
    table.dropColumn('transport_mode');
    table.dropColumn('claim_trace');
    table.dropColumn('coupon_target');
  });
}
