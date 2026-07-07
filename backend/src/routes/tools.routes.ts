import { Router } from 'express';
import { AIRPORT_CITY_MAP } from '../data/airport-codes';
import { INTERNATIONAL_ZH_MAP } from '../data/international-zh-map';
import { HS_CODE_DATA } from '../data/hs-codes';

const router = Router();

// ── 机场三字代码查询 ──
router.get('/airport-search', (req, res) => {
  const q = ((req.query.q as string) || '').trim().toLowerCase();
  if (!q || q.length < 1) return res.json({ data: [] });

  const results: { code: string; zh: string; en?: string; country?: string; type: 'domestic' | 'international' }[] = [];

  // 国内机场：按城市名或代码搜索
  for (const [city, code] of Object.entries(AIRPORT_CITY_MAP)) {
    if (code.toLowerCase().includes(q) || city.toLowerCase().includes(q)) {
      results.push({ code, zh: city, type: 'domestic' });
    }
  }

  // 国际机场：按代码/中文名/英文名搜索
  for (const [code, info] of Object.entries(INTERNATIONAL_ZH_MAP)) {
    if (code.toLowerCase().includes(q) ||
        info.zh.toLowerCase().includes(q) ||
        info.en.toLowerCase().includes(q)) {
      results.push({ code, zh: info.zh, en: info.en, country: info.country, type: 'international' });
    }
  }

  // 排序：精确匹配在前，中文城市名匹配优先
  results.sort((a, b) => {
    const aCodeExact = a.code.toLowerCase() === q;
    const bCodeExact = b.code.toLowerCase() === q;
    const aZhExact = a.zh.toLowerCase() === q;
    const bZhExact = b.zh.toLowerCase() === q;
    const aEnExact = a.en?.toLowerCase() === q;
    const bEnExact = b.en?.toLowerCase() === q;

    if (aCodeExact && !bCodeExact) return -1;
    if (!aCodeExact && bCodeExact) return 1;
    if (aZhExact && !bZhExact) return -1;
    if (!aZhExact && bZhExact) return 1;
    if (aEnExact && !bEnExact) return -1;
    if (!aEnExact && bEnExact) return 1;

    return 0;
  });

  res.json({ data: results.slice(0, 30) });
});

// ── HS 编码快速查询 ──
router.get('/hs-search', (req, res) => {
  const q = ((req.query.q as string) || '').trim().toLowerCase();
  if (!q || q.length < 1) return res.json({ data: [] });

  const results = HS_CODE_DATA.filter(item =>
    item.code.includes(q) ||
    item.name.toLowerCase().includes(q) ||
    item.category.includes(q),
  );

  res.json({ data: results.slice(0, 30) });
});

export default router;
