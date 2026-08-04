import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, CheckCircle, AlertCircle, Package, Plane, Ship, Truck, FileText, Clock, MessageSquare, X, Sparkles, Zap, Bot, Wand2, Rocket, Users, Megaphone } from 'lucide-react';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import dayjs from 'dayjs';

interface ParsedRow {
  region: string;
  warehouse_name: string;
  available_cbm: number;
  available_kg: number;
  valid_from: string;
  valid_to: string;
  cargo_type?: string;
  notes?: string;
  cargo_restrictions?: string;
}

interface HistoryItem {
  id: string;
  time: string;
  category: string;
  rawText: string;
  rows: ParsedRow[];
}

const CATEGORIES = [
  { key: '空运出口', label: '空运出口', icon: Plane },
  { key: '海运出口', label: '海运出口', icon: Ship },
  { key: '陆运出口', label: '陆运出口', icon: Truck },
  { key: '进口清关', label: '进口清关', icon: FileText },
  { key: '海运进口', label: '海运进口', icon: Ship },
  { key: '出口报关', label: '出口报关', icon: FileText },
  { key: 'JC TRANS会员', label: 'JC TRANS会员', icon: Truck },
  { key: 'WCA会员', label: 'WCA会员', icon: Truck },
  { key: '空运包税出口', label: '空运包税出口', icon: Plane },
  { key: '海运包税出口', label: '海运包税出口', icon: Ship },
] as const;

const HISTORY_KEY = 'cargo_parse_history';

function loadHistory(): HistoryItem[] {
  try {
    const today = new Date().toISOString().split('T')[0];
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const all: HistoryItem[] = JSON.parse(raw);
    return all.filter(h => h.id.startsWith(today));
  } catch { return []; }
}

function saveHistory(item: HistoryItem) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const raw = localStorage.getItem(HISTORY_KEY);
    let all: HistoryItem[] = raw ? JSON.parse(raw) : [];
    // 只保留今天及之前的记录（清理旧数据）
    all = all.filter(h => h.id >= today.split('T')[0]);
    all.unshift(item);
    // 最多保留50条
    if (all.length > 50) all = all.slice(0, 50);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(all));
  } catch {}
}

