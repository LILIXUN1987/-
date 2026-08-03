import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import db from '../config/database';
import logger from '../utils/logger';
import { env } from '../config/env';
import { recognizeImage, parseCardOcr, isOcrConfigured } from '../services/ocr.service';
import { isAlipayConfigured, createAlipayPagePayUrl } from '../services/alipay.service';

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
      const data = await db('card_batches')
        .leftJoin('collected_cards', 'card_batches.id', 'collected_cards.batch_id')
        .select('card_batches.id', 'card_batches.name', 'card_batches.notes', 'card_batches.total', 'card_batches.invited', 'card_batches.created_at')
        .select(db.raw('COUNT(CASE WHEN collected_cards.registered = 0 THEN 1 END) as pending'))
        .groupBy('card_batches.id')
        .orderBy('card_batches.created_at', 'desc')
        .limit(50);
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
      const cards = await db('collected_cards').where({ batch_id: batchId, invited: 0 }).whereNotNull('email').whereNot('email_status', 'bounced');
      // 每人随机密码（8位字母数字）
      const genPwd = () => Math.random().toString(36).slice(2, 10);
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

        const trialEnd = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
        const pwd = genPwd();
        const passwordHash = await bcrypt.hash(pwd, 12);
        await db('users').insert({
          id: uuidv4(), username, password_hash: passwordHash,
          display_name: card.name, company_name: card.company || null,
          email, email_verified: true, role: card.role || 'forwarder',
          status: 'approved', trial_end: trialEnd, is_newbie: true,
        });

        await db('collected_cards').where({ id: card.id }).update({ invited: 1, invited_at: new Date().toISOString() });

        try {
          const { sendAccountActivationEmail } = await import('../services/email.service');
          await sendAccountActivationEmail(email, card.name, card.company || '', username, pwd);
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

      const userId = req.user!.id;
      const batchId = uuidv4();
      const genPwd = () => Math.random().toString(36).slice(2, 10);
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

        const trialEnd = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
        const pwd = genPwd();
        const passwordHash = await bcrypt.hash(pwd, 12);
        await db('users').insert({
          id: uuidv4(), username, password_hash: passwordHash,
          display_name: name, company_name: companyName, email,
          email_verified: true, role: 'forwarder',
          status: 'approved', trial_end: trialEnd, is_newbie: true,
        });

        // 发邮件
        try {
          const { sendAccountActivationEmail } = await import('../services/email.service');
          await sendAccountActivationEmail(email, name, companyName || '', username, pwd);
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
      const { search, batch_id, tag } = req.query;
      let query = db('collected_cards')
        .leftJoin('card_batches', 'collected_cards.batch_id', 'card_batches.id')
        .select(
          'collected_cards.id', 'collected_cards.name', 'collected_cards.company',
          'collected_cards.phone', 'collected_cards.email', 'collected_cards.role',
          'collected_cards.registered_user_id', 'collected_cards.batch_id',
          'collected_cards.tag', 'collected_cards.created_at',
          'card_batches.name as batch_name',
        );

      if (batch_id && typeof batch_id === 'string' && batch_id.trim()) {
        query = query.where('collected_cards.batch_id', batch_id.trim());
      }
      if (tag && typeof tag === 'string' && tag.trim()) {
        if (tag === '__untagged') query = query.whereNull('collected_cards.tag');
        else query = query.where('collected_cards.tag', tag.trim());
      }
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

  /** 获取所有标签（基于当前批次） */
  async directoryTags(req: Request, res: Response, next: NextFunction) {
    try {
      const { batch_id } = req.query;
      let query = db('collected_cards').whereNotNull('tag').where('tag', '!=', '');
      if (batch_id && typeof batch_id === 'string') query = query.where('batch_id', batch_id);
      const data = await query.select('tag').select(db.raw('COUNT(*) as cnt')).groupBy('tag').orderBy('cnt', 'desc');
      res.json({ data });
    } catch (err) { next(err); }
  },

  /** 获取通讯录分类（批次列表） */
  async directoryBatches(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await db('card_batches')
        .leftJoin('collected_cards', 'card_batches.id', 'collected_cards.batch_id')
        .select('card_batches.id', 'card_batches.name', 'card_batches.notes', 'card_batches.total', 'card_batches.created_at')
        .select(db.raw('COUNT(collected_cards.id) as actual'))
        .select(db.raw('SUM(CASE WHEN collected_cards.registered_user_id IS NOT NULL THEN 1 ELSE 0 END) as registered'))
        .groupBy('card_batches.id')
        .orderBy('card_batches.created_at', 'desc');
      res.json({ data });
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
      if (rows.length > 100) return res.status(400).json({ error: '单次上传不超过 100 条，请拆分后分批上传' });

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

      // 4. 仅保存到 collected_cards，标记已注册状态，不创建账号不发邮件
      const userId = req.user!.id;
      const batchId = uuidv4();
      let validCount = 0, alreadyRegistered = 0, invalidCount = 0;
      const details: any[] = [];

      for (const row of rows) {
        const name = colMap.name ? String(row[colMap.name] || '').trim() : '';
        const company = colMap.company ? String(row[colMap.company] || '').trim() : '';
        const phone = colMap.phone ? String(row[colMap.phone] || '').trim() : '';
        const email = colMap.email ? String(row[colMap.email] || '').trim().toLowerCase() : '';

        if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          invalidCount++;
          details.push({ name, email, status: 'invalid', reason: '缺少姓名或邮箱格式无效' });
          continue;
        }

        const existing = await db('users').where({ email }).first();
        const isRegistered = !!existing;
        await db('collected_cards').insert({
          id: uuidv4(), name, company: company || null, phone: phone || null,
          email, role: 'forwarder', batch_id: batchId, created_by: userId,
          invited: 1,
          registered: isRegistered ? 1 : 0,
          registered_user_id: existing?.id || null,
        });

        if (isRegistered) {
          alreadyRegistered++;
          details.push({ name, company, email, status: 'registered', reason: '已注册' });
        } else {
          validCount++;
          details.push({ name, company, email, status: 'pending', reason: null });
        }
      }

      // 批次名称：优先用前端传入的 name，否则用文件名
      const batchName = (req.body.batch_name || file.originalname.replace(/\.(xlsx|xls)$/i, '')).trim() || `通讯录 ${new Date().toLocaleDateString('zh-CN')}`;
      const batchNotes = req.body.batch_notes || null;
      await db('card_batches').insert({
        id: batchId, name: batchName, notes: batchNotes,
        source: 'excel_upload', total: rows.length, invited: 0, created_by: userId,
      });
      try { fs.unlinkSync(file.path); } catch {}

      res.json({
        message: `上传完成：共 ${rows.length} 条，新用户 ${validCount} 人，已注册 ${alreadyRegistered} 人，无效 ${invalidCount} 条`,
        batch_id: batchId, total: rows.length, pending: validCount, registered: alreadyRegistered, invalid: invalidCount, details,
      });
    } catch (err) { next(err); }
  },

  /** 预览待邀请名单：根据 batch_id 查询未注册的记录 */
  async previewInvite(req: Request, res: Response, next: NextFunction) {
    try {
      const batchId = req.query.batch_id as string;
      if (!batchId) return res.status(400).json({ error: '缺少 batch_id' });
      const data = await db('collected_cards')
        .where({ batch_id: batchId, registered: 0 })
        .select('id', 'name', 'company', 'email')
        .orderBy('name', 'asc');
      res.json({ data, total: data.length });
    } catch (err) { next(err); }
  },

  /** 批量邀请注册：分批限速发送邮件，防止 SMTP 被封 */
  async batchInvite(req: Request, res: Response, next: NextFunction) {
    try {
      const { batch_id } = req.body;
      if (!batch_id) return res.status(400).json({ error: '缺少 batch_id' });

      const pending = await db('collected_cards')
        .where({ batch_id, registered: 0 }).select('*');
      if (pending.length === 0) return res.json({ message: '没有待邀请的记录', total: 0, success: 0, failed: 0 });

      // 立即返回，后台异步处理
      res.json({
        message: `已提交邀请请求，共 ${pending.length} 人，系统将在后台分批发送邮件，请稍后刷新查看结果。`,
        total: pending.length, queued: true,
      });

      // ── 后台分批处理 ──
      const BATCH_SIZE = 5;       // 每批并发数
      const DELAY_MS = 1000;      // 批间隔
      const password = 'test1234';
      const passwordHash = await bcrypt.hash(password, 12);
      const { sendAccountActivationEmail } = await import('../services/email.service');
      let success = 0;

      for (let i = 0; i < pending.length; i += BATCH_SIZE) {
        const batch = pending.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(batch.map(async (card) => {
          const email = card.email;
          if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
          const existing = await db('users').where({ email }).first();
          if (existing) {
            await db('collected_cards').where({ id: card.id }).update({ registered: 1, registered_user_id: existing.id });
            success++;
            return;
          }

          let username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
          if (await db('users').where({ username }).first()) username += Math.random().toString(36).substring(2, 5);

          const trialEnd = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
          const userId = uuidv4();
          try {
            await db('users').insert({
              id: userId, username, password_hash: passwordHash, display_name: card.name,
              company_name: card.company || null, email, email_verified: true, role: 'forwarder',
              status: 'approved', trial_end: trialEnd, is_newbie: true, plan_tier: 'standard',
            });
            await db('collected_cards').where({ id: card.id }).update({
              registered: 1, registered_user_id: userId, invited: 1, invited_at: new Date().toISOString(),
            });
            try {
              await sendAccountActivationEmail(email, card.name, card.company || '', username, password);
            } catch { /* 邮件发送失败不影响注册 */ }
            success++;
          } catch { /* 创建失败跳过 */ }
        }));

        if (i + BATCH_SIZE < pending.length) {
          await new Promise(r => setTimeout(r, DELAY_MS));
        }
      }

      try { await db('card_batches').where({ id: batch_id }).increment('invited', success); } catch {}
      logger.info(`批量邀请完成：批次 ${batch_id}，成功 ${success}/${pending.length} 人`);
    } catch (err) { next(err); }
  },

  /** 管理员：删除指定批次（同时删除批次下的所有卡片） */
  async deleteBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const { batchId } = req.params;
      const batch = await db('card_batches').where({ id: batchId }).first();
      if (!batch) return res.status(404).json({ error: '批次不存在' });

      // 删除该批次下的所有 collected_cards
      await db('collected_cards').where({ batch_id: batchId }).delete();
      // 删除批次记录
      await db('card_batches').where({ id: batchId }).delete();

      res.json({ message: '已删除' });
    } catch (err) { next(err); }
  },

  /** 管理员：更新批次名称/备注 */
  async updateBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const { batchId } = req.params;
      const { name, notes } = req.body;
      const updates: Record<string, any> = {};
      if (name !== undefined) updates.name = name;
      if (notes !== undefined) updates.notes = notes;
      if (Object.keys(updates).length === 0) return res.status(400).json({ error: '没有要更新的字段' });
      await db('card_batches').where({ id: batchId }).update(updates);
      res.json({ message: '已更新' });
    } catch (err) { next(err); }
  },

  /** 更新联系人标签 */
  async updateCardTag(req: Request, res: Response, next: NextFunction) {
    try {
      const { cardId } = req.params;
      const { tag } = req.body;
      await db('collected_cards').where({ id: cardId }).update({ tag: tag || null });
      res.json({ message: '标签已更新' });
    } catch (err) { next(err); }
  },

  // ── 用户：下载展会通讯录（角色感知：免费版给5条，付费版全部） ──
  async downloadDirectory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const user = await db('users').where({ id: userId }).first() as any;
      const isAdmin = user?.role === 'admin';

      // ── 活跃度兑换下载量 ──
      const publishCount = Number(((await db('raw_messages')
        .where({ uploaded_by: userId }).count('* as total').first()) as any)?.total || 0);
      const searchCount = Number(((await db('search_logs')
        .where({ user_id: userId }).count('* as total').first()) as any)?.total || 0);
      // 已下载次数
      const downloadedCount = Number(((await db('contact_downloads')
        .where({ user_id: userId }).count('* as total').first()) as any)?.total || 0);

      // 计算可下载条数
      let maxDownload = 0;
      if (publishCount >= 10) maxDownload = 99999; // 全量
      else if (publishCount >= 3) maxDownload = 20;
      else if (publishCount >= 1) maxDownload = 5;
      if (searchCount >= 30) maxDownload = Math.max(maxDownload, 20);
      else if (searchCount >= 10) maxDownload = Math.max(maxDownload, 5);

      const remaining = Math.max(0, maxDownload - downloadedCount);

      // ── 支持按 batch_id / ids 筛选下载 ──
      const batchId = req.query.batch_id as string | undefined;
      const ids = req.query.ids as string | undefined;
      const batchName = batchId
        ? ((await db('card_batches').where({ id: batchId }).first()) as any)?.name || '通讯录'
        : '展会通讯录';

      if (!isAdmin && remaining <= 0) {
        return res.status(403).json({
          error: `当前下载额度已用完。发布舱位或查询可解锁更多。`,
          publishCount, searchCount, maxDownload, downloadedCount,
        });
      }

      // ── 非管理员限制条数 ──
      const limit = isAdmin ? undefined : Math.min(remaining, 99999);

      const fs = require('fs');
      const XLSX = require('xlsx');
      let query = db('collected_cards');
      if (batchId) query = query.where('batch_id', batchId);
      if (ids) {
        const idArr = ids.split(',').filter(Boolean);
        if (idArr.length > 0) query = query.whereIn('id', idArr);
      }
      let cards = await query.orderBy('name', 'asc').select('name', 'company', 'phone', 'email', 'tag');
      const actualCount = cards.length;

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(cards.map(c => ({
        '姓名': c.name, '公司名': c.company || '', '手机号': c.phone || '', '邮箱': c.email || '',
      })));
      XLSX.utils.book_append_sheet(wb, ws, '通讯录');
      const tmpPath = `/tmp/${batchId || 'all'}_${Date.now()}.xlsx`;
      XLSX.writeFile(wb, tmpPath);

      // 记录下载
      try {
        await db('contact_downloads').insert({
          user_id: userId,
          count: actualCount,
          remark: 'activity_unlock',
          created_at: new Date().toISOString(),
        });
      } catch {}

      const fileName = `${batchName.replace(/[\\/:*?"<>|]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.attachment(fileName);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.sendFile(tmpPath, (err) => {
        if (!err) try { fs.unlinkSync(tmpPath); } catch {}
      });
    } catch (err) { next(err); }
  },

  // ── 免费版：付费下载全量通讯录（¥10） ──
  async purchaseDirectory(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isAlipayConfigured()) {
        return res.status(503).json({ error: '支付系统暂未配置' });
      }

      const userId = req.user!.id;
      const orderId = uuidv4();
      const outTradeNo = `DIR${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const price = 10;

      // 创建订单
      await db('payment_orders').insert({
        id: orderId, user_id: userId, plan_id: null,
        amount: price, days: 0,
        status: 'pending', channel: 'alipay', remark: outTradeNo,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      });

      const payUrl = await createAlipayPagePayUrl(
        outTradeNo, '展会通讯录全量下载', price,
        `${env.frontendUrl}/admin/card-directory?order_id=${orderId}`,
      );

      res.json({
        order_id: orderId, trade_no: outTradeNo,
        pay_method: 'redirect', pay_content: payUrl,
        channel: 'alipay', amount: price,
      });
    } catch (err: any) {
      logger.error('创建通讯录支付订单失败:', err.message || err);
      res.status(500).json({ error: '支付创建失败，请稍后重试' });
    }
  },

  // ── 用户：查看通讯录下载状态 ──
  async directoryDownloadStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const user = await db('users').where({ id: userId }).first() as any;
      const isAdmin = user?.role === 'admin';

      // 活跃度统计
      const publishCount = Number(((await db('raw_messages').where({ uploaded_by: userId }).count('* as total').first()) as any)?.total || 0);
      const searchCount = Number(((await db('search_logs').where({ user_id: userId }).count('* as total').first()) as any)?.total || 0);
      const downloadedCount = Number(((await db('contact_downloads').where({ user_id: userId }).count('* as total').first()) as any)?.total || 0);

      let maxDownload = 0;
      if (publishCount >= 10) maxDownload = 99999;
      else if (publishCount >= 3) maxDownload = 20;
      else if (publishCount >= 1) maxDownload = 5;
      if (searchCount >= 30) maxDownload = Math.max(maxDownload, 20);
      else if (searchCount >= 10) maxDownload = Math.max(maxDownload, 5);

      return res.json({
        canDownload: isAdmin || maxDownload > downloadedCount,
        publishCount, searchCount, maxDownload, downloadedCount,
        remaining: Math.max(0, maxDownload - downloadedCount),
      });
    } catch (err) { next(err); }
  },
};
