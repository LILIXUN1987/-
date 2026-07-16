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
): Promise<void> {
  if (!isEnabled() || !toEmail) return;
  const frontendUrl = env.frontendUrl;
  const transport = getTransporter();
  try {
    await transport.sendMail({
      from: `"${env.smtp.fromName}" <${env.smtp.user}>`,
      to: toEmail,
      subject: `📢 New inquiry - ${keyword.substring(0, 20)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a56db;">123 Cargo Community</h2>
          <p>Hi ${toName},</p>
          <p><strong>${senderName}</strong> is interested in your listing and sent an inquiry:</p>
          <div style="background: #f3f4f6; padding: 12px; border-radius: 8px; margin: 12px 0; font-size: 14px;">
            🔍 ${keyword.substring(0, 50)}
          </div>
          <p>Please log in to view and reply:</p>
          <a href="${frontendUrl}/admin/inbox" style="display: inline-block; background: #1a56db; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 8px 0;">
            View Inquiry & Reply
          </a>
          <p style="color: #6b7280; font-size: 13px; margin-top: 16px;">
            ⚠️ Please do not reply directly to this email. Use in-app messaging.
          </p>
          ${COMMUNITY_INTRO_FORWARDER_EN}
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
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a56db;">123 Cargo Community</h2>
          <p>Hi ${toName},</p>
          <p>Your account has been created for <strong>${companyName}</strong>:</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0; font-size: 14px;">
            <p style="margin: 4px 0;"><strong>Username:</strong> ${username}</p>
            <p style="margin: 4px 0;"><strong>Password:</strong> ${password}</p>
          </div>
          <p style="color: #dc2626; font-size: 13px;">⚠️ Please change your password after first login</p>
          <a href="${frontendUrl}/login" style="display: inline-block; background: #1a56db; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 8px 0;">
            Login Now
          </a>
          ${COMMUNITY_INTRO_FORWARDER_EN}
        </div>
      ` : `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a56db;">123共享外贸物流社区</h2>
          <p>${toName} 您好！</p>
          <p>您在 <strong>${companyName}</strong> 的名片已被录入，现已为您开通社区账号：</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0; font-size: 14px;">
            <p style="margin: 4px 0;"><strong>用户名：</strong>${username}</p>
            <p style="margin: 4px 0;"><strong>密码：</strong>${password}</p>
          </div>
          <a href="${frontendUrl}/login" style="display: inline-block; background: #1a56db; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 8px 0;">
            立即登录
          </a>
          ${COMMUNITY_INTRO_FORWARDER}
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
