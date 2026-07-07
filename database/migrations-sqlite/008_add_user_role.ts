import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.string('role', 20).defaultTo('user');
  });
  // Update existing admin account
  await knex('users').where({ username: 'admin' }).update({ role: 'admin', status: 'approved' });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('role');
  });
}
