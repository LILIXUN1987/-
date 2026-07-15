import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasColumn = async (col: string) => knex.schema.hasColumn('users', col);

  const changes: string[] = [];

  if (!(await hasColumn('role'))) {
    await knex.schema.alterTable('users', (t) => { t.string('role', 20).defaultTo('trader'); });
    changes.push('role');
  }
  if (!(await hasColumn('email'))) {
    await knex.schema.alterTable('users', (t) => { t.string('email', 200).nullable().unique(); });
    changes.push('email');
  }
  if (!(await hasColumn('phone'))) {
    await knex.schema.alterTable('users', (t) => { t.string('phone', 50).nullable(); });
    changes.push('phone');
  }
  if (!(await hasColumn('company_name'))) {
    await knex.schema.alterTable('users', (t) => { t.string('company_name', 300).nullable(); });
    changes.push('company_name');
  }
  if (!(await hasColumn('gender'))) {
    await knex.schema.alterTable('users', (t) => { t.string('gender', 10).nullable(); });
    changes.push('gender');
  }
  if (!(await hasColumn('card_image'))) {
    await knex.schema.alterTable('users', (t) => { t.string('card_image', 500).nullable(); });
    changes.push('card_image');
  }
  if (!(await hasColumn('avatar'))) {
    await knex.schema.alterTable('users', (t) => { t.string('avatar', 500).nullable(); });
    changes.push('avatar');
  }
  if (!(await hasColumn('bio'))) {
    await knex.schema.alterTable('users', (t) => { t.text('bio').nullable(); });
    changes.push('bio');
  }
  if (!(await hasColumn('status'))) {
    await knex.schema.alterTable('users', (t) => { t.string('status', 20).defaultTo('pending'); });
    changes.push('status');
  }
  if (!(await hasColumn('trial_end'))) {
    await knex.schema.alterTable('users', (t) => { t.string('trial_end', 10).nullable(); });
    changes.push('trial_end');
  }
  if (!(await hasColumn('referral_code'))) {
    await knex.schema.alterTable('users', (t) => { t.string('referral_code', 50).nullable(); });
    changes.push('referral_code');
  }
  if (!(await hasColumn('jc_trans_id'))) {
    await knex.schema.alterTable('users', (t) => { t.string('jc_trans_id', 100).nullable(); });
    changes.push('jc_trans_id');
  }
  if (!(await hasColumn('wca_id'))) {
    await knex.schema.alterTable('users', (t) => { t.string('wca_id', 100).nullable(); });
    changes.push('wca_id');
  }
  if (!(await hasColumn('email_verified'))) {
    await knex.schema.alterTable('users', (t) => { t.integer('email_verified').defaultTo(0); });
    changes.push('email_verified');
  }
  if (!(await hasColumn('is_verified_company'))) {
    await knex.schema.alterTable('users', (t) => { t.integer('is_verified_company').defaultTo(0); });
    changes.push('is_verified_company');
  }
  if (!(await hasColumn('company_license'))) {
    await knex.schema.alterTable('users', (t) => { t.string('company_license', 500).nullable(); });
    changes.push('company_license');
  }
  if (!(await hasColumn('notify_inquiry_email'))) {
    await knex.schema.alterTable('users', (t) => { t.integer('notify_inquiry_email').defaultTo(1); });
    changes.push('notify_inquiry_email');
  }
  if (!(await hasColumn('notify_inquiry_site'))) {
    await knex.schema.alterTable('users', (t) => { t.integer('notify_inquiry_site').defaultTo(1); });
    changes.push('notify_inquiry_site');
  }
  if (!(await hasColumn('notify_all_messages_email'))) {
    await knex.schema.alterTable('users', (t) => { t.integer('notify_all_messages_email').defaultTo(0); });
    changes.push('notify_all_messages_email');
  }
  if (!(await hasColumn('is_newbie'))) {
    await knex.schema.alterTable('users', (t) => { t.integer('is_newbie').defaultTo(0); });
    changes.push('is_newbie');
  }
  if (!(await hasColumn('token_version'))) {
    await knex.schema.alterTable('users', (t) => { t.integer('token_version').defaultTo(0); });
    changes.push('token_version');
  }
  if (!(await hasColumn('password_hash'))) {
    // already exists, skip
  }

  console.log('Added columns:', changes.join(', ') || 'none needed');
}

export async function down(knex: Knex): Promise<void> {
  // SQLite doesn't support DROP COLUMN, and PG migration is additive only
}
