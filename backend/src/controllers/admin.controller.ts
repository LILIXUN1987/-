import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import db from '../config/database';
import { ForbiddenError } from '../utils/errors';
import logger from '../utils/logger';
import XLSX from 'xlsx';

export async function requireAdmin(req: Request) {
  const user = await db('users').where({ id: req.user!.id }).first();
  if (user?.role !== 'admin') throw new ForbiddenError('仅管理员可操作');
}

export const adminController = {
  // ---- 运营数据统计 ----
  async stats(req: Request, res: Response, next: NextFunction) {
    try {
      await requireAdmin(req);
      const today = new Date().toISOString().split('T')[0];
      const todayLike = today + '%';
      const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const startDate = sevenDaysAgo.toISOString().split('T')[0];

      const [
        newUsers, todayPush, todaySearches, todayMatches, todayActiveUsers,
        totalUsers, totalCargos, userRoleCounts, expiringSoon, todayDau,
      ] = await Promise.all([
        db('users').where('created_at', 'like', todayLike).count('* as total').first(),
        db('raw_messages').where('created_at', 'like', todayLike).count('* as total').first(),
        db('search_logs').where('created_at', 'like', todayLike).count('* as total').first(),
        db('search_logs').where('created_at', 'like', todayLike).where('has_push', true).count('* as total').first(),
        db('search_logs').where('created_at', 'like', todayLike).whereNotNull('user_id').countDistinct('user_id as total').first(),
        db('users').count('* as total').first(),
        db('cargo_spaces').count('* as total').first(),
        db('users').select('role').count('* as cnt').groupBy('role') as any,
        db('users').where({ role: 'forwarder' }).whereNotNull('trial_end')
          .where('trial_end', '>=', today)
          .where('trial_end', '<=', new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0])
          .count('* as total').first(),
        db('users').where('last_active_date', today).count('* as total').first(),
      ]);

      const roleBreakdown: Record<string, number> = {};
      for (const r of userRoleCounts) roleBreakdown[r.role] = Number(r.cnt);

      const dailySearchLogs: any[] = await db('search_logs').where('created_at', 'like', startDate + '%')
        .select(db.raw("substr(created_at, 1, 10) as day"), db.raw('COUNT(*) as cnt'))
        .groupByRaw("substr(created_at, 1, 10)").orderBy('day', 'asc');
      const dailyActiveLogs: any[] = await db("users").where("last_active_date", ">=", startDate)
        .select("last_active_date as day", db.raw("COUNT(*) as cnt"))
        .groupBy("last_active_date").orderBy("day", "asc");
      const dailyNewUsersLogs: any[] = await db('users').where('created_at', 'like', startDate + '%')
        .select(db.raw("substr(created_at, 1, 10) as day"), db.raw('COUNT(*) as cnt'))
        .groupByRaw("substr(created_at, 1, 10)").orderBy('day', 'asc');

      const buildDaily = (logs: any[], field: string, key: string) => {
        const map: Record<string, number> = {};
        for (const r of logs) map[r.day] = Number(r.cnt);
        const result: any[] = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(sevenDaysAgo); d.setDate(d.getDate() + i);
          const dateStr = d.toISOString().split('T')[0];
          result.push({ date: dateStr, [key]: map[dateStr] || 0 });
        }
        return result;
      };

      const activeUserDetails = await db('search_logs')
        .leftJoin('users', 'search_logs.user_id', 'users.id')
        .where('search_logs.created_at', 'like', todayLike)
        .whereNotNull('search_logs.user_id')
        .select(
          'users.id', 'users.display_name', 'users.company_name', 'users.role',
          db.raw('COUNT(*) as search_count'),
          db.raw("SUM(CASE WHEN search_logs.has_push=1 THEN 1 ELSE 0 END) as push_count"),
        )
        .groupBy('search_logs.user_id')
        .orderBy('search_count', 'desc')
        .limit(20);

      const todayActiveForwarders = await db('messages')
        .leftJoin('users', 'messages.sender_id', 'users.id')
        .where('messages.created_at', 'like', todayLike)
        .where('users.role', 'forwarder')
        .countDistinct('messages.sender_id as total').first() as any;

      res.json({
        today: {
          newUsers: Number((newUsers as any)?.total || 0),
          newPush: Number((todayPush as any)?.total || 0),
          searches: Number((todaySearches as any)?.total || 0),
          matches: Number((todayMatches as any)?.total || 0),
          activeUsers: Number((todayActiveUsers as any)?.total || 0),
          dau: Number((todayDau as any)?.total || 0),
          activeForwarders: Number(todayActiveForwarders?.total || 0),
        },
        total: {
          users: Number((totalUsers as any)?.total || 0),
          cargos: Number((totalCargos as any)?.total || 0),
          roleBreakdown,
          expiringSoon: Number((expiringSoon as any)?.total || 0),
        },
        dailySearches: buildDaily(dailySearchLogs, 'cnt', 'searches'),
        dailyNewUsers: buildDaily(dailyNewUsersLogs, 'cnt', 'newUsers'),
        dailyActive: buildDaily(dailyActiveLogs, 'cnt', 'dau'),
        activeUserDetails,
        funnel: { searches: 0, matches: 0, inquiries: 0, messages: 0 },
      });
    } catch (err) { next(err); }
  },

  // ---- 用户详细分析 ----
  async userAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      await requireAdmin(req);
      const users = await db('users')
        .select('id', 'username', 'display_name', 'company_name', 'role', 'email', 'status', 'trial_end', 'created_at')
        .orderBy('created_at', 'desc').limit(200);
      const userIds = users.map((u: any) => u.id);
      if (userIds.length === 0) return res.json({ data: [] });

      const searchCounts = await db('search_logs').whereIn('user_id', userIds)
        .select('user_id', db.raw('COUNT(*) as cnt'), db.raw("SUM(CASE WHEN has_push=1 THEN 1 ELSE 0 END) as push_cnt"))
        .groupBy('user_id');
      const searchMap: Record<string, any> = {};
      for (const r of searchCounts) searchMap[r.user_id] = r;

      const msgSent = await db('messages').whereIn('sender_id', userIds)
        .select('sender_id', db.raw('COUNT(*) as cnt')).groupBy('sender_id');
      const sentMap: Record<string, number> = {};
      for (const r of msgSent) sentMap[r.sender_id] = Number(r.cnt);

      const msgReceived = await db('messages').whereIn('receiver_id', userIds)
        .select('receiver_id', db.raw('COUNT(*) as cnt')).groupBy('receiver_id');
      const recvMap: Record<string, number> = {};
      for (const r of msgReceived) recvMap[r.receiver_id] = Number(r.cnt);

      const rawMsgUsers = await db('raw_messages').whereIn('uploaded_by', userIds)
        .select('uploaded_by', db.raw('COUNT(*) as cnt')).groupBy('uploaded_by');
      const rawMap: Record<string, number> = {};
      for (const r of rawMsgUsers) rawMap[r.uploaded_by] = Number(r.cnt);

      const data = users.map((u: any) => {
        const sr = searchMap[u.id] || {};
        return {
          id: u.id, username: u.username, display_name: u.display_name,
          company_name: u.company_name, role: u.role, email: u.email,
          status: u.status, trial_end: u.trial_end, created_at: u.created_at,
          search_count: Number(sr.cnt || 0), push_count: Number(sr.push_cnt || 0),
          cargo_count: rawMap[u.id] || 0,
          msg_sent: sentMap[u.id] || 0, msg_received: recvMap[u.id] || 0,
          total_msgs: (sentMap[u.id] || 0) + (recvMap[u.id] || 0),
        };
      });
      res.json({ data });
    } catch (err) { next(err); }
  },

  // ---- 会员套餐管理 ----
  async listPlans(req: Request, res: Response, next: NextFunction) {
    try {
      await requireAdmin(req);
      const data = await db('membership_plans').orderBy('days', 'asc');
      res.json({ data });
    } catch (err) { next(err); }
  },

  async savePlan(req: Request, res: Response, next: NextFunction) {
    try {
      await requireAdmin(req);
      const { id, name, days, price, is_active } = req.body;
      if (!name || !days || price === undefined) return res.status(400).json({ error: '参数不完整' });
      if (id) {
        await db('membership_plans').where({ id }).update({ name, days, price, is_active: is_active !== false });
      } else {
        await db('membership_plans').insert({ id: uuidv4(), name, days, price, is_active: is_active !== false });
      }
      res.json({ message: '保存成功' });
    } catch (err) { next(err); }
  },

  async deletePlan(req: Request, res: Response, next: NextFunction) {
    try {
      await requireAdmin(req);
      await db('membership_plans').where({ id: req.params.id }).delete();
      res.json({ message: '已删除' });
    } catch (err) { next(err); }
  },

  // ---- 手动续期 ----
  async renewUser(req: Request, res: Response, next: NextFunction) {
    try {
      await requireAdmin(req);
      const { username, plan_id, days, amount, remark } = req.body;
      if (!username || !days) return res.status(400).json({ error: '参数不完整' });
      const user = await db('users').where({ username }).first() as any;
      if (!user) return res.status(404).json({ error: '用户不存在' });
      const currentEnd = user.trial_end ? new Date(user.trial_end + 'T23:59:59') : new Date();
      const now = new Date();
      const start = currentEnd > now ? currentEnd : now;
      const newEnd = new Date(start.getTime() + days * 86400000);
      await db('users').where({ id: user.id }).update({ trial_end: newEnd.toISOString().split('T')[0] });
      await db('renewal_records').insert({
        id: uuidv4(), user_id: user.id, plan_id: plan_id || null,
        days, amount: amount || 0, remark: remark || '', created_by: req.user!.id,
      });
      res.json({ message: `已为 ${user.display_name} 续期 ${days} 天，新到期日：${newEnd.toISOString().split('T')[0]}` });
    } catch (err) { next(err); }
  },

  // ---- 续期记录 ----
  async renewalRecords(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await db('renewal_records')
        .leftJoin('users', 'renewal_records.user_id', 'users.id')
        .leftJoin('users as creator', 'renewal_records.created_by', 'creator.id')
        .select('renewal_records.*', 'users.display_name as user_name', 'users.username', 'users.company_name', 'users.trial_end', 'creator.display_name as creator_name')
        .orderBy('renewal_records.created_at', 'desc').limit(100);
      res.json({ data });
    } catch (err) { next(err); }
  },

  // ---- 用户列表 ----
  async userList(req: Request, res: Response, next: NextFunction) {
    try {
      await requireAdmin(req);
      const q = (req.query.q as string) || '';
      const query = db('users').select('username', 'display_name', 'company_name', 'role', 'trial_end', 'status').limit(50).orderBy('created_at', 'desc');
      if (q) query.where(function () { this.where('username', 'like', '%' + q + '%').orWhere('display_name', 'like', '%' + q + '%').orWhere('company_name', 'like', '%' + q + '%'); });
      const data = await query;
      res.json({ data });
    } catch (err) { next(err); }
  },

  // ---- 企业认证 ----
  async companyVerifications(req: Request, res: Response, next: NextFunction) {
    try {
      await requireAdmin(req);
      const q = (req.query.q as string) || '';
      const query = db('users')
        .select('id', 'username', 'display_name', 'company_name', 'phone', 'email', 'role', 'card_image', 'company_license', 'is_verified_company', 'created_at')
        .where('company_license', '!=', '').whereNotNull('company_license')
        .orderBy('created_at', 'desc').limit(50);
      if (q) query.where(function () { this.where('company_name', 'like', '%' + q + '%').orWhere('display_name', 'like', '%' + q + '%'); });
      const data = await query;
      res.json({ data });
    } catch (err) { next(err); }
  },

  async approveVerification(req: Request, res: Response, next: NextFunction) {
    try {
      await requireAdmin(req);
      const { user_id } = req.body;
      if (!user_id) return res.status(400).json({ error: '缺少用户ID' });
      const user = await db('users').where({ id: user_id }).first() as any;
      if (!user) return res.status(404).json({ error: '用户不存在' });
      if (!user.company_license) return res.status(400).json({ error: '该用户未上传营业执照' });
      await db('users').where({ id: user_id }).update({ is_verified_company: 1 });
      res.json({ message: '企业认证已通过' });
    } catch (err) { next(err); }
  },

  async rejectVerification(req: Request, res: Response, next: NextFunction) {
    try {
      await requireAdmin(req);
      const { user_id } = req.body;
      if (!user_id) return res.status(400).json({ error: '缺少用户ID' });
      await db('users').where({ id: user_id }).update({ is_verified_company: 0, company_license: null });
      res.json({ message: '企业认证已驳回' });
    } catch (err) { next(err); }
  },

  // ---- 批量导入展会名片（Excel） ----
  async batchImport(req: Request, res: Response, next: NextFunction) {
    try {
      await requireAdmin(req);
      if (!req.file) return res.status(400).json({ error: '请上传Excel文件' });

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

      if (rows.length === 0) return res.status(400).json({ error: 'Excel文件为空' });

      const colMap: Record<string, string> = {};
      const sampleKeys = Object.keys(rows[0]);
      for (const key of sampleKeys) {
        const k = key.toLowerCase().trim();
        if (/姓名|名字|name/.test(k)) colMap.name = key;
        else if (/公司|企业|单位|company/.test(k)) colMap.company = key;
        else if (/手机|电话|phone|mobile/.test(k)) colMap.phone = key;
        else if (/邮箱|邮件|email/.test(k)) colMap.email = key;
      }

      if (!colMap.name || !colMap.company || !colMap.email) {
        return res.status(400).json({ error: 'Excel缺少必要列（姓名/公司/邮箱），示例：姓名 | 公司名 | 手机号 | 邮箱', detected: sampleKeys });
      }

      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
      function randomPwd(): string {
        return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      }

      const results: { name: string; company: string; email: string; username: string; password: string; status: string; reason?: string }[] = [];

      for (const row of rows) {
        const name = String(row[colMap.name] || '').trim();
        const company = String(row[colMap.company] || '').trim();
        const phone = colMap.phone ? String(row[colMap.phone] || '').trim() : '';
        const email = String(row[colMap.email] || '').trim().toLowerCase();

        if (!name || !company || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          results.push({ name, company, email, username: '', password: '', status: '跳过', reason: '缺少有效姓名/公司/邮箱' });
          continue;
        }

        const exists = await db('users').where({ email }).first();
        if (exists) {
          results.push({ name, company, email, username: '', password: '', status: '跳过', reason: '邮箱已注册' });
          continue;
        }

        let username = phone || email.split('@')[0];
        const nameExists = await db('users').where({ username }).first();
        if (nameExists) username = username + '_' + Math.random().toString(36).substring(2, 5);

        const password = randomPwd();
        const passwordHash = await bcrypt.hash(password, 12);
        const trialEnd = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
        const id = uuidv4();

        await db('users').insert({
          id, username, password_hash: passwordHash,
          display_name: name, company_name: company, phone, email,
          email_verified: 1, role: 'forwarder', status: 'approved', trial_end: trialEnd,
          referral_code: 'RF' + Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 30)]).join(''),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        results.push({ name, company, email, username, password, status: '成功' });
      }

      const { sendAccountActivationEmail } = await import('../services/email.service');
      const emailList = results.filter(r => r.status === '成功' && r.email);
      const successCount = results.filter(r => r.status === '成功').length;
      const skippedCount = results.length - successCount;

      // 计算今日剩余额度（查已有的批次记录，不含当前批次）
      const today = new Date().toISOString().split('T')[0];
      const todaySentBefore = await db('import_batches')
        .where('created_at', 'like', today + '%')
        .sum('success as total').first() as any;
      const sentBefore = Number(todaySentBefore?.total || 0);
      const DAILY_LIMIT = 150;
      const canSend = Math.min(emailList.length, Math.max(0, DAILY_LIMIT - sentBefore));

      const batchId = uuidv4();
      await db('import_batches').insert({
        id: batchId, file_name: req.file?.originalname || null,
        total: results.length, success: successCount,
        skipped: skippedCount, email_failed: 0, created_by: req.user!.id,
      });

      // 后台任务：逐封发邮件，每日硬上限 150 封
      if (canSend > 0) {
        (async () => {
          let failCount = 0;
          for (let i = 0; i < canSend; i++) {
            const r = emailList[i];
            try {
              await sendAccountActivationEmail(r.email, r.name, r.company, r.username, r.password);
            } catch (err: any) {
              failCount++;
              logger.error('后台发件失败 ' + r.email + ' (' + (i + 1) + '/' + canSend + '):', err);
            }
            if (i < canSend - 1) {
              await new Promise(r => setTimeout(r, 1500));
              if ((i + 1) % 5 === 0) await new Promise(r => setTimeout(r, 5000));
            }
          }
          if (failCount > 0) {
            try { await db('import_batches').where({ id: batchId }).update({ email_failed: failCount }); } catch {}
          }
          logger.info('批量发件完成：成功 ' + (canSend - failCount) + '/' + canSend + '，今日累计 ' + (sentBefore + canSend - failCount) + '/' + DAILY_LIMIT);
        })();
      } else {
        logger.warn('每日发件上限 ' + DAILY_LIMIT + ' 已达（今天已发 ' + sentBefore + ' 封），跳过本次 ' + emailList.length + ' 封，请明天再导入');
      }

      let respMsg = '已导入 ' + successCount + ' 人，跳过 ' + skippedCount + ' 人。';
      if (canSend < emailList.length) {
        respMsg += '今天发件额度已用 ' + sentBefore + '/' + DAILY_LIMIT + '，本次将发 ' + canSend + ' 封，余 ' + (emailList.length - canSend) + ' 封明天再上传。';
      } else if (canSend > 0) {
        respMsg += '账号已创建，邮件后台逐封发送（约 ' + Math.ceil(canSend * 2.5 / 60) + ' 分钟完成）';
      } else {
        respMsg += '今日发件额度已满（' + sentBefore + '/' + DAILY_LIMIT + '），明天再上传即可继续发件。';
      }

      res.json({
        message: respMsg,
        total: results.length, success: successCount, batch_id: batchId,
        details: results.map(r => ({ name: r.name, email: r.email, status: r.status, reason: r.reason })),
      });
    } catch (err: any) {
      logger.error('批量导入失败:', err);
      next(err);
    }
  },

  // ---- 导入批次历史 ----
  async batchImportList(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await db('import_batches')
        .leftJoin('users', 'import_batches.created_by', 'users.id')
        .select('import_batches.*', 'users.display_name as admin_name')
        .orderBy('import_batches.created_at', 'desc').limit(50);
      res.json({ data });
    } catch (err) { next(err); }
  },
};
