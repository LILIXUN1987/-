/**
 * 中国大陆机场城市名 ↔ IATA 三字代码对照表
 *
 * 数据来源：中国民用航空局官方公布
 * 格式： { 城市名: 'IATA代码', ... }
 * 包含约 200+ 个民用运输机场
 */

export const AIRPORT_CITY_MAP: Record<string, string> = {
  "兴义": 'ACX',
  "安康": 'AKA',
  "阿克苏": 'AKU',
  "鞍山": 'AOG',
  "安庆": 'AQG',
  "安顺": 'AVA',
  "安阳": 'AYN',
  "包头": 'BAV',
  "毕节": 'BFJ',
  "蚌埠": 'BFU',
  "北海": 'BHY',
  "博乐": 'BPL',
  "昌都": 'BPX',
  "保山": 'BSD',
  "广州": 'CAN',
  "常德": 'CGD',
  "郑州": 'CGO',
  "长春": 'CGQ',
  "朝阳": 'CHG',
  "赤峰": 'CIF',
  "长治": 'CIH',
  "重庆": 'CKG',
  "长海": 'CNI',
  "长沙": 'CSX',
  "成都": 'CTU',
  "常州": 'CZX',
  "大同": 'DAT',
  "达州": 'DAX',
  "丹东": 'DDG',
  "迪庆": 'DIG',
  "大连": 'DLC',
  "大理": 'DLU',
  "敦煌": 'DNH',
  "东营": 'DOY',
  "大庆": 'DQA',
  "鄂尔多斯": 'DSN',
  "张家界": 'DYG',
  "鄂州": 'EHU',
  "鄂州花湖": 'EHU',
  "恩施": 'ENH',
  "延安": 'ENY',
  "二连浩特": 'ERL',
  "福州": 'FOC',
  "阜阳": 'FUG',
  "佛山": 'FUO',
  "抚远": 'FYJ',
  "富蕴": 'FYN',
  "格尔木": 'GOQ',
  "甘南夏河": 'GXH',
  "广元": 'GYS',
  "固原": 'GYU',
  "海口": 'HAK',
  "河池": 'HCJ',
  "邯郸": 'HDG',
  "黑河": 'HEK',
  "呼和浩特": 'HET',
  "合肥": 'HFE',
  "杭州": 'HGH',
  "淮安": 'HIA',
  "怀化": 'HJJ',
  "香港": 'HKG',
  "海拉尔": 'HLD',
  "乌兰浩特": 'HLH',
  "哈密": 'HMI',
  "衡阳": 'HNY',
  "神农架": 'HPG',
  "哈尔滨": 'HRB',
  "舟山": 'HSN',
  "和田": 'HTN',
  "花土沟": 'HTT',
  "惠州": 'HUZ',
  "台州": 'HYN',
  "汉中": 'HZG',
  "黎平": 'HZH',
  "银川": 'INC',
  "且末": 'IQM',
  "庆阳": 'IQN',
  "景德镇": 'JDZ',
  "加格达奇": 'JGD',
  "嘉峪关": 'JGN',
  "井冈山": 'JGS',
  "西双版纳": 'JHG',
  "吉林": 'JIL',
  "黔江": 'JIQ',
  "九江": 'JIU',
  "泉州": 'JJN',
  "佳木斯": 'JMU',
  "济宁": 'JNG',
  "锦州": 'JNZ',
  "池州": 'JUH',
  "衢州": 'JUZ',
  "鸡西": 'JXA',
  "九寨沟": 'JZH',
  "库车": 'KCA',
  "康定": 'KGT',
  "南昌": 'KHN',
  "喀纳斯": 'KJI',
  "昆明": 'KMG',
  "赣州": 'KOW',
  "库尔勒": 'KRL',
  "克拉玛依": 'KRY',
  "贵阳": 'KWE',
  "桂林": 'KWL',
  "连城": 'LCX',
  "伊春": 'LDS',
  "兰州": 'LHW',
  "永州": 'LLF',
  "吕梁": 'LLV',
  "临沧": 'LNJ',
  "六盘水": 'LPF',
  "芒市": 'LUM',
  "拉萨": 'LXA',
  "洛阳": 'LYA',
  "连云港": 'LYG',
  "临沂": 'LYI',
  "柳州": 'LZH',
  "泸州": 'LZO',
  "林芝": 'LZY',
  "牡丹江": 'MDG',
  "澳门": 'MFM',
  "绵阳": 'MIG',
  "梅州": 'MXZ',
  "南充": 'NAO',
  "北京南苑": 'NAY',
  "长白山": 'NBS',
  "齐齐哈尔": 'NDG',
  "宁波": 'NGB',
  "阿里": 'NGQ',
  "南京": 'NKG',
  "那拉提": 'NLT',
  "南宁": 'NNG',
  "南阳": 'NNY',
  "南通": 'NTG',
  "满洲里": 'NZH',
  "漠河": 'OHE',
  "北京": 'PEK',
  "北京大兴": 'PKX',
  "上海": 'PVG',
  "攀枝花": 'PZI',
  "日照": 'RIZ',
  "巴彦淖尔": 'RLK',
  "如皋": 'RUG',
  "上海虹桥": 'SHA',
  "沈阳": 'SHE',
  "石河子": 'SHF',
  "山海关": 'SHP',
  "荆州": 'SHS',
  "石家庄": 'SJW',
  "上饶": 'SQD',
  "揭阳": 'SWA',
  "鄯善": 'SXJ',
  "普洱": 'SYM',
  "三亚": 'SYX',
  "苏州": 'SZV',
  "深圳": 'SZX',
  "青岛": 'TAO',
  "塔城": 'TCG',
  "腾冲": 'TCZ',
  "铜仁": 'TEN',
  "成都天府": 'TFU',
  "通辽": 'TGO',
  "吐鲁番": 'TLQ',
  "济南": 'TNA',
  "通化": 'TNH',
  "天津": 'TSN',
  "唐山": 'TVS',
  "黄山": 'TXN',
  "太原": 'TYN',
  "乌兰察布": 'UCB',
  "乌鲁木齐": 'URC',
  "榆林": 'UYN',
  "十堰": 'WDS',
  "潍坊": 'WEF',
  "威海": 'WEH',
  "邵阳": 'WGN',
  "芜湖": 'WHU',
  "温州": 'WNZ',
  "乌海": 'WUA',
  "武汉": 'WUH',
  "武夷山": 'WUS',
  "忻州": 'WUT',
  "无锡": 'WUX',
  "梧州": 'WUZ',
  "万州": 'WXN',
  "襄阳": 'XFN',
  "锡林浩特": 'XIL',
  "西安": 'XIY',
  "厦门": 'XMN',
  "西宁": 'XNN',
  "邢台": 'XNT',
  "徐州": 'XUZ',
  "宜宾": 'YBP',
  "运城": 'YCU',
  "宜春": 'YIC',
  "阿尔山": 'YIE',
  "宜昌": 'YIH',
  "伊宁": 'YIN',
  "义乌": 'YIW',
  "营口": 'YKH',
  "延吉": 'YNJ',
  "烟台": 'YNT',
  "盐城": 'YNZ',
  "扬州": 'YTY',
  "玉树": 'YUS',
  "昭通": 'ZAT',
  "兰州中川": 'ZGC',
  "湛江": 'ZHA',
  "中卫": 'ZHY',
  "张家口": 'ZQZ',
  "珠海": 'ZUH',
  "遵义": 'ZYI',
};


