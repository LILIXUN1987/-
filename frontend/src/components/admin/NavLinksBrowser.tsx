import { useState, useEffect } from 'react';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import {
  Search, Loader2, ExternalLink, Plus, X, ThumbsUp, Send, Bookmark,
  CheckCircle, XCircle, Clock,
} from 'lucide-react';
import { getRoleChecks } from '../../types';

interface NavLink {
  id: string;
  title: string;
  url: string;
  category: string;
  description: string | null;
  vote_count: number;
  created_at: string;
}

export default function NavLinksBrowser() {
  const lang = useAuthStore((s) => s.lang);
  const user = useAuthStore((s) => s.user);
  const rc = getRoleChecks(user?.role);
  const isAdmin = rc.isAdmin;
  const [links, setLinks] = useState<NavLink[]>([]);
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [showSubmit, setShowSubmit] = useState(false);
  const [pendingLinks, setPendingLinks] = useState<any[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [showPending, setShowPending] = useState(false);

  const fetchData = async (cat?: string, kw?: string) => {
    setLoading(true);
    try {
      const params: any = {};
      if (cat) params.category = cat;
      if (kw) params.search = kw;
      const [linksRes, catsRes] = await Promise.all([
        client.get<{ data: NavLink[]; categories: any[]; total: number }>('/nav', { params }),
        client.get<{ data: { category: string; count: number }[] }>('/nav/categories'),
      ]);
      setLinks(linksRes.data.data || []);
      setCategories(catsRes.data.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(activeCategory || undefined, search || undefined); }, [activeCategory]);

  const fetchPending = async () => {
    if (!isAdmin) return;
    setPendingLoading(true);
    try {
      const res = await client.get<{ data: any[]; total: number }>('/nav/pending');
      setPendingLinks(res.data.data || []);
    } catch {}
    setPendingLoading(false);
  };

  useEffect(() => { if (isAdmin) fetchPending(); }, [isAdmin]);

  const handleReview = async (id: string, action: 'approved' | 'rejected') => {
    try {
      await client.post(`/nav/${id}/review`, { action });
      fetchPending();
      fetchData();
    } catch { alert(lang === 'en' ? 'Operation failed' : '操作失败'); }
  };

  const handleSearch = () => { fetchData(activeCategory || undefined, search || undefined); };

  const handleVote = async (id: string) => {
    try {
      await client.post(`/nav/${id}/vote`);
      setLinks(prev => prev.map(l => l.id === id ? { ...l, vote_count: l.vote_count + 1 } : l));
    } catch { alert(lang === 'en' ? 'Login required' : '请先登录'); }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 max-w-4xl">
      {/* 管理员审核面板 */}
      {isAdmin && (
        <div className="mb-4">
          <button
            className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg px-3 py-2 transition-colors w-full justify-center border border-amber-200"
            onClick={() => { setShowPending(!showPending); if (!showPending && pendingLinks.length === 0) fetchPending(); }}
          >
            <Clock className="w-3.5 h-3.5" />
            {showPending ? (lang === 'en' ? 'Hide pending' : '收起待审') : (lang === 'en' ? `Review pending links (${pendingLinks.length})` : `审核待处理链接（${pendingLinks.length}条）`)}
          </button>
          {showPending && (
            <div className="mt-2 space-y-2 bg-amber-50/50 border border-amber-200 rounded-xl p-3">
              {pendingLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>
              ) : pendingLinks.length === 0 ? (
                <div className="text-center py-4 text-xs text-gray-400">{lang === 'en' ? 'No pending links' : '暂无待审核链接'}</div>
              ) : pendingLinks.map((pl: any) => (
                <div key={pl.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-100">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-800 truncate">{pl.title}</p>
                    <p className="text-[10px] text-gray-400 truncate">{pl.url} · {pl.submitter_name || pl.submitter_company || '匿名'}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button className="p-1 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title={lang === 'en' ? 'Approve' : '通过'} onClick={() => handleReview(pl.id, 'approved')}>
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title={lang === 'en' ? 'Reject' : '驳回'} onClick={() => handleReview(pl.id, 'rejected')}>
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 标题+提交按钮 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-primary-600" />
          <h2 className="font-bold text-gray-900">
            {lang === 'en' ? '📚 Navigation Library' : '📚 导航库'}
          </h2>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{links.length}</span>
        </div>
        <button
          className={`flex items-center gap-1.5 text-sm font-bold rounded-xl px-4 py-2.5 transition-all shadow-md ${
            showSubmit
              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-orange-200/50 hover:shadow-lg hover:scale-105'
          }`}
          onClick={() => setShowSubmit(!showSubmit)}
        >
          <Plus className={`w-4 h-4 ${showSubmit ? '' : 'animate-pulse'}`} />
          {showSubmit ? (lang === 'en' ? 'Cancel' : '收起') : (lang === 'en' ? '➕ Submit Link & Earn' : '➕ 提交新链接拿奖励')}
        </button>
      </div>

      {/* ⭐ 奖励提醒横幅 */}
      <div className="bg-gradient-to-r from-orange-400 via-amber-500 to-yellow-500 rounded-xl p-4 mb-4 shadow-lg shadow-orange-200/50 border-2 border-orange-300">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/30 backdrop-blur flex items-center justify-center flex-shrink-0 shadow-inner">
            <span className="text-2xl">🎁</span>
          </div>
          <div className="text-white">
            <div className="font-bold text-base tracking-wide">
              {lang === 'en' ? '✨ +3 TRIAL DAYS per link submitted!' : '✨ 提交一条新链接 = 试用期 +3 天！'}
            </div>
            <div className="text-sm text-white/90 mt-0.5 font-medium">
              {lang === 'en' ? 'Submit useful links, grow the library, earn rewards!' : '提交有用的网址到导航库，和群友共享，审核通过即奖励。'}
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1 ml-auto bg-white/20 backdrop-blur rounded-lg px-3 py-1.5 border border-white/30">
            <span className="text-lg">🔥</span>
            <span className="text-white font-bold text-sm">{lang === 'en' ? 'UNLIMITED' : '上不封顶'}</span>
          </div>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
            placeholder={lang === 'en' ? 'Search links...' : '搜索导航...'} value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }} />
        </div>
        <button className="btn-outline text-xs px-3 py-2" onClick={handleSearch}><Search className="w-3.5 h-3.5" /></button>
      </div>

      {/* 分类筛选 */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${!activeCategory ? 'bg-primary-50 border-primary-300 text-primary-700 font-medium' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`} onClick={() => setActiveCategory('')}>
            {lang === 'en' ? 'All' : '全部'}
          </button>
          {categories.map(c => (
            <button key={c.category} className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${activeCategory === c.category ? 'bg-primary-50 border-primary-300 text-primary-700 font-medium' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`} onClick={() => setActiveCategory(c.category)}>
              {c.category} ({c.count})
            </button>
          ))}
        </div>
      )}

      {/* 提交表单 */}
      {showSubmit && <SubmitForm onDone={() => { setShowSubmit(false); fetchData(activeCategory || undefined, search || undefined); }} />}

      {/* 列表 */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : links.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">{lang === 'en' ? 'No links found. Be the first to submit one!' : '暂无导航链接，快来提交第一条吧！'}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {links.map(link => (
            <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
              className="group flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-100 hover:border-primary-200 hover:bg-primary-50/30 transition-all">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-gray-800 truncate group-hover:text-primary-700 transition-colors">{link.title}</span>
                  <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-primary-500 flex-shrink-0" />
                </div>
                {link.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{link.description}</p>}
                <span className="text-[10px] text-gray-300 mt-0.5 inline-block bg-gray-50 px-1.5 py-0.5 rounded">{link.category}</span>
              </div>
              <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                <button onClick={e => { e.preventDefault(); e.stopPropagation(); handleVote(link.id); }}
                  className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg hover:bg-primary-100 transition-colors">
                  <ThumbsUp className="w-3.5 h-3.5 text-gray-400 hover:text-primary-600" />
                  <span className="text-[10px] font-mono text-gray-500">{link.vote_count}</span>
                </button>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function SubmitForm({ onDone }: { onDone: () => void }) {
  const lang = useAuthStore((s) => s.lang);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const commonCats = lang === 'en'
    ? ['Ocean Freight', 'Air Freight', 'Customs', 'Courier Tracking', 'Tools', 'Industry News']
    : ['海运', '空运', '海关', '快递追踪', '物流工具', '行业资讯'];

  const handleSubmit = async () => {
    if (!title.trim() || !url.trim() || !category.trim()) {
      alert(lang === 'en' ? 'Please fill in title, URL and category' : '请填写标题、网址和分类');
      return;
    }
    setSubmitting(true);
    try {
      await client.post('/nav', { title: title.trim(), url: url.trim(), category: category.trim(), description: description.trim() || undefined });
      setDone(true);
      setTimeout(() => { onDone(); }, 2000);
    } catch (err: any) { alert(err?.response?.data?.error || (lang === 'en' ? 'Submit failed' : '提交失败')); }
    setSubmitting(false);
  };

  if (done) {
    return <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center text-sm text-amber-700 font-medium mb-4">⏳ {lang === 'en' ? 'Link submitted! Pending admin review. Reward upon approval.' : '链接已提交，等待管理员审核。审核通过后发放 +3 天奖励！'}</div>;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 space-y-3">
      <p className="text-xs font-medium text-blue-700">{lang === 'en' ? '📝 Submit a useful link to share with the community' : '📝 提交一个有用的网址，分享给社区群友'}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-0.5 block">{lang === 'en' ? 'Title *' : '标题 *'}</label>
          <input className="input-field w-full text-sm" placeholder={lang === 'en' ? 'e.g. MAERSK Tracking' : '如：马士基货物追踪'} value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-0.5 block">{lang === 'en' ? 'URL *' : '网址 *'}</label>
          <input className="input-field w-full text-sm" placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-0.5 block">{lang === 'en' ? 'Category *' : '分类 *'}</label>
          <div className="flex flex-wrap gap-1">
            {commonCats.map(c => (
              <button key={c} className={`text-xs px-2 py-1 rounded-lg border transition-colors ${category === c ? 'bg-primary-100 border-primary-300 text-primary-700 font-medium' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`} onClick={() => setCategory(c)}>{c}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-0.5 block">{lang === 'en' ? 'Description (optional)' : '描述（选填）'}</label>
          <input className="input-field w-full text-sm" placeholder={lang === 'en' ? 'Brief description' : '简要说明'} value={description} onChange={e => setDescription(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button className="btn-outline text-sm" onClick={onDone}>{lang === 'en' ? 'Cancel' : '取消'}</button>
        <button className="btn-primary text-sm flex items-center gap-1" onClick={handleSubmit} disabled={submitting}>
          {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          {lang === 'en' ? 'Submit' : '提交'}
        </button>
      </div>
    </div>
  );
}
