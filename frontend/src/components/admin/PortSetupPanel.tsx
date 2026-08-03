import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import client from '../../api/client';
import { MapPin, Search, X, Loader2, Save, CheckCircle, Plane, Ship } from 'lucide-react';
import { toast } from '../common/Toast';

interface Suggestion { code: string; zh: string; en?: string; type: string }

export default function PortSetupPanel() {
  const user = useAuthStore((s) => s.user);
  const lang = useAuthStore((s) => s.lang);

  const [portCity, setPortCity] = useState('');
  const [portCode, setPortCode] = useState('');
  const [operablePorts, setOperablePorts] = useState<string[]>([]);
  const [portInput, setPortInput] = useState('');

  // Suggestions
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestTarget, setSuggestTarget] = useState<'city' | 'port' | null>(null);
  const suggestTimer = useRef<NodeJS.Timeout>();

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load existing data
  const [hasExisting, setHasExisting] = useState(false);
  useEffect(() => {
    client.get('/auth/me').then(r => {
      const u = r.data;
      if (u.port_city) { setPortCity(u.port_city); setHasExisting(true); }
      if (u.port_code) setPortCode(u.port_code);
      if (u.operable_ports) setOperablePorts(u.operable_ports.split(/[\n,]+/).filter(Boolean));
    }).catch(() => {});
  }, []);

  const fetchSuggestions = async (q: string) => {
    if (q.length < 1) { setSuggestions([]); setShowSuggestions(false); return; }
    try {
      const res = await client.get('/tools/airport-search', { params: { q } });
      setSuggestions(res.data.data || []);
      setShowSuggestions((res.data.data || []).length > 0);
    } catch { setSuggestions([]); }
  };

  const handleCityInput = (val: string) => {
    setPortCity(val);
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    suggestTimer.current = setTimeout(() => {
      setSuggestTarget('city');
      fetchSuggestions(val);
    }, 300);
  };

  const handlePortInput = (val: string) => {
    setPortCode(val.toUpperCase());
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    suggestTimer.current = setTimeout(() => {
      setSuggestTarget('port');
      fetchSuggestions(val);
    }, 300);
  };

  const selectSuggestion = (s: Suggestion) => {
    if (suggestTarget === 'city') {
      setPortCity(s.zh);
      setPortCode(s.code);
    } else if (suggestTarget === 'port') {
      // Add to operable ports (max 10)
      const label = `${s.code} ${s.zh}`;
      if (operablePorts.includes(label)) return;
      if (operablePorts.length >= 10) {
        toast.error(lang === 'en' ? 'Max 10 ports' : '最多10个口岸');
        return;
      }
      setOperablePorts(prev => [...prev, label]);
    }
    setShowSuggestions(false);
  };

  const removePort = (port: string) => {
    setOperablePorts(prev => prev.filter(p => p !== port));
  };

  const handleSave = async () => {
    if (!portCity.trim()) {
      toast.error(lang === 'en' ? 'Please fill in your city' : '请填写城市');
      return;
    }
    setSaving(true);
    try {
      await client.put('/auth/profile', {
        port_city: portCity.trim(),
        port_code: portCode.trim() || null,
        operable_ports: operablePorts.join(','),
      });
      setSaved(true);
      toast.success(lang === 'en' ? 'Saved!' : '已保存');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || (lang === 'en' ? 'Save failed' : '保存失败'));
    }
    setSaving(false);
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm p-5 mb-4 relative">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-5 h-5 text-blue-600" />
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          {lang === 'en' ? '📍 Port & City Setup' : '📍 设置你的口岸与城市（可被海外代理搜到）'}
          {hasExisting && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">✅ 已设置</span>}
        </h3>
      </div>

      <div className="space-y-4">
        {/* 城市 */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">
            {lang === 'en' ? 'Company City' : '公司所在城市'} <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <MapPin className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input-field text-sm pl-7 w-full" placeholder={lang === 'en' ? 'e.g. Guangzhou' : '如：广州'}
              value={portCity} onChange={e => handleCityInput(e.target.value)}
              onFocus={() => { setSuggestTarget('city'); fetchSuggestions(portCity); }} />
          </div>
        </div>

        {/* 口岸代码 */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">
            {lang === 'en' ? 'Port Code (IATA)' : '口岸三字代码'}
          </label>
          <div className="relative">
            <Plane className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input-field text-xs font-mono pl-7 w-full" placeholder="CAN / CKG / PVG"
              value={portCode} onChange={e => handlePortInput(e.target.value)}
              onFocus={() => { setSuggestTarget('port'); fetchSuggestions(portCode); }} />
          </div>
        </div>

        {/* 可操作口岸 */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">
            {lang === 'en' ? 'Operable Ports (max 10)' : `可操作口岸（最多10个，已选 ${operablePorts.length}/10）`}
          </label>
          {operablePorts.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {operablePorts.map((p, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-[11px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                  {p}
                  <button onClick={() => removePort(p)} className="hover:text-red-600"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input-field text-xs pl-7 w-full" placeholder={lang === 'en' ? 'Search port/city...' : '搜索口岸或城市名...'}
              value={portInput} onChange={e => { setPortInput(e.target.value); handlePortInput(e.target.value); }}
              onFocus={() => { setSuggestTarget('port'); fetchSuggestions(portInput); }} />
          </div>
        </div>

        {/* Dropdown suggestions */}
        {showSuggestions && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto absolute z-10" style={{ width: 'calc(100% - 2.5rem)' }}>
            {suggestions.slice(0, 15).map((s, i) => (
              <button key={i} className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 flex items-center gap-2 border-b border-gray-50"
                onClick={() => selectSuggestion(s)}>
                <span className="font-mono font-bold text-blue-600 w-10 flex-shrink-0">{s.code}</span>
                <span>{s.zh}{s.en ? ` / ${s.en}` : ''}</span>
                <span className="ml-auto text-[10px] text-gray-400">{s.type === 'domestic' ? '国内' : '国际'}</span>
              </button>
            ))}
          </div>
        )}

        <button onClick={handleSave} disabled={saving || !portCity.trim()}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {lang === 'en' ? 'Save Port Info' : '保存口岸信息'}
        </button>
      </div>
    </div>
  );
}
