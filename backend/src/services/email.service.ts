import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import { env } from '../config/env';
import logger from '../utils/logger';
import { isBusinessRole } from '../types';

// ── Transporter (lazy init) ──
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    const { host, port, secure, user, pass } = env.smtp;
    if (!pass) {
      logger.warn('SMTP_PASS not configured, email sending disabled');
      transporter = null as any;
      return null as any;
    }
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }
  return transporter;
}

function isEnabled(): boolean {
  return !!env.smtp.pass;
}

// ── 社区优势对比模块（按角色不同版本） ──

/** 外贸行业版：查口碑、避坑、找渠道 */
const COMMUNITY_INTRO_TRADER = `
<div style="margin-top: 28px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
  <h3 style="color: #1a56db; font-size: 16px; margin-bottom: 12px;">🛡️ 外贸行业护航者 — 合作前先查口碑，让您不再被不诚信货代坑骗！</h3>

  <table style="width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.8; margin-bottom: 16px;">
    <tr style="background: #f0fdf4;">
      <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center; width: 33%;">
        <div style="font-size: 24px; margin-bottom: 4px;">🔍</div>
        <div style="font-weight: bold; color: #16a34a;">查口碑</div>
        <div style="color: #6b7280; font-size: 12px; margin-top: 4px;">合作前搜公司名<br/>看清被投诉记录<br/>再决定是否合作</div>
      </td>
      <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center; width: 33%;">
        <div style="font-size: 24px; margin-bottom: 4px;">📢</div>
        <div style="font-weight: bold; color: #dc2626;">曝黑幕</div>
        <div style="color: #6b7280; font-size: 12px; margin-top: 4px;">遇到不诚信一键发吐槽<br/>5家公司投诉→<br/><strong style="color: #dc2626;">全员提醒通知</strong></div>
      </td>
      <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center; width: 33%;">
        <div style="font-size: 24px; margin-bottom: 4px;">🤝</div>
        <div style="font-weight: bold; color: #1a56db;">找渠道</div>
        <div style="color: #6b7280; font-size: 12px; margin-top: 4px;">输入港口代码<br/>秒出推广信息<br/>直接联系货代报价</div>
      </td>
    </tr>
  </table>

  <table style="width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.8;">
    <tr style="background: #f9fafb;">
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-weight: bold; width: 30%;">场景</td>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb; background: #fef2f2; color: #dc2626; font-weight: bold; width: 35%;">❌ 以前您只能</td>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb; background: #f0fdf4; color: #16a34a; font-weight: bold; width: 35%;">✅ 现在您可以</td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-weight: bold;">遇到新货代</td>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">问同行、翻朋友圈、凭感觉</td>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb;"><strong>搜公司名，看有没有被吐槽过</strong></td>
    </tr>
    <tr style="background: #f9fafb;">
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-weight: bold;">被坑了</td>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">群里骂两句，下个人继续被骗</td>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb;"><strong>发吐槽→积累5家→管理员审核→全员提醒通知</strong></td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-weight: bold;">找特价舱位</td>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">群发几百条微信好友等回复</td>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb;"><strong>输入广州-LAX，所有推广信息全出来，一键联系</strong></td>
    </tr>
    <tr style="background: #f9fafb;">
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-weight: bold;">比价格</td>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">挨个打电话问，慢了就没了</td>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb;"><strong>系统自动匹配推送，有合适仓位马上通知您</strong></td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-weight: bold;">担心被骗保证金</td>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">只能听对方说"我们做了很多年"</td>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb;"><strong>公司实名注册+名片认证，身份真实可追溯</strong></td>
    </tr>
  </table>

  <p style="color: #6b7280; font-size: 12px; margin-top: 16px; text-align: center;">
    让您<strong style="color: #1a56db;">不再被坑</strong>，让他<strong style="color: #1a56db;">不再缺货</strong> — 共建诚信物流社区！
  </p>
  <p style="color: #6b7280; font-size: 11px; margin-top: 8px; text-align: center;">
    💬 有任何建议？欢迎在社区「群友建议」中留言，功能根据您的反馈不断完善中！
  </p>
</div>`;