/** 所有中文城市名（用于正则匹配） */
export const ALL_CHINESE_AIRPORT_CITIES = Object.keys(AIRPORT_CITY_MAP)
  .filter(k => k !== AIRPORT_CITY_MAP[k] && !/^[A-Z]{3}$/.test(k)) // 排除纯代码和同名字段
  .sort((a, b) => b.length - a.length); // 长名优先（如"鄂州花湖"优先于"鄂州"）

// ── 国际常用港口/城市（物流行业常见，不入 IATA 代码表） ──
export const INTERNATIONAL_PORTS = [
  '胡志明', '曼谷', '东京', '大阪', '首尔', '汉城', '釜山', '新加坡', '洛杉矶', '纽约',
  '伦敦', '迪拜', '巴黎', '法兰克福', '悉尼', '墨尔本', '雅加达', '马尼拉',
  '吉隆坡', '河内', '金边', '仰光', '德里', '孟买', '达卡', '科伦坡',
  '伊斯坦布尔', '莫斯科', '芝加哥', '休斯顿', '旧金山', '迈阿密',
  '汉堡', '鹿特丹', '阿姆斯特丹', '马德里', '巴塞罗那', '米兰', '罗马',
  '维也纳', '华沙', '布拉格', '布达佩斯', '哥本哈根', '斯德哥尔摩', '奥斯陆',
  '赫尔辛基', '苏黎世', '日内瓦', '布鲁塞尔', '都柏林', '里斯本', '雅典',
  '多伦多', '温哥华', '墨西哥城', '圣保罗', '里约热内卢', '布宜诺斯艾利斯',
  '圣地亚哥', '利马', '开罗', '卡萨布兰卡', '内罗毕', '拉各斯', '约翰内斯堡',
  '开普敦', '德班', '达累斯萨拉姆', '蒙巴萨',
  '达喀尔',
  '塞内加尔',
  // ── 非洲国家名（推广信息中常见） ──
  '津巴布韦', '莫桑比克', '南非', '马里', '肯尼亚', '刚果金', '科特迪瓦',
  '坦桑尼亚', '加纳', '喀麦隆', '塞拉利昂', '尼日利亚', '埃塞俄比亚',
  '安哥拉', '摩洛哥', '阿尔及利亚', '突尼斯', '苏丹', '南苏丹', '乌干达',
  '卢旺达', '赞比亚', '博茨瓦纳', '纳米比亚', '马达加斯加', '毛里求斯',
  '几内亚', '贝宁', '多哥', '布基纳法索', '刚果布', '赤道几内亚', '加蓬',
  '乍得', '尼日尔', '毛里塔尼亚', '利比里亚', '索马里', '吉布提', '厄立特里亚',
  '马拉维', '斯威士兰', '莱索托', '塞舌尔', '佛得角',
  // ── 中东/西亚国家名 ──
  '沙特', '阿联酋', '卡塔尔', '阿曼', '巴林', '科威特', '约旦', '黎巴嫩',
  '以色列', '巴勒斯坦', '也门', '叙利亚', '伊拉克', '伊朗',
  // ── 中亚/南亚国家名 ──
  '哈萨克斯坦', '乌兹别克斯坦', '土库曼斯坦', '吉尔吉斯斯坦', '塔吉克斯坦',
  '巴基斯坦', '阿富汗', '尼泊尔', '不丹', '马尔代夫',
  // ── 东南亚国家名 ──
  '越南', '泰国', '印度尼西亚', '菲律宾', '马来西亚', '柬埔寨', '缅甸', '老挝', '文莱', '东帝汶',
  // ── 东亚国家名 ──
  '日本', '韩国', '蒙古',
  // ── 欧洲国家名 ──
  '英国', '法国', '德国', '意大利', '西班牙', '荷兰', '比利时', '瑞士', '瑞典',
  '挪威', '芬兰', '丹麦', '奥地利', '葡萄牙', '希腊', '波兰', '捷克', '匈牙利',
  '罗马尼亚', '保加利亚', '乌克兰', '白俄罗斯', '塞尔维亚', '克罗地亚',
  '斯洛文尼亚', '斯洛伐克', '立陶宛', '拉脱维亚', '爱沙尼亚', '爱尔兰', '卢森堡',
  '马耳他', '冰岛', '摩纳哥', '列支敦士登',
  // ── 美洲国家名 ──
  '美国', '加拿大', '墨西哥', '巴西', '阿根廷', '智利', '秘鲁', '哥伦比亚',
  '厄瓜多尔', '委内瑞拉', '乌拉圭', '巴拉圭', '玻利维亚', '圭亚那', '苏里南',
  '哥斯达黎加', '巴拿马', '危地马拉', '洪都拉斯', '萨尔瓦多', '尼加拉瓜',
  '古巴', '多米尼加', '波多黎各', '牙买加', '特立尼达和多巴哥', '巴哈马',
  '巴巴多斯', '海地',
  // ── 大洋洲国家名 ──
  '澳大利亚', '新西兰', '巴布亚新几内亚', '斐济', '瓦努阿图', '所罗门群岛',
  '萨摩亚', '汤加', '密克罗尼西亚', '马绍尔群岛', '帕劳', '瑙鲁', '基里巴斯',
  '图瓦卢',
  '大阪', '名古屋', '福冈', '札幌', '冲绳',
  '仁川', '济州',
  '深圳', '盐田', '蛇口', '南沙', '赤湾', '大铲湾',
  '宁波', '北仑', '舟山',
  '青岛', '前湾', '日照', '烟台', '威海', '连云港',
  '天津', '新港', '大连', '营口', '秦皇岛', '唐山', '黄骅',
  '厦门', '海沧', '福州', '江阴', '泉州', '莆田', '漳州',
  '香港', '葵涌', '澳门',
  '高雄', '基隆', '台北', '台中',
  '林查班', '丹戎帕拉帕斯', '巴生', '槟城', '丹戎不碌', '泗水',
  '海防', '岘港', '胡志明', '西贡',
  '横滨', '神户', '川崎', '清水',
  '长滩', '奥克兰', '西雅图', '塔科马', '新泽西', '萨凡纳', '查尔斯顿',
  '温哥华', '鲁珀特王子港', '蒙特利尔', '哈利法克斯',
  '南安普顿', '费利克斯托', '不来梅', '安特卫普', '泽布吕赫', '勒阿弗尔', '马赛',
  '瓦伦西亚', '阿尔赫西拉斯', '热那亚', '拉斯佩齐亚', '的里雅斯特', '比雷埃夫斯',
  '敖德萨', '阿布扎比', '达曼', '吉达', '马斯喀特',
  '桑托斯', '圣安东尼奥', '瓦尔帕莱索', '卡尔德拉', '科隆', '曼萨尼约',
  '格但斯克', '格丁尼亚', '康斯坦察', '塞得港', '亚历山大', '贝鲁特', '海法', '阿什杜德',
  '海参崴', '东方港',
];