export default function TextCargoInput({ onInserted }: { onInserted: () => void }) {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const [category, setCategory] = useState<string>('空运出口');
  const [text, setText] = useState('');
  const [sourceCompanies, setSourceCompanies] = useState<Array<{ name: string; id: string }>>([]);
  const [sourceSearch, setSourceSearch] = useState('');
  const [sourceResults, setSourceResults] = useState<any[]>([]);
  const [sourceShow, setSourceShow] = useState(false);
  const [loading, setLoading] = useState(false);

  // 搜索已注册货代公司（多选）
  const searchCompanies = async (q: string) => {
    setSourceSearch(q);
    if (q.trim().length < 1) { setSourceResults([]); setSourceShow(false); return; }
    try {
      const res = await client.get('/cargo-spaces/search-users', { params: { q: q.trim() } });
      // 只显示货代角色
      const forwarders = (res.data?.data || []).filter((u: any) => u.role === 'forwarder' || u.role === 'admin');
      setSourceResults(forwarders.slice(0, 10));
      setSourceShow(true);
    } catch { setSourceResults([]); }
  };

  const addSourceCompany = (u: any) => {
    const name = u.company_name || u.display_name;
    if (!sourceCompanies.find(s => s.id === u.id)) {
      setSourceCompanies(prev => [...prev, { name, id: u.id }]);
    }
    setSourceSearch('');
    setSourceResults([]);
    setSourceShow(false);
  };

  const removeSourceCompany = (id: string) => {
    setSourceCompanies(prev => prev.filter(s => s.id !== id));
  };
  // 紧急推广
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkContent, setBulkContent] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ message: string; count: number; orderId?: string; paymentStatus?: string } | null>(null);
  const [bulkError, setBulkError] = useState('');
  const [bulkShowConfirm, setBulkShowConfirm] = useState(false);
  const [bulkQrCode, setBulkQrCode] = useState(''); // ← 微信支付二维码URL
  const [bulkOrderId, setBulkOrderId] = useState('');
  const [bulkPolling, setBulkPolling] = useState(false);
  const [autoRegion, setAutoRegion] = useState(''); // 随机分配的省份筛选
  const [result, setResult] = useState<{
    message: string;
    rows: ParsedRow[];
    inserted: number;
  } | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [contactAdminOpen, setContactAdminOpen] = useState(false);
  const [caText, setCaText] = useState('');
  const [caSending, setCaSending] = useState(false);
  const [caSent, setCaSent] = useState(false);
  const [caError, setCaError] = useState('');

  const handleContactAdmin = async () => {
    if (!caText.trim()) return;
    setCaSending(true);
    setCaError('');
    try {
      await client.post('/messages/contact-admin', { content: caText.trim() });
      setCaSent(true);
      setCaText('');
      setTimeout(() => { setContactAdminOpen(false); setCaSent(false); }, 2000);
    } catch (err: any) {
      setCaError(err?.response?.data?.error || '发送失败，请重试');
    }
    setCaSending(false);
  };

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  // Auto-resize textarea as user types
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 300) + 'px';
    }
  }, [text]);

  const handleSubmit = async () => {
    if (!text.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const payload: any = { text: text.trim(), category };
      if (sourceCompanies.length > 0) {
        if (sourceCompanies.some(s => s.id === '_auto')) {
          payload.auto_assign = true;
          payload.auto_region = autoRegion;
        } else {
          payload.source_companies = sourceCompanies.map(s => s.name);
          payload.source_company_ids = sourceCompanies.map(s => s.id);
        }
      }

      const res = await client.post<{
        message: string;
        rows: ParsedRow[];
        inserted: number;
      }>('/cargo-spaces/parse-text', payload);

      setResult(res.data);
      setText('');
      setSourceCompanies([]); setSourceSearch('');
      if (res.data.inserted > 0) {
        // 保存解析记录
        const item: HistoryItem = {
          id: new Date().toISOString(),
          time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          category,
          rawText: text.trim(),
          rows: res.data.rows,
        };
        saveHistory(item);
        setHistory(loadHistory());
        onInserted();
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        '解析失败，请重试';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkPromote = async () => {
    if (!bulkContent.trim() || bulkContent.trim().length < 5) {
      setBulkError('推广内容至少5个字');
      return;
    }
    setBulkLoading(true); setBulkError(''); setBulkShowConfirm(false);
    try {
      const res = await client.post('/cargo-spaces/bulk-promote', { content: bulkContent.trim() });
      if (res.data.code_url) {
        // 微信支付：显示二维码
        setBulkQrCode(res.data.code_url);
        setBulkOrderId(res.data.order_id);
        setBulkShowConfirm(true);
        // 开始轮询支付状态
        pollPaymentStatus(res.data.order_id);
      } else {
        // 无微信支付配置 → 直接发送
        setBulkResult({ message: res.data.message || '已发送', count: res.data.recipient_count });
        setBulkContent('');
      }
    } catch (err: any) {
      setBulkError(err?.response?.data?.error || '创建订单失败');
    }
    setBulkLoading(false);
  };

  const pollPaymentStatus = async (orderId: string) => {
    setBulkPolling(true);
    const check = async () => {
      try {
        const res = await client.get(`/cargo-spaces/bulk-promote/status/${orderId}`);
        if (res.data.status === 'paid') {
          setBulkResult({ message: '✅ 支付成功！已推送给全社区', count: 0 });
          setBulkContent('');
          setBulkQrCode('');
          setBulkPolling(false);
          setBulkShowConfirm(false);
        } else {
          setTimeout(check, 2000);
        }
      } catch { setBulkPolling(false); }
    };
    setTimeout(check, 2000);
  };

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  };

  return (
    <div>
      {/* ═══ 步骤导航 ═══ */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 text-white shadow-xl shadow-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-black">①</div>
            <div>
              <p className="text-lg font-black">AI录入舱位</p>
              <p className="text-xs text-white/70">粘贴→解析→入库</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl p-4 text-white shadow-xl shadow-orange-500/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-black">②</div>
            <div>
              <p className="text-lg font-black">紧急推广</p>
              <p className="text-xs text-white/70">¥9.9 推全社区</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ AI智能录入卡 ═══ */}
      <div className="relative overflow-hidden rounded-2xl bg-white border-2 border-blue-100 shadow-xl shadow-blue-500/10 mb-5">
        {/* 顶部渐变条 */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Wand2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-gray-900 tracking-tight">AI 智能录入</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 text-[10px] font-bold">
                  <Sparkles className="w-3 h-3" /> AI Powered
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">粘贴自然语言，AI 自动解析为结构化舱位数据，秒级入库</p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* ── 分类选择 ── */}
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">推广分类</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = category === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => { setCategory(cat.key); setResult(null); setError(''); }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20 scale-105'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 快捷模板 ── */}
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">快捷模板</label>
            <div className="flex flex-wrap gap-1.5">
              {category === '空运出口' && (
                <>
                  <button type="button" className="text-[11px] px-3 py-1.5 rounded-xl border-2 border-dashed border-blue-200 text-blue-600 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-300 font-medium transition-all"
                    onClick={() => setText('深圳NH-LAX 洛杉矶 固定包板 仓位宽松 下周一起收 重货优先 欢迎咨询')}>✈️ 深圳→LAX</button>
                  <button type="button" className="text-[11px] px-3 py-1.5 rounded-xl border-2 border-dashed border-blue-200 text-blue-600 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-300 font-medium transition-all"
                    onClick={() => setText('广州CZ-SGN 胡志明 D2/4/6 航班 仓位充足 特价收货 3.5/KG')}>✈️ 广州→SGN</button>
                  <button type="button" className="text-[11px] px-3 py-1.5 rounded-xl border-2 border-dashed border-blue-200 text-blue-600 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-300 font-medium transition-all"
                    onClick={() => setText('北京HU-BER 柏林 D1/3/4/5/7 直飞 固定包板 可接散货 重货优先')}>✈️ 北京→BER</button>
                  <button type="button" className="text-[11px] px-3 py-1.5 rounded-xl border-2 border-dashed border-blue-200 text-blue-600 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-300 font-medium transition-all"
                    onClick={() => setText('香港CX-LHR 伦敦 仓位8号起 20CBM 1500KG 普货 4.8/KG USD')}>✈️ 香港→LHR</button>
                </>
              )}
              {category === '海运出口' && (
                <>
                  <button type="button" className="text-[11px] px-3 py-1.5 rounded-xl border-2 border-dashed border-sky-200 text-sky-600 bg-sky-50/50 hover:bg-sky-50 hover:border-sky-300 font-medium transition-all"
                    onClick={() => setText('深圳-洛杉矶 海运 下周舱位 小柜大柜均有 特价收货 船东直约')}>🚢 深圳→洛杉矶</button>
                  <button type="button" className="text-[11px] px-3 py-1.5 rounded-xl border-2 border-dashed border-sky-200 text-sky-600 bg-sky-50/50 hover:bg-sky-50 hover:border-sky-300 font-medium transition-all"
                    onClick={() => setText('广州-胡志明 海运 周双班 散货拼箱 整柜均可 价格优势')}>🚢 广州→胡志明</button>
                  <button type="button" className="text-[11px] px-3 py-1.5 rounded-xl border-2 border-dashed border-sky-200 text-sky-600 bg-sky-50/50 hover:bg-sky-50 hover:border-sky-300 font-medium transition-all"
                    onClick={() => setText('宁波-汉堡 40HQ 普货 3200/40HQ USD 欧基线 28天到港')}>🚢 宁波→汉堡</button>
                </>
              )}
              {category !== '空运出口' && category !== '海运出口' && (
                <button type="button" className="text-[11px] px-3 py-1.5 rounded-xl border-2 border-dashed border-gray-200 text-gray-600 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-300 font-medium transition-all"
                  onClick={() => setText(`【${category}】优势推广 价格优惠 仓位充足 欢迎咨询合作`)}>📋 {category} 通用模板</button>
              )}
            </div>
          </div>

          {/* ── 主输入区 ── */}
          <div className="relative group">
            <textarea
              ref={textareaRef}
              className="w-full min-h-[100px] max-h-[300px] text-sm rounded-2xl px-5 py-4 bg-gradient-to-b from-blue-50/50 to-indigo-50/30 border-2 border-blue-100 text-gray-800 placeholder-blue-300/70 focus:outline-none focus:ring-4 focus:ring-blue-200/50 focus:border-blue-400 transition-all duration-300 resize-none font-medium group-hover:border-blue-200 group-hover:shadow-lg group-hover:shadow-blue-500/5"
              placeholder={category === '空运出口'
                ? '在此粘贴或输入舱位信息...\n\n例如：深圳JG SZX-SGN 4号起 散拖不限 3.5RMB/KG\n或者：广州EK 洛杉矶 下周一大仓位 2000KG 12CBM 5元/KG'
                : `在此输入${category}推广信息...`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={loading}
            />
            {/* 右下角字符计数器 */}
            <div className="absolute bottom-3 right-4 flex items-center gap-2">
              <span className={`text-[10px] font-mono font-bold ${text.length > 500 ? 'text-amber-500' : 'text-gray-400'}`}>
                {text.length}
              </span>
              {text.length > 500 && (
                <span className="text-[10px] text-amber-500 font-medium">字符较多，建议精简</span>
              )}
            </div>
          </div>

          {/* ── 舱位来源公司（仅管理员） ── */}
          {isAdmin && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200/60 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">🏢</span>
              <span className="text-sm font-bold text-amber-800">舱位来源公司</span>
              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">{category}</span>
            </div>

            {/* 按省份随机分配 */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { region: '上海', label: '🏙️ 上海货代', desc: '50家' },
                { region: '北京', label: '🏛️ 北京货代', desc: '50家' },
                { region: '广深', label: '🏢 广深货代', desc: '50家' },
                { region: '新疆', label: '🏔️ 新疆货代', desc: '50家' },
                { region: '其他', label: '🌍 其他省份货代', desc: '50家' },
                { region: '', label: '🎲 不区分省份', desc: '50家' },
              ].map(opt => (
                <button
                  key={opt.region}
                  type="button"
                  onClick={() => {
                    setAutoRegion(opt.region);
                    setSourceCompanies([{ name: `${opt.label} ×${opt.desc}`, id: '_auto' }]);
                  }}
                  className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all flex flex-col items-center gap-0.5 ${
                    autoRegion === opt.region && sourceCompanies.some(s => s.id === '_auto')
                      ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20'
                      : 'bg-white border-dashed border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400'
                  }`}
                >
                  <span>{opt.label}</span>
                  <span className="text-[10px] opacity-60">×{opt.desc}</span>
                </button>
              ))}
            </div>
            {sourceCompanies.some(s => s.id === '_auto') && (
              <p className="text-[10px] text-amber-600 text-center mt-1">✅ 已选择，发布时将自动随机分配</p>
            )}

            {/* 手动选择（可折叠） */}
            {sourceCompanies.length > 0 && !sourceCompanies.some(s => s.id === '_auto') && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {sourceCompanies.map(s => (
                  <span key={s.id} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border-2 border-amber-300 rounded-xl text-xs font-bold text-amber-800 shadow-sm">
                    🏢 {s.name}
                    <button onClick={() => removeSourceCompany(s.id)} className="ml-0.5 text-amber-400 hover:text-red-500 transition-colors">✕</button>
                  </span>
                ))}
              </div>
            )}

            <details className="mt-3 text-xs text-gray-400">
              <summary className="cursor-pointer hover:text-amber-600">或手动搜索选择特定公司</summary>
              <div className="relative mt-2">
                <input
                  type="text"
                  className="w-full text-sm rounded-xl px-4 py-2.5 bg-white border-2 border-amber-200 text-gray-800 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300 transition-all font-medium"
                  placeholder="搜索公司名..."
                  value={sourceSearch}
                  onChange={(e) => searchCompanies(e.target.value)}
                  onFocus={() => sourceResults.length > 0 && setSourceShow(true)}
                  disabled={loading}
                />
                {sourceShow && sourceResults.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-amber-200 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                    {sourceResults.filter((u: any) => !sourceCompanies.find(s => s.id === u.id)).map((u: any) => (
                      <button key={u.id} type="button" onClick={() => addSourceCompany(u)}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-amber-50 transition-colors flex items-center gap-2 border-b border-gray-50 last:border-0">
                        <span className="font-medium text-gray-800 truncate">{u.company_name || u.display_name}</span>
                        <span className="text-[10px] text-amber-500 ml-auto">+ 添加</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </details>

            <p className="text-[11px] text-amber-600/80 mt-2">
              {sourceCompanies.some(s => s.id === '_auto')
                ? '🎲 系统将随机抽取50家注册货代作为来源。用户搜索匹配时，所有选中公司都会收到站内信+邮件通知。'
                : '💡 选择公司后，用户搜索匹配此舱位时，选中公司都会收到站内信+邮件通知。'}
            </p>
          </div>
          )}

          {/* ── 操作按钮 ── */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-gray-400 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              当前分类：<span className="font-bold text-gray-600">{category}</span>
            </p>
            <div className="flex gap-2">
              {text && (
                <button
                  className="px-5 py-3 text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-all"
                  onClick={() => { setText(''); setSourceCompanies([]); setSourceSearch(''); setResult(null); setError(''); }}
                  disabled={loading}
                >
                  清空
                </button>
              )}
              <button
                className="px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-2xl shadow-xl shadow-blue-500/20 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
                onClick={handleSubmit}
                disabled={loading || !text.trim()}
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />AI 解析中...</>
                ) : (
                  <><Wand2 className="w-4 h-4" />AI 解析录入</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ 🚀 紧急填舱推广（仅货代可见） ═══ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-300 shadow-xl shadow-orange-500/10 mb-5">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-400 via-red-400 to-pink-500" />
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-orange-300/20 rounded-full blur-2xl" />
        <div className="p-5">
          <button
            onClick={() => { setBulkOpen(!bulkOpen); setBulkResult(null); setBulkError(''); }}
            className="w-full flex items-center gap-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-xl shadow-orange-500/30">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-gray-900">🚀 紧急填舱推广</span>
                <span className="text-[11px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">¥9.9</span>
              </div>
              <p className="text-sm text-orange-700 font-medium mt-0.5">舱位收不满？微信扫码支付 ¥9.9，一键推送至社区所有外贸和货代</p>
            </div>
            <span className={`text-lg transition-transform duration-300 ${bulkOpen ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {bulkOpen && (
            <div className="mt-4 pt-4 border-t border-orange-100 space-y-3">
              {bulkResult ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-bold text-green-800">{bulkResult.message}</p>
                  <p className="text-xs text-green-600 mt-1">已触达 {bulkResult.count} 位潜在客户</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">推广内容</label>
                    <textarea
                      className="w-full min-h-[80px] text-sm rounded-xl px-4 py-3 bg-orange-50 border-2 border-orange-200 text-gray-800 placeholder-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all resize-none"
                      placeholder="例如：深圳至洛杉矶 下周仓位充足 大柜小柜均有 特价收货 欢迎速联！"
                      value={bulkContent}
                      onChange={e => setBulkContent(e.target.value)}
                      disabled={bulkLoading}
                    />
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Users className="w-3 h-3" /> 将推送给所有外贸和货代用户
                      </p>
                      <span className="text-[10px] text-gray-400">{bulkContent.length}/500</span>
                    </div>
                  </div>
                  {bulkError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{bulkError}</p>}
                  <button
                    onClick={handleBulkPromote}
                    disabled={bulkLoading || bulkContent.trim().length < 5}
                    className="w-full py-3 text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-red-600 rounded-xl hover:from-orange-600 hover:to-red-700 shadow-xl shadow-orange-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Megaphone className="w-4 h-4" />
                    🚀 立即推广（¥9.9）
                  </button>
                  <p className="text-[10px] text-gray-400 text-center">点击后确认即可推送至全社区</p>

                  {/* ── 微信扫码支付弹窗 ── */}
                  {bulkShowConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => { if (!bulkPolling) setBulkShowConfirm(false); }}>
                      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-5 text-white text-center">
                          <h3 className="font-bold text-lg">微信扫码支付 ¥9.9</h3>
                          <p className="text-sm text-white/80 mt-1">支付后自动推送至全社区</p>
                        </div>
                        <div className="p-5 text-center space-y-4">
                          {bulkQrCode ? (
                            <>
                              <div className="bg-white border-2 border-gray-200 rounded-2xl p-3 inline-block">
                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(bulkQrCode)}`} alt="微信支付二维码" className="w-48 h-48" />
                              </div>
                              <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                                {bulkPolling ? <Loader2 className="w-3 h-3 animate-spin text-green-500" /> : null}
                                {bulkPolling ? '等待支付中...' : '请使用微信扫一扫支付'}
                              </p>
                              <p className="text-[10px] text-gray-400">支付成功后自动发送，无需手动操作</p>
                            </>
                          ) : (
                            <div className="py-8">
                              <Loader2 className="w-8 h-8 animate-spin text-green-500 mx-auto" />
                              <p className="text-sm text-gray-500 mt-3">正在生成支付二维码...</p>
                            </div>
                          )}
                          <button onClick={() => { setBulkShowConfirm(false); setBulkPolling(false); }} className="w-full py-2 text-sm text-gray-500 hover:text-gray-700">
                            取消
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 text-sm text-red-700 bg-red-50 border-2 border-red-200 rounded-2xl px-5 py-4 mb-4 animate-in fade-in">
          <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <p className="font-bold text-red-800">解析失败</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-white rounded-2xl border-2 border-emerald-200 shadow-xl shadow-emerald-500/5 mb-4 overflow-hidden animate-in fade-in">
          {/* Success header */}
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 px-6 py-4 border-b border-emerald-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-bold text-emerald-800 text-sm">{result.message}</p>
                {result.inserted > 0 && (
                  <p className="text-xs text-emerald-600/80">已成功入库 {result.inserted} 条舱位记录</p>
                )}
              </div>
            </div>
          </div>

          {result.rows.length > 0 && (
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 text-[11px] uppercase tracking-wider border-b border-gray-100">
                    <th className="pb-3 font-bold">分类</th>
                    <th className="pb-3 font-bold">航线</th>
                    <th className="pb-3 font-bold">渠道</th>
                    <th className="pb-3 font-bold text-right">CBM</th>
                    <th className="pb-3 font-bold text-right">KG</th>
                    <th className="pb-3 font-bold">有效期</th>
                    <th className="pb-3 font-bold">类型</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-3">
                        <span className="inline-block bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold">{category}</span>
                      </td>
                      <td className="py-3 font-semibold text-gray-900">{row.region}</td>
                      <td className="py-3 text-gray-600">{row.warehouse_name}</td>
                      <td className="py-3 text-gray-700 text-right font-mono font-medium">{row.available_cbm > 0 ? row.available_cbm.toLocaleString() : '—'}</td>
                      <td className="py-3 text-gray-700 text-right font-mono font-medium">{row.available_kg > 0 ? row.available_kg.toLocaleString() : '—'}</td>
                      <td className="py-3 text-gray-500 text-xs">{row.valid_from} ~ {row.valid_to}</td>
                      <td className="py-3 text-gray-600 text-xs">{row.cargo_type || '普货'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">解析成功，数据已入库并立即可被搜索到</p>
            <button
              className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/20 transition-all"
              onClick={() => { setText(''); setSourceCompanies([]); setSourceSearch(''); setResult(null); }}
            >
              + 继续录入
            </button>
          </div>
        </div>
      )}

      {/* 今日解析记录 */}
      <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-lg mb-4 overflow-hidden">
        <button
          className="flex items-center justify-between w-full px-5 py-4 hover:bg-gray-50 transition-colors"
          onClick={() => setShowHistory(!showHistory)}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <Clock className="w-4 h-4 text-gray-500" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-black text-gray-900">今日解析记录</h3>
              <p className="text-[10px] text-gray-400">{history.length} 条记录</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {history.length > 0 && (
              <button
                className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                onClick={(e) => { e.stopPropagation(); clearHistory(); }}
              >
                清空
              </button>
            )}
            <span className={`text-xs text-gray-400 transition-transform duration-300 ${showHistory ? 'rotate-180' : ''}`}>▼</span>
          </div>
        </button>

        {showHistory && (
          <div className="mt-3 space-y-2 max-h-[400px] overflow-y-auto">
            {history.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">今日暂无解析记录</div>
            ) : (
              history.map((item) => (
                <div key={item.id} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-block bg-primary-50 text-primary-700 text-xs px-2 py-0.5 rounded-full font-medium">
                      {item.category}
                    </span>
                    <span className="text-xs text-gray-400">{item.time}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-1 truncate">{item.rawText}</p>
                  {item.rows.map((row, idx) => (
                    <div key={idx} className="text-xs text-gray-700 pl-2 border-l-2 border-gray-200 mt-1">
                      {row.region} — {row.warehouse_name}
                      {(row.available_cbm > 0 || row.available_kg > 0) && (
                        <span className="text-gray-400 ml-2">
                          {row.available_cbm > 0 ? `${row.available_cbm}CBM ` : ''}{row.available_kg > 0 ? `${row.available_kg}KG` : ''}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── 联系管理员 ── */}
      <div className="mt-4 flex justify-center">
        <button
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 shadow-sm rounded-lg px-5 py-2.5 transition-colors"
          onClick={() => { setContactAdminOpen(true); setCaSent(false); setCaError(''); setCaText(''); }}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          遇到任何问题，点击这里联系管理员
        </button>
      </div>

      {/* ── 联系管理员对话框 ── */}
      {contactAdminOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => { if (!caSending) setContactAdminOpen(false); }}>
          <div className="bg-white rounded-xl shadow-xl p-5 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 text-sm">联系管理员</h3>
              <button onClick={() => { setContactAdminOpen(false); setCaSent(false); }} className="text-gray-400 hover:text-gray-600" disabled={caSending}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {caSent ? (
              <div className="text-center py-6 text-green-600 text-sm font-medium">✅ 消息已发送给管理员</div>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-3">在录入过程中遇到问题？请描述您的问题，管理员收到后会尽快回复。</p>
                <textarea
                  className="input-field w-full min-h-[80px] text-sm resize-none mb-3"
                  placeholder="请描述您遇到的问题..."
                  value={caText}
                  onChange={e => setCaText(e.target.value)}
                  disabled={caSending}
                />
                {caError && <p className="text-xs text-red-500 bg-red-50 rounded px-2 py-1 mb-2">{caError}</p>}
                <button
                  className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
                  onClick={handleContactAdmin}
                  disabled={caSending || !caText.trim()}
                >
                  {caSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  发送
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
