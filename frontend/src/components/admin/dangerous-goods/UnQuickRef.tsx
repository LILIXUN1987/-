import { useState } from 'react';
import {
  ChevronDown, ChevronUp, Search, FileSpreadsheet,
} from 'lucide-react';
import { UN_REF_DATA, CLASS_BADGES } from './DgConstants';

interface UnQuickRefProps {
  form: { un_number: string };
  setForm: (f: any) => void;
}

export default function UnQuickRef({ form, setForm }: UnQuickRefProps) {
  const [open, setOpen] = useState(false);
  const [unKeyword, setUnKeyword] = useState('');

  const q = unKeyword;
  const filtered = q.trim()
    ? UN_REF_DATA.filter(r => r.un.includes(q.toUpperCase()) || r.name.includes(q) || r.cls.includes(q))
    : UN_REF_DATA;

  return (
    <div className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-medium text-gray-600">UN编号快速参考</span>
          <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
            {UN_REF_DATA.length} 种常见危险品
          </span>
        </div>
        <div className="flex items-center gap-2">
          {open && (
            <div className="relative" onClick={e => e.stopPropagation()}>
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="pl-7 pr-2 py-1 text-[10px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-300 w-28"
                placeholder="筛选..." value={unKeyword} onChange={e => setUnKeyword(e.target.value)} />
            </div>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-3 border-t border-gray-100">
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100">
                  <th className="pb-2 font-medium text-left">UN编号</th>
                  <th className="pb-2 font-medium text-left">货物名称</th>
                  <th className="pb-2 font-medium text-left">类别</th>
                  <th className="pb-2 font-medium text-left hidden sm:table-cell">包装要求</th>
                  <th className="pb-2 font-medium text-left hidden sm:table-cell">备注</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const badge = CLASS_BADGES[r.cls] || { label: r.cls, color: 'text-gray-700', bg: 'bg-gray-100' };
                  return (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => { setForm((f: any) => ({ ...f, un_number: r.un })); setOpen(false); setUnKeyword(''); }}>
                      <td className="py-2 pr-3 font-mono font-medium text-primary-600 w-20">{r.un}</td>
                      <td className="py-2 pr-3 text-gray-800">{r.name}</td>
                      <td className="py-2 pr-3">
                        <span className={`${badge.bg} ${badge.color} px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap`}>{badge.label}</span>
                      </td>
                      <td className="py-2 pr-3 text-gray-600 hidden sm:table-cell max-w-[120px] truncate">{r.pack}</td>
                      <td className="py-2 text-gray-500 hidden sm:table-cell">{r.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">点击任意行快速填入UN编号</p>
        </div>
      )}
    </div>
  );
}