/** 根据中文城市名（或别名）查 IATA 代码 */
export function getAirportCode(cityName: string): string | undefined {
  return AIRPORT_CITY_MAP[cityName] || undefined;
}

// ── 完整代码→城市反向映射（构建于CSV加载后） ──
let CODE_TO_CITY: Record<string, string> | null = null;

function buildCodeToCity() {
  if (CODE_TO_CITY) return;
  CODE_TO_CITY = {};
  // 从 AIRPORT_CITY_MAP 反向（中国机场）
  for (const [city, code] of Object.entries(AIRPORT_CITY_MAP)) {
    CODE_TO_CITY[code] = city;
  }
  // 从 INTERNATIONAL_CODE_MAP 反向（国际城市）
  for (const [city, code] of Object.entries(INTERNATIONAL_CODE_MAP)) {
    if (!CODE_TO_CITY[code]) CODE_TO_CITY[code] = city;
  }
  // 从国际化中文映射表补充（541个国外城市中文名）
  try {
    const { INTERNATIONAL_ZH_MAP } = require('./international-zh-map') as { INTERNATIONAL_ZH_MAP: Record<string, { en: string; zh: string; country: string }> };
    for (const [code, info] of Object.entries(INTERNATIONAL_ZH_MAP)) {
      if (!CODE_TO_CITY[code]) {
        CODE_TO_CITY[code] = info.zh;
        // 也加入中文→代码映射
        if (!(INTERNATIONAL_CODE_MAP as Record<string, string>)[info.zh]) {
          (INTERNATIONAL_CODE_MAP as Record<string, string>)[info.zh] = code;
        }
      }
    }
  } catch {}
}

