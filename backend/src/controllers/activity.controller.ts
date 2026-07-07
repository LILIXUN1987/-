import { Request, Response, NextFunction } from 'express';
import QRCode from 'qrcode';
import db from '../config/database';
import { env } from '../config/env';

export const activityController = {
  // ── 生成社区入口二维码 ──
  async qrcode(_req: Request, res: Response, next: NextFunction) {
    try {
      const url = env.frontendUrl;
      const qrBuffer = await QRCode.toBuffer(url, {
        width: 400,
        margin: 2,
        color: { dark: '#1a365d', light: '#ffffff' },
      });
      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'public, max-age=86400');
      res.send(qrBuffer);
    } catch (err) {
      next(err);
    }
  },

  // ── 实时动态消息流 ──
  async feed(_req: Request, res: Response, next: NextFunction) {
    try {
      const searches = await db('search_logs')
        .leftJoin('users', 'search_logs.user_id', 'users.id')
        .whereNotNull('users.company_name')
        .select('search_logs.keyword', 'search_logs.created_at', 'users.company_name', 'users.display_name')
        .orderBy('search_logs.created_at', 'desc')
        .limit(5) as any[];
      const msgs = await db('messages')
        .leftJoin('users as sender', 'messages.sender_id', 'sender.id')
        .leftJoin('users as receiver', 'messages.receiver_id', 'receiver.id')
        .whereNotNull('sender.company_name').whereNotNull('receiver.company_name')
        .where('messages.content', 'not like', '【律师咨询】%')
        .select('messages.content', 'messages.created_at',
          'sender.company_name as sender_company', 'sender.display_name as sender_name',
          'receiver.company_name as receiver_company', 'receiver.display_name as receiver_name')
        .orderBy('messages.created_at', 'desc').limit(5) as any[];
      const views = await db('messages')
        .leftJoin('users as sender', 'messages.sender_id', 'sender.id')
        .leftJoin('users as receiver', 'messages.receiver_id', 'receiver.id')
        .whereNotNull('sender.company_name').whereNotNull('receiver.company_name')
        .where('messages.content', 'like', '📢 有群友%')
        .select('messages.content', 'messages.created_at',
          'sender.company_name as sender_company', 'sender.display_name as sender_name',
          'receiver.company_name as receiver_company', 'receiver.display_name as receiver_name')
        .orderBy('messages.created_at', 'desc').limit(5) as any[];
      const activities: { type: string; text: string; time: string }[] = [];
      for (const s of searches) {
        if (s.keyword && s.company_name) activities.push({ type: 'search', text: `🔍 ${s.company_name} 正在查询「${s.keyword.substring(0, 30)}」`, time: s.created_at });
      }
      for (const v of views) {
        if (v.sender_company && v.receiver_company) {
          const kw = v.content?.match(/「(.+?)」/)?.[1] || '航线';
          activities.push({ type: 'inquiry', text: `📢 ${v.sender_company} 正在查询 ${v.receiver_company}「${v.receiver_name}」发布的${kw}`, time: v.created_at });
        }
      }
      for (const m of msgs) {
        if (m.sender_company && m.receiver_company && !m.content?.includes('有群友')) {
          activities.push({ type: 'chat', text: `💬 ${m.sender_company}（${m.sender_name}）与 ${m.receiver_company}（${m.receiver_name}）正在通过站内信联系`, time: m.created_at });
        }
      }
      activities.sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime());
      res.json({ data: activities.slice(0, 20) });
    } catch (err) {
      res.json({ data: [] });
    }
  },
};