/** 货运代理版：免费推广、精准获客、直接对接 */
const COMMUNITY_INTRO_FORWARDER = `
<div style="margin-top: 28px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
  <h3 style="color: #1a56db; font-size: 16px; margin-bottom: 12px;">📦 货代获客新渠道 — 免费发布，精准匹配，直接对接客户！</h3>

  <table style="width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.8; margin-bottom: 16px;">
    <tr style="background: #eff6ff;">
      <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center; width: 33%;">
        <div style="font-size: 24px; margin-bottom: 4px;">📢</div>
        <div style="font-weight: bold; color: #2563eb;">免费推广</div>
        <div style="color: #6b7280; font-size: 12px; margin-top: 4px;">录入舱位信息<br/>全网外贸群友可见<br/>不再群发朋友圈</div>
      </td>
      <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center; width: 33%;">
        <div style="font-size: 24px; margin-bottom: 4px;">🎯</div>
        <div style="font-weight: bold; color: #16a34a;">精准匹配</div>
        <div style="color: #6b7280; font-size: 12px; margin-top: 4px;">客户搜港口→自动匹配<br/>您的推广信息<br/>需求直接推送到站内信</div>
      </td>
      <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center; width: 33%;">
        <div style="font-size: 24px; margin-bottom: 4px;">💬</div>
        <div style="font-weight: bold; color: #9333ea;">直接对接</div>
        <div style="color: #6b7280; font-size: 12px; margin-top: 4px;">客户一键联系<br/>站内信即时沟通<br/>手机号自主交换</div>
      </td>
    </tr>
  </table>

  <table style="width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.8;">
    <tr style="background: #f9fafb;">
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-weight: bold; width: 30%;">场景</td>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb; background: #fef2f2; color: #dc2626; font-weight: bold; width: 35%;">❌ 以前您只能</td>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb; background: #f0fdf4; color: #16a34a; font-weight: bold; width: 35%;">✅ 现在您可以</td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-weight: bold;">推广特价</td>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">微信群刷屏、朋友圈发广告<br/>客户看不到就白发了</td>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb;"><strong>录入一次→全天展示→有需求的客户主动找您</strong></td>
    </tr>
    <tr style="background: #f9fafb;">
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-weight: bold;">找客户</td>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">加群加好友、求推荐、等询价</td>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb;"><strong>客户搜您的航线→自动匹配→需求推送到站内信</strong></td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-weight: bold;">沟通报价</td>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">打电话、加微信、反复报价</td>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb;"><strong>站内信即时沟通，满意后再交换手机号</strong></td>
    </tr>
    <tr style="background: #f9fafb;">
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-weight: bold;">建立信任</td>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">客户怕被骗、怕货代不靠谱</td>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb;"><strong>企业认证🏢+实名名片，客户更敢找您下单</strong></td>
    </tr>
  </table>

  <p style="color: #6b7280; font-size: 12px; margin-top: 16px; text-align: center;">
    他<strong style="color: #1a56db;">不再被坑</strong>，您<strong style="color: #1a56db;">不再缺货</strong> — 共建诚信物流社区！
  </p>
  <p style="color: #6b7280; font-size: 11px; margin-top: 8px; text-align: center;">
    💬 有任何建议？欢迎在社区「群友建议」中留言，功能根据您的反馈不断完善中！
  </p>
</div>`;

import { randomInt } from 'crypto';

// ── 生成验证码（加密安全随机） ──
function generateCode(): string {
  return String(randomInt(100000, 999999));
}

