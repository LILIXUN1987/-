import { useState } from 'react';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { Search, Loader2, Send, Package } from 'lucide-react';

export default function ExpressInquiryPanel() {
  const user = useAuthStore((s) => s.user);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchDone, setSearchDone] = useState(false);

  const handleSearch = async () => {
    const kw = keyword.trim();
    if (!kw) return;

    // 验证必须包含件数+毛重+体积
    if (!/\d+\s*件/.test(kw) || !/\d+\s*(?:KG|kg|公斤)/.test(kw) || !/\d+\s*(?:CBM|立方)/.test(kw)) {
      alert('⚠️ 请确保输入包含目的港/城市/国家+件数+毛重+体积，例如：洛杉矶 件数12件 毛重23KG 0.8CBM');
      return;
    }

    setLoading(true);
    setSearchDone(false);
    try {
      // 推送到后端（站内信给YXD + 邮件给两个指定邮箱）
      await client.post('/express-inquiry/submit', { keyword: kw });
      setSearchDone(true);
    } catch {}
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border-2 border-red-300 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Package className="w-5 h-5 text-red-600" />
        <h3 className="font-semibold text-red-800 text-sm bg-yellow-100 px-2 py-1 rounded-lg">📦 平台自营<span className="text-blue-600 font-bold">香港</span>快递出口实时询价（DHL/FEDEX/UPS）--深圳交货</h3>
      </div>

      <div className="mb-2">
        <p className="text-xs text-red-600 font-medium leading-relaxed">
          ⚠️ 查询者必须输入：<strong>目的城市/国家 + 件数 + 毛重(KG) + 体积(CBM) + 邮编（可选）</strong>，要素不限制顺序，默认始发港为香港快递账户，深圳交货！
        </p>
      </div>

      <div className="flex gap-2">
        <input
          className="w-full px-3 py-2 text-sm border-2 border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent placeholder-red-400"
          placeholder="输入目的港/城市/国家+件数+重量+体积，如 洛杉矶 件数12件 毛重23KG 0.8CBM"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className="inline-flex items-center gap-1 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg px-4 py-2 transition-colors shadow-sm disabled:opacity-50"
          onClick={handleSearch}
          disabled={loading || !keyword.trim()}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          查询
        </button>
      </div>

      {searchDone && (
        <div className="mt-3 bg-green-50 border-2 border-green-300 rounded-xl p-3 text-sm text-green-800 font-medium leading-relaxed text-center">
          ✅ 您的快递实时询价已提交成功，请随后在左侧侧边栏 <strong>收件箱</strong> 查收报价回复
        </div>
      )}
    </div>
  );
}
