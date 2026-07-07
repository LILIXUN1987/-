/**
 * 危险品模块常量和工具函数
 */
import { type DgColorConfig } from './DgColors';

// ── UN 编号查询 ──
export const UN_LOOKUP: Record<string, string> = {
  '锂电池': 'UN3480', '锂离子电池': 'UN3480', '锂金属电池': 'UN3090',
  '手机': 'UN3481', '笔记本电脑': 'UN3481', '含锂电池设备': 'UN3481',
  '酒精': 'UN1170', '乙醇': 'UN1170', '消毒液': 'UN1170',
  '油漆': 'UN1263', '涂料': 'UN1263', '油墨': 'UN1263',
  '农药': 'UN2902', '杀虫剂': 'UN2902', '除草剂': 'UN2902',
  '干冰': 'UN1845', '固体二氧化碳': 'UN1845',
  '磁性物质': 'UN2807', '磁铁': 'UN2807', '扬声器': 'UN2807',
  '腐蚀品': 'UN3264', '酸性': 'UN3264', '硫酸': 'UN1830',
  '易燃液体': 'UN1993', '树脂': 'UN1993', '气溶胶': 'UN1950',
};

// ── 操作清单模板 ──
export const CHECKLIST_TEMPLATES: Record<string, { step: number; title: string; desc: string }[]> = {
  '锂电池': [
    { step: 1, title: '提供MSDS及运输鉴定书', desc: '需第三方检测机构出具的有效期内运输鉴定书' },
    { step: 2, title: 'UN认证包装', desc: '使用UN4G纸箱，内包装防短路' },
    { step: 3, title: '贴锂电池操作标签', desc: '外包装贴锂电池操作标签+第9类标签' },
    { step: 4, title: 'DGD签署', desc: '由持IATA DGR证书人员签署危险品申报单' },
    { step: 5, title: '提前送达仓库', desc: '建议提前4-6小时送达危险品仓库' },
  ],
  '酒精/化妆品': [
    { step: 1, title: '确认酒精含量', desc: '酒精浓度≤70%（按体积计）' },
    { step: 2, title: 'UN认证包装', desc: '防漏内包装+UN认证外包装+吸收材料' },
    { step: 3, title: '贴第3类标签', desc: '贴易燃液体标签' },
    { step: 4, title: '独立组装', desc: '不与其他危险品混装' },
  ],
  '一般': [
    { step: 1, title: '客户提供货物信息', desc: '品名、UN编号、类别、包装件数' },
    { step: 2, title: '确认航司是否接受', desc: '不同航司对危险品政策不同' },
    { step: 3, title: 'UN认证包装', desc: '使用合规包装并贴好标签' },
    { step: 4, title: '提前送达仓库', desc: '建议提前4小时送达' },
  ],
};

// ── 危险品分类徽章 ──
export const CLASS_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  '第2类': { label: '2类 气体', color: 'text-red-700', bg: 'bg-red-50' },
  '第3类': { label: '3类 易燃液体', color: 'text-orange-700', bg: 'bg-orange-50' },
  '第6类': { label: '6类 有毒物', color: 'text-green-700', bg: 'bg-green-50' },
  '第8类': { label: '8类 腐蚀品', color: 'text-purple-700', bg: 'bg-purple-50' },
  '第9类': { label: '9类 杂项', color: 'text-blue-700', bg: 'bg-blue-50' },
};

export function dgClass(un: string): string {
  const u = un.toUpperCase();
  if (u.startsWith('UN3480') || u.startsWith('UN3481') || u.startsWith('UN309') || u.startsWith('UN2807') || u.startsWith('UN1845')) return '第9类';
  if (u.startsWith('UN1170') || u.startsWith('UN1263') || u.startsWith('UN1993')) return '第3类';
  if (u.startsWith('UN3264')) return '第8类';
  if (u.startsWith('UN2902')) return '第6类';
  if (u.startsWith('UN1950')) return '第2类';
  return '';
}

export function assetUrl(path: string | null): string | null {
  if (!path) return null;
  return '/api/uploads/' + path.replace(/^uploads[/\\]/, '').replace(/\\/g, '/');
}

// ── UN 快速参考数据 ──
export const UN_REF_DATA = [
  { un: "UN3480", name: "锂离子电池", cls: "第9类", pack: "UN4G纸箱", note: "PI965,需DGD,电量≤30%" },
  { un: "UN3481", name: "含锂电池设备", cls: "第9类", pack: "坚固外包装", note: "PI967,无需DGD" },
  { un: "UN3090", name: "锂金属电池", cls: "第9类", pack: "UN4G纸箱", note: "PI968,需DGD" },
  { un: "UN1170", name: "乙醇/酒精", cls: "第3类", pack: "金属桶+UN外箱", note: "浓度≤70%" },
  { un: "UN1263", name: "油漆/涂料", cls: "第3类", pack: "金属桶+吸收材料", note: "III类包装" },
  { un: "UN1845", name: "干冰", cls: "第9类", pack: "非密封包装", note: "单件≤200KG" },
  { un: "UN2807", name: "磁性物质", cls: "第9类", pack: "UN认证纸箱", note: "≤0.418A/m" },
  { un: "UN2902", name: "农药", cls: "第6类", pack: "密封+UN外箱", note: "隔离食品" },
  { un: "UN3264", name: "腐蚀性液体", cls: "第8类", pack: "防漏内包+UN外包", note: "双人核对" },
  { un: "UN1993", name: "易燃液体", cls: "第3类", pack: "金属桶+UN纸箱", note: "III类包装" },
  { un: "UN1950", name: "气溶胶", cls: "第2类", pack: "防漏外箱", note: "限压力容器" },
];