/** 根据 IATA 代码查中文城市名（返回第一个匹配） */
export function getCityNameByCode(code: string): string | undefined {
  const upper = code.toUpperCase();
  // 先从 AIRPORT_CITY_MAP 查
  const found = Object.entries(AIRPORT_CITY_MAP).find(([, v]) => v === upper);
  if (found) return found[0];
  // 再查完整映射（含CSV数据）
  buildCodeToCity();
  return CODE_TO_CITY?.[upper];
}

/**
 * 获取某个 IATA 代码对应的所有中文名（含别名）
 * 例如 ICN → ["首尔", "汉城", "仁川", "韩国"]
 */
export function getAllCityNamesByCode(code: string): string[] {
  const upper = code.toUpperCase();
  const names: string[] = [];

  // 1. AIRPORT_CITY_MAP 反向查找（国内机场）
  const found = Object.entries(AIRPORT_CITY_MAP).find(([, v]) => v === upper);
  if (found) names.push(found[0]);

  // 2. CODE_TO_CITY（含 CSV 数据）
  buildCodeToCity();
  if (CODE_TO_CITY?.[upper] && !names.includes(CODE_TO_CITY[upper])) {
    names.push(CODE_TO_CITY[upper]);
  }

  // 3. INTERNATIONAL_CODE_MAP 反向查找（国际城市别名）
  for (const [city, iata] of Object.entries(INTERNATIONAL_CODE_MAP)) {
    if (iata === upper && !names.includes(city)) {
      names.push(city);
    }
  }

  return names;
}

