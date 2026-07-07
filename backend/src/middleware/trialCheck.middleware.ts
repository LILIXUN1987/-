import { Request, Response, NextFunction } from 'express';
import db from '../config/database';
import { ForbiddenError } from '../utils/errors';
import { isBusinessRole } from '../types';

/**
 * 检查当前认证用户的体验期是否已过期
 * 对货运代理/检测认证/运输保险角色生效，管理员、外贸行业、律师和海外代理不限制
 * 过期 → 返回 403 TRIAL_EXPIRED
 * 正常 → next()
 */
export async function requireActiveTrial(req: Request, _res: Response, next: NextFunction) {
  try {
    // 没有认证信息（authOptional 场景）→ 走公共路径，不拦截
    if (!req.user?.id) return next();

    const user = await db('users').where({ id: req.user.id }).first() as any;
    if (!user) return next();

    // 仅货运代理/检测认证/运输保险检查体验期
    if (!isBusinessRole(user.role)) return next();

    const trialEnd = user.trial_end as string | null;
    if (!trialEnd) return next(); // 没有设置体验期（老用户）→ 放行

    const now = new Date();
    const end = new Date(trialEnd + 'T23:59:59');

    if (end < now) {
      return next(new ForbiddenError(
        '您的免费体验期已结束，数据录入+模块查询功能已暂停。请联系管理员续期以恢复全部功能。'
      ));
    }

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * 检查指定用户是否为过期货代（供 controller 内调用）
 */
export async function isExpiredForwarder(userId: string): Promise<boolean> {
  try {
    const user = await db('users').where({ id: userId }).first() as any;
    if (!user || !isBusinessRole(user.role)) return false;
    const trialEnd = user.trial_end as string | null;
    if (!trialEnd) return false;
    const now = new Date();
    const end = new Date(trialEnd + 'T23:59:59');
    return end < now;
  } catch {
    return false;
  }
}
