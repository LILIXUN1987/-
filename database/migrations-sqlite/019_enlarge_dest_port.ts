import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // SQLite 不支持 ALTER COLUMN，重建列
  await knex.raw('ALTER TABLE cargo_spaces DROP COLUMN dest_port');
  await knex.schema.alterTable('cargo_spaces', (table) => {
    table.string('dest_port', 500).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('ALTER TABLE cargo_spaces DROP COLUMN dest_port');
  await knex.schema.alterTable('cargo_spaces', (table) => {
    table.string('dest_port', 100).nullable();
  });
}
