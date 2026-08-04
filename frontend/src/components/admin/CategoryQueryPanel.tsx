import { useState, useEffect, useRef } from 'react';
import client from '../../api/client';
import { messagesApi } from '../../api/messages.api';
import { favoritesApi } from '../../api/favorites.api';
import { Search, Loader2, Plane, Ship, Package, Truck, User, MessageSquare, Send, X, Star, Clock, Share2 } from 'lucide-react';
import dayjs from 'dayjs';

const SEARCH_HISTORY_KEY = 'search_history';
function loadHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]').slice(0, 10); } catch { return []; }
}
function saveHistory(keyword: string) {
  try {
    let h = loadHistory();
    h = [keyword, ...h.filter(k => k !== keyword)].slice(0, 10);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(h));
  } catch {}
}

interface CargoItem {
  region: string;
  airline_code?: string;
  origin_port?: string;
  dest_port?: string;
  notes: string;
  contact_info: string;
  uploaded_file_id?: string;
  valid_from: string;
  valid_to: string;
  created_at: string;
}

interface QueryResult {
  data: CargoItem[];
  total: number;
  push_message?: string;
}

const ALL_QUERIES = [
  { key: '空运出口', label: '空运查询助手（货代版）', icon: Plane },
  { key: '空运外贸版', label: '空运查询助手（外贸客户版）', icon: Plane },
  { key: '海运出口', label: '海运查询助手', icon: Ship },
  { key: '陆运出口', label: '陆运查询助手', icon: Truck },
  { key: '其他', label: '其他（进口清关+出口报关+包税双清+WCA/JC会员等）', icon: Search },
];

interface CategoryQueryPanelProps {
  showOnly?: string;
  initialKeyword?: string;
}

