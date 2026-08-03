import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import { env } from '../config/env';
import logger from '../utils/logger';
import { isBusinessRole } from '../types';

// ── Transporter (lazy init) ──
let transporter: nodemailer.Transporter | null = null;

export function getTransporter(): nodemailer.Transporter {
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

// ══════════════════════════════════════════════════════════════
// 社区介绍模块 — 中文版
// ══════════════════════════════════════════════════════════════

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
  <p style="color: #6b7280; font-size: 12px; margin-top: 16px; text-align: center;">
    让您<strong style="color: #1a56db;">不再被坑</strong>，让他<strong style="color: #1a56db;">不再缺货</strong> — 共建诚信物流社区！
  </p>
  <p style="color: #6b7280; font-size: 11px; margin-top: 8px; text-align: center;">
    💬 有任何建议？欢迎在社区「群友建议」中留言！
  </p>
</div>`;

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
        <div style="color: #6b7280; font-size: 12px; margin-top: 4px;">客户搜港口→自动匹配<br/>需求直接推送到站内信</div>
      </td>
      <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center; width: 33%;">
        <div style="font-size: 24px; margin-bottom: 4px;">💬</div>
        <div style="font-weight: bold; color: #9333ea;">直接对接</div>
        <div style="color: #6b7280; font-size: 12px; margin-top: 4px;">客户一键联系<br/>站内信即时沟通<br/>手机号自主交换</div>
      </td>
    </tr>
  </table>
  <p style="color: #6b7280; font-size: 12px; margin-top: 16px; text-align: center;">
    他<strong style="color: #1a56db;">不再被坑</strong>，您<strong style="color: #1a56db;">不再缺货</strong> — 共建诚信物流社区！
  </p>
  <p style="color: #6b7280; font-size: 11px; margin-top: 8px; text-align: center;">
    💬 有任何建议？欢迎在社区「群友建议」中留言！
  </p>
</div>`;

// ══════════════════════════════════════════════════════════════
// 社区介绍模块 — 英文版
// ══════════════════════════════════════════════════════════════

const COMMUNITY_INTRO_TRADER_EN = `
<div style="margin-top: 28px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
  <h3 style="color: #1a56db; font-size: 16px; margin-bottom: 12px;">🛡️ Your Industry Shield — Check reputation before working with any forwarder!</h3>
  <table style="width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.8; margin-bottom: 16px;">
    <tr style="background: #f0fdf4;">
      <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center; width: 33%;">
        <div style="font-size: 24px; margin-bottom: 4px;">🔍</div>
        <div style="font-weight: bold; color: #16a34a;">Check Reputation</div>
        <div style="color: #6b7280; font-size: 12px; margin-top: 4px;">Search company name<br/>See complaints history<br/>Decide before cooperating</div>
      </td>
      <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center; width: 33%;">
        <div style="font-size: 24px; margin-bottom: 4px;">📢</div>
        <div style="font-weight: bold; color: #dc2626;">Report Bad Actors</div>
        <div style="color: #6b7280; font-size: 12px; margin-top: 4px;">One-click complaint<br/>5 reports trigger<br/><strong style="color: #dc2626;">community-wide alert</strong></div>
      </td>
      <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center; width: 33%;">
        <div style="font-size: 24px; margin-bottom: 4px;">🤝</div>
        <div style="font-weight: bold; color: #1a56db;">Find Partners</div>
        <div style="color: #6b7280; font-size: 12px; margin-top: 4px;">Enter port code<br/>See listings instantly<br/>Contact forwarders directly</div>
      </td>
    </tr>
  </table>
  <p style="color: #6b7280; font-size: 12px; margin-top: 16px; text-align: center;">
    Building a trusted logistics community together!
  </p>
</div>`;

const COMMUNITY_INTRO_FORWARDER_EN = `
<div style="margin-top: 28px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
  <h3 style="color: #1a56db; font-size: 16px; margin-bottom: 12px;">📦 New Client Acquisition — Post free, get matched, connect directly!</h3>
  <table style="width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.8; margin-bottom: 16px;">
    <tr style="background: #eff6ff;">
      <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center; width: 33%;">
        <div style="font-size: 24px; margin-bottom: 4px;">📢</div>
        <div style="font-weight: bold; color: #2563eb;">Free Listings</div>
        <div style="color: #6b7280; font-size: 12px; margin-top: 4px;">Post cargo space once<br/>Visible to all traders<br/>No more WeChat spam</div>
      </td>
      <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center; width: 33%;">
        <div style="font-size: 24px; margin-bottom: 4px;">🎯</div>
        <div style="font-weight: bold; color: #16a34a;">Smart Matching</div>
        <div style="color: #6b7280; font-size: 12px; margin-top: 4px;">Clients search ports<br/>Your listing appears<br/>Leads sent to your inbox</div>
      </td>
      <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center; width: 33%;">
        <div style="font-size: 24px; margin-bottom: 4px;">💬</div>
        <div style="font-weight: bold; color: #9333ea;">Direct Contact</div>
        <div style="color: #6b7280; font-size: 12px; margin-top: 4px;">Clients contact you<br/>In-app messaging<br/>Share phone when ready</div>
      </td>
    </tr>
  </table>
  <p style="color: #6b7280; font-size: 12px; margin-top: 16px; text-align: center;">
    Building a trusted logistics community together!
  </p>
</div>`;

import { randomInt } from 'crypto';

function generateCode(): string {
  return String(randomInt(100000, 999999));
}

/** 根据语言和角色选择社区介绍模块 */
function communityIntro(isBiz: boolean, lang: string): string {
  if (lang === 'en') return isBiz ? COMMUNITY_INTRO_FORWARDER_EN : COMMUNITY_INTRO_TRADER_EN;
  return isBiz ? COMMUNITY_INTRO_FORWARDER : COMMUNITY_INTRO_TRADER;
}

// ══════════════════════════════════════════════════════════════
// 发送验证码邮件
// ══════════════════════════════════════════════════════════════
export async function sendVerificationCode(email: string, role?: string): Promise<void> {
  if (!isEnabled()) {
    logger.warn(`Email disabled, would send verification to ${email}`);
    return;
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const id = uuidv4();

  await db('email_verifications').insert({
    id, email, code,
    expires_at: expiresAt.toISOString(),
    used: false,
  });

  const isBizRole = isBusinessRole(role || '');
  const lang = role === 'overseas_agent' ? 'en' : 'zh';
  const roleTitle = role === 'overseas_agent' ? 'Overseas Agent'
    : isBizRole ? 'Forwarder'
    : 'Trader';
  const roleTitleZh = isBizRole ? '货运代理' : '外贸行业';
  const subject = lang === 'en'
    ? `Your verification code - 123 Cargo Community (${roleTitle})`
    : `您的注册验证码 - 123共享外贸物流社区（${roleTitleZh}）`;

  const transport = getTransporter();
  await transport.sendMail({
    from: `"${env.smtp.fromName}" <${env.smtp.user}>`,
    to: email,
    subject,
    html: lang === 'en' ? `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a56db;">123 Cargo Community</h2>
        <p>Hello!</p>
        <p>Your registration verification code:</p>
        <div style="background: #f3f4f6; padding: 16px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; border-radius: 8px; margin: 16px 0;">
          ${code}
        </div>
        <p style="color: #6b7280; font-size: 14px;">Valid for 10 minutes.</p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">If you did not request this, please ignore this email.</p>
        ${communityIntro(isBizRole, lang)}
      </div>
    ` : `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a56db;">123共享外贸物流社区</h2>
        <p>您好！欢迎注册${roleTitleZh}账号。</p>
        <p>您的注册验证码为：</p>
        <div style="background: #f3f4f6; padding: 16px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; border-radius: 8px; margin: 16px 0;">
          ${code}
        </div>
        <p style="color: #6b7280; font-size: 14px;">验证码有效期 10 分钟，请尽快完成验证。</p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">如果这不是您本人的操作，请忽略此邮件。</p>
        ${communityIntro(isBizRole, lang)}
      </div>
    `,
  });

  logger.info(`Verification email sent to ${email} (lang: ${lang})`);
}

export async function verifyCode(email: string, code: string): Promise<boolean> {
  const result = await db('email_verifications')
    .where({ email, code, used: false })
    .where('expires_at', '>=', new Date().toISOString())
    .update({ used: true });
  return result > 0;
}

// ══════════════════════════════════════════════════════════════
// 询价通知邮件
// ══════════════════════════════════════════════════════════════
export async function sendInquiryNotification(
  toEmail: string, toName: string, senderName: string, keyword: string,
  lang: string = 'zh',
): Promise<void> {
  if (!isEnabled() || !toEmail) return;
  // 跳过退件邮箱
  try { const b = await db('users').where({ email: toEmail, email_bounced: 1 }).first(); if (b) return; } catch {}
  const frontendUrl = env.frontendUrl;
  const transport = getTransporter();
  const subject = lang === 'en'
    ? `📢 New inquiry - ${keyword.substring(0, 20)}`
    : `📢 您有新的询价 - ${keyword.substring(0, 20)}`;

  try {
    await transport.sendMail({
      from: `"${env.smtp.fromName}" <${env.smtp.user}>`,
      to: toEmail,
      subject,
      html: lang === 'en' ? `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a56db;">123 Cargo Community</h2>
          <p>Hi ${toName},</p>
          <p><strong>${senderName}</strong> is interested in your listing and sent an inquiry:</p>
          <div style="background: #f3f4f6; padding: 12px; border-radius: 8px; margin: 12px 0; font-size: 14px;">
            🔍 ${keyword.substring(0, 50)}
          </div>
          <a href="${frontendUrl}/admin/inbox" style="display: inline-block; background: #1a56db; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 8px 0;">
            View Inquiry & Reply
          </a>
          <p style="color: #6b7280; font-size: 13px; margin-top: 16px;">⚠️ Do not reply directly to this email.</p>
          ${COMMUNITY_INTRO_FORWARDER_EN}
        </div>
      ` : `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a56db;">123共享外贸物流社区</h2>
          <p>${toName} 您好！</p>
          <p>用户 <strong>${senderName}</strong> 对您的推广信息产生了兴趣：</p>
          <div style="background: #f3f4f6; padding: 12px; border-radius: 8px; margin: 12px 0; font-size: 14px;">
            🔍 查询内容：${keyword.substring(0, 50)}
          </div>
          <a href="${frontendUrl}/admin/inbox" style="display: inline-block; background: #1a56db; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 8px 0;">
            查看询价并回复
          </a>
          <p style="color: #6b7280; font-size: 13px; margin-top: 16px;">⚠️ 请勿直接回复此邮件。</p>
          ${COMMUNITY_INTRO_FORWARDER}
        </div>
      `,
    });
    logger.info(`Inquiry notification sent to ${toEmail}`);
  } catch (err) {
    logger.error(`Failed to send inquiry notification to ${toEmail}:`, err);
  }
}

// ══════════════════════════════════════════════════════════════
// DDP 询价邮件（英文，专为海外代理设计）
// ══════════════════════════════════════════════════════════════
export async function sendDdpInquiryEmail(
  toEmail: string, agentName: string, country: string,
  goodsDesc: string, notes: string,
  inquirerName: string, inquirerCompany: string,
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
          <p>A Chinese forwarder is looking for DDP service to <strong>${country}</strong>!</p>
          <div style="background: #f0f7ff; border-left: 4px solid #1a56db; padding: 16px; margin: 16px 0; border-radius: 4px;">
            <p style="margin: 0 0 8px 0; font-weight: bold;">📋 Inquiry Details:</p>
            <p style="margin: 4px 0;">📍 Destination: <strong>${country}</strong></p>
            ${goodsDesc ? `<p style="margin: 4px 0;">📦 Cargo: ${goodsDesc}</p>` : ''}
            ${notes ? `<p style="margin: 4px 0;">📐 ${notes}</p>` : ''}
            <p style="margin: 4px 0; color: #6b7280; font-size: 13px;">👤 From: ${inquirerCompany} ${inquirerName}</p>
          </div>
          <a href="${frontendUrl}/admin/inbox" style="display: block; text-align: center; background: #1a56db; color: white; padding: 14px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; margin: 16px 0;">
            📬 Reply with Quote
          </a>
          <p style="color: #6b7280; font-size: 13px;">⚠️ Do not reply to this email. Use in-app messaging.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">123 Cargo Community</p>
        </div>
      `,
    });
    logger.info(`DDP inquiry email sent to ${toEmail}`);
  } catch (err) {
    logger.error(`Failed to send DDP inquiry to ${toEmail}:`, err);
  }
}

// ══════════════════════════════════════════════════════════════
// 新消息通知邮件（双语，根据收件人角色判断）
// ══════════════════════════════════════════════════════════════
export async function sendNewMessageNotification(
  toEmail: string, toName: string, senderName: string, senderCompany: string, contentPreview: string,
  lang: string = 'zh',
): Promise<void> {
  if (!isEnabled() || !toEmail) return;
  const frontendUrl = env.frontendUrl;
  const transport = getTransporter();
  const from = senderCompany ? `${senderCompany} ${senderName}` : senderName;
  const subject = lang === 'en'
    ? `💬 New message from ${from}`
    : `💬 您收到了一条新消息 - ${from}`;

  try {
    await transport.sendMail({
      from: `"${env.smtp.fromName}" <${env.smtp.user}>`,
      to: toEmail,
      subject,
      html: lang === 'en' ? `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a56db;">123 Cargo Community</h2>
          <p>Hi ${toName},</p>
          <p><strong>${from}</strong> sent you a message:</p>
          <div style="background: #f3f4f6; padding: 12px; border-radius: 8px; margin: 12px 0; font-size: 14px; white-space: pre-wrap;">
            ${contentPreview.substring(0, 300)}
          </div>
          <a href="${frontendUrl}/admin/inbox" style="display: inline-block; background: #1a56db; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 8px 0;">
            Reply in Inbox
          </a>
          <p style="color: #6b7280; font-size: 13px; margin-top: 16px;">⚠️ Do not reply directly to this email.</p>
          ${COMMUNITY_INTRO_FORWARDER_EN}
        </div>
      ` : `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a56db;">123共享外贸物流社区</h2>
          <p>${toName} 您好！</p>
          <p>用户 <strong>${from}</strong> 给您发了一条消息：</p>
          <div style="background: #f3f4f6; padding: 12px; border-radius: 8px; margin: 12px 0; font-size: 14px; white-space: pre-wrap;">
            ${contentPreview.substring(0, 300)}
          </div>
          <a href="${frontendUrl}/admin/inbox" style="display: inline-block; background: #1a56db; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 8px 0;">
            进入收件箱回复
          </a>
          <p style="color: #6b7280; font-size: 13px; margin-top: 16px;">⚠️ 请勿直接回复此邮件。</p>
          ${COMMUNITY_INTRO_FORWARDER}
        </div>
      `,
    });
    logger.info(`New message notification sent to ${toEmail}`);
  } catch (err) {
    logger.error(`Failed to send message notification to ${toEmail}:`, err);
  }
}

// ══════════════════════════════════════════════════════════════
// 账号开通通知邮件
// ══════════════════════════════════════════════════════════════
export async function sendAccountActivationEmail(
  toEmail: string, toName: string, companyName: string,
  username: string, password: string,
  lang: string = 'zh',
): Promise<void> {
  if (!isEnabled() || !toEmail) return;
  const frontendUrl = env.frontendUrl;
  const transport = getTransporter();
  const subject = lang === 'en'
    ? `🎉 Your 123 Cargo Community account is ready`
    : `🎉 您的 123共享外贸物流社区 账号已开通`;

  try {
    await transport.sendMail({
      from: `"${env.smtp.fromName}" <${env.smtp.user}>`,
      to: toEmail,
      subject,
      html: lang === 'en' ? `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f9fafb;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #1a56db; font-size: 24px; margin: 0;">🚢 123 Cargo Community</h1>
            <p style="color: #6b7280; font-size: 14px; margin: 8px 0 0;">International Logistics Collaboration Hub</p>
          </div>
          <div style="background: white; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <p style="font-size: 15px; color: #374151;">Hi <strong>${toName}</strong>,</p>
            <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">Your business card from <strong>${companyName}</strong> has been imported. An account has been created for you:</p>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0; font-size: 14px;">
              <p style="margin: 6px 0;"><strong>🔗 Website:</strong> <a href="${frontendUrl}" style="color: #1a56db;">${frontendUrl}</a></p>
              <p style="margin: 6px 0;"><strong>👤 Username:</strong> ${username}</p>
              <p style="margin: 6px 0;"><strong>🔑 Password:</strong> ${password}</p>
            </div>
            <p style="color: #dc2626; font-size: 13px; margin: 4px 0 16px;">⚠️ Please change your password after first login for security.</p>
            <a href="${frontendUrl}/login" style="display: block; text-align: center; background: linear-gradient(135deg, #2563EB, #4F46E5); color: white; padding: 14px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 15px;">
              🚀 Login Now
            </a>
          </div>
          <div style="margin-top: 24px; padding: 20px; background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 12px; border: 2px solid #f59e0b;">
            <h3 style="font-size: 16px; color: #92400e; margin: 0 0 8px;">💡 Why join 123 Cargo Community?</h3>
            <p style="font-size: 14px; color: #78350f; line-height: 1.7; margin: 0 0 12px;">
              The forwarding industry is tough for newcomers — posting on WeChat only reaches peers, not real clients. <strong>Our platform connects you directly with traders searching for cargo space.</strong> AI parses your routes in seconds, and your posts get matched to trader searches automatically. No cold-calling, no endless WeChat groups.
            </p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px;">
              <div style="background: white; padding: 10px 12px; border-radius: 8px; border: 1px solid #fcd34d;">
                <strong style="color: #1a56db;">🤖 AI Auto-Post</strong><br/><span style="color: #6b7280; font-size: 12px;">Paste text → parsed in seconds</span>
              </div>
              <div style="background: white; padding: 10px 12px; border-radius: 8px; border: 1px solid #fcd34d;">
                <strong style="color: #059669;">🎯 Auto-Match</strong><br/><span style="color: #6b7280; font-size: 12px;">Traders search → you get notified</span>
              </div>
              <div style="background: white; padding: 10px 12px; border-radius: 8px; border: 1px solid #fcd34d;">
                <strong style="color: #7c3aed;">🎫 Coupon System</strong><br/><span style="color: #6b7280; font-size: 12px;">Gift coupons → clients come back</span>
              </div>
              <div style="background: white; padding: 10px 12px; border-radius: 8px; border: 1px solid #fcd34d;">
                <strong style="color: #dc2626;">🚀 Urgent Promote</strong><br/><span style="color: #6b7280; font-size: 12px;">¥1.5 push to ALL traders</span>
              </div>
            </div>
          </div>
          <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">This is an automated message. Questions? Reply to this email.</p>
        </div>
      ` : `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f9fafb;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #1a56db; font-size: 24px; margin: 0;">🚢 123共享外贸物流社区</h1>
            <p style="color: #6b7280; font-size: 14px; margin: 8px 0 0;">国际物流人都在用的协作平台</p>
          </div>
          <div style="background: white; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <p style="font-size: 15px; color: #374151;"><strong>${toName}</strong> 您好！</p>
            <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">您在 <strong>${companyName}</strong> 的名片已被录入系统，社区已为您开通了专属账号：</p>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0; font-size: 14px;">
              <p style="margin: 6px 0;"><strong>🔗 网址：</strong><a href="${frontendUrl}" style="color: #1a56db;">${frontendUrl}</a></p>
              <p style="margin: 6px 0;"><strong>👤 用户名：</strong>${username}</p>
              <p style="margin: 6px 0;"><strong>🔑 密码：</strong>${password}</p>
            </div>
            <p style="color: #dc2626; font-size: 13px; margin: 4px 0 16px;">⚠️ 首次登录后请尽快修改密码</p>
            <a href="${frontendUrl}/login" style="display: block; text-align: center; background: linear-gradient(135deg, #2563EB, #4F46E5); color: white; padding: 14px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 15px;">
              🚀 立即登录社区
            </a>
          </div>
          <div style="margin-top: 24px; padding: 20px; background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 12px; border: 2px solid #f59e0b;">
            <h3 style="font-size: 16px; color: #92400e; margin: 0 0 12px;">💡 为什么货代新人都在用 123 社区？</h3>

            <!-- 新人与老登对比 -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px;">
              <div style="background: #fef2f2; padding: 12px; border-radius: 10px; border: 1px solid #fecaca;">
                <p style="font-size: 13px; font-weight: bold; color: #dc2626; margin: 0 0 6px;">😰 货代新人的困境</p>
                <p style="font-size: 12px; color: #7f1d1d; line-height: 1.7; margin: 0;">
                  ❌ 没有老客户积累，一切从零开始<br/>
                  ❌ 不知道去哪找外贸客户<br/>
                  ❌ 加微信群全是同行，无人询价<br/>
                  ❌ 没加入WCA/JC TRANS，海外资源空白<br/>
                  ❌ 大货代垄断航线，新人拼价格死路一条<br/>
                  ❌ 朋友圈发广告，点赞的都是同行
                </p>
              </div>
              <div style="background: #ecfdf5; padding: 12px; border-radius: 10px; border: 1px solid #a7f3d0;">
                <p style="font-size: 13px; font-weight: bold; color: #059669; margin: 0 0 6px;">🦾 老货代的优势</p>
                <p style="font-size: 12px; color: #064e3b; line-height: 1.7; margin: 0;">
                  ✅ 多年积累的老客户群，细水长流<br/>
                  ✅ 外贸客户口口相传，自然获客<br/>
                  ✅ WCA/JC TRANS会员，全球代理网络<br/>
                  ✅ 固定航司舱位，价格优势明显<br/>
                  ✅ 口碑建立，新客户主动找上门<br/>
                  ✅ 收入稳定，新人入职就有业务
                </p>
              </div>
            </div>

            <!-- 解决方案 -->
            <div style="background: white; padding: 14px; border-radius: 10px; border: 2px solid #1a56db; margin-bottom: 12px;">
              <p style="font-size: 14px; font-weight: bold; color: #1a56db; margin: 0 0 8px;">🔑 123 社区 = 新人的"加速器"</p>
              <p style="font-size: 13px; color: #374151; line-height: 1.8; margin: 0;">
                老货代的优势是<strong>时间积累</strong>的——客户积累、口碑建立、联盟资质，这些新人短时间内无法复制。<br/><br/>
                但 <strong>123 社区直接给新人一条快车道：</strong>不用自己找客户，外贸搜索航线时系统自动把你的舱位推给他们。<strong>老货代靠人脉获客，你用社区用技术获客。</strong> 新人不需要等三年五年积累客户，注册就能被外贸看到。<br/><br/>
                更关键的是：社区整合了<strong>海外DDP代理、报关行、律师、检测认证</strong>等全角色资源——这些是老货代花几十万加入WCA/JC TRANS才能有的，你注册社区就免费享用。
              </p>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px;">
              <div style="background: white; padding: 10px 12px; border-radius: 8px; border: 1px solid #fcd34d;">
                <strong style="color: #1a56db;">🤖 AI 一键录入</strong><br/><span style="color: #6b7280; font-size: 12px;">粘贴文字，3秒解析入库</span>
              </div>
              <div style="background: white; padding: 10px 12px; border-radius: 8px; border: 1px solid #fcd34d;">
                <strong style="color: #059669;">🎯 自动匹配推送</strong><br/><span style="color: #6b7280; font-size: 12px;">外贸搜索→你收通知→秒回复</span>
              </div>
              <div style="background: white; padding: 10px 12px; border-radius: 8px; border: 1px solid #fcd34d;">
                <strong style="color: #7c3aed;">🎫 报关券生态</strong><br/><span style="color: #6b7280; font-size: 12px;">送券给外贸→抵扣报关费→客户粘性</span>
              </div>
              <div style="background: white; padding: 10px 12px; border-radius: 8px; border: 1px solid #fcd34d;">
                <strong style="color: #dc2626;">🚀 紧急推广 ¥9.9</strong><br/><span style="color: #6b7280; font-size: 12px;">舱位收不满？一键推全社区</span>
              </div>
            </div>
          </div>
          <div style="margin-top: 16px; padding: 12px; background: #eff6ff; border-radius: 10px; text-align: center; font-size: 13px; color: #1a56db;">
            💬 有任何问题？直接回复此邮件联系管理员，或加微信群交流
          </div>
          <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 16px;">此邮件由系统自动发送，请勿回复。如有疑问请联系社区管理员。</p>
        </div>
      `,
    });
    logger.info(`Activation email sent to ${toEmail}`);
  } catch (err) {
    logger.error(`Failed to send activation email to ${toEmail}:`, err);
  }
}

// ══════════════════════════════════════════════════════════════
// 未登录提醒邮件
// ══════════════════════════════════════════════════════════════
export async function sendInactiveReminderEmail(
  toEmail: string, toName: string, username: string,
  lang: string = 'zh',
): Promise<void> {
  if (!isEnabled() || !toEmail) return;
  const frontendUrl = env.frontendUrl;
  const transport = getTransporter();
  const subject = lang === 'en'
    ? `🔔 ${toName}, your community account is ready!`
    : `🔔 ${toName}，您的社区账号已开通，快来体验吧！`;

  try {
    await transport.sendMail({
      from: `"${env.smtp.fromName}" <${env.smtp.user}>`,
      to: toEmail,
      subject,
      html: lang === 'en' ? `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a56db;">123 Cargo Community</h2>
          <p>Hi ${toName},</p>
          <p>Your account is ready! Log in to post listings and search for cargo space.</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0; font-size: 14px;">
            <p style="margin: 4px 0;"><strong>Username:</strong> ${username}</p>
            <p style="margin: 4px 0;"><strong>Password:</strong> sent to your email. Use 'Forgot Password' if needed.</p>
          </div>
          <a href="${frontendUrl}/login" style="display: inline-block; background: #1a56db; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 8px 0;">
            Login Now
          </a>
          ${COMMUNITY_INTRO_FORWARDER_EN}
        </div>
      ` : `
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
    logger.info(`Inactive reminder sent to ${toEmail}`);
  } catch (err) {
    logger.error(`Failed to send inactive reminder to ${toEmail}:`, err);
  }
}

// ══════════════════════════════════════════════════════════════
// 律师咨询通知邮件
// ══════════════════════════════════════════════════════════════
export async function sendLegalConsultEmail(
  toEmail: string, toName: string, senderCompany: string,
  senderName: string, senderPhone: string, content: string,
): Promise<void> {
  if (!isEnabled() || !toEmail) return;
  const frontendUrl = env.frontendUrl;
  const transport = getTransporter();
  try {
    await transport.sendMail({
      from: `"${env.smtp.fromName}" <${env.smtp.user}>`,
      to: toEmail,
      subject: `⚖️ Legal consultation from ${senderCompany || senderName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #d97706;">123 Cargo Community · Legal Consultation</h2>
          <p>Dear ${toName},</p>
          <p>A community member has requested your legal consultation:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #fefce8; border-radius: 8px;">
            <tr><td style="padding: 8px 12px; font-size: 13px; color: #6b7280;">Client</td><td style="padding: 8px 12px; font-weight: bold;">${senderCompany || ''} ${senderName}</td></tr>
            <tr><td style="padding: 8px 12px; font-size: 13px; color: #6b7280;">Contact</td><td style="padding: 8px 12px;">${senderPhone || 'Not provided'}</td></tr>
            <tr><td style="padding: 8px 12px; font-size: 13px; color: #6b7280;">Inquiry</td><td style="padding: 8px 12px; white-space: pre-wrap;">${content.substring(0, 500)}</td></tr>
          </table>
          <a href="${frontendUrl}/admin/inbox" style="display: inline-block; background: #d97706; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 8px 0;">
            Reply in Inbox
          </a>
          <p style="color: #6b7280; font-size: 13px; margin-top: 16px;">⚠️ Do not reply directly to this email.</p>
        </div>
      `,
    });
    logger.info(`Legal consult email sent to ${toEmail}`);
  } catch (err) {
    logger.error(`Failed to send legal consult email to ${toEmail}:`, err);
  }
}

// ══════════════════════════════════════════════════════════════
// 试用到期提醒邮件
// ══════════════════════════════════════════════════════════════
export async function sendTrialExpiryReminderEmail(
  toEmail: string, toName: string, trialEnd: string, remainingDays: number,
  lang: string = 'zh',
): Promise<void> {
  if (!isEnabled() || !toEmail) return;
  const frontendUrl = env.frontendUrl;
  const transport = getTransporter();

  const subject = remainingDays <= 0
    ? (lang === 'en' ? '⚠️ Your membership has expired' : '⚠️ 您的社区会员已过期，请及时续期')
    : (lang === 'en' ? `⚠️ Your membership expires in ${remainingDays} days` : `⚠️ 您的社区会员将在 ${remainingDays} 天后到期`);

  try {
    await transport.sendMail({
      from: `"${env.smtp.fromName}" <${env.smtp.user}>`,
      to: toEmail,
      subject,
      html: lang === 'en' ? `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #dc2626;">123 Cargo Community</h2>
          <p>Hi ${toName},</p>
          ${remainingDays <= 0
            ? `<p>Your membership expired on <strong>${trialEnd}</strong>. Some features are now limited.</p>`
            : `<p>Your membership expires on <strong>${trialEnd}</strong> (<strong style="color: #dc2626; font-size: 18px;">${remainingDays}</strong> days left).</p>`
          }
          <p>Limited features after expiry:</p>
          <ul style="color: #6b7280; font-size: 13px; line-height: 1.8;">
            <li>❌ Data entry (text parsing, file upload)</li>
            <li>❌ Send new messages</li>
            <li>✅ Search & browse normal</li>
            <li>✅ Inbox can receive messages</li>
          </ul>
          <a href="${frontendUrl}/admin/renew" style="display: inline-block; background: #1a56db; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 8px 0;">Renew Now</a>
        </div>
      ` : `
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
        </div>
      `,
    });
    logger.info(`Expiry reminder sent to ${toEmail}`);
  } catch (err) {
    logger.error(`Failed to send expiry reminder to ${toEmail}:`, err);
  }
}

// ══════════════════════════════════════════════════════════════
// 邀请海外代理入驻邮件（英文）
// ══════════════════════════════════════════════════════════════
export async function sendInvitationEmail(params: {
  toEmail: string; agentName: string; inviterName: string;
  inviterCompany: string; registerUrl: string;
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
      subject: `${params.inviterName} invited you to join 123 Cargo Community`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a56db;">🤝 123 Cargo Community</h2>
          <p>Hi <strong>${params.agentName}</strong>,</p>
          <p>Your partner <strong>${inviterInfo}</strong> invites you to <strong>123 Cargo Community</strong>.</p>
          <div style="background: #f0f7ff; border-left: 4px solid #1a56db; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 15px;"><strong>Why join?</strong></p>
          </div>
          <table style="width: 100%; font-size: 14px; line-height: 1.8; color: #374151;">
            <tr><td style="padding: 4px 0;">🌍</td><td style="padding: 4px 8px;"><strong>Receive inquiries</strong> from Chinese forwarders daily</td></tr>
            <tr><td style="padding: 4px 0;">✅</td><td style="padding: 4px 8px;"><strong>Free to join</strong> — No membership fees</td></tr>
            <tr><td style="padding: 4px 0;">🤝</td><td style="padding: 4px 8px;"><strong>Build trust</strong> — Earn credit score with completed jobs</td></tr>
            <tr><td style="padding: 4px 0;">📬</td><td style="padding: 4px 8px;"><strong>In-app messaging</strong> — Connect within the platform</td></tr>
          </table>
          <a href="${params.registerUrl}" style="display: block; text-align: center; background: #1a56db; color: white; padding: 14px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; margin: 20px 0;">
            👉 Accept Invitation
          </a>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">123 Cargo Community Team</p>
        </div>
      `,
    });
    logger.info(`Invitation email sent to ${params.toEmail}`);
  } catch (err) {
    logger.error(`Failed to send invitation to ${params.toEmail}:`, err);
    throw err;
  }
}

// ══════════════════════════════════════════════════════════════
// 海外代理标准版试用升级提醒（英文，每7天发送一次）
// ══════════════════════════════════════════════════════════════
export async function sendOverseasUpgradeReminderEmail(
  toEmail: string, toName: string, trialEnd: string, remainingDays: number,
): Promise<void> {
  if (!isEnabled() || !toEmail) return;
  const frontendUrl = env.frontendUrl;
  const transport = getTransporter();

  const daysText = remainingDays <= 0
    ? 'Your trial has ended'
    : `${remainingDays} days left in your trial`;

  try {
    await transport.sendMail({
      from: `"${env.smtp.fromName}" <${env.smtp.user}>`,
      to: toEmail,
      subject: `⏰ ${daysText} — Upgrade your 123 Cargo plan`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #7c3aed;">🌍 123 Cargo Community</h2>
          <p>Hi <strong>${toName}</strong>,</p>
          ${remainingDays <= 0 ? `
            <p>Your <strong>Standard</strong> free trial has ended.</p>
            <p>You have been downgraded to the <strong>Free</strong> plan (5 DDP inquiries/month).</p>
          ` : `
            <p>Your <strong>Standard</strong> free trial is still active.</p>
            <p><strong style="color: #7c3aed; font-size: 18px;">${remainingDays}</strong> days remaining (ends ${trialEnd}).</p>
          `}
          <div style="background: #f5f3ff; border-left: 4px solid #7c3aed; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0 0 8px 0; font-weight: bold;">🚀 Upgrade to Standard ($19.99/mo) to get:</p>
            <table style="width: 100%; font-size: 14px; line-height: 1.8; color: #374151;">
              <tr><td style="padding: 2px 0;">✅</td><td style="padding: 2px 8px;"><strong>Unlimited</strong> DDP inquiries</td></tr>
              <tr><td style="padding: 2px 0;">✅</td><td style="padding: 2px 8px;"><strong>Structured quoting</strong> — Win more deals</td></tr>
              <tr><td style="padding: 2px 0;">✅</td><td style="padding: 2px 8px;"><strong>Cooperation management</strong> — Track partners</td></tr>
              <tr><td style="padding: 2px 0;">✅</td><td style="padding: 2px 8px;"><strong>Unlimited</strong> AI queries</td></tr>
            </table>
          </div>
          <p style="font-size: 13px; color: #6b7280;">One DDP deal can bring thousands in profit — your subscription pays for itself with a single inquiry.</p>
          <a href="${frontendUrl}/admin/subscribe" style="display: block; text-align: center; background: #7c3aed; color: white; padding: 14px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; margin: 20px 0;">
            👉 Upgrade Now
          </a>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">123 Cargo Community Team · <a href="${frontendUrl}" style="color: #9ca3af;">Visit website</a></p>
        </div>
      `,
    });
    logger.info(`Overseas upgrade reminder sent to ${toEmail}`);
  } catch (err) {
    logger.error(`Failed to send overseas upgrade reminder to ${toEmail}:`, err);
  }
}

