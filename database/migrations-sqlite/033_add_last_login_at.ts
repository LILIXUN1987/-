import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.string('last_login_at', 30).nullable();
    table.string('last_reminder_at', 30).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('last_login_at');
    table.dropColumn('last_reminder_at');
  });
}
