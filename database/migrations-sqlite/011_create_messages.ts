import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('messages', (table) => {
    table.string('id', 36).primary();
    table.string('sender_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('receiver_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('raw_message_id', 36).nullable().references('id').inTable('raw_messages').onDelete('SET NULL');
    table.text('content').notNullable();
    table.boolean('is_read').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index('receiver_id');
    table.index('sender_id');
    table.index('is_read');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('messages');
}
