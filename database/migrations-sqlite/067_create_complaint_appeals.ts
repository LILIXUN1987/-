import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('complaint_appeals', (table) => {
    table.string('id', 36).primary();
    table.string('complaint_id', 36).notNullable().references('id').inTable('complaints').onDelete('CASCADE');
    table.string('target_company', 300).notNullable();
    table.string('contact_info', 200).notNullable();
    table.text('appeal_reason').notNullable();
    table.text('evidence').nullable();
    table.string('status', 20).notNullable().defaultTo('pending'); // pending / approved / rejected
    table.string('created_by', 36).nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.string('reviewed_by', 36).nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('reviewed_at').nullable();
    table.text('review_note').nullable();
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('complaint_appeals');
}
