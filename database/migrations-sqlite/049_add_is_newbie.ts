export async function up(knex: any): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('users', 'is_newbie');
  if (!hasColumn) {
    await knex.raw("ALTER TABLE users ADD COLUMN is_newbie boolean not null default '0'");
  }
}

export async function down(knex: any): Promise<void> {
  // SQLite doesn't support DROP COLUMN easily
}