// ── 中文国家名 → 英文国家名（用于国家级搜索匹配） ──
export const CHINESE_COUNTRY_MAP: Record<string, string> = {
  '中国': 'China', '美国': 'United States', '日本': 'Japan', '韩国': 'South Korea',
  '越南': 'Vietnam', '泰国': 'Thailand', '德国': 'Germany', '法国': 'France',
  '英国': 'United Kingdom', '意大利': 'Italy', '西班牙': 'Spain', '荷兰': 'Netherlands',
  '比利时': 'Belgium', '瑞士': 'Switzerland', '俄罗斯': 'Russia', '印度': 'India',
  '加拿大': 'Canada', '澳大利亚': 'Australia', '墨西哥': 'Mexico', '巴西': 'Brazil',
  '阿根廷': 'Argentina', '智利': 'Chile', '秘鲁': 'Peru', '土耳其': 'Turkey',
  '阿联酋': 'United Arab Emirates', '沙特': 'Saudi Arabia', '南非': 'South Africa',
  '埃及': 'Egypt', '尼日利亚': 'Nigeria', '肯尼亚': 'Kenya', '印尼': 'Indonesia',
  '印度尼西亚': 'Indonesia', '马来西亚': 'Malaysia', '菲律宾': 'Philippines',
  '新加坡': 'Singapore', '柬埔寨': 'Cambodia', '缅甸': 'Myanmar', '孟加拉': 'Bangladesh',
  '斯里兰卡': 'Sri Lanka', '巴基斯坦': 'Pakistan', '波兰': 'Poland', '瑞典': 'Sweden',
  '挪威': 'Norway', '丹麦': 'Denmark', '芬兰': 'Finland', '爱尔兰': 'Ireland',
  '葡萄牙': 'Portugal', '希腊': 'Greece', '新西兰': 'New Zealand', '哥伦比亚': 'Colombia',
  '厄瓜多尔': 'Ecuador', '巴拿马': 'Panama', '多米尼加': 'Dominican Republic',
  '古巴': 'Cuba', '哥斯达黎加': 'Costa Rica', '危地马拉': 'Guatemala',
  '洪都拉斯': 'Honduras', '委内瑞拉': 'Venezuela', '乌拉圭': 'Uruguay',
  '巴拉圭': 'Paraguay', '玻利维亚': 'Bolivia', '摩洛哥': 'Morocco',
  '阿尔及利亚': 'Algeria', '突尼斯': 'Tunisia', '埃塞俄比亚': 'Ethiopia',
  '安哥拉': 'Angola', '坦桑尼亚': 'Tanzania', '加纳': 'Ghana',
  '科特迪瓦': 'Ivory Coast', '喀麦隆': 'Cameroon', '塞内加尔': 'Senegal',
  '哈萨克斯坦': 'Kazakhstan', '乌克兰': 'Ukraine', '罗马尼亚': 'Romania',
  '捷克': 'Czech Republic', '匈牙利': 'Hungary', '奥地利': 'Austria',
  '以色列': 'Israel', '卡塔尔': 'Qatar', '科威特': 'Kuwait', '阿曼': 'Oman',
  '巴林': 'Bahrain', '约旦': 'Jordan', '黎巴嫩': 'Lebanon',
  '台湾': 'Taiwan', '香港': 'Hong Kong', '澳门': 'Macau',
  '蒙古': 'Mongolia', '老挝': 'Laos', '文莱': 'Brunei',
};

let COUNTRY_TO_CODES: Record<string, string[]> | null = null;

/** 根据中文国家名获取该国所有机场 IATA 代码列表 */
export function getAirportCodesByCountry(chineseCountry: string): string[] {
  const en = CHINESE_COUNTRY_MAP[chineseCountry];
  if (!en) return [];

  if (!COUNTRY_TO_CODES) {
    COUNTRY_TO_CODES = {};
    try {
      const { INTERNATIONAL_ZH_MAP } = require('./international-zh-map') as {
        INTERNATIONAL_ZH_MAP: Record<string, { en: string; zh: string; country: string }>;
      };
      for (const [code, info] of Object.entries(INTERNATIONAL_ZH_MAP)) {
        if (!COUNTRY_TO_CODES[info.country]) COUNTRY_TO_CODES[info.country] = [];
        COUNTRY_TO_CODES[info.country].push(code);
      }
    } catch {}
  }

  return COUNTRY_TO_CODES[en] || [];
}

