import { useState, useEffect, useRef } from 'react';
import client from '../../../api/client';
import { useLang, t, getCountryEmoji, type Lang } from './shared';
import {
  Search, Loader2, Send, MessageSquare, X, Package, Globe,
} from 'lucide-react';

const T = {
  inquiryTitle: { zh: '填写您的DDP到门需求', en: 'Fill in your DDP requirements' },
  inquiryDesc: { zh: '提交后系统自动推送给目的国已入驻的海外代理，通过站内信沟通报价', en: 'Your inquiry will be sent to all registered agents in the destination country via internal messages' },
  continueNew: { zh: '继续发布新需求', en: 'Submit another inquiry' },
  directionExport: { zh: '🇨🇳 中国出口 → 全球', en: '🇨🇳 Export from China' },
  directionImport: { zh: '🌍 全球进口 → 中国', en: '🌍 Import to China' },
  inquiryDescExport: { zh: '从中国出口到目的国，推送给当地海外代理报价', en: 'Export from China. Sent to agents in destination country.' },
  inquiryDescImport: { zh: '从海外进口到中国，推送给社区中国货代报价', en: 'Import to China. Sent to Chinese forwarders in the community.' },
  trustTip: { zh: '💡 首次合作建议：建议从小单开始（如1CBM试发），降低双方风险。信任积累后再逐步扩大合作量。', en: '💡 First-time tip: Start with a small trial shipment (e.g. 1 CBM) to build trust. Scale up gradually.' },
  destCountry: { zh: '目的国家', en: 'Destination Country' },
  destPort: { zh: '目的港/城市', en: 'Destination Port/City' },
  originCountry: { zh: '来源国家', en: 'Origin Country' },
  chinaDestPort: { zh: '中国境内目的港/城市', en: 'Dest. Port/City in China' },
  portPlaceholder: { zh: '如：纽约、汉堡、内罗毕', en: 'e.g. New York, Hamburg, Nairobi' },
  goodsDesc: { zh: '货物描述', en: 'Goods Description' },
  goodsPlaceholder: { zh: '如：电子产品、纺织品、机械设备...', en: 'e.g. Electronics, Textiles, Machinery...' },
  hsCode: { zh: 'HS CODE', en: 'HS CODE' },
  hsPlaceholder: { zh: '如：8471.30、6204.62 等', en: 'e.g. 8471.30, 6204.62' },
  notesLabel: { zh: '件数/重量/尺寸', en: 'Pieces/Weight/Dimensions' },
  notesHint: { zh: '必须提供详细的件数、毛重和每件尺寸', en: 'Detailed pieces, gross weight & dimensions required' },
  notesPlaceholder: { zh: '例如：1件 毛重160KG 120*100*80/1\n2件 毛重320KG 120*100*80/1 + 100*80*60/1', en: 'e.g. 1pc GW160KG 120*100*80/1\n2pcs GW320KG 120*100*80/1 + 100*80*60/1' },
  deliveryAddr: { zh: '派送地址', en: 'Delivery Address' },
  addrPlaceholder: { zh: '详细收货地址、门牌号、邮编、收件人及电话等', en: 'Full address, zip code, recipient name & phone...' },
  uploadLabel: { zh: '上传箱单/发票', en: 'Upload Packing List/Invoice' },
  uploadHint: { zh: '选填，支持图片/PDF/Word/Excel', en: 'Optional, supports images/PDF/Word/Excel' },
  uploadClick: { zh: '点击选择文件或将文件拖拽到这里', en: 'Click to select files or drag & drop here' },
  uploadLimit: { zh: '支持 JPG/PNG/PDF/Word/Excel，每文件最大20MB', en: 'Supports JPG/PNG/PDF/Word/Excel, max 20MB each' },
  submitBtn: { zh: '提交需求', en: 'Submit' },
  submitting: { zh: '提交中...', en: 'Submitting...' },
  msgSent: { zh: '✅ 消息已发送，请留意收件箱回复', en: '✅ Message sent, please check your inbox' },
  reqRequired: { zh: '请填写目的国家', en: 'Please select destination country' },
  reqAddress: { zh: '请填写派送地址', en: 'Please fill in delivery address' },
  reqNotes: { zh: '请填写详细的件数/重量/尺寸信息', en: 'Please provide detailed pieces/weight/dimensions' },
  uploadFailed: { zh: '文件上传失败', en: 'File upload failed' },
  submitFailed: { zh: '提交失败，请重试', en: 'Submission failed, please retry' },
};

