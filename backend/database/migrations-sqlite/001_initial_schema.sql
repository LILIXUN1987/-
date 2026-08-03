-- 初始数据库迁移 (从现有 SQLite 导出)
-- 生成时间: 2026-07-26T07:23:21.909Z
-- 表数量: 50

CREATE TABLE IF NOT EXISTS `agent_invitations` (`id` varchar(36), `inviter_id` varchar(36) not null, `agent_email` varchar(200) not null, `agent_name` varchar(200) null, `invitee_user_id` varchar(36) null, `status` varchar(20) default 'pending', `created_at` datetime default CURRENT_TIMESTAMP, `inviter_english_name` varchar(200) null, `inviter_english_company` varchar(300) null, `reward_granted` boolean default '0', foreign key(`inviter_id`) references `users`(`id`) on delete CASCADE, foreign key(`invitee_user_id`) references `users`(`id`) on delete SET NULL, primary key (`id`));

CREATE TABLE IF NOT EXISTS `api_keys` (`id` varchar(36), `user_id` varchar(36) not null, `key_prefix` varchar(8) not null, `key_hash` varchar(128) not null, `name` varchar(100) not null default '默认密钥', `status` varchar(20) not null default 'active', `last_used_at` datetime null, `created_at` datetime default CURRENT_TIMESTAMP, foreign key(`user_id`) references `users`(`id`) on delete CASCADE, primary key (`id`));

CREATE TABLE IF NOT EXISTS audit_logs (
      id varchar(36) primary key,
      action varchar(100) not null,
      target_type varchar(50) not null,
      target_id varchar(36),
      target_name varchar(200),
      detail text,
      operator_id varchar(36) not null,
      created_at datetime default current_timestamp
    );

CREATE TABLE IF NOT EXISTS `broker_reviews` (`id` varchar(36), `broker_id` varchar(36) not null, `user_id` varchar(36) not null, `coupon_id` varchar(36) null, `service_rating` integer not null, `efficiency_rating` integer not null, `problem_rating` integer null, `comment` text null, `created_at` varchar(30) default CURRENT_TIMESTAMP, primary key (`id`));

