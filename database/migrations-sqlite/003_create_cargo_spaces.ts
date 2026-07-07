import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('cargo_spaces', (table) => {
    table.string('id', 36).primary();
    table.string('uploaded_file_id', 36).nullable().references('id').inTable('uploaded_files').onDelete('SET NULL');
    table.string('region', 200).notNullable();
    table.string('warehouse_name', 500).notNullable();
    table.text('warehouse_address').nullable();
    table.decimal('available_cbm', 12, 2).notNullable();
    table.decimal('available_kg', 12, 2).notNullable();
    table.decimal('price_per_cbm', 12, 2).nullable();
    table.decimal('price_per_kg', 12, 2).nullable();
    table.string('currency', 10).defaultTo('CNY');
    table.date('valid_from').notNullable();
    table.date('valid_to').notNullable();
    table.string('cargo_type', 300).nullable();
    table.text('cargo_restrictions').nullable();
    table.string('contact_info', 500).nullable();
    table.text('notes').nullable();
    table.string('status', 20).defaultTo('available');
    table.text('raw_data').nullable(); // JSON stored as text in SQLite
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('region');
    table.index(['valid_from', 'valid_to']);
    table.index('status');
    table.index('cargo_type');
    table.index('uploaded_file_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('cargo_spaces');
}
