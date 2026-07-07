export async function up(knex: any): Promise<void> {
  const exists = await knex.schema.hasTable('push_subscriptions');
  if (!exists) {
    await knex.raw(`CREATE TABLE IF NOT EXISTS push_subscriptions (
      user_id varchar(36) primary key,
      endpoint varchar(500) not null,
      p256dh_key varchar(200) not null,
      auth_key varchar(200) not null,
      created_at datetime default current_timestamp
    )`);
  }
}

export async function down(knex: any): Promise<void> {
  await knex.schema.dropTableIfExists('push_subscriptions');
}
