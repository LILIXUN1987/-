import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.boolean('notify_inquiry_email').defaultTo(true);
    table.boolean('notify_inquiry_site').defaultTo(true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('notify_inquiry_email');
    table.dropColumn('notify_inquiry_site');
  });
}