function stripCJK(s: string): string {
  return s.replace(/[一-鿿㐀-䶿豈-﫿]/g, '');
}

export default function InquiryTab({ isAgent }: { isAgent?: boolean }) {
  const lang = useLang();
  const [direction, setDirection] = useState<'export' | 'import'>(isAgent ? 'import' : 'export');
  const [country, setCountry] = useState('');
  const [port, setPort] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countryList, setCountryList] = useState<string[]>([]);
  const countryRef = useRef<HTMLDivElement>(null);
  const [goodsDesc, setGoodsDesc] = useState('');
  const [hsCode, setHsCode] = useState('');
  const [notes, setNotes] = useState('');
  const [address, setAddress] = useState('');
  const [files, setFiles] = useState<{ file: File; uploading: boolean; path?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ message: string; notified: number } | null>(null);

  const hotCountries = lang === 'zh'
    ? ['中国', '美国', '德国', '英国', '法国', '荷兰', '日本', '韩国', '越南', '泰国', '印度', '阿联酋', '沙特', '巴西', '尼日利亚', '肯尼亚', '澳大利亚']
    : ['China', 'USA', 'Germany', 'UK', 'France', 'Netherlands', 'Japan', 'Korea', 'Vietnam', 'Thailand', 'India', 'UAE', 'Saudi', 'Brazil', 'Nigeria', 'Kenya', 'Australia'];

  const handleUploadFile = async (file: File) => {
    const idx = files.findIndex(f => f.file === file);
    if (idx >= 0) return;
    const entry = { file, uploading: true };
    setFiles(prev => [...prev, entry]);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await client.post<{ filePath: string }>('/ddp/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFiles(prev => prev.map(f => f.file === file ? { ...f, uploading: false, path: res.data.filePath } : f));
    } catch {
      alert(t(T.uploadFailed, lang));
      setFiles(prev => prev.filter(f => f.file !== file));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    for (const f of selected) {
      if (files.some(ex => ex.file.name === f.name && ex.file.size === f.size)) continue;
      handleUploadFile(f);
    }
    e.target.value = '';
  };

  const removeFile = (file: File) => setFiles(prev => prev.filter(f => f.file !== file));

  const handleSubmit = async () => {
    if (!country.trim()) { alert(t(T.reqRequired, lang)); return; }
    if (!address.trim()) { alert(t(T.reqAddress, lang)); return; }
    if (!notes.trim()) { alert(t(T.reqNotes, lang)); return; }
    setLoading(true);
    setResult(null);
    try {
      const uploadedPaths = files.filter(f => f.path).map(f => f.path!);
      const res = await client.post('/ddp/inquiry', {
        direction: direction, country: country.trim(), port: port.trim() || undefined,
        goods_desc: goodsDesc.trim() || undefined, hs_code: hsCode.trim() || undefined,
        notes: notes.trim(), file_paths: uploadedPaths.length > 0 ? uploadedPaths : undefined, address: address.trim(),
      });
      setResult(res.data);
    } catch { alert(t(T.submitFailed, lang)); }
    setLoading(false);
  };

  useEffect(() => {
    client.get('/ddp/destinations').then(r => setCountryList(r.data.countries || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) setShowCountryDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const resetForm = () => {
    setResult(null); setCountry(''); setPort(''); setGoodsDesc(''); setHsCode('');
    setNotes(''); setAddress(''); setFiles([]);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-sm">
          <Package className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-base font-bold text-gray-800">{t(T.inquiryTitle, lang)}</h3>
      </div>
      {!isAgent && (
        <div className="bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 rounded-xl p-3 mb-4 flex items-start gap-2.5 shadow-sm">
          <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5"><span className="text-sm">⚠️</span></div>
          <div>
            <p className="text-sm font-bold text-red-700">{lang === 'en' ? '⚠️ English Only' : '⚠️ 请使用英文填写'}</p>
            <p className="text-xs text-red-600 mt-0.5">{lang === 'en' ? 'Overseas agents cannot read Chinese. All fields must be filled in English.' : '海外代理看不懂中文，以下所有字段请使用英文填写，禁止输入中文。'}</p>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 mb-5 flex items-start gap-2.5 shadow-sm">
        <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5"><span className="text-sm">📮</span></div>
        <div>
          <p className="text-sm font-semibold text-amber-800">{lang === 'en' ? 'How it works' : '提交后如何收到回复？'}</p>
          <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">{direction === 'export' ? t(T.inquiryDescExport, lang) : t(T.inquiryDescImport, lang)}</p>
          <p className="text-xs text-amber-500 mt-1.5 leading-relaxed bg-amber-50 rounded-lg p-2 border border-amber-200">{t(T.trustTip, lang)}</p>
        </div>
      </div>

      {!isAgent && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <button onClick={() => setDirection('export')}
            className={`group relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-300 ${
              direction === 'export'
                ? 'bg-gradient-to-br from-red-500 via-rose-600 to-pink-700 shadow-xl shadow-red-500/25 scale-[1.02] ring-2 ring-red-400'
                : 'bg-white border-2 border-gray-200 hover:border-red-300 hover:shadow-lg'
            }`}>
            <div className={`text-4xl mb-2`}>🇨🇳</div>
            <div className={`text-lg font-black ${direction === 'export' ? 'text-white' : 'text-gray-800'}`}>
              {lang === 'en' ? 'Export from China' : '中国出口 → 全球'}
            </div>
            <div className={`text-xs mt-1 ${direction === 'export' ? 'text-white/70' : 'text-gray-400'}`}>
              {lang === 'en' ? 'Ship from China to worldwide' : '从中国发货到全球各地'}
            </div>
            {direction === 'export' && (
              <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/25 flex items-center justify-center">
                <span className="text-white text-xs font-bold">✓</span>
              </div>
            )}
          </button>
          <button onClick={() => setDirection('import')}
            className={`group relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-300 ${
              direction === 'import'
                ? 'bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 shadow-xl shadow-blue-500/25 scale-[1.02] ring-2 ring-blue-400'
                : 'bg-white border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg'
            }`}>
            <div className={`text-4xl mb-2`}>🌍</div>
            <div className={`text-lg font-black ${direction === 'import' ? 'text-white' : 'text-gray-800'}`}>
              {lang === 'en' ? 'Import to China' : '全球进口 → 中国'}
            </div>
            <div className={`text-xs mt-1 ${direction === 'import' ? 'text-white/70' : 'text-gray-400'}`}>
              {lang === 'en' ? 'Import from worldwide to China' : '从全球各地进口到中国'}
            </div>
            {direction === 'import' && (
              <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/25 flex items-center justify-center">
                <span className="text-white text-xs font-bold">✓</span>
              </div>
            )}
          </button>
        </div>
      )}

      <div className="mb-4">
        <label className="text-xs font-medium text-gray-500 mb-1.5 block">
            {direction === 'import'
              ? (isAgent ? (lang === 'en' ? '🌍 Export Country (where goods come from)' : '🌍 出口国家（货物从哪发出）') : (lang === 'en' ? '🌍 Origin Country (where goods come from)' : '🌍 来源国家（货物从哪来）'))
              : (lang === 'en' ? '🇨🇳 Destination Country (where goods go to)' : '🇨🇳 目的国家（货物发往哪）')}
          </label>
        <div className="flex flex-wrap gap-1.5">
          {hotCountries.map(c => (
            <button key={c} className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${country === c ? 'bg-primary-50 border-primary-300 text-primary-700 font-medium' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
              onClick={() => { setCountry(c); setCountrySearch(''); setShowCountryDropdown(false); setResult(null); }}>
              {getCountryEmoji(c)} {c}
            </button>
          ))}
        </div>
      </div>

      {result ? (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-5 text-center">
          <div className="text-3xl mb-2">✅</div><p className="text-green-800 font-medium text-sm">{result.message}</p>
          <button className="mt-4 text-xs text-primary-600 hover:text-primary-700 underline" onClick={resetForm}>{t(T.continueNew, lang)}</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative" ref={countryRef}>
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              {direction === 'import'
                ? (isAgent ? (lang === 'en' ? '🌍 Export Country' : '🌍 出口国家') : (lang === 'en' ? '🌍 Origin Country' : '🌍 来源国家'))
                : (lang === 'en' ? '🇨🇳 Destination Country' : '🇨🇳 目的国家')}
              <span className="text-red-500">*</span>
            </label>
            <input className="input-field w-full text-sm" placeholder={lang === 'zh' ? '搜索国家...' : 'Search country...'}
              value={showCountryDropdown ? countrySearch : country}
              onChange={e => { setCountrySearch(e.target.value); setShowCountryDropdown(true); setCountry(''); setResult(null); }}
              onFocus={() => { setCountrySearch(country); setShowCountryDropdown(true); }} />
            {showCountryDropdown && (
              <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {countryList.filter(c => !countrySearch || c.toLowerCase().includes(countrySearch.toLowerCase())).slice(0, 30).map(c => (
                  <button key={c} className={`w-full text-left px-3 py-1.5 text-sm hover:bg-primary-50 hover:text-primary-700 transition-colors ${country === c ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'}`}
                    onClick={() => { setCountry(c); setCountrySearch(''); setShowCountryDropdown(false); setResult(null); }}>{c}</button>
                ))}
                {countryList.filter(c => !countrySearch || c.toLowerCase().includes(countrySearch.toLowerCase())).length === 0 && (
                  <div className="px-3 py-2 text-xs text-gray-400">{lang === 'en' ? 'No country found' : '未找到匹配国家'}</div>
                )}
              </div>
            )}
          </div>
          <div><label className="text-xs font-medium text-gray-500 mb-1 block">
            {direction === 'import'
              ? (lang === 'en' ? '🇨🇳 Destination Port/City in China' : '🇨🇳 中国境内目的港/城市')
              : (lang === 'en' ? '🌍 Destination Port/City' : '🌍 目的港/城市')}
          </label>
            <input className="input-field w-full text-sm" placeholder={direction === 'import' ? (lang === 'en' ? 'e.g. Shanghai, Shenzhen, Guangzhou' : '如：上海、深圳、广州') : t(T.portPlaceholder, lang)} value={port} onChange={e => setPort(stripCJK(e.target.value))} /></div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t(T.goodsDesc, lang)}</label>
            <input className="input-field w-full text-sm" placeholder={t(T.goodsPlaceholder, lang)} value={goodsDesc} onChange={e => setGoodsDesc(stripCJK(e.target.value))} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t(T.hsCode, lang)}</label>
            <input className="input-field w-full text-sm" placeholder={t(T.hsPlaceholder, lang)} value={hsCode} onChange={e => setHsCode(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t(T.notesLabel, lang)} <span className="text-red-500">*</span><span className="text-gray-400 font-normal ml-1">（{t(T.notesHint, lang)}）</span></label>
            <textarea className="input-field w-full text-sm min-h-[80px]" placeholder={t(T.notesPlaceholder, lang)} value={notes} onChange={e => setNotes(stripCJK(e.target.value))} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t(T.deliveryAddr, lang)} <span className="text-red-500">*</span></label>
            <textarea className="input-field w-full text-sm min-h-[60px]" placeholder={t(T.addrPlaceholder, lang)} value={address} onChange={e => setAddress(stripCJK(e.target.value))} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t(T.uploadLabel, lang)}<span className="text-gray-400 font-normal ml-1">（{t(T.uploadHint, lang)}）</span></label>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-primary-300 transition-colors cursor-pointer"
              onClick={() => document.getElementById('ddp-file-input')?.click()}>
              <input id="ddp-file-input" type="file" multiple className="hidden" accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xlsx,.xls" onChange={handleFileSelect} />
              <p className="text-xs text-gray-400">{t(T.uploadClick, lang)}</p>
              <p className="text-[10px] text-gray-300 mt-1">{t(T.uploadLimit, lang)}</p>
            </div>
            {files.length > 0 && (
              <div className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {f.uploading ? <Loader2 className="w-3 h-3 animate-spin text-gray-400 flex-shrink-0" /> : <span className="text-green-500 flex-shrink-0">✅</span>}
                      <span className="truncate text-gray-700">{f.file.name}</span>
                      <span className="text-gray-400 flex-shrink-0">({(f.file.size / 1024).toFixed(0)}KB)</span>
                    </div>
                    <button className="text-gray-400 hover:text-red-500 ml-2 flex-shrink-0" onClick={() => removeFile(f.file)}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button className="btn-primary inline-flex items-center gap-2 text-sm py-2.5 px-6"
              onClick={handleSubmit} disabled={loading || !country.trim() || !address.trim() || !notes.trim()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {loading ? t(T.submitting, lang) : t(T.submitBtn, lang)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
