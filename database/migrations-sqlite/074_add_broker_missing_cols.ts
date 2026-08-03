import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('customs_brokers', (table) => {
    table.string('created_by', 36).nullable();
    table.string('service_type', 20).nullable().defaultTo('both');
    table.boolean('can_import').defaultTo(false);
    table.string('wechat', 100).nullable();
    table.text('intro').nullable();
    table.decimal('fee_per_decl', 10, 2).nullable();
    table.text('commitment_notes').nullable();
    table.integer('total_contributed').defaultTo(0);
    table.integer('remaining_contributed').defaultTo(0);
    table.integer('claim_count').defaultTo(0);
    table.integer('view_count').defaultTo(0);
    table.integer('return_customer_count').defaultTo(0);
    table.decimal('avg_rating', 3, 2).nullable();
    table.integer('review_count').defaultTo(0);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('customs_brokers', (table) => {
    table.dropColumn('created_by');
    table.dropColumn('service_type');
    table.dropColumn('can_import');
    table.dropColumn('wechat');
    table.dropColumn('intro');
    table.dropColumn('fee_per_decl');
    table.dropColumn('commitment_notes');
    table.dropColumn('total_contributed');
    table.dropColumn('remaining_contributed');
    table.dropColumn('claim_count');
    table.dropColumn('view_count');
    table.dropColumn('return_customer_count');
    table.dropColumn('avg_rating');
    table.dropColumn('review_count');
  });
}
