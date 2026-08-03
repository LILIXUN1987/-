import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { INTERNATIONAL_ZH_MAP } from '../data/international-zh-map';
import { INTERNATIONAL_PORTS } from '../data/airport-codes';
import { authRequired } from '../middleware/auth.middleware';
import { ddpController } from '../controllers/ddp.controller';
import { env } from '../config/env';

const router = Router();

/** 管理员鉴权中间件 */
async function requireAdmin(req: any, res: any, next: any) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: '仅管理员可操作' });
  }
  next();
}

// DDP文件上传（箱单发票等）- 仅单文件
const ddpUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => { cb(null, env.upload.dir); },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `ddp-${uuidv4()}${ext}`);
    },
  }),
  fileFilter: (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xlsx', '.xls'];
    if (!allowed.includes(path.extname(file.originalname).toLowerCase())) {
      return cb(new Error(`不支持的文件类型，请上传图片/PDF/Word/Excel`));
    }
    cb(null, true);
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

router.use(authRequired);

// 代理列表（公开）
router.get('/agents', ddpController.agents);

// 全部代理（管理员）
router.get('/agents/all', requireAdmin, ddpController.allAgents);

// 添加/编辑代理（管理员）
router.post('/agents/save', requireAdmin, ddpController.saveAgent);

// 审核代理（管理员）
router.post('/agents/:id/review', requireAdmin, ddpController.reviewAgent);

// 删除代理（管理员）
router.delete('/agents/:id', requireAdmin, ddpController.deleteAgent);

// 海外代理自助入驻
router.post('/agents/self-onboard', ddpController.selfOnboard);
router.get('/agents/my-status', ddpController.myOnboardStatus);

// DDP文件上传
router.post('/upload', ddpUpload.single('file'), ddpController.uploadFile);

// DDP 询价
router.post('/inquiry', ddpController.submitInquiry);
router.get('/my-inquiries', ddpController.myInquiries);

// 需求热度统计
router.get('/stats', ddpController.stats);

// 结构化报价
router.post('/quotes', ddpController.submitQuote);
router.get('/quotes/my', ddpController.myQuotes);
router.get('/quotes/:inquiryId', ddpController.getQuotes);
router.post('/quotes/:id/respond', ddpController.respondQuote);

// 入驻草稿
router.post('/onboarding-draft', ddpController.saveOnboardingDraft);
router.get('/onboarding-draft', ddpController.getOnboardingDraft);

// 管理员：未完成入驻列表
router.get('/pending-onboardings', requireAdmin, ddpController.pendingOnboardings);

// 管理员：计算代理标签
router.post('/compute-tags', requireAdmin, ddpController.computeAgentTags);


// 获取DDP目的地数据（国家列表+港口）
router.get('/destinations', async (req, res) => {
  try {
    const { country } = req.query;

    // 从国际机场数据中提取所有国家
    const countrySet = new Set<string>();
    for (const [code, info] of Object.entries(INTERNATIONAL_ZH_MAP)) {
      const entry = info as { en: string; zh: string; country: string };
      if (entry.country) countrySet.add(entry.country);
    }
    countrySet.add('China');
    countrySet.add('中国');
    const allCountries = Array.from(countrySet).sort();

    // 如果没有指定国家，只返回国家列表
    if (!country || typeof country !== 'string') {
      return res.json({ countries: allCountries });
    }

    // 查找该国家的主要港口/机场
    const q = country.toLowerCase();
    const ports: { code: string; name: string }[] = [];

    for (const [code, info] of Object.entries(INTERNATIONAL_ZH_MAP)) {
      const entry = info as { en: string; zh: string; country: string };
      if (entry.country && entry.country.toLowerCase().includes(q)) {
        ports.push({ code, name: entry.zh || entry.en });
      }
    }

    // 去重排序
        // 搜索中国时加入国内主要机场
    if (q.includes('china')) {
      const { AIRPORT_CITY_MAP } = require('../data/airport-codes');
      for (const [city, code] of Object.entries(AIRPORT_CITY_MAP) as [string, string][]) {
        if (city !== code && !/^[A-Z]{3}$/.test(city)) {
          ports.push({ code, name: city });
        }
      }
    }

    const seen = new Set<string>();
    const uniquePorts = ports.filter(p => {
      const key = p.name + p.code;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));

    res.json({ countries: allCountries, ports: uniquePorts });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

export default router;
