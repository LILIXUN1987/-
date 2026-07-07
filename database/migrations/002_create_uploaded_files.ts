import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('uploaded_files', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('original_filename', 500).notNullable();
    table.string('file_path', 1000).notNullable();
    table.string('file_type', 20).notNullable(); // excel, csv, pdf
    table.integer('file_size_bytes').notNullable();
    table.string('status', 20).notNullable().defaultTo('uploaded'); // uploaded, processing, processed, error, pending_mapping
    table.text('error_message').nullable();
    table.uuid('uploaded_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('row_count').nullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());

    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('uploaded_files');
}
