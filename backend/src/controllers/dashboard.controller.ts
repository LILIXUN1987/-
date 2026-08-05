import { Request, Response, NextFunction } from 'express';
import db from '../config/database';
import { cargoService } from '../services/cargo.service';

export const dashboardController = {
  async index(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role || '';
      if (!userId) {
        return res.status(401).json({ error: '未认证' });
      }

      // ── 1. 用户基础信息 ──
      const user = await db('users')
        .select('id', 'display_name', 'company_name', 'role', 'avatar', 'trial_end', 'email', 'phone', 'is_newbie', 'is_verified_company', 'company_license', 'business_scope')
        .where({ id: userId })
        .first() as any;

      // ── 2. 全局统计（复用 cargoService） ──
      const globalStats = await cargoService.getStats();

      // ── 3. 用户个人统计 ──
      const myCargos = await db('cargo_spaces')
        .where('uploaded_by', userId)
        .select(
          db.raw('COUNT(*) as total'),
          db.raw("SUM(CASE WHEN cargo_spaces.status = 'available' AND cargo_spaces.valid_to >= date('now') THEN 1 ELSE 0 END) as active"),
          db.raw('SUM(cargo_spaces.view_count) as total_views'),
          db.raw('SUM(cargo_spaces.inquiry_count) as total_inquiries')
        )
        .first() as any;

      // ── 4. 近7天趋势（用户的发布/浏览量） ──
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString();

      const weeklyViews = await db('cargo_spaces')
        .where('uploaded_by', userId)
        .where('updated_at', '>=', sevenDaysAgoStr)
        .select(db.raw("date(cargo_spaces.updated_at) as day"))
        .select(db.raw('SUM(cargo_spaces.view_count) as views'))
        .groupByRaw("date(cargo_spaces.updated_at)")
        .orderByRaw("date(cargo_spaces.updated_at) asc") as any[];

      // ── 5. 我的热门路线（按浏览量排序） ──
      const topRoutes = await db('cargo_spaces')
        .leftJoin('uploaded_files', 'cargo_spaces.uploaded_file_id', 'uploaded_files.id')
        .leftJoin('raw_messages', 'cargo_spaces.uploaded_file_id', 'raw_messages.id')
        .where(function (this: any) {
          this.where('uploaded_files.uploaded_by', userId)
            .orWhere('raw_messages.uploaded_by', userId);
        })
        .where('cargo_spaces.status', 'available')
        .select('cargo_spaces.origin_port', 'cargo_spaces.dest_port', 'cargo_spaces.region',
          'cargo_spaces.view_count', 'cargo_spaces.inquiry_count')
        .orderBy('cargo_spaces.view_count', 'desc')
        .limit(5) as any[];

      // ── 6. 今日活跃动态 ──
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayStr = todayStart.toISOString();

      const todaySearches = await db('search_logs')
        .where('created_at', '>=', todayStr)
        .count('* as total')
        .first() as any;

      const todayInquiries = await db('messages')
        .where('created_at', '>=', todayStr)
        .where('content', 'like', '📢%')
        .count('* as total')
        .first() as any;

      const todayNewUsers = await db('users')
        .where('created_at', '>=', todayStr)
        .count('* as total')
        .first() as any;

      // ── 8. 报关券相关（按角色） ──
      let couponInfo = null;
      if (userRole === 'forwarder' || userRole === 'admin') {
        const sub = await db('monthly_subscriptions')
          .where({ user_id: userId, status: 'active' })
          .first() as any;
        const couponCounts = await db('customs_coupons')
          .where({ forwarder_id: userId })
          .select(
            db.raw('COUNT(*) as total'),
            db.raw("SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent"),
            db.raw("SUM(CASE WHEN status = 'used' THEN 1 ELSE 0 END) as used"),
          )
          .first() as any;
        couponInfo = {
          subscribed: !!sub,
          current_month: sub?.current_month || null,
          total_issued: Number(couponCounts?.total || 0),
          sent: Number(couponCounts?.sent || 0),
          used: Number(couponCounts?.used || 0),
        };
      } else if (userRole === 'trader') {
        const coupons = await db('customs_coupons')
          .where({ trader_id: userId })
          .select(
            db.raw('COUNT(*) as total'),
            db.raw("SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as available"),
            db.raw("SUM(CASE WHEN status = 'used' THEN 1 ELSE 0 END) as used"),
          )
          .first() as any;
        couponInfo = {
          total: Number(coupons?.total || 0),
          available: Number(coupons?.available || 0),
          used: Number(coupons?.used || 0),
        };
      }

      // ── 7. 近期活动（仅展示外贸用户的搜索——方便货代拦截） ──
      const recentActivities = await db('search_logs')
        .leftJoin('users', 'search_logs.user_id', 'users.id')
        .whereNotNull('users.company_name')
        .where('users.role', 'trader')
        .select('search_logs.keyword', 'search_logs.created_at', 'users.id as user_id', 'users.company_name', 'users.display_name')
        .orderBy('search_logs.created_at', 'desc')
        .limit(8) as any[];

      res.json({
        user: {
          display_name: user?.display_name || '',
          company_name: user?.company_name || '',
          role: user?.role || '',
          avatar: user?.avatar || null,
          trial_end: user?.trial_end || null,
          email: user?.email || null,
          phone: user?.phone || null,
          is_newbie: !!user?.is_newbie,
          is_verified_company: !!user?.is_verified_company,
          company_license: user?.company_license || null,
          business_scope: user?.business_scope || null,
        },
        globalStats: {
          totalUsers: globalStats.users || 0,
          availableCargos: globalStats.available || 0,
          regions: globalStats.regions || 0,
          todayAir: globalStats.categories?.air || 0,
          todaySea: globalStats.categories?.sea || 0,
          todayLand: globalStats.categories?.land || 0,
          todayExpress: globalStats.categories?.express || 0,
        },
        myStats: {
          totalCargos: Number(myCargos?.total || 0),
          activeCargos: Number(myCargos?.active || 0),
          totalViews: Number(myCargos?.total_views || 0),
          totalInquiries: Number(myCargos?.total_inquiries || 0),
          topRoutes: topRoutes || [],
          weeklyViews: weeklyViews || [],
        },
        todayStats: {
          searches: Number(todaySearches?.total || 0),
          inquiries: Number(todayInquiries?.total || 0),
          newUsers: Number(todayNewUsers?.total || 0),
        },
        couponInfo,
        recentActivities: (recentActivities || []).map((a: any) => ({
          keyword: a.keyword,
          company: a.company_name,
          name: a.display_name,
          user_id: a.user_id,
          time: a.created_at,
        })),
      });
    } catch (err) {
      next(err);
    }
  },
};
