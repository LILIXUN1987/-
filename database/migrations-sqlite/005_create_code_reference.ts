import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('code_reference', (table) => {
    table.string('code', 10).notNullable();       // IATA code (2-char airline or 3-char airport)
    table.string('type', 20).notNullable();        // 'airline' or 'airport'
    table.string('name_en', 200).notNullable();    // English name
    table.string('name_cn', 200).notNullable();    // Chinese name
    table.string('city', 100).nullable();          // City (for airports)
    table.string('country', 100).nullable();       // Country
    table.string('icao', 10).nullable();           // ICAO code (for airlines)

    table.index('code');
    table.index('type');
  });

  // Insert data
  await knex('code_reference').insert([
    // ── 中国内地航空公司 ──
    { code: 'CA', type: 'airline', name_en: 'Air China', name_cn: '中国国际航空', country: '中国', icao: 'CCA' },
    { code: 'MU', type: 'airline', name_en: 'China Eastern Airlines', name_cn: '中国东方航空', country: '中国', icao: 'CES' },
    { code: 'CZ', type: 'airline', name_en: 'China Southern Airlines', name_cn: '中国南方航空', country: '中国', icao: 'CSN' },
    { code: 'HU', type: 'airline', name_en: 'Hainan Airlines', name_cn: '海南航空', country: '中国', icao: 'CHH' },
    { code: 'ZH', type: 'airline', name_en: 'Shenzhen Airlines', name_cn: '深圳航空', country: '中国', icao: 'CSZ' },
    { code: 'MF', type: 'airline', name_en: 'Xiamen Airlines', name_cn: '厦门航空', country: '中国', icao: 'CXA' },
    { code: '3U', type: 'airline', name_en: 'Sichuan Airlines', name_cn: '四川航空', country: '中国', icao: 'CSC' },
    { code: 'FM', type: 'airline', name_en: 'Shanghai Airlines', name_cn: '上海航空', country: '中国', icao: 'CSH' },
    { code: 'SC', type: 'airline', name_en: 'Shandong Airlines', name_cn: '山东航空', country: '中国', icao: 'CDG' },
    { code: 'HO', type: 'airline', name_en: 'Juneyao Airlines', name_cn: '吉祥航空', country: '中国', icao: 'DKH' },
    { code: '9C', type: 'airline', name_en: 'Spring Airlines', name_cn: '春秋航空', country: '中国', icao: 'CQH' },
    { code: 'KN', type: 'airline', name_en: 'China United Airlines', name_cn: '中国联合航空', country: '中国', icao: 'CUA' },
    { code: 'GS', type: 'airline', name_en: 'Tianjin Airlines', name_cn: '天津航空', country: '中国', icao: 'GCR' },
    { code: 'JD', type: 'airline', name_en: 'Beijing Capital Airlines', name_cn: '首都航空', country: '中国', icao: 'CBJ' },
    { code: 'PN', type: 'airline', name_en: 'West Air', name_cn: '西部航空', country: '中国', icao: null },
    { code: 'GJ', type: 'airline', name_en: 'Loong Airlines', name_cn: '长龙航空', country: '中国', icao: 'CDC' },
    { code: '8L', type: 'airline', name_en: 'Lucky Air', name_cn: '祥鹏航空', country: '中国', icao: null },
    { code: 'EU', type: 'airline', name_en: 'Chengdu Airlines', name_cn: '成都航空', country: '中国', icao: null },
    { code: 'G5', type: 'airline', name_en: 'China Express Airlines', name_cn: '华夏航空', country: '中国', icao: 'HXA' },
    { code: 'DZ', type: 'airline', name_en: 'Donghai Airlines', name_cn: '东海航空', country: '中国', icao: null },
    { code: 'Y8', type: 'airline', name_en: 'Suparna Airlines', name_cn: '金鹏航空', country: '中国', icao: null },

    // ── 港澳台航空公司 ──
    { code: 'CX', type: 'airline', name_en: 'Cathay Pacific', name_cn: '国泰航空', country: '中国香港', icao: 'CPA' },
    { code: 'HX', type: 'airline', name_en: 'Hong Kong Airlines', name_cn: '香港航空', country: '中国香港', icao: null },
    { code: 'BR', type: 'airline', name_en: 'EVA Air', name_cn: '长荣航空', country: '中国台湾', icao: null },
    { code: 'CI', type: 'airline', name_en: 'China Airlines', name_cn: '中华航空', country: '中国台湾', icao: null },

    // ── 亚洲主要航空公司 ──
    { code: 'JL', type: 'airline', name_en: 'Japan Airlines', name_cn: '日本航空', country: '日本', icao: null },
    { code: 'NH', type: 'airline', name_en: 'All Nippon Airways', name_cn: '全日空', country: '日本', icao: null },
    { code: 'KE', type: 'airline', name_en: 'Korean Air', name_cn: '大韩航空', country: '韩国', icao: null },
    { code: 'OZ', type: 'airline', name_en: 'Asiana Airlines', name_cn: '韩亚航空', country: '韩国', icao: null },
    { code: 'SQ', type: 'airline', name_en: 'Singapore Airlines', name_cn: '新加坡航空', country: '新加坡', icao: null },
    { code: 'MH', type: 'airline', name_en: 'Malaysia Airlines', name_cn: '马来西亚航空', country: '马来西亚', icao: null },
    { code: 'TG', type: 'airline', name_en: 'Thai Airways', name_cn: '泰国国际航空', country: '泰国', icao: null },
    { code: 'VN', type: 'airline', name_en: 'Vietnam Airlines', name_cn: '越南航空', country: '越南', icao: null },
    { code: 'PR', type: 'airline', name_en: 'Philippine Airlines', name_cn: '菲律宾航空', country: '菲律宾', icao: null },
    { code: 'GA', type: 'airline', name_en: 'Garuda Indonesia', name_cn: '印尼鹰航', country: '印尼', icao: null },

    // ── 欧洲主要航空公司 ──
    { code: 'BA', type: 'airline', name_en: 'British Airways', name_cn: '英国航空', country: '英国', icao: null },
    { code: 'LH', type: 'airline', name_en: 'Lufthansa', name_cn: '汉莎航空', country: '德国', icao: null },
    { code: 'AF', type: 'airline', name_en: 'Air France', name_cn: '法国航空', country: '法国', icao: null },
    { code: 'KL', type: 'airline', name_en: 'KLM Royal Dutch Airlines', name_cn: '荷兰皇家航空', country: '荷兰', icao: null },
    { code: 'LX', type: 'airline', name_en: 'Swiss International Air Lines', name_cn: '瑞士航空', country: '瑞士', icao: null },
    { code: 'OS', type: 'airline', name_en: 'Austrian Airlines', name_cn: '奥地利航空', country: '奥地利', icao: null },
    { code: 'AY', type: 'airline', name_en: 'Finnair', name_cn: '芬兰航空', country: '芬兰', icao: null },
    { code: 'SK', type: 'airline', name_en: 'Scandinavian Airlines', name_cn: '北欧航空', country: '北欧', icao: null },
    { code: 'SU', type: 'airline', name_en: 'Aeroflot', name_cn: '俄罗斯航空', country: '俄罗斯', icao: null },
    { code: 'TK', type: 'airline', name_en: 'Turkish Airlines', name_cn: '土耳其航空', country: '土耳其', icao: null },

    // ── 美洲主要航空公司 ──
    { code: 'AA', type: 'airline', name_en: 'American Airlines', name_cn: '美国航空', country: '美国', icao: null },
    { code: 'UA', type: 'airline', name_en: 'United Airlines', name_cn: '美联航', country: '美国', icao: null },
    { code: 'DL', type: 'airline', name_en: 'Delta Air Lines', name_cn: '达美航空', country: '美国', icao: null },
    { code: 'AC', type: 'airline', name_en: 'Air Canada', name_cn: '加拿大航空', country: '加拿大', icao: null },
    { code: 'WN', type: 'airline', name_en: 'Southwest Airlines', name_cn: '西南航空', country: '美国', icao: null },

    // ── 中东/大洋洲/非洲 ──
    { code: 'EK', type: 'airline', name_en: 'Emirates', name_cn: '阿联酋航空', country: '阿联酋', icao: null },
    { code: 'QR', type: 'airline', name_en: 'Qatar Airways', name_cn: '卡塔尔航空', country: '卡塔尔', icao: null },
    { code: 'EY', type: 'airline', name_en: 'Etihad Airways', name_cn: '阿提哈德航空', country: '阿联酋', icao: null },
    { code: 'QF', type: 'airline', name_en: 'Qantas', name_cn: '澳洲航空', country: '澳大利亚', icao: null },
    { code: 'NZ', type: 'airline', name_en: 'Air New Zealand', name_cn: '新西兰航空', country: '新西兰', icao: null },
    { code: 'ET', type: 'airline', name_en: 'Ethiopian Airlines', name_cn: '埃塞俄比亚航空', country: '埃塞俄比亚', icao: null },
    { code: 'KQ', type: 'airline', name_en: 'Kenya Airways', name_cn: '肯尼亚航空', country: '肯尼亚', icao: null },
    { code: 'MS', type: 'airline', name_en: 'EgyptAir', name_cn: '埃及航空', country: '埃及', icao: null },
    { code: 'SA', type: 'airline', name_en: 'South African Airways', name_cn: '南非航空', country: '南非', icao: null },

    // ── 主要国际机场 ──
    { code: 'SVO', type: 'airport', name_en: 'Sheremetyevo International Airport', name_cn: '谢列梅捷沃国际机场', city: '莫斯科', country: '俄罗斯' },
    { code: 'DME', type: 'airport', name_en: 'Domodedovo International Airport', name_cn: '多莫杰多沃国际机场', city: '莫斯科', country: '俄罗斯' },
    { code: 'VKO', type: 'airport', name_en: 'Vnukovo International Airport', name_cn: '伏努科沃国际机场', city: '莫斯科', country: '俄罗斯' },
    { code: 'LED', type: 'airport', name_en: 'Pulkovo Airport', name_cn: '普尔科沃机场', city: '圣彼得堡', country: '俄罗斯' },
    { code: 'LAX', type: 'airport', name_en: 'Los Angeles International Airport', name_cn: '洛杉矶国际机场', city: '洛杉矶', country: '美国' },
    { code: 'JFK', type: 'airport', name_en: 'John F. Kennedy International Airport', name_cn: '肯尼迪国际机场', city: '纽约', country: '美国' },
    { code: 'ORD', type: 'airport', name_en: "Chicago O'Hare International Airport", name_cn: '芝加哥奥黑尔国际机场', city: '芝加哥', country: '美国' },
    { code: 'LHR', type: 'airport', name_en: 'London Heathrow Airport', name_cn: '伦敦希斯罗机场', city: '伦敦', country: '英国' },
    { code: 'CDG', type: 'airport', name_en: 'Charles de Gaulle Airport', name_cn: '戴高乐机场', city: '巴黎', country: '法国' },
    { code: 'FRA', type: 'airport', name_en: 'Frankfurt Airport', name_cn: '法兰克福国际机场', city: '法兰克福', country: '德国' },
    { code: 'AMS', type: 'airport', name_en: 'Amsterdam Airport Schiphol', name_cn: '史基浦机场', city: '阿姆斯特丹', country: '荷兰' },
    { code: 'DXB', type: 'airport', name_en: 'Dubai International Airport', name_cn: '迪拜国际机场', city: '迪拜', country: '阿联酋' },
    { code: 'IST', type: 'airport', name_en: 'Istanbul Airport', name_cn: '伊斯坦布尔新机场', city: '伊斯坦布尔', country: '土耳其' },

    // ── 亚洲主要机场 ──
    { code: 'NRT', type: 'airport', name_en: 'Narita International Airport', name_cn: '成田国际机场', city: '东京', country: '日本' },
    { code: 'HND', type: 'airport', name_en: 'Haneda Airport', name_cn: '羽田机场', city: '东京', country: '日本' },
    { code: 'KIX', type: 'airport', name_en: 'Kansai International Airport', name_cn: '关西国际机场', city: '大阪', country: '日本' },
    { code: 'ICN', type: 'airport', name_en: 'Incheon International Airport', name_cn: '仁川国际机场', city: '首尔', country: '韩国' },
    { code: 'SIN', type: 'airport', name_en: 'Singapore Changi Airport', name_cn: '樟宜机场', city: '新加坡', country: '新加坡' },
    { code: 'BKK', type: 'airport', name_en: 'Suvarnabhumi Airport', name_cn: '素万那普机场', city: '曼谷', country: '泰国' },
    { code: 'CGK', type: 'airport', name_en: 'Soekarno-Hatta International Airport', name_cn: '苏加诺-哈达国际机场', city: '雅加达', country: '印尼' },
    { code: 'SGN', type: 'airport', name_en: 'Tan Son Nhat International Airport', name_cn: '新山一国际机场', city: '胡志明市', country: '越南' },
    { code: 'HAN', type: 'airport', name_en: 'Noi Bai International Airport', name_cn: '内排国际机场', city: '河内', country: '越南' },
    { code: 'DEL', type: 'airport', name_en: 'Indira Gandhi International Airport', name_cn: '英迪拉甘地国际机场', city: '新德里', country: '印度' },
    { code: 'BOM', type: 'airport', name_en: 'Chhatrapati Shivaji International Airport', name_cn: '贾特拉帕蒂·希瓦吉国际机场', city: '孟买', country: '印度' },

    // ── 中国主要机场 ──
    { code: 'PEK', type: 'airport', name_en: 'Beijing Capital International Airport', name_cn: '北京首都国际机场', city: '北京', country: '中国' },
    { code: 'PKX', type: 'airport', name_en: 'Beijing Daxing International Airport', name_cn: '北京大兴国际机场', city: '北京', country: '中国' },
    { code: 'PVG', type: 'airport', name_en: 'Shanghai Pudong International Airport', name_cn: '上海浦东国际机场', city: '上海', country: '中国' },
    { code: 'SHA', type: 'airport', name_en: 'Shanghai Hongqiao International Airport', name_cn: '上海虹桥国际机场', city: '上海', country: '中国' },
    { code: 'CAN', type: 'airport', name_en: 'Guangzhou Baiyun International Airport', name_cn: '广州白云国际机场', city: '广州', country: '中国' },
    { code: 'SZX', type: 'airport', name_en: 'Shenzhen Bao-an International Airport', name_cn: '深圳宝安国际机场', city: '深圳', country: '中国' },
    { code: 'HKG', type: 'airport', name_en: 'Hong Kong International Airport', name_cn: '香港国际机场', city: '香港', country: '中国' },
    { code: 'CTU', type: 'airport', name_en: 'Chengdu Shuangliu International Airport', name_cn: '成都双流国际机场', city: '成都', country: '中国' },
    { code: 'TFU', type: 'airport', name_en: 'Chengdu Tianfu International Airport', name_cn: '成都天府国际机场', city: '成都', country: '中国' },
    { code: 'CKG', type: 'airport', name_en: 'Chongqing Jiangbei International Airport', name_cn: '重庆江北国际机场', city: '重庆', country: '中国' },
    { code: 'XIY', type: 'airport', name_en: 'Xi-an Xianyang International Airport', name_cn: '西安咸阳国际机场', city: '西安', country: '中国' },
    { code: 'WUH', type: 'airport', name_en: 'Wuhan Tianhe International Airport', name_cn: '武汉天河国际机场', city: '武汉', country: '中国' },
    { code: 'NKG', type: 'airport', name_en: 'Nanjing Lukou International Airport', name_cn: '南京禄口国际机场', city: '南京', country: '中国' },
    { code: 'HGH', type: 'airport', name_en: 'Hangzhou Xiaoshan International Airport', name_cn: '杭州萧山国际机场', city: '杭州', country: '中国' },
    { code: 'XMN', type: 'airport', name_en: 'Xiamen Gaoqi International Airport', name_cn: '厦门高崎国际机场', city: '厦门', country: '中国' },
    { code: 'TAO', type: 'airport', name_en: 'Qingdao Jiaodong International Airport', name_cn: '青岛胶东国际机场', city: '青岛', country: '中国' },
    { code: 'NGB', type: 'airport', name_en: 'Ningbo Lishe International Airport', name_cn: '宁波栎社国际机场', city: '宁波', country: '中国' },
    { code: 'DLC', type: 'airport', name_en: 'Dalian Zhoushuizi International Airport', name_cn: '大连周水子国际机场', city: '大连', country: '中国' },
    { code: 'CGO', type: 'airport', name_en: 'Zhengzhou Xinzheng International Airport', name_cn: '郑州新郑国际机场', city: '郑州', country: '中国' },
    { code: 'CSX', type: 'airport', name_en: 'Changsha Huanghua International Airport', name_cn: '长沙黄花国际机场', city: '长沙', country: '中国' },
    { code: 'TSN', type: 'airport', name_en: 'Tianjin Binhai International Airport', name_cn: '天津滨海国际机场', city: '天津', country: '中国' },
    { code: 'KMG', type: 'airport', name_en: 'Kunming Changshui International Airport', name_cn: '昆明长水国际机场', city: '昆明', country: '中国' },
    { code: 'FOC', type: 'airport', name_en: 'Fuzhou Changle International Airport', name_cn: '福州长乐国际机场', city: '福州', country: '中国' },

    // ── 其他国际主要机场 ──
    { code: 'SFO', type: 'airport', name_en: 'San Francisco International Airport', name_cn: '旧金山国际机场', city: '旧金山', country: '美国' },
    { code: 'MIA', type: 'airport', name_en: 'Miami International Airport', name_cn: '迈阿密国际机场', city: '迈阿密', country: '美国' },
    { code: 'IAH', type: 'airport', name_en: 'George Bush Intercontinental Airport', name_cn: '休斯顿洲际机场', city: '休斯顿', country: '美国' },
    { code: 'SEA', type: 'airport', name_en: 'Seattle-Tacoma International Airport', name_cn: '西雅图-塔科马国际机场', city: '西雅图', country: '美国' },
    { code: 'ANC', type: 'airport', name_en: 'Ted Stevens Anchorage International Airport', name_cn: '安克雷奇国际机场', city: '安克雷奇', country: '美国' },
    { code: 'MEM', type: 'airport', name_en: 'Memphis International Airport', name_cn: '孟菲斯国际机场', city: '孟菲斯', country: '美国' },
    { code: 'MUC', type: 'airport', name_en: 'Munich Airport', name_cn: '慕尼黑机场', city: '慕尼黑', country: '德国' },
    { code: 'VIE', type: 'airport', name_en: 'Vienna International Airport', name_cn: '维也纳国际机场', city: '维也纳', country: '奥地利' },
    { code: 'MAD', type: 'airport', name_en: 'Adolfo Suárez Madrid–Barajas Airport', name_cn: '马德里巴拉哈斯机场', city: '马德里', country: '西班牙' },
    { code: 'BCN', type: 'airport', name_en: 'Barcelona–El Prat Airport', name_cn: '巴塞罗那埃尔普拉特机场', city: '巴塞罗那', country: '西班牙' },
    { code: 'MXP', type: 'airport', name_en: 'Milan Malpensa Airport', name_cn: '米兰马尔彭萨机场', city: '米兰', country: '意大利' },
    { code: 'SYD', type: 'airport', name_en: 'Sydney Kingsford Smith Airport', name_cn: '悉尼金斯福德·史密斯机场', city: '悉尼', country: '澳大利亚' },
    { code: 'MEL', type: 'airport', name_en: 'Melbourne Airport', name_cn: '墨尔本机场', city: '墨尔本', country: '澳大利亚' },
    { code: 'AKL', type: 'airport', name_en: 'Auckland Airport', name_cn: '奥克兰机场', city: '奥克兰', country: '新西兰' },
    { code: 'GRU', type: 'airport', name_en: 'São Paulo–Guarulhos International Airport', name_cn: '圣保罗瓜卢流斯国际机场', city: '圣保罗', country: '巴西' },
    { code: 'JNB', type: 'airport', name_en: 'O. R. Tambo International Airport', name_cn: '约翰内斯堡奥利弗·坦博机场', city: '约翰内斯堡', country: '南非' },
    { code: 'CPT', type: 'airport', name_en: 'Cape Town International Airport', name_cn: '开普敦国际机场', city: '开普敦', country: '南非' },
    { code: 'RUH', type: 'airport', name_en: 'King Khalid International Airport', name_cn: '哈立德国王国际机场', city: '利雅得', country: '沙特' },
    { code: 'JED', type: 'airport', name_en: 'King Abdulaziz International Airport', name_cn: '阿卜杜勒-阿齐兹国王国际机场', city: '吉达', country: '沙特' },
    { code: 'DOH', type: 'airport', name_en: 'Hamad International Airport', name_cn: '哈马德国际机场', city: '多哈', country: '卡塔尔' },
    { code: 'AUH', type: 'airport', name_en: 'Abu Dhabi International Airport', name_cn: '阿布扎比国际机场', city: '阿布扎比', country: '阿联酋' },
    { code: 'WAW', type: 'airport', name_en: 'Warsaw Chopin Airport', name_cn: '华沙肖邦机场', city: '华沙', country: '波兰' },
    { code: 'HEL', type: 'airport', name_en: 'Helsinki-Vantaa Airport', name_cn: '赫尔辛基万塔机场', city: '赫尔辛基', country: '芬兰' },
    { code: 'ZRH', type: 'airport', name_en: 'Zurich Airport', name_cn: '苏黎世机场', city: '苏黎世', country: '瑞士' },
    { code: 'BRU', type: 'airport', name_en: 'Brussels Airport', name_cn: '布鲁塞尔机场', city: '布鲁塞尔', country: '比利时' },
    { code: 'LIS', type: 'airport', name_en: 'Lisbon Airport', name_cn: '里斯本机场', city: '里斯本', country: '葡萄牙' },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('code_reference');
}
