import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, CheckCircle, AlertCircle, Package, Plane, Ship, Truck, FileText, Clock, MessageSquare, X } from 'lucide-react';
import client from '../../api/client';
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
  const [category, setCategory] = useState<string>('空运出口');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
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
      const res = await client.post<{
        message: string;
        rows: ParsedRow[];
        inserted: number;
      }>('/cargo-spaces/parse-text', { text: text.trim(), category });

      setResult(res.data);
      setText('');
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

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  };

  return (
    <div>
      {/* Category tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-5 h-5 text-primary-600" />
          <h3 className="font-semibold text-gray-900">快速录入推广信息</h3>
          <span className="text-xs text-gray-400 ml-auto">
            支持自然语言输入，AI 自动解析
          </span>
        </div>

        {/* Category selector */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = category === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => {
                  setCategory(cat.key);
                  setResult(null);
                  setError('');
                }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                }`}
              >
                <Icon className="w-3 h-3" />
                {cat.label}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-gray-400 mb-3">
          当前分类：<span className="font-medium text-gray-600">{category}</span> ——
          直接粘贴或输入货舱动态信息，如：<br />
          <code className="text-gray-500 bg-gray-100 px-1 rounded">
            广州到纽约头程最早6.5，还有2000KG 12CBM仓位，俄罗斯莫斯科仓位紧张最早月底，泰国走CZ仓位宽松直飞随时定
          </code>
        </p>

        {/* ── 新手模板快捷填充 ── */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {category === '空运出口' && (
            <>
              <button type="button" className="text-[10px] px-2 py-1 rounded-lg border border-dashed border-blue-300 text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                onClick={() => setText('深圳NH-LAX 洛杉矶 固定包板 仓位宽松 下周一起收 重货优先 欢迎咨询')}>
                ✈️ 深圳→LAX 模板
              </button>
              <button type="button" className="text-[10px] px-2 py-1 rounded-lg border border-dashed border-blue-300 text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                onClick={() => setText('广州CZ-SGN 胡志明 D2/4/6 航班 仓位充足 特价收货 3.5/KG 欢迎询价')}>
                ✈️ 广州→SGN 模板
              </button>
              <button type="button" className="text-[10px] px-2 py-1 rounded-lg border border-dashed border-blue-300 text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                onClick={() => setText('北京HU-BER 柏林 D1/3/4/5/7 直飞 固定包板 可接散货 重货优先 卡转欧洲全境')}>
                ✈️ 北京→BER 模板
              </button>
            </>
          )}
          {category === '海运出口' && (
            <>
              <button type="button" className="text-[10px] px-2 py-1 rounded-lg border border-dashed border-blue-300 text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                onClick={() => setText('深圳-洛杉矶 海运 下周舱位 小柜大柜均有 特价收货 船东直约 欢迎询价')}>
                🚢 深圳→洛杉矶 模板
              </button>
              <button type="button" className="text-[10px] px-2 py-1 rounded-lg border border-dashed border-blue-300 text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                onClick={() => setText('广州-胡志明 海运 周双班 散货拼箱 整柜均可 价格优势 欢迎长期合作')}>
                🚢 广州→胡志明 模板
              </button>
            </>
          )}
          {category !== '空运出口' && category !== '海运出口' && (
            <button type="button" className="text-[10px] px-2 py-1 rounded-lg border border-dashed border-blue-300 text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
              onClick={() => setText(`【${category}】优势推广 价格优惠 仓位充足 欢迎咨询合作`)}>
              📋 {category} 通用模板
            </button>
          )}
        </div>

        <textarea
          ref={textareaRef}
          className="w-full min-h-[60px] max-h-[300px] text-sm rounded-xl px-4 py-3 bg-blue-50 border border-blue-200 text-gray-700 placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 transition-colors resize-none"
          placeholder={category === '空运出口' ? '空运出口：请发布有价格或者最早订舱时间的推广信息，笼统的航线信息不予收录！&#10;&#10;例如：深圳JG SZX-SGN 4号起 散拖不限 3.5RMB/KG&#10;或者：广州EK 阿联酋 下周一大仓位 200KG 12.0CBM 30RMB/KG（如有特价请标注）' : '在此输入你需要推广的信息&#10;&#10;例如：深圳JG SZX-SGN 4号起 散托不限 3.5/KG&#10;或者：广州EK 洛杉矶 下周一大仓位 2000KG 12CBM 5元/KG'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={loading}
        />

        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-gray-400">
            {text.length} 字符
          </span>
          <div className="flex gap-2">
            {text && (
              <button
                className="btn-outline text-sm"
                onClick={() => {
                  setText('');
                  setResult(null);
                  setError('');
                }}
                disabled={loading}
              >
                清空
              </button>
            )}
            <button
              className="btn-primary flex items-center gap-2 text-sm"
              onClick={handleSubmit}
              disabled={loading || !text.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  解析中...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  提交解析
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3 mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <h3 className="font-semibold text-gray-900">{result.message}</h3>
          </div>

          {result.rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="pb-2 font-medium">分类</th>
                    <th className="pb-2 font-medium">地区/航线</th>
                    <th className="pb-2 font-medium">仓库/渠道</th>
                    <th className="pb-2 font-medium">CBM</th>
                    <th className="pb-2 font-medium">KG</th>
                    <th className="pb-2 font-medium">有效期</th>
                    <th className="pb-2 font-medium">货物类型</th>
                    <th className="pb-2 font-medium">备注</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2">
                        <span className="inline-block bg-primary-50 text-primary-700 text-xs px-2 py-0.5 rounded-full font-medium">
                          {category}
                        </span>
                      </td>
                      <td className="py-2 font-medium text-gray-900">{row.region}</td>
                      <td className="py-2 text-gray-700">{row.warehouse_name}</td>
                      <td className="py-2 text-gray-600">{row.available_cbm > 0 ? row.available_cbm.toLocaleString() : '--'}</td>
                      <td className="py-2 text-gray-600">{row.available_kg > 0 ? row.available_kg.toLocaleString() : '--'}</td>
                      <td className="py-2 text-gray-500 text-xs">
                        {row.valid_from} ~ {row.valid_to}
                      </td>
                      <td className="py-2 text-gray-600">{row.cargo_type || '--'}</td>
                      <td className="py-2 text-gray-500 text-xs max-w-[200px] truncate">
                        {row.notes || row.cargo_restrictions || '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            className="btn-outline text-sm mt-4 bg-yellow-400 hover:bg-yellow-500 border-yellow-400 text-yellow-900"
            onClick={() => {
              setText('');
              setResult(null);
            }}
          >
            继续录入
          </button>
        </div>
      )}

      {/* 今日解析记录 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <button
          className="flex items-center justify-between w-full"
          onClick={() => setShowHistory(!showHistory)}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">今日解析记录</h3>
            <span className="text-xs text-gray-400">({history.length} 条)</span>
          </div>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                className="text-xs text-red-500 hover:underline"
                onClick={(e) => { e.stopPropagation(); clearHistory(); }}
              >
                清空
              </button>
            )}
            <span className="text-xs text-gray-400">{showHistory ? '收起' : '展开'}</span>
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
