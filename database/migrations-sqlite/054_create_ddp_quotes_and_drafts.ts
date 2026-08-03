import type { Knex } from 'knex';

export async function up(knex: Knex) {
  // 1. DDP 报价表
  const hasQuotes = await knex.schema.hasTable('ddp_quotes');
  if (!hasQuotes) {
    await knex.schema.createTable('ddp_quotes', (t) => {
      t.string('id').primary();
      t.string('inquiry_id').notNullable().references('id').inTable('ddp_inquiries').onDelete('CASCADE');
      t.string('agent_user_id').notNullable();       // 报价的海外代理
      t.string('forwarder_user_id').notNullable();    // 被报价的中国货代/用户
      t.string('ocean_freight').nullable();           // 海运费
      t.string('clearance_fee').nullable();           // 清关费
      t.string('delivery_fee').nullable();            // 派送费
      t.string('duty_fee').nullable();                // 税费/关税
      t.string('other_fees').nullable();              // 其他费用
      t.string('total_price').nullable();             // 总价
      t.string('currency').defaultTo('USD');          // 货币
      t.string('valid_until').nullable();             // 报价有效期
      t.text('notes').nullable();                     // 备注
      t.string('status').defaultTo('pending');        // pending | accepted | rejected | expired
      t.text('reply_content').nullable();             // 报价附带的站内信回复内容
      t.string('created_at').defaultTo(knex.fn.now());
      t.string('updated_at').defaultTo(knex.fn.now());
    });
  }

  // 2. 代理入驻草稿表（跟踪未完成入驻的用户）
  const hasDrafts = await knex.schema.hasTable('ddp_onboarding_drafts');
  if (!hasDrafts) {
    await knex.schema.createTable('ddp_onboarding_drafts', (t) => {
      t.string('id').primary();
      t.string('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
      t.string('company_name').nullable();
      t.string('country').nullable();
      t.string('service_ports').nullable();
      t.string('contact_person').nullable();
      t.string('phone').nullable();
      t.string('email').nullable();
      t.integer('step_reached').defaultTo(1);         // 填写进度：1=开始 2=公司信息 3=服务信息
      t.string('created_at').defaultTo(knex.fn.now());
      t.string('updated_at').defaultTo(knex.fn.now());
    });
  }

  // 3. ddp_agents 表增加标签字段
  const hasTags = await knex.schema.hasColumn('ddp_agents', 'tags');
  if (!hasTags) {
    await knex.schema.alterTable('ddp_agents', (t) => {
      t.string('tags').nullable();      // 逗号分隔的热门路线标签
    });
  }
}

export async function down(knex: Knex) {
  await knex.schema.dropTableIfExists('ddp_quotes');
  await knex.schema.dropTableIfExists('ddp_onboarding_drafts');
  await knex.schema.alterTable('ddp_agents', (t) => {
    t.dropColumn('tags');
  });
}
