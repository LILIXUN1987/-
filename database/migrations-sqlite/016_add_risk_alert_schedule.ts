import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('risk_alerts', (table) => {
    table.string('next_send_at', 30).nullable();
    table.string('last_sent_at', 30).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('risk_alerts', (table) => {
    table.dropColumn('next_send_at');
    table.dropColumn('last_sent_at');
  });
}