let ENGLISH_CITY_TO_CODE: Record<string, string> | null = null;

/** 从英文城市名查找 IATA 代码（如 "Los Angeles" → "LAX"） */
export function getCodeByEnglishCity(englishName: string): string | undefined {
  if (!ENGLISH_CITY_TO_CODE) {
    ENGLISH_CITY_TO_CODE = {};
    try {
      const { INTERNATIONAL_ZH_MAP } = require('./international-zh-map') as {
        INTERNATIONAL_ZH_MAP: Record<string, { en: string; zh: string; country: string }>;
      };
      for (const [code, info] of Object.entries(INTERNATIONAL_ZH_MAP)) {
        const lowerEn = info.en.toLowerCase();
        if (!ENGLISH_CITY_TO_CODE[lowerEn] || info.en.length > 3) {
          ENGLISH_CITY_TO_CODE[lowerEn] = code;
        }
        // 也处理多词城市名的每个单词（"Los Angeles" → 存 "los" 和 "angeles"）
        const words = info.en.toLowerCase().split(/[\s,.-]+/).filter(Boolean);
        for (const w of words) {
          if (w.length >= 3 && !ENGLISH_CITY_TO_CODE[w]) {
            ENGLISH_CITY_TO_CODE[w] = code;
          }
        }
      }
    } catch {}
  }

  const key = englishName.trim().toLowerCase();
  return ENGLISH_CITY_TO_CODE?.[key];
}

/** 从英文地址文本中提取所有可能的城市名，返回 IATA 代码列表 */
export function extractCityCodesFromEnglish(text: string): string[] {
  const results: string[] = [];
  // 先尝试整体匹配已知英文城市名
  const words = text.split(/[\s,.\n\r]+/).filter(w => w.length >= 3);
  for (const w of words) {
    const code = getCodeByEnglishCity(w);
    if (code && !results.includes(code)) results.push(code);
  }
  // 尝试多词组合匹配（如 "Los Angeles", "New York"）
  for (let i = 0; i < words.length - 1; i++) {
    const combo = words[i] + ' ' + words[i + 1];
    const code = getCodeByEnglishCity(combo);
    if (code && !results.includes(code)) results.push(code);
  }
  return results;
}

/** 判断一个三字代码是否为国外机场代码 */
export function isForeignCode(code: string): boolean {
  const upper = code.toUpperCase();
  if (isMainlandCode(upper)) return false; // 国内机场不算国外
  // 查反查映射中是否有对应城市名
  buildCodeToCity();
  const city = CODE_TO_CITY?.[upper];
  if (!city) return false; // 未知代码
  // 查到城市名后，判断是否国外城市
  return !isHongKongMacau(city) && !isMainlandCity(city);
}

/** 国内机场城市 + 国际城市 + 海运港口 全量匹配列表（用于 regex） */
export const ALL_PORTS_MATCH_LIST = [
  ...ALL_CHINESE_AIRPORT_CITIES,
  ...INTERNATIONAL_PORTS,
].filter((v, i, a) => a.indexOf(v) === i) // deduplicate
  .sort((a, b) => b.length - a.length);