/** 报关券被使用通知 */
export async function sendCouponUsedEmail(
  toEmail: string, toName: string, faceValue: number,
) {
  if (!transporter) return;
  try {
    await transporter.sendMail({
      from: `"${env.smtp.fromName}" <${env.smtp.user}>`,
      to: toEmail,
      subject: `您的 ¥${faceValue} 报关券已被使用`,
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:12px">
        <h2 style="color:#059669">🎉 报关券已使用</h2>
        <p>${toName}，您好：</p>
        <p>您赠送的 <strong style="color:#dc2626;font-size:18px">¥${faceValue}</strong> 报关券已被外贸用户提交使用。</p>
        <p style="color:#6b7280;font-size:13px">报关行将尽快处理核销。</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />
        <p style="color:#9ca3af;font-size:11px">此邮件由系统自动发送，请勿回复。</p>
      </div>`,
    });
  } catch (err) {
    logger.error(`Failed to send coupon used email to ${toEmail}:`, err);
  }
}

/** 货代周报：本周社区动态 + 个人数据 */
export async function sendWeeklyReport(
  toEmail: string, toName: string,
  stats: { totalSearches: number; totalMatches: number; yourViews: number; yourInquiries: number; hotKeywords: string[] },
) {
  if (!isEnabled() || !toEmail) return;
  const transport = getTransporter();
  try {
    await transport.sendMail({
      from: `"${env.smtp.fromName}" <${env.smtp.user}>`,
      to: toEmail,
      subject: '📊 123物流社区 · 本周动态周报',
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f9fafb">
        <h2 style="color:#1a56db;margin:0 0 4px">📊 123共享外贸物流社区</h2>
        <p style="color:#6b7280;font-size:13px;margin:0 0 20px">本周动态周报 — ${toName} 您好</p>
        <div style="background:white;padding:20px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);margin-bottom:16px">
          <h3 style="font-size:15px;color:#374151;margin:0 0 12px">🌐 本周社区动态</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px">
            <div style="background:#eff6ff;padding:12px;border-radius:8px;text-align:center">
              <div style="font-size:22px;font-weight:900;color:#1a56db">${stats.totalSearches}</div>
              <div style="color:#6b7280;font-size:11px">次搜索</div>
            </div>
            <div style="background:#fef3c7;padding:12px;border-radius:8px;text-align:center">
              <div style="font-size:22px;font-weight:900;color:#d97706">${stats.totalMatches}</div>
              <div style="color:#6b7280;font-size:11px">次询价推送</div>
            </div>
          </div>
          ${stats.hotKeywords.length > 0 ? `<div style="margin-top:10px;font-size:12px;color:#6b7280">🔥 热搜词：${stats.hotKeywords.join('、')}</div>` : ''}
        </div>
        <div style="background:white;padding:20px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);margin-bottom:16px">
          <h3 style="font-size:15px;color:#374151;margin:0 0 12px">📦 您的舱位数据</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px">
            <div style="background:#f0fdf4;padding:12px;border-radius:8px;text-align:center">
              <div style="font-size:22px;font-weight:900;color:#059669">${stats.yourViews}</div>
              <div style="color:#6b7280;font-size:11px">次被浏览</div>
            </div>
            <div style="background:#fef2f2;padding:12px;border-radius:8px;text-align:center">
              <div style="font-size:22px;font-weight:900;color:#dc2626">${stats.yourInquiries}</div>
              <div style="color:#6b7280;font-size:11px">次被询价</div>
            </div>
          </div>
        </div>
        <a href="${env.frontendUrl}/admin/dashboard" style="display:block;text-align:center;background:linear-gradient(135deg,#2563EB,#4F46E5);color:white;padding:14px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:14px">🚀 登录社区发布舱位</a>
        <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:12px">每周自动发送。不想收到？登录后在个人信息页关闭。</p>
      </div>`,
    });
    logger.info(`Weekly report sent to ${toEmail}`);
  } catch (err) { logger.error(`Failed to send weekly report to ${toEmail}:`, err); }
}
