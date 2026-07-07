import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.string('gender', 10).nullable();
    table.string('company_name', 300).nullable();
    table.string('phone', 30).nullable();
    table.string('card_image', 500).nullable(); // 名片图片路径
    table.string('status', 20).defaultTo('pending'); // pending/approved/rejected
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('gender');
    table.dropColumn('company_name');
    table.dropColumn('phone');
    table.dropColumn('card_image');
    table.dropColumn('status');
  });
}
