import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasParentId = await knex.schema.hasColumn('users', 'parent_id');
  if (!hasParentId) {
    await knex.schema.alterTable('users', (t) => {
      t.string('parent_id', 36).nullable();
      t.boolean('company_verified').defaultTo(false);
      t.string('license_image', 500).nullable();
      t.index('parent_id');
    });
  }

  const hasInvites = await knex.schema.hasTable('team_invitations');
  if (!hasInvites) {
    await knex.schema.createTable('team_invitations', (t) => {
      t.string('id', 36).primary();
      t.string('admin_id', 36).notNullable();
      t.string('email', 200).notNullable();
      t.string('token', 100).notNullable().unique();
      t.string('status', 20).defaultTo('pending');
      t.timestamp('created_at').defaultTo(knex.fn.now());
      t.timestamp('accepted_at').nullable();
      t.index('admin_id');
      t.index('token');
    });
  }

  await knex('users').where({ plan_tier: 'enterprise' }).whereNull('company_verified').update({ company_verified: true });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('parent_id');
    t.dropColumn('company_verified');
    t.dropColumn('license_image');
  });
  await knex.schema.dropTableIfExists('team_invitations');
}
