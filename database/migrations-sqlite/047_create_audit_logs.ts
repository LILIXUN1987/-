export async function up(knex: any): Promise<void> {
  const exists = await knex.schema.hasTable('audit_logs');
  if (!exists) {
    await knex.raw(`CREATE TABLE IF NOT EXISTS audit_logs (
      id varchar(36) primary key,
      action varchar(100) not null,
      target_type varchar(50) not null,
      target_id varchar(36),
      target_name varchar(200),
      detail text,
      operator_id varchar(36) not null,
      created_at datetime default current_timestamp
    )`);
  }
}

export async function down(knex: any): Promise<void> {
  await knex.schema.dropTableIfExists('audit_logs');
}
