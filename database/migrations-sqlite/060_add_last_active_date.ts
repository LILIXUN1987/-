import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasCol = await knex.schema.hasColumn('users', 'last_active_date');
  if (!hasCol) {
    await knex.schema.alterTable('users', (table) => {
      table.string('last_active_date', 10).nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  // SQLite 不支持 DROP COLUMN，忽略回滚
}
