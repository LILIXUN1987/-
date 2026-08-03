import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import client from '../../api/client';
import { Plane, Ship, Truck, Package, Shield, CheckCircle, Loader2 } from 'lucide-react';

const BUSINESS_OPTIONS = [
  { key: '空运', icon: '✈️', labelZh: '空运出口', labelEn: 'Air Freight' },
  { key: '海运', icon: '🚢', labelZh: '海运出口', labelEn: 'Sea Freight' },
  { key: '快递', icon: '📦', labelZh: '国际快递', labelEn: 'Express' },
  { key: '陆运', icon: '🚛', labelZh: '陆运/铁路', labelEn: 'Land/Rail' },
  { key: '双清包税', icon: '🛃', labelZh: '双清包税', labelEn: 'DDP Tax' },
  { key: '外贸采购', icon: '🌏', labelZh: '外贸采购', labelEn: 'Trading' },
  { key: '进口清关', icon: '🏗️', labelZh: '进口清关', labelEn: 'Import Clearance' },
  { key: '危险品', icon: '⚠️', labelZh: '危险品运输', labelEn: 'Dangerous Goods' },
] as const;

export default function BusinessScopeModal({ onDone }: { onDone: () => void }) {
  const user = useAuthStore((s) => s.user);
  const lang = useAuthStore((s) => s.lang);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const toggle = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleSave = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      const scope = Array.from(selected).join(',');
      await client.put('/auth/profile', { business_scope: scope, is_newbie: false });
      await useAuthStore.getState().checkAuth();
      onDone();
    } catch {}
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white rounded-t-2xl">
          <h2 className="text-xl font-black">
            {lang === 'en' ? 'Welcome to 123 Cargo Community!' : '欢迎加入 123共享外贸物流社区！'}
          </h2>
          <p className="text-sm text-white/80 mt-2">
            {lang === 'en'
              ? `${user?.display_name || ''}, please select your business scope so we can match you better.`
              : `${user?.display_name || '您好'}，请选择贵司主营的业务类型（可多选），系统将为您精准匹配商机。`}
          </p>
        </div>

        {/* Options */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-3">
            {BUSINESS_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => toggle(opt.key)}
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                  selected.has(opt.key)
                    ? 'border-blue-500 bg-blue-50 shadow-md scale-[1.02]'
                    : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50'
                }`}
              >
                <span className="text-2xl flex-shrink-0">{opt.icon}</span>
                <div>
                  <p className="text-sm font-bold text-gray-800">{lang === 'en' ? opt.labelEn : opt.labelZh}</p>
                  <p className="text-[10px] text-gray-400">{opt.key}</p>
                </div>
                {selected.has(opt.key) && (
                  <CheckCircle className="w-5 h-5 text-blue-500 ml-auto flex-shrink-0" />
                )}
              </button>
            ))}
          </div>

          {/* Selected count + save */}
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {lang === 'en'
                ? `Selected: ${selected.size} types`
                : `已选 ${selected.size} 种业务类型`}
            </p>
            <button
              onClick={handleSave}
              disabled={selected.size === 0 || saving}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-sm shadow-xl shadow-blue-500/20 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {lang === 'en' ? 'Save & Continue' : '保存并进入社区'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