// ── 发送验证码邮件 ──
export async function sendVerificationCode(email: string, role?: string): Promise<void> {
  if (!isEnabled()) {
    logger.warn(`Email disabled, would send verification to ${email}`);
    return;
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分钟有效
  const id = uuidv4();

  await db('email_verifications').insert({
    id,
    email,
    code,
    expires_at: expiresAt.toISOString(),
    used: false,
  });

  // 根据角色选择不同的邮件广告
  const isBizRole = isBusinessRole(role || '');
  const introHtml = isBizRole ? COMMUNITY_INTRO_FORWARDER : COMMUNITY_INTRO_TRADER;
  const roleTitle = isBizRole ? '货运代理' : '外贸行业';

  const transport = getTransporter();
  await transport.sendMail({
    from: `"${env.smtp.fromName}" <${env.smtp.user}>`,
    to: email,
    subject: `您的注册验证码 - 123共享外贸物流社区（${roleTitle}）`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a56db;">123共享外贸物流社区</h2>
        <p>您好！欢迎注册${roleTitle}账号。</p>
        <p>您的注册验证码为：</p>
        <div style="background: #f3f4f6; padding: 16px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; border-radius: 8px; margin: 16px 0;">
          ${code}
        </div>
        <p style="color: #6b7280; font-size: 14px;">验证码有效期 10 分钟，请尽快完成验证。</p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">如果这不是您本人的操作，请忽略此邮件。</p>
        ${introHtml}
      </div>
    `,
  });

  logger.info(`验证码已发送至 ${email}（角色: ${roleTitle}）`);
}

// ── 校验验证码 ──
export async function verifyCode(email: string, code: string): Promise<boolean> {
  // 原子更新：一次查询完成校验+标记已用，防止并发 TOCTOU
  const result = await db('email_verifications')
    .where({ email, code, used: false })
    .where('expires_at', '>=', new Date().toISOString())
    .update({ used: true });

  // affected_rows > 0 表示成功标记了一条记录
  return result > 0;
}

// ── 发送询价通知邮件 ──
export async function sendInquiryNotification(
  toEmail: string,
  toName: string,
  senderName: string,
  keyword: string,
): Promise<void> {
  if (!isEnabled() || !toEmail) return;

  const frontendUrl = env.frontendUrl;
  const transport = getTransporter();

  try {
    await transport.sendMail({
      from: `"${env.smtp.fromName}" <${env.smtp.user}>`,
      to: toEmail,
      subject: `📢 您有新的询价 - ${keyword.substring(0, 20)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a56db;">123共享外贸物流社区</h2>
          <p>${toName} 您好！</p>
          <p>用户 <strong>${senderName}</strong> 对您的推广信息产生了兴趣，并已通过系统发送了询价需求：</p>
          <div style="background: #f3f4f6; padding: 12px; border-radius: 8px; margin: 12px 0; font-size: 14px;">
            🔍 查询内容：${keyword.substring(0, 50)}
          </div>
          <p>请登录系统查看详细询价信息并进行回复：</p>
          <a href="${frontendUrl}/admin/inbox" style="display: inline-block; background: #1a56db; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 8px 0;">
            查看询价并回复
          </a>
          <p style="color: #6b7280; font-size: 13px; margin-top: 16px;">
            ⚠️ 请勿直接回复此邮件，所有沟通请通过系统站内信进行。
          </p>
          ${COMMUNITY_INTRO_TRADER}
        </div>
      `,
    });
    logger.info(`询价通知邮件已发送至 ${toEmail}`);
  } catch (err) {
    logger.error(`发送询价通知邮件失败 ${toEmail}:`, err);
  }
}

// ── DDP 询价邮件（英文，推送给海外代理） ──
export async function sendDdpInquiryEmail(
  toEmail: string,
  agentName: string,
  country: string,
  goodsDesc: string,
  notes: string,
  inquirerName: string,
  inquirerCompany: string,
): Promise<void> {
  if (!isEnabled() || !toEmail) return;
  const frontendUrl = env.frontendUrl;
  const transport = getTransporter();

  try {
    await transport.sendMail({
      from: `"${env.smtp.fromName}" <${env.smtp.user}>`,
      to: toEmail,
      subject: `🌍 New DDP Inquiry from China to ${country}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a56db;">🌍 123 Cargo Community</h2>
          <p>Hi <strong>${agentName}</strong>,</p>
          <p>A Chinese forwarder is looking for DDP service to <strong>${country}</strong> and you've been matched!</p>
          <div style="background: #f0f7ff; border-left: 4px solid #1a56db; padding: 16px; margin: 16px 0; border-radius: 4px;">
            <p style="margin: 0 0 8px 0; font-weight: bold;">📋 Inquiry Details:</p>
            <p style="margin: 4px 0;">📍 Destination: <strong>${country}</strong></p>
            ${goodsDesc ? `<p style="margin: 4px 0;">📦 Cargo: ${goodsDesc}</p>` : ''}
            ${notes ? `<p style="margin: 4px 0;">📐 Pcs/Weight/Dims: ${notes}</p>` : ''}
            <p style="margin: 4px 0; color: #6b7280; font-size: 13px;">👤 Inquirer: ${inquirerCompany} ${inquirerName}</p>
          </div>
          <p style="font-size: 14px; line-height: 1.6;">Please log in to reply with your quote via internal message:</p>
          <a href="${frontendUrl}/admin/inbox" style="display: block; text-align: center; background: #1a56db; color: white; padding: 14px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; margin: 16px 0;">
            📬 Reply with Quote
          </a>
          <p style="color: #6b7280; font-size: 13px;">⚠️ Please do not reply to this email. All communication should be through the platform's internal messaging.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">123 Cargo Community</p>
        </div>
      `,
    });
    logger.info(`DDP询价邮件已发送至 ${toEmail}`);
  } catch (err) {
    logger.error(`发送DDP询价邮件失败 ${toEmail}:`, err);
  }
}

// ── 新消息邮件通知（站内信触发） ──
export async function sendNewMessageNotification(
  toEmail: string,
  toName: string,
  senderName: string,
  senderCompany: string,
  contentPreview: string,
): Promise<void> {
  if (!isEnabled() || !toEmail) return;

  const frontendUrl = env.frontendUrl;
  const transport = getTransporter();

  try {
    await transport.sendMail({
      from: `"${env.smtp.fromName}" <${env.smtp.user}>`,
      to: toEmail,
      subject: `💬 您收到了一条新消息 - ${senderCompany || senderName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a56db;">123共享外贸物流社区</h2>
          <p>${toName} 您好！</p>
          <p>用户 <strong>${senderCompany ? `${senderCompany} ` : ''}${senderName}</strong> 给您发了一条消息：</p>
          <div style="background: #f3f4f6; padding: 12px; border-radius: 8px; margin: 12px 0; font-size: 14px; white-space: pre-wrap;">
            ${contentPreview.substring(0, 300)}
          </div>
          <p>请登录系统查看并回复：</p>
          <a href="${frontendUrl}/admin/inbox" style="display: inline-block; background: #1a56db; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 8px 0;">
            进入收件箱回复
          </a>
          <p style="color: #6b7280; font-size: 13px; margin-top: 16px;">
            ⚠️ 请勿直接回复此邮件，所有沟通请通过系统站内信进行。
          </p>
          ${COMMUNITY_INTRO_FORWARDER}
        </div>
      `,
    });
    logger.info(`新消息通知邮件已发送至 ${toEmail}`);
  } catch (err) {
    logger.error(`发送新消息通知邮件失败 ${toEmail}:`, err);
  }
}

// ── 账号开通通知邮件（管理员批量导入后用） ──
export async function sendAccountActivationEmail(
  toEmail: string,
  toName: string,
  companyName: string,
  username: string,
  password: string,
): Promise<void> {
  if (!isEnabled() || !toEmail) return;

  const frontendUrl = env.frontendUrl;
  const transport = getTransporter();

  try {
    await transport.sendMail({
      from: `"${env.smtp.fromName}" <${env.smtp.user}>`,
      to: toEmail,
      subject: `🎉 您的 123共享外贸物流社区 账号已开通`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a56db;">123共享外贸物流社区</h2>
          <p>${toName} 您好！</p>
          <p>您在 <strong>${companyName}</strong> 的名片已被录入，现已为您开通社区账号：</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0; font-size: 14px;">
            <p style="margin: 4px 0;"><strong>用户名：</strong>${username}</p>
            <p style="margin: 4px 0;"><strong>密码：</strong>${password}</p>
          </div>
          <p style="color: #dc2626; font-size: 13px;">⚠️ 建议首次登录后立即修改密码</p>
          <a href="${frontendUrl}/login" style="display: inline-block; background: #1a56db; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 8px 0;">
            立即登录
          </a>
          <p style="color: #6b7280; font-size: 13px; margin-top: 12px;">
            登录后可发布推广信息、查询舱位、联系客户。</p>
          ${COMMUNITY_INTRO_FORWARDER}
        </div>
      `,
    });
    logger.info(`账号开通邮件已发送至 ${toEmail}`);
  } catch (err) {
    logger.error(`发送账号开通邮件失败 ${toEmail}:`, err);
  }
}

// ── 未登录提醒邮件 ──
export async function sendInactiveReminderEmail(
  toEmail: string,
  toName: string,
  username: string,
): Promise<void> {
  if (!isEnabled() || !toEmail) return;

  const frontendUrl = env.frontendUrl;
  const transport = getTransporter();

  try {
    await transport.sendMail({
      from: `"${env.smtp.fromName}" <${env.smtp.user}>`,
      to: toEmail,
      subject: `🔔 ${toName}，您的社区账号已开通，快来体验吧！`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a56db;">123共享外贸物流社区</h2>
          <p>${toName} 您好！</p>
          <p>您的账号已开通但还未登录，快来社区发布推广信息、查询舱位吧！</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0; font-size: 14px;">
            <p style="margin: 4px 0;"><strong>用户名：</strong>${username}</p>
            <p style="margin: 4px 0;"><strong>密码：</strong>已发送到您的注册邮箱，如有遗忘可点击「忘记密码」重置</p>
          </div>
          <a href="${frontendUrl}/login" style="display: inline-block; background: #1a56db; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 8px 0;">
            立即登录
          </a>
          ${COMMUNITY_INTRO_FORWARDER}
        </div>
      `,
    });
    logger.info(`未登录提醒邮件已发送至 ${toEmail}`);
  } catch (err) {
    logger.error(`发送未登录提醒邮件失败 ${toEmail}:`, err);
  }
}

/** 律师咨询第一封站内信发送时，同步发外部邮件提醒 */
export async function sendLegalConsultEmail(
  toEmail: string,
  toName: string,
  senderCompany: string,
  senderName: string,
  senderPhone: string,
  content: string,
): Promise<void> {
  if (!isEnabled() || !toEmail) return;

  const frontendUrl = env.frontendUrl;
  const transport = getTransporter();

  try {
    await transport.sendMail({
      from: `"${env.smtp.fromName}" <${env.smtp.user}>`,
      to: toEmail,
      subject: `⚖️ 社区律师咨询通知 - ${senderCompany || senderName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #d97706;">123共享外贸物流社区 · 法律咨询</h2>
          <p>尊敬的 ${toName} 律师，您好！</p>
          <p>有社区用户向您发起了法律咨询，详情如下：</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #fefce8; border-radius: 8px;">
            <tr><td style="padding: 8px 12px; font-size: 13px; color: #6b7280;">咨询人</td><td style="padding: 8px 12px; font-weight: bold;">${senderCompany || ''} ${senderName}</td></tr>
            <tr><td style="padding: 8px 12px; font-size: 13px; color: #6b7280;">联系方式</td><td style="padding: 8px 12px;">${senderPhone || '未提供'}</td></tr>
            <tr><td style="padding: 8px 12px; font-size: 13px; color: #6b7280;">咨询内容</td><td style="padding: 8px 12px; white-space: pre-wrap;">${content.substring(0, 500)}</td></tr>
          </table>
          <a href="${frontendUrl}/admin/inbox" style="display: inline-block; background: #d97706; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 8px 0;">
            进入收件箱回复
          </a>
          <p style="color: #6b7280; font-size: 13px; margin-top: 16px;">
            ⚠️ 请勿直接回复此邮件，所有沟通请通过系统站内信进行。
          </p>
        </div>
      `,
    });
    logger.info(`律师咨询邮件已发送至 ${toEmail}`);
  } catch (err) {
    logger.error(`发送律师咨询邮件失败 ${toEmail}:`, err);
  }
}

/** 会员到期提醒邮件 */
export async function sendTrialExpiryReminderEmail(
  toEmail: string,
  toName: string,
  trialEnd: string,
  remainingDays: number,
): Promise<void> {
  if (!isEnabled() || !toEmail) return;
  const frontendUrl = env.frontendUrl;
  const transport = getTransporter();
  const subject = remainingDays <= 0
    ? '⚠️ 您的社区会员已过期，请及时续期'
    : `⚠️ 您的社区会员将在 ${remainingDays} 天后到期`;

  try {
    await transport.sendMail({
      from: `"${env.smtp.fromName}" <${env.smtp.user}>`,
      to: toEmail,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #dc2626;">123共享外贸物流社区</h2>
          <p>${toName} 您好！</p>
          ${remainingDays <= 0
            ? `<p>您的社区会员已于 <strong>${trialEnd}</strong> 过期，部分功能已受限。</p>`
            : `<p>您的社区会员将于 <strong>${trialEnd}</strong> 到期，还剩 <strong style="color: #dc2626; font-size: 18px;">${remainingDays}</strong> 天。</p>`
          }
          <p>到期后以下功能将受限：</p>
          <ul style="color: #6b7280; font-size: 13px; line-height: 1.8;">
            <li>❌ 数据录入（文本解析录入、文件上传）</li>
            <li>❌ 发送新消息</li>
            <li>✅ 查询功能正常</li>
            <li>✅ 收件箱可接收消息</li>
          </ul>
          <a href="${frontendUrl}/admin/renew" style="display: inline-block; background: #1a56db; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 8px 0;">立即续期</a>
          <p style="color: #6b7280; font-size: 12px; margin-top: 12px;">如有疑问，请联系管理员。</p>
        </div>
      `,
    });
    logger.info(`到期提醒邮件已发送至 ${toEmail}${remainingDays > 0 ? `（剩余 ${remainingDays} 天）` : '（已过期）'}`);
  } catch (err) {
    logger.error(`发送到期提醒邮件失败 ${toEmail}:`, err);
  }
}

// ── 邀请海外代理入驻邮件（英文） ──
export async function sendInvitationEmail(params: {
  toEmail: string;
  agentName: string;
  inviterName: string;
  inviterCompany: string;
  registerUrl: string;
}): Promise<void> {
  if (!isEnabled() || !params.toEmail) return;
  const transport = getTransporter();

  const inviterInfo = params.inviterCompany
    ? `${params.inviterCompany} (${params.inviterName})`
    : params.inviterName;

  try {
    await transport.sendMail({
      from: `"${env.smtp.fromName}" <${env.smtp.user}>`,
      to: params.toEmail,
      subject: `${params.inviterName} invited you to join 123 Cargo Community — China freight network`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a56db;">🤝 123 Cargo Community</h2>
          <p>Hi <strong>${params.agentName}</strong>,</p>
          <p>Your partner <strong>${inviterInfo}</strong> has invited you to join <strong>123 Cargo Community</strong> — a growing network of Chinese freight forwarders looking for reliable overseas agents like you.</p>

          <div style="background: #f0f7ff; border-left: 4px solid #1a56db; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 15px;"><strong>Why join?</strong></p>
          </div>

          <table style="width: 100%; font-size: 14px; line-height: 1.8; color: #374151;">
            <tr><td style="padding: 4px 0;">🌍</td><td style="padding: 4px 8px;"><strong>Receive direct inquiries</strong> — Chinese forwarders search for DDP/clearance/delivery partners daily</td></tr>
            <tr><td style="padding: 4px 0;">✅</td><td style="padding: 4px 8px;"><strong>Zero membership fee</strong> — No annual fees. Free to join, free to connect</td></tr>
            <tr><td style="padding: 4px 0;">🤝</td><td style="padding: 4px 8px;"><strong>Build trust with track record</strong> — Complete jobs, earn credit score, get recommended</td></tr>
            <tr><td style="padding: 4px 0;">📬</td><td style="padding: 4px 8px;"><strong>Built-in messaging</strong> — Communicate directly within the platform</td></tr>
            <tr><td style="padding: 4px 0;">🔒</td><td style="padding: 4px 8px;"><strong>Verified partners</strong> — Every Chinese forwarder is company-verified</td></tr>
          </table>

          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0; font-size: 14px;">
            <p style="margin: 4px 0; font-weight: bold;">📋 How it works:</p>
            <p style="margin: 8px 0 4px 0;">1. Register in 1 minute — just your email and company info</p>
            <p style="margin: 4px 0;">2. Set up your profile — tell forwarders what services you offer</p>
            <p style="margin: 4px 0;">3. Start receiving inquiries — forwarders will message you directly</p>
          </div>

          <a href="${params.registerUrl}" style="display: block; text-align: center; background: #1a56db; color: white; padding: 14px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; margin: 20px 0;">
            👉 Accept Invitation & Register
          </a>

          <p style="color: #6b7280; font-size: 13px;">Your partner ${params.inviterName} will be notified once you join.</p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">
            Best regards,<br />
            123 Cargo Community Team<br />
            <a href="https://123cargo123.com" style="color: #1a56db;">123cargo123.com</a>
          </p>
        </div>
      `,
    });
    logger.info(`邀请邮件已发送至 ${params.toEmail}`);
  } catch (err) {
    logger.error(`发送邀请邮件失败 ${params.toEmail}:`, err);
    throw err;
  }
}
