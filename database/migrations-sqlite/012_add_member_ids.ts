import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.string('jc_trans_id', 200).nullable();
    table.string('wca_id', 200).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('jc_trans_id');
    table.dropColumn('wca_id');
  });
}
