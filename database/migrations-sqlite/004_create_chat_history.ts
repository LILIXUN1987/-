import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('chat_history', (table) => {
    table.string('id', 36).primary();
    table.string('session_id', 100).notNullable();
    table.text('user_message').notNullable();
    table.text('ai_response').notNullable();
    table.text('context_used').nullable(); // JSON array stored as text
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['session_id', 'created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('chat_history');
}
