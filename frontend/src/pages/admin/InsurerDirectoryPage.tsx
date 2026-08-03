import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { directoryApi } from '../../api/directory.api';
import { useAuthStore } from '../../store/authStore';
import client from '../../api/client';
import {
  Search, Loader2, Send, X, Building2, MessageSquare,
  Eye, Shield,
} from 'lucide-react';

export default function InsurerDirectoryPage() {
  const lang = useAuthStore((s) => s.lang);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [consultTarget, setConsultTarget] = useState<{ id: string; name: string } | null>(null);
  const [consultText, setConsultText] = useState('');
  const [consultSending, setConsultSending] = useState(false);
  const [consultSent, setConsultSent] = useState(false);
  const [consultError, setConsultError] = useState('');
  const [cardPreview, setCardPreview] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['insurers', search, page],
    queryFn: () => directoryApi.insurers({ search: search || undefined, page, limit: 12 }),
  });

  const items = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleConsultSend = async () => {
    if (!consultTarget || !consultText.trim()) return;
    setConsultSending(true);
    setConsultError('');
    try {
      await client.post(`/messages/legal-consult/${consultTarget.id}`, {
        content: `【运输保险咨询】${consultText.trim()}`,
      });
      setConsultSent(true);
      setConsultText('');
      setTimeout(() => { setConsultTarget(null); setConsultSent(false); }, 3000);
    } catch (err: any) {
      setConsultError(err?.response?.data?.error || (lang === 'en' ? 'Send failed' : '发送失败'));
    }
    setConsultSending(false);
  };

  const fileUrl = (path: string | null) =>
    path ? `/api/uploads/${path.replace(/^uploads[/\\]/, '')}` : null;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-md">
          <Shield className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {lang === 'en' ? 'Cargo Insurance' : '运输保险黄页'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {lang === 'en' ? 'Find cargo and transport insurance providers' : '查找运输保险服务商，在线咨询与投保'}
          </p>
        </div>
      </div>

      {/* Notice */}
      <div className="bg-rose-50 border border-rose-200 rounded-xl px-5 py-4 mb-5">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-rose-800 space-y-1">
            <p className="font-medium">{lang === 'en' ? '📋 Notice' : '📋 说明'}</p>
            <p>{lang === 'en' ? 'Select an insurer and click "Consult" to send an internal message.' : '选择您想咨询的保险服务商，点击「咨询TA」即可发送站内信。'}</p>
            <p className="text-xs text-rose-600">{lang === 'en' ? '* Consultation is for reference only' : '* 咨询内容仅供参考'}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="w-full pl-10 pr-16 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400 placeholder-gray-400 bg-white transition-all"
          placeholder={lang === 'en' ? 'Search company or service...' : '搜索公司名称或保险类型...'}
          value={search} onChange={handleSearch} />
        {search && (
          <button className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-md transition-colors"
            onClick={() => { setSearch(''); setPage(1); }}>
            {lang === 'en' ? 'Clear' : '清空'}
          </button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-gray-400" /></div>
      ) : !items.length ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Shield className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm font-medium">
            {search
              ? (lang === 'en' ? 'No matching providers' : '未找到匹配的服务商')
              : (lang === 'en' ? 'No insurance providers yet' : '暂无运输保险服务商')}
          </p>
          <p className="text-gray-300 text-xs mt-1">
            {search ? (lang === 'en' ? 'Try different keywords' : '请尝试其他关键词') : (lang === 'en' ? 'Please wait patiently' : '请耐心等待')}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item) => {
              const avatarUrl = fileUrl(item.avatar);
              const cardUrl = fileUrl(item.card_image);
              return (
                <div key={item.id} className="bg-white rounded-xl border border-gray-200 hover:border-rose-300 hover:shadow-md transition-all p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full flex-shrink-0 overflow-hidden bg-rose-100 flex items-center justify-center ring-2 ring-rose-200/50">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={item.display_name} className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerText = item.display_name?.charAt(0) || '保'; }} />
                      ) : (
                        <span className="text-xl font-bold text-rose-700 select-none">{item.display_name?.charAt(0) || '保'}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 text-base truncate">{item.display_name}</h3>
                          {item.company_name && (
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{item.company_name}</span>
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">
                          <MessageSquare className="w-3 h-3" />
                          <span>{item.consult_count} {lang === 'en' ? 'consults' : '次咨询'}</span>
                        </div>
                      </div>
                      {item.bio ? (
                        <p className="text-sm text-gray-600 leading-relaxed mb-3 line-clamp-3">{item.bio}</p>
                      ) : (
                        <p className="text-sm text-gray-400 italic mb-3">{lang === 'en' ? 'No introduction yet' : '暂未填写介绍'}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <button className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors border border-rose-200"
                          onClick={() => { setConsultTarget({ id: item.id, name: item.display_name }); setConsultSent(false); setConsultError(''); setConsultText(''); }}>
                          <Send className="w-3.5 h-3.5" />{lang === 'en' ? 'Consult' : '咨询TA'}
                        </button>
                        {cardUrl && (
                          <button className="flex items-center gap-1 text-xs px-3 py-2 rounded-lg font-medium text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                            onClick={() => setCardPreview(cardUrl)}>
                            <Eye className="w-3.5 h-3.5" />{lang === 'en' ? 'View Card' : '查看名片'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-5 mt-5 border-t border-gray-200">
              <span className="text-xs text-gray-500">{lang === 'en' ? `Total ${total}, Page ${page}/${totalPages}` : `共 ${total} 家，第 ${page}/${totalPages} 页`}</span>
              <div className="flex gap-1">
                <button className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                  {lang === 'en' ? 'Prev' : '上一页'}
                </button>
                <button className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  {lang === 'en' ? 'Next' : '下一页'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Consult Modal */}
      {consultTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!consultSending) { setConsultTarget(null); setConsultSent(false); } }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 border-t-4 border-rose-500" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 text-base">🛡️ 咨询 {consultTarget.name}</h3>
              <button className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100" onClick={() => { setConsultTarget(null); setConsultSent(false); }}><X className="w-4 h-4" /></button>
            </div>
            {consultSent ? (
              <div className="text-center py-6 text-green-600 text-sm font-medium">✅ {lang === 'en' ? 'Consultation sent' : '已提交咨询'}</div>
            ) : (
              <>
                {consultError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-3">{consultError}</div>}
                <p className="text-xs text-gray-500 mb-3">{lang === 'en' ? 'Describe your insurance needs' : '请描述您的保险需求'}</p>
                <textarea className="input-field w-full min-h-[120px] text-sm resize-none mb-3"
                  placeholder={lang === 'en' ? 'Describe your insurance needs...' : '请输入您的运输保险需求...'}
                  value={consultText} onChange={e => setConsultText(e.target.value)} disabled={consultSending} autoFocus />
                <button className="w-full flex items-center justify-center gap-2 text-sm py-2.5 rounded-lg font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-colors"
                  onClick={handleConsultSend} disabled={consultSending || !consultText.trim()}>
                  {consultSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {lang === 'en' ? 'Send' : '发送咨询'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Card Preview */}
      {cardPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setCardPreview(null)}>
          <div className="relative max-w-lg max-h-[80vh] mx-4" onClick={e => e.stopPropagation()}>
            <img src={cardPreview} alt="" className="max-w-full max-h-[80vh] rounded-xl shadow-2xl" />
            <button className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors" onClick={() => setCardPreview(null)}><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