// ── 国际主要城市 → IATA 三字代码映射（用于中文名转代码搜索） ──
export const INTERNATIONAL_CODE_MAP: Record<string, string> = {
  '迪拜': 'DXB',
  '东京': 'NRT',
  '东京成田': 'NRT',
  '东京羽田': 'HND',
  '大阪': 'KIX',
  '首尔': 'ICN',
  '汉城': 'ICN',
  '仁川': 'ICN',
  '曼谷': 'BKK',
  '新加坡': 'SIN',
  '胡志明': 'SGN',
  '河内': 'HAN',
  '金边': 'PNH',
  '仰光': 'RGN',
  '雅加达': 'CGK',
  '马尼拉': 'MNL',
  '吉隆坡': 'KUL',
  '德里': 'DEL',
  '孟买': 'BOM',
  '达卡': 'DAC',
  '科伦坡': 'CMB',
  '加德满都': 'KTM',
  '洛杉矶': 'LAX',
  '纽约': 'JFK',
  '纽约肯尼迪': 'JFK',
  '纽约纽瓦克': 'EWR',
  '旧金山': 'SFO',
  '芝加哥': 'ORD',
  '休斯顿': 'IAH',
  '迈阿密': 'MIA',
  '西雅图': 'SEA',
  '亚特兰大': 'ATL',
  '多伦多': 'YYZ',
  '温哥华': 'YVR',
  '伦敦': 'LHR',
  '伦敦希思罗': 'LHR',
  '巴黎': 'CDG',
  '法兰克福': 'FRA',
  '阿姆斯特丹': 'AMS',
  '米兰': 'MXP',
  '罗马': 'FCO',
  '马德里': 'MAD',
  '巴塞罗那': 'BCN',
  '慕尼黑': 'MUC',
  '柏林': 'BER',
  '布鲁塞尔': 'BRU',
  '苏黎世': 'ZRH',
  '维也纳': 'VIE',
  '哥本哈根': 'CPH',
  '斯德哥尔摩': 'ARN',
  '奥斯陆': 'OSL',
  '赫尔辛基': 'HEL',
  '雅典': 'ATH',
  '莫斯科': 'SVO',
  '圣彼得堡': 'LED',
  '伊斯坦布尔': 'IST',
  '悉尼': 'SYD',
  '墨尔本': 'MEL',
  '布里斯班': 'BNE',
  '奥克兰': 'AKL',
  '阿布扎比': 'AUH',
  '多哈': 'DOH',
  '马斯喀特': 'MCT',
  '开罗': 'CAI',
  '卡萨布兰卡': 'CMN',
  '内罗毕': 'NBO',
  '约翰内斯堡': 'JNB',
  '开普敦': 'CPT',
  '拉各斯': 'LOS',
  // 非洲国家 → 主要空港
  '津巴布韦': 'HRE',
  '莫桑比克': 'MPM',
  '南非': 'JNB',
  '马里': 'BKO',
  '肯尼亚': 'NBO',
  '刚果金': 'FIH',
  '科特迪瓦': 'ABJ',
  '坦桑尼亚': 'DAR',
  '加纳': 'ACC',
  '喀麦隆': 'DLA',
  '塞拉利昂': 'FNA',
  '尼日利亚': 'LOS',
  '埃塞俄比亚': 'ADD',
  '安哥拉': 'LAD',
  '阿尔及利亚': 'ALG',
  '突尼斯': 'TUN',
  '苏丹': 'KRT',
  '乌干达': 'EBB',
  '卢旺达': 'KGL',
  '赞比亚': 'LUN',
  '博茨瓦纳': 'GBE',
  '纳米比亚': 'WDH',
  '马达加斯加': 'TNR',
  '毛里求斯': 'MRU',
  '几内亚': 'CKY',
  '贝宁': 'COO',
  '多哥': 'LFW',
  '刚果布': 'BZV',
  '加蓬': 'LBV',
  '乍得': 'NDJ',
  '尼日尔': 'NIM',
  '毛里塔尼亚': 'NKC',
  '索马里': 'MGQ',
  '吉布提': 'JIB',
  '墨西哥城': 'MEX',
  '圣保罗': 'GRU',
  '里约热内卢': 'GIG',
  '布宜诺斯艾利斯': 'EZE',
  '圣地亚哥': 'SCL',
  '利马': 'LIM',
  // 国家名 → 主要空港代码
  '塞内加尔': 'DSS',
  '达喀尔': 'DSS',
  '越南': 'SGN',
  '泰国': 'BKK',
  '印度': 'DEL',
  '日本': 'NRT',
  '韩国': 'ICN',
  '马来西亚': 'KUL',
  '印度尼西亚': 'CGK',
  '菲律宾': 'MNL',
  '柬埔寨': 'PNH',
  '缅甸': 'RGN',
  '孟加拉': 'DAC',
  '尼泊尔': 'KTM',
  '斯里兰卡': 'CMB',
  '阿联酋': 'DXB',
  '沙特': 'JED',
  '土耳其': 'IST',
  '俄罗斯': 'SVO',
  '英国': 'LHR',
  '法国': 'CDG',
  '德国': 'FRA',
  '意大利': 'FCO',
  '西班牙': 'MAD',
  '荷兰': 'AMS',
  '比利时': 'BRU',
  '瑞士': 'ZRH',
  '美国': 'LAX',
  '加拿大': 'YVR',
  '墨西哥': 'MEX',
  '巴西': 'GRU',
  '阿根廷': 'EZE',
  '智利': 'SCL',
  '秘鲁': 'LIM',
  '澳大利亚': 'SYD',
  '新西兰': 'AKL',
  '埃及': 'CAI',
  '摩洛哥': 'CMN',
};

