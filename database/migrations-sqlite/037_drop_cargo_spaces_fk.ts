import { Knex } from 'knex';

/**
 * 移除 cargo_spaces.uploaded_file_id 的外键约束
 * 因为 uploaded_file_id 可能指向 uploaded_files 或 raw_messages，
 * 与单一外键约束冲突，导致文本录入时 FOREIGN KEY constraint failed
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw('PRAGMA foreign_keys = OFF');

  // 重建表，移除 uploaded_file_id 的外键约束
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS "cargo_spaces_v2" (
      "id" text not null primary key,
      "uploaded_file_id" text null,
      "region" text not null,
      "warehouse_name" text not null,
      "available_cbm" real not null,
      "available_kg" real not null,
      "price_per_cbm" real null,
      "price_per_kg" real null,
      "currency" text default 'CNY',
      "valid_from" text not null,
      "valid_to" text not null,
      "cargo_type" text null,
      "cargo_restrictions" text null,
      "contact_info" text null,
      "notes" text null,
      "status" text default 'available',
      "raw_data" text null,
      "created_at" text,
      "updated_at" text,
      "airline_code" text null,
      "origin_port" text null,
      "dest_port" text null,
      "view_count" integer default 0,
      "inquiry_count" integer default 0
    )
  `);

  // 复制所有数据
  await knex.raw(`
    INSERT INTO cargo_spaces_v2 (
      id, uploaded_file_id, region, warehouse_name,
      available_cbm, available_kg, price_per_cbm, price_per_kg,
      currency, valid_from, valid_to, cargo_type,
      cargo_restrictions, contact_info, notes, status,
      raw_data, created_at, updated_at,
      airline_code, origin_port, dest_port, view_count, inquiry_count
    )
    SELECT
      id, uploaded_file_id, region, warehouse_name,
      available_cbm, available_kg, price_per_cbm, price_per_kg,
      currency, valid_from, valid_to, cargo_type,
      cargo_restrictions, contact_info, notes, status,
      raw_data, created_at, updated_at,
      airline_code, origin_port, dest_port, view_count, inquiry_count
    FROM cargo_spaces
  `);

  // 删除旧表
  await knex.raw('DROP TABLE IF EXISTS "cargo_spaces"');

  // 重命名
  await knex.raw('ALTER TABLE cargo_spaces_v2 RENAME TO cargo_spaces');

  // 重建索引（不含 FK）
  await knex.raw('CREATE INDEX IF NOT EXISTS "idx_cargo_spaces_region" ON "cargo_spaces" ("region")');
  await knex.raw('CREATE INDEX IF NOT EXISTS "idx_cargo_spaces_valid" ON "cargo_spaces" ("valid_from", "valid_to")');
  await knex.raw('CREATE INDEX IF NOT EXISTS "idx_cargo_spaces_status" ON "cargo_spaces" ("status")');
  await knex.raw('CREATE INDEX IF NOT EXISTS "idx_cargo_spaces_cargo_type" ON "cargo_spaces" ("cargo_type")');
  await knex.raw('CREATE INDEX IF NOT EXISTS "idx_cargo_spaces_uploaded_file_id" ON "cargo_spaces" ("uploaded_file_id")');

  await knex.raw('PRAGMA foreign_keys = ON');
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('PRAGMA foreign_keys = OFF');
  await knex.raw('DROP TABLE IF EXISTS "cargo_spaces"');
  await knex.schema.createTable('cargo_spaces', (table) => {
    table.string('id', 36).primary();
    table.string('uploaded_file_id', 36).nullable().references('id').inTable('uploaded_files').onDelete('SET NULL');
    table.string('region', 200).notNullable();
    table.string('warehouse_name', 500).notNullable();
    table.decimal('available_cbm', 12, 2).notNullable();
    table.decimal('available_kg', 12, 2).notNullable();
    table.decimal('price_per_cbm', 12, 2).nullable();
    table.decimal('price_per_kg', 12, 2).nullable();
    table.string('currency', 10).defaultTo('CNY');
    table.date('valid_from').notNullable();
    table.date('valid_to').notNullable();
    table.string('cargo_type', 300).nullable();
    table.text('cargo_restrictions').nullable();
    table.string('contact_info', 500).nullable();
    table.text('notes').nullable();
    table.string('status', 20).defaultTo('available');
    table.text('raw_data').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.string('airline_code', 10).nullable();
    table.string('origin_port', 100).nullable();
    table.string('dest_port', 500).nullable();
    table.integer('view_count').defaultTo(0);
    table.integer('inquiry_count').defaultTo(0);
    table.index('region');
    table.index(['valid_from', 'valid_to']);
    table.index('status');
    table.index('cargo_type');
    table.index('uploaded_file_id');
  });
  await knex.raw('PRAGMA foreign_keys = ON');
}
