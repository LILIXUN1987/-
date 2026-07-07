import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('agent_invitations', (table) => {
    table.string('inviter_english_name', 200).nullable();
    table.string('inviter_english_company', 300).nullable();
    table.boolean('reward_granted').defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('agent_invitations', (table) => {
    table.dropColumn('inviter_english_name');
    table.dropColumn('inviter_english_company');
    table.dropColumn('reward_granted');
  });
}