// 合并所有城市→代码映射
export const ALL_CITY_CODE_MAP: Record<string, string> = {
  ...AIRPORT_CITY_MAP,
  ...INTERNATIONAL_CODE_MAP,
};

/** 根据中文城市名查找 IATA 代码 */
export function getCodeByCityName(name: string): string | undefined {
  // 精确匹配（静态映射）
  if (ALL_CITY_CODE_MAP[name]) return ALL_CITY_CODE_MAP[name];
  // 尝试从国际化中文映射表查找（动态加载）
  buildCodeToCity();
  const found = Object.entries(CODE_TO_CITY || {}).find(([, city]) => city === name);
  if (found) return found[0];
  return undefined;
}

/** 判断是否为大陆城市（始发港） */
export function isMainlandCity(name: string): boolean {
  return !!AIRPORT_CITY_MAP[name] && name !== '香港' && name !== '澳门';
}

/** 判断是否为香港/澳门 */
export function isHongKongMacau(name: string): boolean {
  return name === '香港' || name === '澳门';
}

/** 判断是否为国外城市（目的港） */
export function isForeignCity(name: string): boolean {
  return !!INTERNATIONAL_CODE_MAP[name] && !isHongKongMacau(name);
}

/** 判断 IATA 代码是否为国内机场 */
export function isMainlandCode(code: string): boolean {
  const upper = code.toUpperCase();
  return Object.values(AIRPORT_CITY_MAP).includes(upper) && upper !== 'HKG' && upper !== 'MFM';
}

/** 构建用于正则匹配的中文城市/港口名表达式 */
export function buildPortRegex(): RegExp {
  const names = ALL_PORTS_MATCH_LIST.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(names.join('|'), 'g');
}

/** 只构建国内机场城市正则 */
export function buildAirportCityRegex(): RegExp {
  const cities = ALL_CHINESE_AIRPORT_CITIES.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(cities.join('|'), 'g');
}

// ══════════════════════════════════════════════════════════════
// 从 CSV 文件加载全球机场数据（自动合并）
// ══════════════════════════════════════════════════════════════

let csvLoaded = false;

function ensureCsvLoaded() {
  if (csvLoaded) return;
  csvLoaded = true;
  try {
    const fs = require('fs');
    const path = require('path');
    let csvPath = path.resolve(__dirname, '../../../airport-codes-evvytools.csv');
    if (!fs.existsSync(csvPath)) {
      csvPath = path.resolve(__dirname, '../../airport-codes-evvytools.csv');
      if (!fs.existsSync(csvPath)) return;
    }
    const csv = fs.readFileSync(csvPath, 'utf-8');
    const lines = csv.split('\n');
    let count = 0;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      // Simple CSV parse
      const parts = [];
      let cur = '', inQ = false;
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ; continue; }
        if (ch === ',' && !inQ) { parts.push(cur); cur = ''; continue; }
        cur += ch;
      }
      parts.push(cur);
      if (parts.length < 4) continue;
      const city = parts[1].trim();
      const country = parts[2].trim();
      const iata = parts[3].trim().toUpperCase();
      if (!city || !/^[A-Z0-9]{3}$/.test(iata)) continue;

      // Skip if already in our manual maps (manual overrides take priority)
      if (INTERNATIONAL_CODE_MAP[city] || AIRPORT_CITY_MAP[city]) continue;
      // Skip Chinese cities (we have a more complete map manually)
      if (country === 'China') continue;

      // Add to INTERNATIONAL_CODE_MAP
      (INTERNATIONAL_CODE_MAP as Record<string, string>)[city] = iata;

      // Add to INTERNATIONAL_PORTS if not already there
      if (!(INTERNATIONAL_PORTS as string[]).includes(city)) {
        (INTERNATIONAL_PORTS as string[]).push(city);
      }
      count++;
    }
    if (count > 0) {
      // Rebuild derived collections
      (ALL_PORTS_MATCH_LIST as string[]).length = 0;
      ALL_PORTS_MATCH_LIST.push(
        ...new Set([...ALL_CHINESE_AIRPORT_CITIES, ...INTERNATIONAL_PORTS])
      );
      ALL_PORTS_MATCH_LIST.sort((a, b) => b.length - a.length);
    }
    // eslint-disable-next-line no-empty
  } catch {}
}

// Auto-load CSV when module is first used
export function initAirportData() {
  ensureCsvLoaded();
  return { count: ALL_PORTS_MATCH_LIST.length };
}

// Call init on module load
initAirportData();
