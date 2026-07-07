import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('agent_invitations', (table) => {
    table.string('id', 36).primary();
    table.string('inviter_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('agent_email', 200).notNullable();
    table.string('agent_name', 200).nullable();
    table.string('invitee_user_id', 36).nullable().references('id').inTable('users').onDelete('SET NULL');
    table.string('status', 20).defaultTo('pending'); // pending / registered / expired
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('agent_invitations');
}