export default function CategoryQueryPanel({ showOnly, initialKeyword }: CategoryQueryPanelProps) {
  const [results, setResults] = useState<Record<string, QueryResult | null>>({});
  const [keywords, setKeywords] = useState<Record<string, string>>({});
  // 如果有初始关键词，组件挂载时自动触发搜索
  const initialTriggered = useRef(false);
  useEffect(() => {
    if (initialKeyword && !initialTriggered.current) {
      initialTriggered.current = true;
      const cat = queries[0]?.key;
      if (cat) {
        setKeywords(prev => ({ ...prev, [cat]: initialKeyword }));
        setTimeout(() => handleSearch(cat), 300);
      }
    }
  }, [initialKeyword]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [uploadFiles, setUploadFiles] = useState<Record<string, File | null>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [validHours, setValidHours] = useState<Record<string, string>>({});
  const [phoneNumber, setPhoneNumber] = useState<Record<string, string>>({});
  const [contactDialog, setContactDialog] = useState<{ contactInfo: string; cargoKey: string; uploadedFileId?: string; fullRecord?: any; searchKeyword?: string } | null>(null);
  const [contactText, setContactText] = useState('');
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [contactError, setContactError] = useState('');

  const [searchHistory, setSearchHistory] = useState<string[]>(loadHistory);
  const [trending, setTrending] = useState<any>(null);

  // ── 外贸客户版多字段表单状态 ──
  const [traderForm, setTraderForm] = useState({
    originPort: '',
    destPort: '',
    pieces: '',
    weight: '',
    volume: '',
    englishAddress: '',
  });
  const traderFormFilled = traderForm.originPort.trim() && traderForm.destPort.trim() && traderForm.englishAddress.trim();

  // ── 英文地址解析：识别就近枢纽机场 ──
  const [suggestedAirports, setSuggestedAirports] = useState<{ code: string; name: string }[]>([]);

  // US 州 → 主要枢纽机场映射
  const US_STATE_HUBS: Record<string, { code: string; name: string }[]> = {
    'CA': [{ code: 'LAX', name: '洛杉矶' }, { code: 'SFO', name: '旧金山' }, { code: 'SAN', name: '圣地亚哥' }],
    'NY': [{ code: 'JFK', name: '纽约肯尼迪' }, { code: 'EWR', name: '纽瓦克' }],
    'TX': [{ code: 'DFW', name: '达拉斯' }, { code: 'IAH', name: '休斯顿' }],
    'IL': [{ code: 'ORD', name: '芝加哥奥黑尔' }],
    'FL': [{ code: 'MIA', name: '迈阿密' }, { code: 'TPA', name: '坦帕' }, { code: 'FLL', name: '劳德代尔堡' }],
    'GA': [{ code: 'ATL', name: '亚特兰大' }],
    'WA': [{ code: 'SEA', name: '西雅图' }],
    'MA': [{ code: 'BOS', name: '波士顿' }],
    'PA': [{ code: 'PHL', name: '费城' }, { code: 'PIT', name: '匹兹堡' }],
    'DC': [{ code: 'IAD', name: '华盛顿杜勒斯' }],
    'MD': [{ code: 'BWI', name: '巴尔的摩' }],
    'CO': [{ code: 'DEN', name: '丹佛' }],
    'AZ': [{ code: 'PHX', name: '凤凰城' }],
    'NV': [{ code: 'LAS', name: '拉斯维加斯' }],
    'OR': [{ code: 'PDX', name: '波特兰' }],
    'MN': [{ code: 'MSP', name: '明尼阿波利斯' }],
    'MI': [{ code: 'DTW', name: '底特律' }],
    'NC': [{ code: 'CLT', name: '夏洛特' }, { code: 'RDU', name: '罗利' }],
    'OH': [{ code: 'CMH', name: '哥伦布' }, { code: 'CLE', name: '克利夫兰' }],
    'TN': [{ code: 'BNA', name: '纳什维尔' }, { code: 'MEM', name: '孟菲斯' }],
    'IN': [{ code: 'IND', name: '印第安纳波利斯' }],
    'MO': [{ code: 'STL', name: '圣路易斯' }, { code: 'MCI', name: '堪萨斯城' }],
    'LA': [{ code: 'MSY', name: '新奥尔良' }],
    'SC': [{ code: 'CHS', name: '查尔斯顿' }],
    'AL': [{ code: 'BHM', name: '伯明翰' }],
    'KY': [{ code: 'SDF', name: '路易斯维尔' }],
    'OK': [{ code: 'OKC', name: '俄克拉荷马城' }],
    'UT': [{ code: 'SLC', name: '盐湖城' }],
    'HI': [{ code: 'HNL', name: '火奴鲁鲁' }],
    'AK': [{ code: 'ANC', name: '安克雷奇' }],
  };

  // 美国知名城市→机场（含非枢纽城市映射到最近枢纽）
  const US_CITY_AIRPORTS: Record<string, { code: string; name: string }[]> = {
    'los angeles': [{ code: 'LAX', name: '洛杉矶' }],
    'san francisco': [{ code: 'SFO', name: '旧金山' }],
    'new york': [{ code: 'JFK', name: '纽约肯尼迪' }],
    'chicago': [{ code: 'ORD', name: '芝加哥奥黑尔' }],
    'miami': [{ code: 'MIA', name: '迈阿密' }],
    'seattle': [{ code: 'SEA', name: '西雅图' }],
    'boston': [{ code: 'BOS', name: '波士顿' }],
    'atlanta': [{ code: 'ATL', name: '亚特兰大' }],
    'dallas': [{ code: 'DFW', name: '达拉斯' }],
    'houston': [{ code: 'IAH', name: '休斯顿' }],
    'phoenix': [{ code: 'PHX', name: '凤凰城' }],
    'denver': [{ code: 'DEN', name: '丹佛' }],
    'las vegas': [{ code: 'LAS', name: '拉斯维加斯' }],
    'portland': [{ code: 'PDX', name: '波特兰' }],
    'san diego': [{ code: 'SAN', name: '圣地亚哥' }],
    'minneapolis': [{ code: 'MSP', name: '明尼阿波利斯' }],
    'detroit': [{ code: 'DTW', name: '底特律' }],
    'philadelphia': [{ code: 'PHL', name: '费城' }],
    'charlotte': [{ code: 'CLT', name: '夏洛特' }],
    'tampa': [{ code: 'TPA', name: '坦帕' }],
    'orlando': [{ code: 'MCO', name: '奥兰多' }],
    'baltimore': [{ code: 'BWI', name: '巴尔的摩' }],
    'nashville': [{ code: 'BNA', name: '纳什维尔' }],
    'indianapolis': [{ code: 'IND', name: '印第安纳波利斯' }],
    'columbus': [{ code: 'CMH', name: '哥伦布' }],
    'memphis': [{ code: 'MEM', name: '孟菲斯' }],
    'louisville': [{ code: 'SDF', name: '路易斯维尔' }],
    'kansas city': [{ code: 'MCI', name: '堪萨斯城' }],
    'new orleans': [{ code: 'MSY', name: '新奥尔良' }],
    'salt lake city': [{ code: 'SLC', name: '盐湖城' }],
    'san antonio': [{ code: 'SAT', name: '圣安东尼奥' }],
    'sacramento': [{ code: 'SMF', name: '萨克拉门托' }],
    'austin': [{ code: 'AUS', name: '奥斯汀' }],
    'raleigh': [{ code: 'RDU', name: '罗利' }],
    'milwaukee': [{ code: 'MKE', name: '密尔沃基' }],
    'cleveland': [{ code: 'CLE', name: '克利夫兰' }],
    'cincinnati': [{ code: 'CVG', name: '辛辛那提' }],
    'pittsburgh': [{ code: 'PIT', name: '匹兹堡' }],
    'norfolk': [{ code: 'ORF', name: '诺福克' }],
    'richmond': [{ code: 'RIC', name: '里士满' }],
    'jacksonville': [{ code: 'JAX', name: '杰克逊维尔' }],
    'oklahoma city': [{ code: 'OKC', name: '俄克拉荷马城' }],
    'hartford': [{ code: 'BDL', name: '哈特福德' }],
    'providence': [{ code: 'PVD', name: '普罗维登斯' }],
    'birmingham': [{ code: 'BHM', name: '伯明翰' }],
    'albuquerque': [{ code: 'ABQ', name: '阿尔伯克基' }],
    'tucson': [{ code: 'TUS', name: '图森' }],
    'fresno': [{ code: 'FAT', name: '弗雷斯诺' }],
    'boise': [{ code: 'BOI', name: '博伊西' }],
    'anchorage': [{ code: 'ANC', name: '安克雷奇' }],
    'honolulu': [{ code: 'HNL', name: '火奴鲁鲁' }],
  };

  // 解析英文地址，推测就近枢纽机场
  const parseEnglishAddress = (address: string) => {
    if (!address.trim()) { setSuggestedAirports([]); return; }

    const found: { code: string; name: string }[] = [];
    const lower = address.toLowerCase();

    // 1) 提取 US 州缩写（如 "CA", "NY", "OH"）
    const stateMatch = lower.match(/\b([a-z]{2})\b(?:\s+\d{5})/); // "OH 43201" 或 "CA 90001"
    if (stateMatch) {
      const stateAbbr = stateMatch[1].toUpperCase();
      const hubs = US_STATE_HUBS[stateAbbr];
      if (hubs) {
        for (const h of hubs) {
          if (!found.find(f => f.code === h.code)) found.push(h);
        }
      }
    }

    // 2) 如果没匹配到州缩写，尝试匹配已知城市名（多词先匹配）
    const cityEntries = Object.entries(US_CITY_AIRPORTS).sort((a, b) => b[0].length - a[0].length); // 长词优先
    for (const [city, airports] of cityEntries) {
      if (lower.includes(city)) {
        for (const a of airports) {
          if (!found.find(f => f.code === a.code)) found.push(a);
        }
      }
    }

    // 3) 如果完全没匹配到，看能否提取出国家展开的枢纽
    if (found.length === 0) {
      // 常见国家的默认枢纽
      const countryDefault: Record<string, { code: string; name: string }[]> = {
        'germany': [{ code: 'FRA', name: '法兰克福' }, { code: 'MUC', name: '慕尼黑' }],
        'uk|united kingdom|england|britain': [{ code: 'LHR', name: '伦敦希思罗' }, { code: 'MAN', name: '曼彻斯特' }],
        'vietnam': [{ code: 'SGN', name: '胡志明' }, { code: 'HAN', name: '河内' }],
        'japan': [{ code: 'NRT', name: '东京成田' }, { code: 'KIX', name: '大阪关西' }],
        'korea|south korea': [{ code: 'ICN', name: '首尔仁川' }],
        'thailand': [{ code: 'BKK', name: '曼谷' }],
        'singapore': [{ code: 'SIN', name: '新加坡' }],
        'india': [{ code: 'DEL', name: '德里' }, { code: 'BOM', name: '孟买' }],
        'netherlands|holland': [{ code: 'AMS', name: '阿姆斯特丹' }],
        'france': [{ code: 'CDG', name: '巴黎戴高乐' }],
        'italy': [{ code: 'MCO|FCO', name: '罗马' }, { code: 'MXP', name: '米兰' }],
        'spain': [{ code: 'MAD', name: '马德里' }],
        'canada': [{ code: 'YVR', name: '温哥华' }, { code: 'YYZ', name: '多伦多' }],
        'australia': [{ code: 'SYD', name: '悉尼' }, { code: 'MEL', name: '墨尔本' }],
        'brazil': [{ code: 'GRU', name: '圣保罗' }],
        'mexico': [{ code: 'MEX', name: '墨西哥城' }],
        'uae|united arab emirates|dubai': [{ code: 'DXB', name: '迪拜' }],
      };
      for (const [key, airports] of Object.entries(countryDefault)) {
        const patterns = key.split('|');
        if (patterns.some(p => lower.includes(p))) {
          for (const a of airports) {
            if (!found.find(f => f.code === a.code)) found.push(a);
          }
          break;
        }
      }
    }

    setSuggestedAirports(found.slice(0, 3));
  };

  // 监听英文地址变化 → 实时解析
  const handleAddressChange = (val: string) => {
    setTraderForm(p => ({ ...p, englishAddress: val }));
    parseEnglishAddress(val);
  };

  useEffect(() => {
    client.get("/cargo-spaces/trending").then(r => setTrending(r.data)).catch((err) => { console.warn('[CategoryQueryPanel] failed to load trending:', err); });
  }, []);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [compareList, setCompareList] = useState<any[]>([]);

  useEffect(() => {
    // 加载搜索结果中所有 cargo 的收藏状态
    const allIds: string[] = [];
    for (const q of ALL_QUERIES) {
      const r = results[q.key];
      if (r?.data) r.data.forEach(item => { if ((item as any).id) allIds.push((item as any).id); });
    }
    if (allIds.length > 0) {
      favoritesApi.batchStatus(allIds).then(res => setFavorites(res.data)).catch((err) => { console.warn('[CategoryQueryPanel] failed to load favorites:', err); });
    }
  }, [results]);

  const toggleCompare = (item: any) => {
    setCompareList(prev => {
      const exists = prev.find(i => (i as any).id === item.id);
      if (exists) return prev.filter(i => (i as any).id !== item.id);
      if (prev.length >= 5) { alert('最多对比5条'); return prev; }
      return [...prev, item];
    });
  };

  const isInCompare = (item: any) => compareList.some(i => (i as any).id === item.id);

  const toggleFavorite = async (cargoId: string) => {
    try {
      const res = await favoritesApi.toggle(cargoId);
      setFavorites(prev => ({ ...prev, [cargoId]: res.favorited }));
    } catch {}
  };

  const queries = showOnly
    ? ALL_QUERIES.filter(q => q.key === showOnly)
    : ALL_QUERIES;

  const searchCategories = (category: string): string[] => {
    if (category === '其他') {
      return ['空运出口', '海运出口', '陆运出口', '进口清关', '海运进口', '出口报关', 'JC TRANS会员', 'WCA会员', '空运包税出口', '海运包税出口'];
    }
    if (category === '空运外贸版') return ['空运出口'];
    return [category];
  };

  const handleSearch = async (category: string) => {
    let keyword: string;

    // ── 外贸客户版：从表单字段构建关键词 ──
    if (category === '空运外贸版') {
      const f = traderForm;
      const parts: string[] = [];
      if (f.originPort.trim()) parts.push(f.originPort.trim());
      if (f.destPort.trim()) parts.push(f.destPort.trim());
      if (f.pieces.trim()) parts.push(f.pieces.trim() + '件');
      if (f.weight.trim()) parts.push(f.weight.trim() + 'KG');
      if (f.volume.trim()) parts.push(f.volume.trim() + 'CBM');
      if (f.englishAddress.trim()) parts.push('收货地址:' + f.englishAddress.trim());
      keyword = parts.join(' ');
      if (!keyword) return;
      // 外贸版校验：始发港 + 目的国家必须填写
      if (!traderForm.originPort.trim() || !traderForm.destPort.trim()) {
        setResults(prev => ({ ...prev, [category]: { data: [], total: 0 } }));
        alert('⚠️ 请输入始发港和目的国家后再查询');
        return;
      }
    } else {
      keyword = keywords[category] || '';
      if (!keyword.trim()) return;
    }

    // 附上有效期和手机号
    const vh = validHours[category] || '';
    const ph = phoneNumber[category] || '';
    if (vh) keyword += ` [有效期:${vh}小时]`;
    if (ph) keyword += ` [电话:${ph}]`;

    if (category === '空运出口') {
      const codes = keyword.match(/[A-Z0-9]{3}/g) || [];
      const chinesePorts = keyword.match(/广州|深圳|上海|北京|香港|杭州|宁波|南京|成都|重庆|武汉|西安|昆明|厦门|青岛|天津|大连|郑州|长沙|济南|福州|海口|三亚|乌鲁木齐|哈尔滨|沈阳|贵阳|南宁|兰州|太原|合肥|南昌|呼和浩特|银川|西宁|拉萨|珠海|揭阳|湛江|惠州|佛山|梅州|温州|义乌|舟山|台州|徐州|常州|南通|无锡|扬州|盐城|淮安|连云港|烟台|威海|临沂|潍坊|日照|济宁|桂林|北海|柳州|泉州|晋江|武夷山|宜昌|襄阳|恩施|鄂州|绵阳|泸州|宜宾|南充|西昌|丽江|大理|西双版纳|香格里拉|敦煌|喀什|包头|呼伦贝尔|鄂尔多斯|胡志明|曼谷|东京|大阪|首尔|新加坡|洛杉矶|纽约|伦敦|迪拜|巴黎|法兰克福|悉尼|墨尔本|雅加达|马尼拉|吉隆坡|河内|金边|仰光|德里|孟买|达卡|科伦坡|伊斯坦布尔|莫斯科|塞内加尔|达喀尔|越南|泰国|印度|日本|韩国|马来西亚|菲律宾|柬埔寨|缅甸|孟加拉|尼泊尔|斯里兰卡|阿联酋|沙特|土耳其|俄罗斯|英国|法国|德国|意大利|西班牙|荷兰|比利时|瑞士|美国|加拿大|墨西哥|巴西|阿根廷|智利|秘鲁|澳大利亚|新西兰|埃及|南非|尼日利亚|肯尼亚|摩洛哥|津巴布韦|莫桑比克|马里|刚果金|科特迪瓦|坦桑尼亚|加纳|喀麦隆|塞拉利昂|埃塞俄比亚|安哥拉|阿尔及利亚|突尼斯|苏丹|乌干达|卢旺达|赞比亚|几内亚|贝宁|多哥|刚果布|加蓬|马拉维|哈萨克斯坦|巴基斯坦|印度尼西亚|老挝|蒙古|爱尔兰|罗马尼亚|乌克兰|哥伦比亚|厄瓜多尔|巴拿马|多米尼加|古巴/g) || [];
      const locationCount = new Set([...codes, ...chinesePorts]).size;
      if (locationCount < 2) {
        setResults(prev => ({ ...prev, [category]: { data: [], total: 0 } }));
        alert('⚠️ 空运查询：请输入始发港+目的港，例如：CAN SGN 或 广州-胡志明');
        return;
      }
    }

    setLoading(prev => ({ ...prev, [category]: true }));
    try {
      const cats = searchCategories(category);
      let allData: CargoItem[] = [];
      let pushMsg: string | undefined;
      for (const cat of cats) {
        const res = await client.get<QueryResult>('/cargo-spaces/search-by-category', {
          params: { category: cat, keyword: keyword.trim() }
        });
        if (res.data.data) allData = allData.concat(res.data.data);
        if (!pushMsg) pushMsg = (res.data as any).push_message;
      }
      const seen = new Set();
      allData = allData.filter(item => {
        const k = item.notes;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      saveHistory(keyword.trim());
      setResults(prev => ({ ...prev, [category]: { data: allData, total: allData.length, push_message: pushMsg } }));
      setSearchHistory(loadHistory());
    } catch {
      setResults(prev => ({ ...prev, [category]: { data: [], total: 0 } }));
    }
    setLoading(prev => ({ ...prev, [category]: false }));
  };

  const handleContactSend = async () => {
    if (!contactText.trim() || !contactDialog) return;
    setContactSending(true);
    setContactError('');

    try {
      let receiverId: string | null = null;

      // 1) 优先通过手机号查找发布者
      const phoneMatch = contactDialog.contactInfo.match(/(\d{11})/);
      if (phoneMatch) {
        try {
          const res = await client.get<{ id: string }>('/auth/lookup?phone=' + phoneMatch[1]);
          if (res.data.id) receiverId = res.data.id;
        } catch {}
      }

      // 2) 没手机号但有 raw_message_id → 通过原始记录找发布者
      if (!receiverId && contactDialog.uploadedFileId) {
        try {
          const poster = await messagesApi.getPosterByRawMessage(contactDialog.uploadedFileId);
          if (poster?.id) receiverId = poster.id;
        } catch {}
      }

      if (!receiverId) {
        setContactError('该发布者暂无联系方式，请稍后再试');
        setContactSending(false);
        return;
      }

      // 在消息前附带原始录入记录 + 搜索关键词，让发布者精确知道是哪条推广
      let recordPrefix = '';
      if (contactDialog.fullRecord?._rawContent) {
        recordPrefix = '📌 查询者对您的以下推广感兴趣：\n'
          + (contactDialog.searchKeyword ? `🔍 查询关键词：${contactDialog.searchKeyword}\n\n` : '')
          + contactDialog.fullRecord._rawContent.substring(0, 500)
          + '\n\n━━━━━━━━━━━━━━━━━━━━\n\n';
      } else if (contactDialog.searchKeyword) {
        recordPrefix = '📌 查询关键词：' + contactDialog.searchKeyword + '\n\n━━━━━━━━━━━━━━━━━━━━\n\n';
      }
      await messagesApi.send(receiverId, recordPrefix + contactText.trim());
      setContactSent(true);
      setTimeout(() => { setContactDialog(null); setContactSent(false); }, 2000);
    } catch (e: any) {
      setContactError(e?.response?.data?.error || '发送失败，请稍后重试');
    }
    setContactSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent, category: string) => {
    if (e.key === 'Enter') handleSearch(category);
  };

  const gridCols = queries.length === 1 ? 'grid-cols-1'
    : queries.length === 2 ? 'grid-cols-1 lg:grid-cols-2'
    : 'grid-cols-1 lg:grid-cols-3';

  return (
    <>
      <div className={`grid ${gridCols} gap-4`}>
        {queries.map((query) => {
          const Icon = query.icon;
          const result = results[query.key];
          const isLoading = loading[query.key];
          const kw = keywords[query.key] || '';
          const isEmpty = result && result.data.length === 0;

          return (
            <div key={query.key} className={`${query.key === '空运出口' ? 'bg-amber-50 border-amber-300' : query.key === '空运外贸版' ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-4 query-card`}>
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-5 h-5 text-primary-600" />
                <h3 className="font-semibold text-gray-900 text-sm">{query.label}</h3>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  {query.key === '空运外贸版' ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                          placeholder="始发港（中国大陆城市）"
                          value={traderForm.originPort}
                          onChange={e => setTraderForm(p => ({ ...p, originPort: e.target.value }))}
                        />
                        <input
                          className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                          placeholder="⚠️ 只填目的国家，不填城市"
                          value={traderForm.destPort}
                          onChange={e => setTraderForm(p => ({ ...p, destPort: e.target.value }))}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                          type="number" min="0" placeholder="件数"
                          value={traderForm.pieces}
                          onChange={e => setTraderForm(p => ({ ...p, pieces: e.target.value }))}
                        />
                        <input
                          className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                          type="number" min="0" placeholder="毛重(KG)"
                          value={traderForm.weight}
                          onChange={e => setTraderForm(p => ({ ...p, weight: e.target.value }))}
                        />
                        <input
                          className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                          type="number" min="0" step="0.1" placeholder="体积(CBM)"
                          value={traderForm.volume}
                          onChange={e => setTraderForm(p => ({ ...p, volume: e.target.value }))}
                        />
                      </div>
                      <textarea
                        className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
                        rows={2} placeholder="收货人英文地址（如: 123 Main St, Los Angeles, CA 90001, USA）"
                        value={traderForm.englishAddress}
                        onChange={e => handleAddressChange(e.target.value)}
                      />
                      {suggestedAirports.length > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-emerald-600 font-medium">✈️ 就近枢纽：</span>
                          {suggestedAirports.map((a, i) => (
                            <span key={a.code}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                            >
                              {a.code}<span className="font-normal text-emerald-500">{a.name}</span>
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="text-xs text-blue-600 leading-relaxed">
                        <p>💡 填始发港+目的国家+英文地址，系统自动匹配该国港口并推送给对应货代</p>
                        <p className="text-blue-400">⚠️ 目的国家只填国家名（如：美国、德国、越南），不填城市</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <input
                        className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent ${query.key === '空运出口' || query.key === '海运出口' ? 'placeholder-red-500' : ''}`}
                        placeholder={query.key === '空运出口' ? '输入始发港+目的港，如 CAN-SGN' : query.key === '海运出口' ? '输入始发港+目的港' : '输入港口、航线或关键词...'}
                        value={kw}
                        onChange={e => setKeywords(prev => ({ ...prev, [query.key]: e.target.value }))}
                        onKeyDown={e => handleKeyDown(e, query.key)}
                      />
                      {/* ── 有效期 + 手机号 ── */}
                      <div className="flex items-center gap-2 mt-2">
                        <select
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          value={validHours[query.key] || ''}
                          onChange={e => setValidHours(prev => ({ ...prev, [query.key]: e.target.value }))}
                        >
                          <option value="">⏱ 不设截止时间</option>
                          <option value="1">⏰ 报价截止：1小时内</option>
                          <option value="3">⏰ 报价截止：3小时内</option>
                          <option value="6">⏰ 报价截止：6小时内</option>
                          <option value="12">⏰ 报价截止：12小时内</option>
                          <option value="24">⏰ 报价截止：24小时内</option>
                        </select>
                        <input
                          type="tel"
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 flex-1"
                          placeholder="📱 手机号（选填）"
                          value={phoneNumber[query.key] || ''}
                          onChange={e => setPhoneNumber(prev => ({ ...prev, [query.key]: e.target.value }))}
                        />
                      </div>

                      {/* ── 可选上传图片/箱单/发票 ── */}
                      <div className="mt-2">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"
                          className="hidden"
                          ref={el => { fileInputRefs.current[query.key] = el; }}
                          onChange={e => {
                            const f = e.target.files?.[0] || null;
                            setUploadFiles(prev => ({ ...prev, [query.key]: f }));
                          }}
                        />
                        <button
                          type="button"
                          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                            uploadFiles[query.key]
                              ? 'bg-green-50 border-green-400 text-green-700 shadow-sm'
                              : 'bg-white border-dashed border-amber-300 text-amber-600 hover:bg-amber-50 hover:border-amber-400'
                          }`}
                          onClick={() => fileInputRefs.current[query.key]?.click()}
                        >
                          {uploadFiles[query.key] ? (
                            <><span className="text-base">📎</span> {uploadFiles[query.key]!.name.length > 20 ? uploadFiles[query.key]!.name.substring(0, 20) + '...' : uploadFiles[query.key]!.name}<span className="text-red-400 ml-2 text-xs" onClick={(e) => { e.stopPropagation(); setUploadFiles(prev => ({ ...prev, [query.key]: null })); }}>✕ 移除</span></>
                          ) : (
                            <><span className="text-lg">📎</span> 可选上传图片或者箱单发票</>
                          )}
                        </button>
                      </div>
                      {query.key === '海运出口' && (
                        <div className="mt-1.5 space-y-0.5 text-xs text-red-500 leading-relaxed">
                          <p>1，始发港城市+目的港城市或者三字代码或者目的国家粗略查询</p>
                          <p>2，输入完整始发港+目的港+件数+重量+体积 5要素自动推送询价到发布者，稍后您的收件箱会收到最及时准确的报价</p>
                          <p className="text-gray-500">📐 匹配规则：关键词OR匹配推广信息中的港口、航线名，含件重体时自动推送给相关发布者</p>
                        </div>
                      )}
                      {query.key === '空运出口' && (
                        <div className="mt-1.5 space-y-0.5 text-xs text-red-500 leading-relaxed">
                          <p>1，输入始发港+目的港三字代码粗略查询，如 CAN-SGN</p>
                          <p>2，输入完整件数+重量+体积+始发港+目的港 5要素自动推送询价到发布者，稍后您的收件箱会收到最及时准确的报价</p>
                          <p className="text-gray-500">📐 匹配规则：需至少2个港口三字码或中文名，OR匹配推广信息，含件重体时推送给匹配发布者</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <button
                  className="btn-primary flex items-center gap-1 text-sm px-4 self-start"
                  onClick={() => handleSearch(query.key)}
                  disabled={isLoading || (query.key === '空运外贸版' ? !traderFormFilled : !kw.trim())}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  查询
                </button>
              </div>

              {isLoading && (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              )}

              {isEmpty && !isLoading && (
                <div className="text-center py-4 text-gray-400 text-sm">
                  {(result as any).push_message ? (
                    <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 text-sm text-green-800 font-medium leading-relaxed text-left">
                      {(result as any).push_message}
                    </div>
                  ) : (
                    <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-5 text-center">
                      <p className="text-2xl mb-2">🔍</p>
                      <p className="text-sm font-bold text-amber-800 mb-1">暂未找到匹配的舱位信息</p>
                      <p className="text-xs text-amber-600 mb-3">
                        {/\d+\s*(?:件|KG|CBM|kg|箱|吨)/.test(kw)
                          ? '您的需求已记录，系统已推送给相关发布者，请留意收件箱报价'
                          : '当前社区暂无此航线舱位。您可以：'}
                      </p>
                      {!/\d+\s*(?:件|KG|CBM|kg|箱|吨)/.test(kw) && (
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              const el = document.querySelector('[data-tab="entry"]') as HTMLElement;
                              if (el) el.click();
                            }}
                            className="text-xs font-bold bg-amber-500 text-white px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors"
                          >
                            📝 去发布舱位
                          </button>
                          <span className="text-xs text-amber-400">或</span>
                          <span className="text-xs text-amber-600">换个关键词试试</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {result && result.data.length > 0 && !isLoading && (
                <div className="space-y-2">
                  {/* ── 实时搜索热度 ── */}
                  <div className="bg-gradient-to-r from-slate-800 to-indigo-900 border border-indigo-500/30 rounded-xl px-4 py-3 text-white">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🛰️</span>
                      <span className="text-xs font-bold">雷达检测：本航线近24h内有人搜索</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
                      <span className="ml-auto text-[10px] text-indigo-200">{result.data.length} 条舱位在线</span>
                    </div>
                    <p className="text-[10px] text-indigo-200/70 mt-1">
                      你不是在看价，你是在看活人——下方是正在找这条航线的真实用户
                    </p>
                  </div>

                  {/* 5要素精准推送提示 */}
                  {(result as any).push_message && (
                    <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 text-sm text-green-800 font-medium leading-relaxed">
                      {(result as any).push_message}
                    </div>
                  )}
                  {result.data.map((item, idx) => (
                    <div key={idx} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="text-sm font-medium text-gray-800 flex items-center gap-1.5 flex-wrap">
                          <span className="text-primary-700">{(item as any).origin_port || item.region}</span>
                          <span className="text-gray-300">→</span>
                          <span>{(item as any).dest_port || '?'}</span>
                          {(item as any).airline_code && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-primary-100 text-primary-700">
                              {(item as any).airline_code}
                            </span>
                          )}
                        </div>
                        {/* 有效期 + 发布时间 */}
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 flex-shrink-0">
                          {item.created_at && (
                            <span className="flex items-center gap-0.5 text-gray-400">
                              🕐 {dayjs(item.created_at).format('MM-DD HH:mm')}
                            </span>
                          )}
                          {item.valid_from && (
                            <span className="text-gray-300">
                              {dayjs(item.valid_from).format('MM-DD')}~{dayjs(item.valid_to).format('MM-DD')}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{item.notes}</p>
                      {/* 如果有舱位来源公司标记，高亮展示 */}
                      {item.notes && item.notes.includes('【来源：') && (
                        <span className="inline-block text-[10px] bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5 mt-1 font-medium">
                          📌 {item.notes.match(/【来源：(.+?)】/)?.[1] || ''}
                        </span>
                      )}
                      {item.contact_info && (
                        <div className="flex items-center gap-1 mt-1.5 text-xs text-primary-600">
                          <User className="w-3 h-3" />
                          {(item as any).is_verified_company && (
                            <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-1 py-0.5 font-medium" title="已认证企业">🏢</span>
                          )}
                          {item.contact_info}
                        </div>
                      )}
                      {(item as any).trust_info && ((item as any).trust_info.hints.length > 0 || (item as any).trust_info.avg_rating || (item as any).trust_info.has_card || (item as any).trust_info.days_since_reg) && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {(item as any).trust_info.has_card && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] bg-teal-50 text-teal-700 border border-teal-200 rounded-full px-2 py-0.5 font-medium">📇 已实名</span>
                          )}
                          {(item as any).trust_info.has_phone && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-full px-2 py-0.5 font-medium">✅ 已验手机</span>
                          )}
                          {(item as any).trust_info.days_since_reg > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-500">📅 入驻 {(item as any).trust_info.days_since_reg} 天</span>
                          )}
                          {(item as any).trust_info.hints.includes('mutual_agent') && (item as any).trust_info.mutual_agents?.slice(0, 2).map((a: any, i: number) => (
                            <span key={i} className="inline-flex items-center gap-0.5 text-[10px] bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5 font-medium">🤝 共同:{a.name}</span>
                          ))}
                          {(item as any).trust_info.hints.includes('referral:i_referred') && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5 font-medium">🔗 我推荐的用户</span>
                          )}
                          {(item as any).trust_info.hints.includes('referral:referred_me') && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-2 py-0.5 font-medium">🔗 推荐过我的人</span>
                          )}
                          {(item as any).trust_info.hints.includes('same_company') && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 font-medium">🏢 同公司同事</span>
                          )}
                          {(item as any).trust_info.avg_rating && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-500">⭐ {(item as any).trust_info.avg_rating}<span className="text-gray-400">({(item as any).trust_info.review_count})</span></span>
                          )}
                          {(item as any).trust_info.coop_count > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-500">🤝 {(item as any).trust_info.coop_count}单</span>
                          )}
                        </div>
                      )}
                      {/* 联系发布者按钮 */}
                      {item.contact_info && (
                        <div className="flex gap-1 mt-2">
                          <button
                            className="inline-flex items-center gap-1 text-xs font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg px-2.5 py-1.5 transition-colors shadow-sm"
                            onClick={async () => {
                              let rawContent = '';
                              if (item.uploaded_file_id) {
                                try {
                                  const { fetchRawContent } = await import('../../api/rawMessages.api');
                                  rawContent = await fetchRawContent(item.uploaded_file_id);
                                } catch {}
                              }
                              setContactDialog({ contactInfo: item.contact_info, cargoKey: query.key + '-' + idx, uploadedFileId: item.uploaded_file_id, fullRecord: { ...item, _rawContent: rawContent }, searchKeyword: kw });
                              setContactText('');
                              setContactSent(false);
                              setContactError('');
                            }}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            联系发布者
                          </button>
                          <button
                            className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg px-2.5 py-1.5 transition-colors"
                            onClick={() => {
                              const text = '🚢 ' + ((item as any).origin_port || item.region) + ' → ' + ((item as any).dest_port || '?') + (item.airline_code ? ' (' + item.airline_code + ')' : '') + '\n' + (item.notes ? item.notes.substring(0, 80) + '...\n' : '') + '\n📞 ' + (item.contact_info || '联系发布者') + '\n\n来自 123共享外贸物流社区';
                              if (navigator.share) {
                                navigator.share({ title: '舱位信息', text }).catch(() => {/* share failure is non-critical */});
                              } else {
                                navigator.clipboard.writeText(text).then(() => alert('已复制到剪贴板，可分享给好友')).catch(() => {/* clipboard failure is non-critical */});
                              }
                            }}
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            分享
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 对比浮层 */}
      {compareList.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-primary-400 shadow-2xl p-4" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-primary-700">📊 航线对比（{compareList.length}条）</span>
              <button className="text-xs text-gray-400 hover:text-gray-600" onClick={() => setCompareList([])}>清空</button>
            </div>
            <button className="text-xs text-gray-400 hover:text-gray-600" onClick={() => setCompareList([])}>收起 ✕</button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {compareList.map((item, idx) => (
              <div key={(item as any).id || idx} className="flex-shrink-0 w-56 bg-white border border-gray-200 rounded-xl p-3 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-primary-700">{(item as any).origin_port || '?'}</span>
                  <span className="text-gray-300 mx-1">→</span>
                  <span className="font-bold text-gray-800">{(item as any).dest_port || '?'}</span>
                  {(item as any).airline_code && (
                    <span className="ml-1 px-1 py-0.5 rounded bg-primary-100 text-primary-700 font-mono text-[10px]">{(item as any).airline_code}</span>
                  )}
                </div>
                {item.valid_from && (
                  <div className="text-gray-400 mb-1">
                    📅 {dayjs(item.valid_from).format('MM-DD')} ~ {dayjs(item.valid_to).format('MM-DD')}
                  </div>
                )}
                {item.contact_info && (
                  <div className="text-primary-600 mb-1 break-all">
                    📞 {item.contact_info}
                  </div>
                )}
                {(item as any).notes && (
                  <div className="text-gray-500 line-clamp-2 mt-1">
                    {(item as any).notes?.substring(0, 100)}
                  </div>
                )}
                <div className="mt-2 pt-2 border-t border-gray-100">
                  {item.contact_info && /1[3-9]\d{9}/.test(item.contact_info) && (
                    <button
                      className="w-full text-xs font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg py-1.5 transition-colors"
                      onClick={async () => {
                        const phoneMatch = (item as any).contact_info?.match(/(\d{11})/);
                        if (phoneMatch) {
                          let rawContent = '';
                          if ((item as any).uploaded_file_id) {
                            try {
                              const { fetchRawContent } = await import('../../api/rawMessages.api');
                              rawContent = await fetchRawContent((item as any).uploaded_file_id);
                            } catch {}
                          }
                          setContactDialog({ contactInfo: (item as any).contact_info, cargoKey: 'compare-' + idx, fullRecord: { ...item, _rawContent: rawContent }, searchKeyword: '' });
                          setContactText('');
                          setContactSent(false);
                          setContactError('');
                        }
                      }}
                    >
                      联系发布者
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 联系发布者对话框 */}
      {contactDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => { if (!contactSending) setContactDialog(null); }}>
          <div className="bg-white rounded-xl shadow-xl p-5 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 text-sm">联系发布者</h3>
              <button onClick={() => { setContactDialog(null); setContactSent(false); }} className="text-gray-400 hover:text-gray-600" disabled={contactSending}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg px-3 py-2 mb-3 text-xs text-gray-500">
              发布者：{contactDialog.contactInfo}
            </div>

            {contactSent ? (
              <div className="text-center py-6 text-green-600 text-sm font-medium">✅ 消息已发送</div>
            ) : (
              <>
                <textarea
                  className="input-field w-full min-h-[80px] text-sm resize-none mb-3"
                  placeholder="输入您想咨询的内容，例如：请问这个舱位还有吗？价格能否优惠？"
                  value={contactText}
                  onChange={e => setContactText(e.target.value)}
                  disabled={contactSending}
                />
                {contactError && <p className="text-xs text-red-500 bg-red-50 rounded px-2 py-1 mb-2">{contactError}</p>}
                <button
                  className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
                  onClick={handleContactSend}
                  disabled={contactSending || !contactText.trim()}
                >
                  {contactSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  发送消息
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
