import { AIRLINE_CODE_MAP, buildAirlineRegexString } from '../backend/src/data/airline-codes';
import { getCodeByCityName } from '../backend/src/data/airport-codes';

const text = `土耳其航空(TK) 广州/深圳一级代理!
广州/深圳飞DAILY全货机，运力超强,  两地飞都可以接带电池货，
CAN/SZX- IST- 欧洲/美线/中东/南美/亚洲/非洲/印巴等各点, 航点辐射全球主要机场！
3月2号航班起收，重货/泡货都喜欢。`;

console.log('=== 1. hasAirportCode ===');
const codes: string[] = text.match(/[A-Z0-9]{3}/g) || [];
console.log('原始 IATA 3字代码:', codes);

const PORT_REGEX = new RegExp(['广州','深圳','上海','北京','香港','杭州','宁波','南京','成都','重庆','武汉','西安','昆明','厦门','青岛','天津','大连','郑州','长沙','济南','福州','海口','三亚','乌鲁木齐','哈尔滨','沈阳','贵阳','南宁','兰州','太原','合肥','南昌','呼和浩特','银川','西宁','拉萨','珠海','揭阳','湛江','惠州','佛山','温州','义乌','舟山','台州','徐州','常州','南通','无锡','扬州','盐城','淮安','连云港','烟台','威海','临沂','潍坊','日照','济宁','桂林','北海','柳州','泉州','晋江','武夷山','宜昌','襄阳','恩施','鄂州','绵阳','泸州','宜宾','南充','西昌','丽江','大理','西双版纳','香格里拉','敦煌','喀什','包头','呼伦贝尔','鄂尔多斯','胡志明','曼谷','东京','大阪','首尔','汉城','新加坡','洛杉矶','纽约','伦敦','迪拜','巴黎','法兰克福','悉尼','墨尔本','雅加达','马尼拉','吉隆坡','河内','金边','仰光','德里','孟买','达卡','科伦坡','伊斯坦布尔','莫斯科'].join('|'), 'g');
const chinesePorts = text.match(PORT_REGEX) || [];
console.log('中文港口名:', chinesePorts);
for (const port of chinesePorts) {
  const code = getCodeByCityName(port);
  if (code && !codes.includes(code)) codes.push(code);
}
const realCodes = codes.filter(c => !/^\d{3}$/.test(c));
console.log('最终 realCodes:', realCodes);
console.log('hasAirportCode (>=2):', realCodes.length >= 2, '✅');

console.log('\n=== 2. hasAirline ===');
const AIRLINE_REGEX = new RegExp('(?:^|[\\s,\\-－—，、]|[一-龥])(?:' + buildAirlineRegexString() + ')(?=[\\s,\\-－—，、]|$|[一-龥])');
const airlineMatch = text.match(AIRLINE_REGEX);
console.log('航司匹配结果:', airlineMatch ? `"${airlineMatch[0]}"` : '❌ 无匹配');
console.log('is TK in AIRLINE_CODE_MAP:', !!AIRLINE_CODE_MAP['TK']);
// 检查 "TK" 前面是什么字符
const tkIndex = text.indexOf('TK');
if (tkIndex >= 0) {
  const before = text[tkIndex - 1];
  const after = text[tkIndex + 2];
  console.log(`"TK" 位置: ${tkIndex}, 前字符: "${before}" (code: ${before.charCodeAt(0)}), 后字符: "${after}"`);
  // 检查边界正则
  const boundaryBefore = /^|[\s,\-－—，、]|[一-龥]/.test(before);
  console.log(`前字符是否匹配边界模式: ${boundaryBefore}`);
}

console.log('\n=== 3. hasCargo ===');
const hasCargo = /CBM|KG|公斤|立方|吨|仓位|舱位|包舱|订舱|托盘|散箱|货机|大泡|电商|航班|\d+\s*:\s*\d+|\d+\s*[＋+]\s*\d+|大力收货|收货中/i.test(text);
console.log('匹配到的关键词:');
const cargoKeywords = text.match(/CBM|KG|公斤|立方|吨|仓位|舱位|包舱|订舱|托盘|散箱|货机|大泡|电商|航班|\d+\s*:\s*\d+|\d+\s*[＋+]\s*\d+|大力收货|收货中/gi);
console.log(cargoKeywords || '❌ 无匹配');
console.log('hasCargo:', hasCargo, '✅');
