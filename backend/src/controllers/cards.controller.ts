import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import db from '../config/database';
import logger from '../utils/logger';
import { recognizeImage, parseCardOcr, isOcrConfigured } from '../services/ocr.service';

export const cardsController = {
  // ── OCR 拍照识别名片 ──
  async ocrScan(req: Request, res: Response, next: NextFunction) {
    const file = req.file;
    try {
      if (!isOcrConfigured()) {
        return res.status(503).json({ error: 'OCR 服务未配置' });
      }
      if (!file) return res.status(400).json({ error: '请上传图片' });

      const text = await recognizeImage(file.path);
      const parsed = parseCardOcr(text);

      // 清理临时文件
      try { require('fs').unlinkSync(file!.path); } catch {}

      // 如果什么都没识别到
      if (!parsed.name && !parsed.company && !parsed.phone && !parsed.email) {
        return res.status(422).json({ error: '未识别到名片信息，请确保照片清晰包含姓名、电话、邮箱、公司等信息' });
      }

      res.json(parsed);
    } catch (err: any) {
      // 清理临时文件
      try { require('fs').unlinkSync(file?.path); } catch {}
      // 腾讯云返回的业务错误（比如不是名片图片）
      if (err?.code === 'FailedOperation.ImageNoBusinessCard') {
        return res.status(422).json({ error: '未识别到名片信息，请确保照片中有清晰的名片' });
      }
      // 其他错误
      logger.error('OCR 识别异常:', err);
      res.status(500).json({ error: 'OCR 识别失败，请手动输入' });
    }
  },

  // ── 管理员：添加名片（批量） ──
  async addCards(req: Request, res: Response, next: NextFunction) {
    try {
      const { cards, batch_name } = req.body;
      if (!Array.isArray(cards) || cards.length === 0) {
        return res.status(400).json({ error: '请提供名片数据' });
      }

      const batchId = uuidv4();
      const userId = req.user!.id;
      let added = 0;

      for (const card of cards) {
        const name = (card.name || '').trim();
        if (!name) continue;
        await db('collected_cards').insert({
          id: uuidv4(), name,
          company: (card.company || '').trim() || null,
          phone: (card.phone || '').trim() || null,
          email: ((card.email || '').trim().toLowerCase()) || null,
          role: (card.role || 'forwarder').trim(),
          notes: (card.notes || '').trim() || null,
          batch_id: batchId, created_by: userId,
        });
        added++;
      }

      if (added > 0) {
        await db('card_batches').insert({
          id: batchId,
          name: batch_name || `展会名片 ${new Date().toLocaleDateString('zh-CN')}`,
          source: 'exhibition', total: added, created_by: userId,
        });
      }

      res.json({ message: `成功添加 ${added} 张名片`, batch_id: batchId, count: added });
    } catch (err) { next(err); }
  },

  // ── 管理员：批次列表 ──
  async batches(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await db('card_batches').orderBy('created_at', 'desc').limit(50);
      res.json({ data });
    } catch (err) { next(err); }
  },

  // ── 管理员：批次详情 ──
  async batchDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await db('collected_cards').where({ batch_id: req.params.batchId }).orderBy('created_at', 'asc');
      res.json({ data });
    } catch (err) { next(err); }
  },

  // ── 管理员：发送邀请 ──
  async inviteBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const { batchId } = req.params;
      const cards = await db('collected_cards').where({ batch_id: batchId, invited: 0 }).whereNotNull('email');
      const password = 'test1234';
      const passwordHash = await bcrypt.hash(password, 12);
      let created = 0;

      for (const card of cards as any[]) {
        const email = card.email?.trim().toLowerCase();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;

        const existing = await db('users').where({ email }).first();
        if (existing) {
          await db('collected_cards').where({ id: card.id }).update({ registered: 1, registered_user_id: existing.id, invited: 1, invited_at: new Date().toISOString() });
          continue;
        }

        let username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
        const nameExists = await db('users').where({ username }).first();
        if (nameExists) username = username + Math.random().toString(36).substring(2, 5);

        const trialEnd = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
        await db('users').insert({
          id: uuidv4(), username, password_hash: passwordHash,
          display_name: card.name, company_name: card.company || null,
          email, email_verified: true, role: card.role || 'forwarder',
          status: 'approved', trial_end: trialEnd, is_newbie: true,
        });

        await db('collected_cards').where({ id: card.id }).update({ invited: 1, invited_at: new Date().toISOString() });

        try {
          const { sendAccountActivationEmail } = await import('../services/email.service');
          await sendAccountActivationEmail(email, card.name, card.company || '', username, password);
        } catch (emailErr) {
          logger.error(`邀请邮件发送失败 ${email}:`, emailErr);
        }
        created++;
      }

      const total = cards.length;
      await db('card_batches').where({ id: batchId }).update({ invited: total });

      res.json({ message: `完成：新创建 ${created} 个账号，跳过 ${total - created} 个已注册用户`, created, total });
    } catch (err) { next(err); }
  },

  // ── 录入 + 自动创建账号 + 发送邀请邮件（一步完成） ──
  async addAndInvite(req: Request, res: Response, next: NextFunction) {
    try {
      const { cards } = req.body;
      if (!Array.isArray(cards) || cards.length === 0) {
        return res.status(400).json({ error: '请提供名片数据' });
      }

      const password = 'test1234';
      const passwordHash = await bcrypt.hash(password, 12);
      const userId = req.user!.id;
      const batchId = uuidv4();
      let created = 0;

      for (const card of cards) {
        const name = (card.name || '').trim();
        const email = ((card.email || '').trim().toLowerCase()) || null;
        const phone = (card.phone || '').trim() || null;
        const companyName = (card.company || '').trim() || null;

        if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          continue;
        }

        // 写入名片收集表
        await db('collected_cards').insert({
          id: uuidv4(), name, company: companyName, phone, email,
          role: 'forwarder', batch_id: batchId, created_by: userId,
          invited: 1, invited_at: new Date().toISOString(),
        });

        // 检查是否已注册
        const existing = await db('users').where({ email }).first();
        if (existing) {
          await db('collected_cards').where({ email }).update({ registered: 1, registered_user_id: existing.id });
          continue;
        }

        // 创建账号
        let username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
        const nameExists = await db('users').where({ username }).first();
        if (nameExists) username = username + Math.random().toString(36).substring(2, 5);

        const trialEnd = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
        await db('users').insert({
          id: uuidv4(), username, password_hash: passwordHash,
          display_name: name, company_name: companyName, email,
          email_verified: true, role: 'forwarder',
          status: 'approved', trial_end: trialEnd, is_newbie: true,
        });

        // 发邮件
        try {
          const { sendAccountActivationEmail } = await import('../services/email.service');
          await sendAccountActivationEmail(email, name, companyName || '', username, password);
        } catch (emailErr) {
          logger.error(`邀请邮件发送失败 ${email}:`, emailErr);
        }
        created++;
      }

      // 记录批次
      await db('card_batches').insert({
        id: batchId,
        name: `展会现场录入 ${new Date().toLocaleDateString('zh-CN')}`,
        source: 'exhibition', total: cards.length, created_by: userId,
      });

      res.json({ message: `完成：已邀请 ${created} 位，跳过 ${cards.length - created} 位已注册用户` });
    } catch (err) { next(err); }
  },

  // ── 普通用户：查看名片目录 ──
  async directory(req: Request, res: Response, next: NextFunction) {
    try {
      const { search } = req.query;
      let query = db('collected_cards')
        .leftJoin('card_batches', 'collected_cards.batch_id', 'card_batches.id')
        .select(
          'collected_cards.id', 'collected_cards.name', 'collected_cards.company',
          'collected_cards.phone', 'collected_cards.email', 'collected_cards.role',
          'collected_cards.registered_user_id', 'collected_cards.created_at',
          'card_batches.name as batch_name',
        )
        .where('collected_cards.invited', 1);

      if (search && typeof search === 'string' && search.trim()) {
        const kw = `%${search.trim()}%`;
        query = query.where(function () {
          this.where('collected_cards.name', 'like', kw).orWhere('collected_cards.company', 'like', kw);
        });
      }

      const data = await query.orderBy('collected_cards.created_at', 'desc').limit(200);
      const result = data.map((card: any) => ({
        ...card,
        is_registered: !!card.registered_user_id,
      }));
      res.json({ data: result, total: result.length });
    } catch (err) { next(err); }
  },

  // ── 管理员：上传通讯录 Excel（自动解析+创建账号+发邮件） ──
  async uploadDirectory(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ error: '请上传 Excel 文件' });

      const fs = require('fs');
      const XLSX = require('xlsx');

      // 1. 读取 Excel
      const workbook = XLSX.readFile(file.path);
      const sheetName = workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as any[];
      if (!rows || rows.length === 0) return res.status(400).json({ error: 'Excel 中未找到数据' });

      // 2. 自动识别列名
      const colMap: Record<string, string> = {};
      for (const key of Object.keys(rows[0])) {
        const k = key.toLowerCase().replace(/[\s\-_]/g, '');
        if (/姓名|名字|name/.test(k)) colMap.name = key;
        else if (/公司|企业|单位|company/.test(k)) colMap.company = key;
        else if (/手机|电话|手机号|phone|mobile|tel/.test(k)) colMap.phone = key;
        else if (/邮箱|邮件|email/.test(k)) colMap.email = key;
      }

      // 3. 保存 Excel 供用户下载
      const dir = './uploads/directory';
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const oldFiles = fs.readdirSync(dir);
      for (const f of oldFiles) fs.unlinkSync(`${dir}/${f}`);
      const filename = `directory_${Date.now()}.xlsx`;
      fs.writeFileSync(`${dir}/${filename}`, fs.readFileSync(file.path));

      // 4. 逐个创建账号
      const password = 'test1234';
      const passwordHash = await bcrypt.hash(password, 12);
      const userId = req.user!.id;
      const batchId = uuidv4();
      let created = 0, skipped = 0;

      for (const row of rows) {
        const name = colMap.name ? String(row[colMap.name] || '').trim() : '';
        const company = colMap.company ? String(row[colMap.company] || '').trim() : '';
        const phone = colMap.phone ? String(row[colMap.phone] || '').trim() : '';
        const email = colMap.email ? String(row[colMap.email] || '').trim().toLowerCase() : '';
        if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { skipped++; continue; }

        await db('collected_cards').insert({
          id: uuidv4(), name, company: company || null, phone: phone || null,
          email, role: 'forwarder', batch_id: batchId, created_by: userId,
          invited: 1, invited_at: new Date().toISOString(),
        });
        const existing = await db('users').where({ email }).first();
        if (existing) { await db('collected_cards').where({ email }).update({ registered: 1, registered_user_id: existing.id }); skipped++; continue; }

        let username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
        if (await db('users').where({ username }).first()) username += Math.random().toString(36).substring(2, 5);
        const trialEnd = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
        await db('users').insert({
          id: uuidv4(), username, password_hash: passwordHash, display_name: name,
          company_name: company || null, email, email_verified: true, role: 'forwarder',
          status: 'approved', trial_end: trialEnd, is_newbie: true,
        });
        try { const { sendAccountActivationEmail } = await import('../services/email.service'); await sendAccountActivationEmail(email, name, company || '', username, password); } catch {}
        created++;
      }

      await db('card_batches').insert({ id: batchId, name: `通讯录导入 ${new Date().toLocaleDateString('zh-CN')}`, source: 'excel_upload', total: rows.length, invited: created, created_by: userId });
      try { fs.unlinkSync(file.path); } catch {}

      res.json({ message: `处理完成：创建 ${created} 个新账号，跳过 ${skipped} 个（已存在或无效）`, total: rows.length, created, skipped });
    } catch (err) { next(err); }
  },

  // ── 用户：下载最新通讯录 Excel ──
  async downloadDirectory(req: Request, res: Response, next: NextFunction) {
    try {
      const fs = require('fs');
      const path = require('path');
      const dir = './uploads/directory';
      if (!fs.existsSync(dir)) return res.status(404).json({ error: '暂无通讯录' });

      const files = fs.readdirSync(dir).sort().reverse();
      if (files.length === 0) return res.status(404).json({ error: '暂无通讯录' });

      const filePath = path.resolve(`${dir}/${files[0]}`);
      res.download(filePath, `展会通讯录_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) { next(err); }
  },
};