CREATE TABLE IF NOT EXISTS card_batches (
    id TEXT PRIMARY KEY,
    name TEXT,
    source TEXT DEFAULT 'exhibition',
    total INTEGER DEFAULT 0,
    invited INTEGER DEFAULT 0,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "cargo_spaces" (
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
    , `uploaded_by` varchar(36) null);

CREATE TABLE IF NOT EXISTS `cargo_view_logs` (`id` varchar(36), `cargo_id` varchar(36) not null, `view_date` varchar(20) not null, `created_at` datetime default CURRENT_TIMESTAMP, primary key (`id`));

CREATE TABLE IF NOT EXISTS `chat_history` (`id` varchar(36), `session_id` varchar(100) not null, `user_message` text not null, `ai_response` text not null, `context_used` text null, `created_at` datetime default CURRENT_TIMESTAMP, primary key (`id`));

CREATE TABLE IF NOT EXISTS `code_reference` (`code` varchar(10) not null, `type` varchar(20) not null, `name_en` varchar(200) not null, `name_cn` varchar(200) not null, `city` varchar(100) null, `country` varchar(100) null, `icao` varchar(10) null);

CREATE TABLE IF NOT EXISTS collected_cards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    company TEXT,
    phone TEXT,
    email TEXT,
    role TEXT DEFAULT 'forwarder',
    card_image TEXT,
    notes TEXT,
    batch_id TEXT,
    invited INTEGER DEFAULT 0,
    invited_at TEXT,
    registered INTEGER DEFAULT 0,
    registered_user_id TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `complaints` (`id` varchar(36), `complaint_company` varchar(300) not null, `target_company` varchar(300) not null, `complaint_person` varchar(100) not null, `target_person` varchar(100) not null, `reason` text not null, `created_by` varchar(36) null, `created_at` datetime default CURRENT_TIMESTAMP, foreign key(`created_by`) references `users`(`id`) on delete SET NULL, primary key (`id`));

CREATE TABLE IF NOT EXISTS `contact_downloads` (`id` varchar(36), `user_id` varchar(36) not null, `payment_id` varchar(36) null, `amount` float not null default '10', `contact_count` integer null, `created_at` datetime default CURRENT_TIMESTAMP, foreign key(`user_id`) references `users`(`id`) on delete CASCADE, primary key (`id`));

CREATE TABLE IF NOT EXISTS `cooperations` (`id` varchar(36), `agent_user_id` varchar(36) not null, `forwarder_user_id` varchar(36) not null, `agent_company` varchar(300) null, `forwarder_company` varchar(300) null, `service_type` varchar(100) null, `description` text null, `status` varchar(20) default 'pending', `confirmed_at` datetime null, `created_at` datetime default CURRENT_TIMESTAMP, foreign key(`agent_user_id`) references `users`(`id`) on delete CASCADE, foreign key(`forwarder_user_id`) references `users`(`id`) on delete CASCADE, primary key (`id`));

CREATE TABLE IF NOT EXISTS `coupon_usage_records` (`id` varchar(36), `coupon_id` varchar(36) not null, `broker_id` varchar(36) null, `trader_id` varchar(36) not null, `status` varchar(20) not null default 'pending', `customs_decl_number` varchar(100) null, `item_count` integer null, `extra_fee` float null, `inspection_fee` float null, `decl_info` text null, `completed_at` datetime null, `settled` boolean not null default '0', `settled_at` datetime null, `created_at` datetime default CURRENT_TIMESTAMP, foreign key(`coupon_id`) references `customs_coupons`(`id`) on delete CASCADE, foreign key(`broker_id`) references `customs_brokers`(`id`) on delete SET NULL, foreign key(`trader_id`) references `users`(`id`) on delete CASCADE, primary key (`id`));

CREATE TABLE IF NOT EXISTS `customs_brokers` (`id` varchar(36), `company_name` varchar(200) not null, `contact_person` varchar(100) null, `phone` varchar(50) null, `port_code` varchar(10) not null default '5141', `port_name` varchar(200) null default '广州白云机场', `unit_price` float not null default '50', `daily_limit` integer not null default '50', `is_active` boolean not null default '1', `created_at` datetime default CURRENT_TIMESTAMP, `created_by` varchar(36) null, `total_contributed` integer default '0', `remaining_contributed` integer default '0', `service_type` varchar(20) default 'sea', `can_import` boolean default '0', `wechat` varchar(100) null, `intro` text null, `fee_per_decl` float null, `commitment_notes` text null, `view_count` integer default '0', `avg_rating` float default '0', `review_count` integer default '0', `claim_count` integer default '0', `return_customer_count` integer default '0', primary key (`id`));

CREATE TABLE IF NOT EXISTS `customs_coupons` (`id` varchar(36), `subscription_id` varchar(36) null, `forwarder_id` varchar(36) not null, `trader_id` varchar(36) null, `face_value` float not null default '50', `month` varchar(7) not null, `status` varchar(20) not null default 'issued', `sent_at` datetime null, `used_at` datetime null, `order_number` varchar(100) null, `created_at` datetime default CURRENT_TIMESTAMP, `broker_id` varchar(36) null, `port_city` varchar(100) null, `transport_mode` varchar(10) default 'sea', `claim_trace` text null, foreign key(`subscription_id`) references `monthly_subscriptions`(`id`) on delete SET NULL, foreign key(`forwarder_id`) references `users`(`id`) on delete CASCADE, foreign key(`trader_id`) references `users`(`id`) on delete SET NULL, primary key (`id`));

CREATE TABLE IF NOT EXISTS `ddp_agents` (`id` varchar(36), `company_name` varchar(300) not null, `contact_person` varchar(100) null, `email` varchar(200) null, `phone` varchar(30) null, `country` varchar(100) not null, `city` varchar(100) null, `service_ports` varchar(500) null, `service_types` varchar(200) null, `description` text null, `reference_price` text null, `completed_orders` integer default '0', `status` varchar(20) default 'pending', `created_by` varchar(36) null, `created_at` datetime default CURRENT_TIMESTAMP, `tags` varchar(255) null, foreign key(`created_by`) references `users`(`id`) on delete SET NULL, primary key (`id`));

CREATE TABLE IF NOT EXISTS `ddp_inquiries` (`id` varchar(36), `country` varchar(100) not null, `port` varchar(100) null, `goods_desc` text null, `weight_kg` float null, `volume_cbm` float null, `address` text null, `user_id` varchar(36) null, `created_at` datetime default CURRENT_TIMESTAMP, `hs_code` varchar(50) null, `notes` text null, `file_paths` text null, foreign key(`user_id`) references `users`(`id`) on delete SET NULL, primary key (`id`));

CREATE TABLE IF NOT EXISTS `ddp_onboarding_drafts` (`id` varchar(255), `user_id` varchar(255) not null, `company_name` varchar(255) null, `country` varchar(255) null, `service_ports` varchar(255) null, `contact_person` varchar(255) null, `phone` varchar(255) null, `email` varchar(255) null, `step_reached` integer default '1', `created_at` varchar(255) default CURRENT_TIMESTAMP, `updated_at` varchar(255) default CURRENT_TIMESTAMP, foreign key(`user_id`) references `users`(`id`) on delete CASCADE, primary key (`id`));

CREATE TABLE IF NOT EXISTS `ddp_quotes` (`id` varchar(255), `inquiry_id` varchar(255) not null, `agent_user_id` varchar(255) not null, `forwarder_user_id` varchar(255) not null, `ocean_freight` varchar(255) null, `clearance_fee` varchar(255) null, `delivery_fee` varchar(255) null, `duty_fee` varchar(255) null, `other_fees` varchar(255) null, `total_price` varchar(255) null, `currency` varchar(255) default 'USD', `valid_until` varchar(255) null, `notes` text null, `status` varchar(255) default 'pending', `reply_content` text null, `created_at` varchar(255) default CURRENT_TIMESTAMP, `updated_at` varchar(255) default CURRENT_TIMESTAMP, foreign key(`inquiry_id`) references `ddp_inquiries`(`id`) on delete CASCADE, primary key (`id`));

CREATE TABLE IF NOT EXISTS `dg_agents` (`id` varchar(36), `company_name` varchar(300) not null, `contact_person` varchar(100) null, `phone` varchar(30) null, `service_categories` varchar(500) null, `description` text null, `status` varchar(20) default 'approved', `created_by` varchar(36) null, `created_at` datetime default CURRENT_TIMESTAMP, `type` varchar(10) default 'air', `ports` varchar(500) null, foreign key(`created_by`) references `users`(`id`) on delete SET NULL, primary key (`id`));

CREATE TABLE IF NOT EXISTS `dg_cases` (`id` varchar(36), `agent_id` varchar(36) null, `agent_name` varchar(200) null, `title` varchar(300) not null, `content` text not null, `status` varchar(20) default 'pending', `created_by` varchar(36) null, `approved_by` varchar(36) null, `created_at` datetime default CURRENT_TIMESTAMP, `processed_at` datetime null, `un_number` varchar(50) null, `awb_number` varchar(100) null, `file_paths` text null, `type` varchar(10) default 'air', `checklist` text null, `port` varchar(100) null, foreign key(`agent_id`) references `dg_agents`(`id`) on delete SET NULL, foreign key(`created_by`) references `users`(`id`) on delete SET NULL, foreign key(`approved_by`) references `users`(`id`) on delete SET NULL, primary key (`id`));

CREATE TABLE IF NOT EXISTS `dg_faqs` (`id` varchar(36), `type` varchar(10) default 'air', `question` varchar(500) not null, `answer` text not null, `status` varchar(20) default 'pending', `created_by` varchar(36) null, `answered_by` varchar(36) null, `created_at` datetime default CURRENT_TIMESTAMP, `answered_at` datetime null, foreign key(`created_by`) references `users`(`id`) on delete SET NULL, foreign key(`answered_by`) references `users`(`id`) on delete SET NULL, primary key (`id`));

CREATE TABLE IF NOT EXISTS `dg_knowledge` (`id` varchar(36), `title` varchar(300) not null, `content` text not null, `sort_order` integer default '0', `created_by` varchar(36) null, `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP, foreign key(`created_by`) references `users`(`id`) on delete SET NULL, primary key (`id`));

CREATE TABLE IF NOT EXISTS `dispute_cases` (`id` varchar(36), `cooperation_id` varchar(36) null, `filed_by` varchar(36) not null, `respondent_id` varchar(36) not null, `title` varchar(300) not null, `description` text not null, `evidence` text null, `status` varchar(20) default 'pending', `verdict` text null, `resolved_by` varchar(36) null, `resolved_at` datetime null, `created_at` datetime default CURRENT_TIMESTAMP, foreign key(`cooperation_id`) references `cooperations`(`id`) on delete SET NULL, foreign key(`filed_by`) references `users`(`id`) on delete CASCADE, foreign key(`respondent_id`) references `users`(`id`) on delete CASCADE, foreign key(`resolved_by`) references `users`(`id`) on delete SET NULL, primary key (`id`));

CREATE TABLE IF NOT EXISTS `email_verifications` (`id` varchar(36), `email` varchar(200) not null, `code` varchar(6) not null, `expires_at` datetime not null, `used` boolean default '0', `created_at` datetime default CURRENT_TIMESTAMP, primary key (`id`));

CREATE TABLE IF NOT EXISTS `favorites` (`id` varchar(36), `user_id` varchar(36) not null, `cargo_id` varchar(36) not null, `created_at` datetime default CURRENT_TIMESTAMP, foreign key(`user_id`) references `users`(`id`) on delete CASCADE, foreign key(`cargo_id`) references `cargo_spaces`(`id`) on delete CASCADE, primary key (`id`));

CREATE TABLE IF NOT EXISTS `file_downloads` (`id` varchar(36), `file_id` varchar(36) not null, `user_id` varchar(36) not null, `file_name` varchar(500) null, `downloader_company` varchar(300) null, `downloader_name` varchar(100) null, `created_at` datetime default CURRENT_TIMESTAMP, foreign key(`file_id`) references `uploaded_files`(`id`) on delete CASCADE, foreign key(`user_id`) references `users`(`id`) on delete CASCADE, primary key (`id`));

CREATE TABLE IF NOT EXISTS `import_batches` (`id` varchar(36), `file_name` varchar(300) null, `total` integer default '0', `success` integer default '0', `skipped` integer default '0', `email_failed` integer default '0', `created_by` varchar(36) null, `created_at` datetime default CURRENT_TIMESTAMP, foreign key(`created_by`) references `users`(`id`) on delete SET NULL, primary key (`id`));

CREATE TABLE IF NOT EXISTS `membership_plans` (`id` varchar(36), `name` varchar(100) not null, `days` integer not null, `price` float not null, `is_active` boolean default '1', `created_at` datetime default CURRENT_TIMESTAMP, primary key (`id`));

CREATE TABLE IF NOT EXISTS `messages` (`id` varchar(36), `sender_id` varchar(36) not null, `receiver_id` varchar(36) not null, `raw_message_id` varchar(36) null, `content` text not null, `is_read` boolean default '0', `created_at` datetime default CURRENT_TIMESTAMP, `inquiry_id` varchar(36) null, `read_at` datetime null, attachments TEXT DEFAULT NULL, foreign key(`sender_id`) references `users`(`id`) on delete CASCADE, foreign key(`receiver_id`) references `users`(`id`) on delete CASCADE, foreign key(`raw_message_id`) references `raw_messages`(`id`) on delete SET NULL, primary key (`id`));

CREATE TABLE IF NOT EXISTS `monthly_subscriptions` (`id` varchar(36), `user_id` varchar(36) not null, `status` varchar(20) not null default 'active', `current_month` varchar(7) null, `amount` float not null default '19.9', `last_paid_at` datetime null, `created_at` datetime default CURRENT_TIMESTAMP, foreign key(`user_id`) references `users`(`id`) on delete CASCADE, primary key (`id`));

CREATE TABLE IF NOT EXISTS `nav_links` (`id` varchar(36), `title` varchar(300) not null, `url` varchar(1000) not null, `category` varchar(100) not null, `description` varchar(500) null, `submitted_by` varchar(36) null, `vote_count` integer default '0', `status` varchar(20) default 'approved', `created_at` datetime default CURRENT_TIMESTAMP, foreign key(`submitted_by`) references `users`(`id`) on delete SET NULL, primary key (`id`));

CREATE TABLE IF NOT EXISTS payment_orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    plan_id TEXT,
    amount REAL NOT NULL,
    days INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    alipay_trade_no TEXT,
    alipay_buyer_id TEXT,
    paid_at TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
, remark TEXT, `channel` varchar(20) null, `pay_trade_no` varchar(100) null);

CREATE TABLE IF NOT EXISTS `peer_invitations` (`id` varchar(36), `inviter_id` varchar(36) not null, `referee_name` varchar(100) not null, `referee_email` varchar(200) not null, `referee_company` varchar(300) null, `referee_username` varchar(100) null, `referee_password` varchar(100) null, `referee_id` varchar(36) null, `status` varchar(20) default 'pending', `bonus_days` integer default '0', `created_at` datetime default CURRENT_TIMESTAMP, foreign key(`inviter_id`) references `users`(`id`) on delete CASCADE, foreign key(`referee_id`) references `users`(`id`) on delete SET NULL, primary key (`id`));

CREATE TABLE IF NOT EXISTS `port_services` (`id` varchar(36), `port_code` varchar(10) not null, `port_name` varchar(200) null, `service_type` varchar(50) not null, `company_name` varchar(300) not null, `contact_person` varchar(100) null, `phone` varchar(50) null, `description` text null, `submitted_by` varchar(36) null, `status` varchar(20) default 'approved', `created_at` datetime default CURRENT_TIMESTAMP, foreign key(`submitted_by`) references `users`(`id`) on delete SET NULL, primary key (`id`));

CREATE TABLE IF NOT EXISTS push_subscriptions (
      user_id varchar(36) primary key,
      endpoint varchar(500) not null,
      p256dh_key varchar(200) not null,
      auth_key varchar(200) not null,
      created_at datetime default current_timestamp
    );

CREATE TABLE IF NOT EXISTS quote_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    origin TEXT,
    dest TEXT,
    cargo_desc TEXT,
    weight_kg REAL,
    volume_cbm REAL,
    quantity INTEGER DEFAULT 1,
    transport_mode TEXT DEFAULT 'air',
    notes TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
, packaging TEXT);

CREATE TABLE IF NOT EXISTS quotes (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    forwarder_id TEXT NOT NULL,
    price_amount REAL NOT NULL,
    currency TEXT DEFAULT 'CNY',
    transit_days INTEGER,
    valid_until TEXT,
    notes TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES quote_requests(id),
    FOREIGN KEY (forwarder_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS `raw_messages` (`id` varchar(36), `content` text not null, `keywords` varchar(500) null, `uploaded_by` varchar(36) null, `created_at` datetime default CURRENT_TIMESTAMP, category TEXT DEFAULT NULL, primary key (`id`));

CREATE TABLE IF NOT EXISTS `referral_clicks` (`id` varchar(36), `referral_code` varchar(20) not null, `ip` varchar(45) null, `referrer_url` varchar(500) null, `user_agent` varchar(500) null, `created_at` datetime default CURRENT_TIMESTAMP, primary key (`id`));

CREATE TABLE IF NOT EXISTS `referrals` (`id` varchar(36), `referrer_id` varchar(36) not null, `referee_id` varchar(36) not null, `bonus_days` integer default '3', `created_at` datetime default CURRENT_TIMESTAMP, foreign key(`referrer_id`) references `users`(`id`) on delete CASCADE, foreign key(`referee_id`) references `users`(`id`) on delete CASCADE, primary key (`id`));

CREATE TABLE IF NOT EXISTS `renewal_records` (`id` varchar(36), `user_id` varchar(36) not null, `plan_id` varchar(36) null, `days` integer not null, `amount` float default '0', `remark` varchar(200) null, `created_by` varchar(36) null, `created_at` datetime default CURRENT_TIMESTAMP, foreign key(`user_id`) references `users`(`id`) on delete CASCADE, foreign key(`plan_id`) references `membership_plans`(`id`) on delete SET NULL, foreign key(`created_by`) references `users`(`id`) on delete SET NULL, primary key (`id`));

CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    reviewer_id TEXT NOT NULL,
    reviewee_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reviewer_id) REFERENCES users(id),
    FOREIGN KEY (reviewee_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS `risk_alerts` (`id` varchar(36), `target_company` varchar(300) not null, `complaint_count` integer not null, `status` varchar(20) default 'pending', `created_by` varchar(36) null, `approved_by` varchar(36) null, `created_at` datetime default CURRENT_TIMESTAMP, `processed_at` datetime null, `next_send_at` varchar(30) null, `last_sent_at` varchar(30) null, foreign key(`created_by`) references `users`(`id`), foreign key(`approved_by`) references `users`(`id`), primary key (`id`));

CREATE TABLE IF NOT EXISTS `search_logs` (`id` varchar(36), `user_id` varchar(36) null, `keyword` varchar(200) null, `category` varchar(50) null, `has_push` boolean default '0', `created_at` varchar(30) default CURRENT_TIMESTAMP, primary key (`id`));

CREATE TABLE IF NOT EXISTS `suggestions` (`id` varchar(36), `suggester_name` varchar(100) not null, `suggester_company` varchar(300) not null, `content` text not null, `status` varchar(20) default 'pending', `created_by` varchar(36) null, `created_at` datetime default CURRENT_TIMESTAMP, foreign key(`created_by`) references `users`(`id`) on delete SET NULL, primary key (`id`));

CREATE TABLE IF NOT EXISTS `team_invitations` (`id` varchar(36), `admin_id` varchar(36) not null, `email` varchar(200) not null, `token` varchar(100) not null, `status` varchar(20) default 'pending', `created_at` datetime default CURRENT_TIMESTAMP, `accepted_at` datetime null, primary key (`id`));

CREATE TABLE IF NOT EXISTS `uploaded_files` (`id` varchar(36), `original_filename` varchar(500) not null, `file_path` varchar(1000) not null, `file_type` varchar(20) not null, `file_size_bytes` integer not null, `status` varchar(20) not null default 'uploaded', `error_message` text null, `uploaded_by` varchar(36) not null, `row_count` integer null, `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP, `download_count` integer default '0', foreign key(`uploaded_by`) references `users`(`id`) on delete CASCADE, primary key (`id`));

CREATE TABLE IF NOT EXISTS `users` (`id` varchar(36), `username` varchar(100) not null, `password_hash` varchar(255) not null, `display_name` varchar(100) not null, `created_at` datetime default CURRENT_TIMESTAMP, `updated_at` datetime default CURRENT_TIMESTAMP, `gender` varchar(10) null, `company_name` varchar(300) null, `phone` varchar(30) null, `card_image` varchar(500) null, `status` varchar(20) default 'pending', `role` varchar(20) default 'user', `jc_trans_id` varchar(200) null, `wca_id` varchar(200) null, `trial_end` varchar(20) null, `referral_code` varchar(20) null, `email` varchar(200) null, `email_verified` boolean default '0', `notify_inquiry_email` boolean default '1', `notify_inquiry_site` boolean default '1', `token_version` integer not null default '0', `is_verified_company` boolean not null default '0', `company_license` varchar(500) null, bio TEXT DEFAULT NULL, avatar TEXT DEFAULT NULL, `registered_ip` varchar(45) null, `last_login_at` varchar(30) null, `last_reminder_at` varchar(30) null, `notify_all_messages_email` boolean not null default '0', is_newbie boolean not null default '0', `last_active_date` varchar(10) null, `plan_tier` varchar(20) default 'standard', `plan_updated_at` datetime null, `parent_id` varchar(36) null, `company_verified` boolean default '0', `license_image` varchar(500) null, primary key (`id`));

-- 索引

CREATE INDEX `cargo_view_logs_cargo_id_view_date_index` on `cargo_view_logs` (`cargo_id`, `view_date`);

CREATE INDEX `chat_history_session_id_created_at_index` on `chat_history` (`session_id`, `created_at`);

CREATE INDEX `code_reference_code_index` on `code_reference` (`code`);

CREATE INDEX `code_reference_type_index` on `code_reference` (`type`);

CREATE INDEX `complaints_created_at_index` on `complaints` (`created_at`);

CREATE INDEX `contact_downloads_user_id_index` on `contact_downloads` (`user_id`);

CREATE INDEX `coupon_usage_records_broker_id_index` on `coupon_usage_records` (`broker_id`);

CREATE INDEX `coupon_usage_records_coupon_id_index` on `coupon_usage_records` (`coupon_id`);

CREATE INDEX `coupon_usage_records_status_index` on `coupon_usage_records` (`status`);

CREATE INDEX `customs_coupons_forwarder_id_index` on `customs_coupons` (`forwarder_id`);

CREATE INDEX `customs_coupons_status_index` on `customs_coupons` (`status`);

CREATE INDEX `customs_coupons_trader_id_index` on `customs_coupons` (`trader_id`);

CREATE UNIQUE INDEX `ddp_onboarding_drafts_user_id_unique` on `ddp_onboarding_drafts` (`user_id`);

CREATE INDEX `dg_cases_status_index` on `dg_cases` (`status`);

CREATE INDEX `dg_faqs_status_index` on `dg_faqs` (`status`);

CREATE INDEX `dg_faqs_type_index` on `dg_faqs` (`type`);

CREATE INDEX `email_verifications_code_index` on `email_verifications` (`code`);

CREATE INDEX `email_verifications_email_index` on `email_verifications` (`email`);

CREATE UNIQUE INDEX `favorites_user_id_cargo_id_unique` on `favorites` (`user_id`, `cargo_id`);

CREATE INDEX `favorites_user_id_index` on `favorites` (`user_id`);

CREATE INDEX idx_cards_batch ON collected_cards(batch_id);

CREATE INDEX idx_cards_email ON collected_cards(email);

CREATE INDEX "idx_cargo_spaces_cargo_type" ON "cargo_spaces" ("cargo_type");

CREATE INDEX "idx_cargo_spaces_region" ON "cargo_spaces" ("region");

CREATE INDEX "idx_cargo_spaces_status" ON "cargo_spaces" ("status");

CREATE INDEX "idx_cargo_spaces_uploaded_file_id" ON "cargo_spaces" ("uploaded_file_id");

CREATE INDEX "idx_cargo_spaces_valid" ON "cargo_spaces" ("valid_from", "valid_to");

CREATE UNIQUE INDEX `idx_coop_pair` on `cooperations` (`agent_user_id`, `forwarder_user_id`);

CREATE INDEX idx_payment_orders_user ON payment_orders(user_id);

CREATE INDEX idx_quote_requests_user ON quote_requests(user_id);

CREATE INDEX idx_quotes_forwarder ON quotes(forwarder_id);

CREATE INDEX idx_quotes_request ON quotes(request_id);

CREATE INDEX `idx_raw_messages_category` on `raw_messages` (`category`);

CREATE INDEX `idx_raw_messages_created_at` on `raw_messages` (`created_at`);

CREATE INDEX `idx_raw_messages_dedup` on `raw_messages` (`uploaded_by`, `content`);

CREATE INDEX `idx_raw_messages_uploaded_by` on `raw_messages` (`uploaded_by`);

CREATE INDEX idx_reviews_reviewee ON reviews(reviewee_id);

CREATE INDEX `messages_inquiry_id_index` on `messages` (`inquiry_id`);

CREATE INDEX `messages_is_read_index` on `messages` (`is_read`);

CREATE INDEX `messages_receiver_id_index` on `messages` (`receiver_id`);

CREATE INDEX `messages_sender_id_index` on `messages` (`sender_id`);

CREATE INDEX `monthly_subscriptions_user_id_index` on `monthly_subscriptions` (`user_id`);

CREATE INDEX `port_services_port_code_index` on `port_services` (`port_code`);

CREATE UNIQUE INDEX `referrals_referee_id_unique` on `referrals` (`referee_id`);

CREATE INDEX `referrals_referrer_id_index` on `referrals` (`referrer_id`);

CREATE INDEX `renewal_records_user_id_index` on `renewal_records` (`user_id`);

CREATE INDEX `risk_alerts_status_index` on `risk_alerts` (`status`);

CREATE INDEX `search_logs_created_at_index` on `search_logs` (`created_at`);

CREATE INDEX `team_invitations_admin_id_index` on `team_invitations` (`admin_id`);

CREATE INDEX `team_invitations_token_index` on `team_invitations` (`token`);

CREATE UNIQUE INDEX `team_invitations_token_unique` on `team_invitations` (`token`);

CREATE INDEX `uploaded_files_status_index` on `uploaded_files` (`status`);

CREATE UNIQUE INDEX users_email_unique ON users(email);

CREATE INDEX `users_parent_id_index` on `users` (`parent_id`);

CREATE UNIQUE INDEX users_phone_unique ON users(phone);

CREATE UNIQUE INDEX `users_referral_code_unique` on `users` (`referral_code`);

CREATE UNIQUE INDEX `users_username_unique` on `users` (`username`);

