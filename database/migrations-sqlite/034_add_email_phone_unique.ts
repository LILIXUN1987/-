import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email)');
  await knex.raw('CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique ON users(phone)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX IF EXISTS users_email_unique');
  await knex.raw('DROP INDEX IF EXISTS users_phone_unique');
}
