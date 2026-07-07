import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { lawyersApi } from '../../api/lawyers.api';
import { useAuthStore } from '../../store/authStore';
import client from '../../api/client';
import {
  Scale, Loader2, Send, X, Building2, MessageSquare,
  Search, ChevronLeft, ChevronRight, Eye,
} from 'lucide-react';

const LIMIT = 12;

/** 从自我介绍中提取专长标签 */
function extractTags(bio: string | null, max = 4): string[] {
  if (!bio) return [];
  // 按常见分隔符拆段，取有意义的短语（2~15 字）
  const segments = bio.split(/[，、。；;，\n\r]+/);
  const tags: string[] = [];
  for (const seg of segments) {
    let t = seg.trim();
    // 去掉「擅长」「专长」「领域」等前缀
    t = t.replace(/^[擅长专长领域：:：\s]+/, '').replace(/[：:]\s*$/, '').trim();
    if (t.length >= 2 && t.length <= 15 && !/^\d/.test(t) && !tags.includes(t)) {
      tags.push(t);
    }
    if (tags.length >= max) break;
  }
  return tags;
}

export default function LawyersPage() {
  const user = useAuthStore((s) => s.user);

  // ── 搜索 & 分页 ──
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // ── 咨询弹窗 ──
  const [consultLawyer, setConsultLawyer] = useState<{ id: string; name: string } | null>(null);
  const [consultText, setConsultText] = useState('');
  const [consultSending, setConsultSending] = useState(false);
  const [consultSent, setConsultSent] = useState(false);
  const [consultError, setConsultError] = useState('');

  // ── 名片预览 ──
  const [cardPreview, setCardPreview] = useState<string | null>(null);

  // ── 数据 ──
  const { data, isLoading } = useQuery({
    queryKey: ['lawyers', search, page],
    queryFn: () => lawyersApi.list({ search: search || undefined, page, limit: LIMIT }),
  });

  const lawyers = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleConsultSend = async () => {
    if (!consultLawyer || !consultText.trim()) return;
    setConsultSending(true);
    setConsultError('');
    try {
      await client.post(`/messages/legal-consult/${consultLawyer.id}`, { content: consultText.trim() });
      setConsultSent(true);
      setConsultText('');
      setTimeout(() => { setConsultLawyer(null); setConsultSent(false); }, 3000);
    } catch (err: any) {
      setConsultError(err?.response?.data?.error || '发送失败，请重试');
    }
    setConsultSending(false);
  };

  /** 构建头像/名片的完整 URL */
  const fileUrl = (path: string | null) =>
    path ? `/api/uploads/${path.replace(/^uploads[/\\]/, '')}` : null;

  return (
    <div>
      {/* ── 页面标题 ── */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">社区律师</h1>
          <p className="text-gray-500 text-sm mt-0.5">免费向社区律师咨询物流相关法律问题</p>
        </div>
        {total > 0 && (
          <div className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg flex-shrink-0">
            共 <span className="font-semibold text-gray-600">{total}</span> 位
          </div>
        )}
      </div>

      {/* ── 温馨提示 ── */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-5">
        <div className="flex items-start gap-3">
          <Scale className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800 space-y-1">
            <p className="font-medium">📋 说明</p>
            <p>选择您想咨询的律师，点击「咨询TA」即可发送站内信。</p>
            <p>律师将在收件箱中回复您，咨询内容同时抄送管理员便于监督。</p>
            <p className="text-xs text-amber-600">* 咨询内容仅供参考，不构成正式法律意见</p>
          </div>
        </div>
      </div>

      {/* ── 搜索栏 ── */}
      <div className="relative mb-5">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-10 pr-16 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 placeholder-gray-400 bg-white transition-all"
          placeholder="搜索律师姓名、律所名称或专长领域..."
          value={search}
          onChange={handleSearchChange}
        />
        {search && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-md transition-colors"
            onClick={() => { setSearch(''); setPage(1); }}
          >
            清空
          </button>
        )}
      </div>

      {/* ── 律师列表 ── */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-gray-400" />
        </div>
      ) : !lawyers.length ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Scale className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm font-medium">
            {search ? '未找到匹配的律师' : '暂无社区律师入驻'}
          </p>
          <p className="text-gray-300 text-xs mt-1">
            {search ? '请尝试其他关键词' : '请耐心等待'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lawyers.map((lawyer) => {
              const tags = extractTags(lawyer.bio);
              const avatarUrl = fileUrl(lawyer.avatar);
              const cardUrl = fileUrl(lawyer.card_image);

              return (
                <div
                  key={lawyer.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 hover:border-amber-300 hover:shadow-md transition-all p-5"
                >
                  <div className="flex items-start gap-4">
                    {/* ── 头像 ── */}
                    <div className="w-14 h-14 rounded-full flex-shrink-0 overflow-hidden bg-amber-100 flex items-center justify-center ring-2 ring-amber-200/50">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={lawyer.display_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement!.innerText = lawyer.display_name?.charAt(0) || '律';
                          }}
                        />
                      ) : (
                        <span className="text-xl font-bold text-amber-700 select-none">
                          {lawyer.display_name?.charAt(0) || '律'}
                        </span>
                      )}
                    </div>

                    {/* ── 信息区 ── */}
                    <div className="flex-1 min-w-0">
                      {/* 姓名 + 律所 + 咨询量 */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 text-base truncate">
                            {lawyer.display_name}
                          </h3>
                          {lawyer.company_name && (
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{lawyer.company_name}</span>
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">
                          <MessageSquare className="w-3 h-3" />
                          <span>{lawyer.consult_count} 次咨询</span>
                        </div>
                      </div>

                      {/* 自我介绍 */}
                      {lawyer.bio ? (
                        <p className="text-sm text-gray-600 leading-relaxed mb-2.5 line-clamp-3">
                          {lawyer.bio}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400 italic mb-2.5">该律师暂未填写介绍</p>
                      )}

                      {/* 专长标签 */}
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {tags.map((tag, i) => (
                            <span
                              key={i}
                              className="inline-block text-[11px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200/50"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* 操作按钮 */}
                      <div className="flex items-center gap-2">
                        <button
                          className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors border border-amber-200"
                          onClick={() => {
                            setConsultLawyer({ id: lawyer.id, name: lawyer.display_name });
                            setConsultSent(false);
                            setConsultError('');
                            setConsultText('');
                          }}
                        >
                          <Send className="w-3.5 h-3.5" />
                          咨询TA
                        </button>
                        {cardUrl && (
                          <button
                            className="flex items-center gap-1 text-xs px-3 py-2 rounded-lg font-medium text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                            onClick={() => setCardPreview(cardUrl)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            查看名片
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── 分页 ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-5 mt-5 border-t border-gray-200">
              <span className="text-xs text-gray-500">
                共 {total} 位律师，第 {page}/{totalPages} 页
              </span>
              <div className="flex gap-1">
                <button
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-3 h-3" />
                  上一页
                </button>
                <button
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  下一页
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── 咨询弹窗 ── */}
      {consultLawyer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!consultSending) { setConsultLawyer(null); setConsultSent(false); } }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 border-t-4 border-amber-500" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 text-base">⚖️ 咨询 {consultLawyer.name}</h3>
              <button
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={() => { setConsultLawyer(null); setConsultSent(false); }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {consultSent ? (
              <div className="text-center py-6 text-green-600 text-sm font-medium">
                ✅ 已向 {consultLawyer.name} 律师提交咨询，请留意收件箱回复
              </div>
            ) : (
              <>
                {consultError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-3">
                    {consultError}
                  </div>
                )}
                <p className="text-xs text-gray-500 mb-3">请详细描述您遇到的法律问题，律师将在收件箱中回复您。</p>
                <textarea
                  className="input-field w-full min-h-[120px] text-sm resize-none mb-3"
                  placeholder="请输入您需要咨询的法律问题，尽量详细描述..."
                  value={consultText}
                  onChange={(e) => setConsultText(e.target.value)}
                  disabled={consultSending}
                  autoFocus
                />
                <button
                  className="w-full flex items-center justify-center gap-2 text-sm py-2.5 rounded-lg font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition-colors"
                  onClick={handleConsultSend}
                  disabled={consultSending || !consultText.trim()}
                >
                  {consultSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  发送咨询
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── 名片预览 Modal ── */}
      {cardPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setCardPreview(null)}
        >
          <div className="relative max-w-lg max-h-[80vh] mx-4" onClick={(e) => e.stopPropagation()}>
            <img
              src={cardPreview}
              alt="律师名片"
              className="max-w-full max-h-[80vh] rounded-xl shadow-2xl"
            />
            <button
              className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
              onClick={() => setCardPreview(null)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
