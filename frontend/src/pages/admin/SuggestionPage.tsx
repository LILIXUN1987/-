import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { suggestionsApi, Suggestion } from '../../api/suggestions.api';
import { useAuthStore } from '../../store/authStore';
import {
  MessageSquarePlus, Send, Lightbulb, Trash2, Loader2,
  AlertTriangle, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { formatTime } from '../../utils/time';
import { getRoleChecks } from '../../types';

const LIMIT = 20;

export default function SuggestionPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const rc = getRoleChecks(user?.role);
  const isAdmin = rc.isAdmin;

  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);

  // 删除确认弹窗
  const [deleteTarget, setDeleteTarget] = useState<Suggestion | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['suggestions', page],
    queryFn: () => suggestionsApi.list({ page, limit: LIMIT }),
  });

  const suggestions = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    setSuccess('');
    try {
      await suggestionsApi.create(content.trim());
      setContent('');
      setSuccess('感谢您的建议！我们会认真考虑');
      setPage(1);
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
    } catch {
      alert('提交失败，请重试');
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await suggestionsApi.delete(deleteTarget.id);
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
    } catch { /* handled by interceptor */ }
    setIsDeleting(false);
    setDeleteTarget(null);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">群友建议</h1>
      <p className="text-gray-500 mb-6">您的每一条建议，都是社区进步的动力</p>

      <div className="max-w-2xl">
        {/* ── 建议输入区 ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            <h2 className="font-semibold text-gray-900">提交建议</h2>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm text-gray-600 space-y-1">
            <p>建议人：<span className="font-medium">{user?.display_name || '未知'}</span></p>
            <p>公司：<span className="font-medium">{user?.company_name || '未知'}</span></p>
          </div>

          <textarea
            className="input-field w-full min-h-[100px] text-sm resize-y"
            placeholder="请写下您对社区的建议、想法或遇到的问题..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={submitting}
          />

          {success && (
            <div className="text-sm text-green-600 bg-green-50 rounded-lg px-4 py-2 mt-3">{success}</div>
          )}

          <div className="flex justify-end mt-3">
            <button
              className="btn-primary flex items-center gap-2 text-sm"
              onClick={handleSubmit}
              disabled={submitting || !content.trim()}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              提交建议
            </button>
          </div>
        </div>

        {/* ── 建议列表 ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">
              已有建议
              <span className="text-gray-400 font-normal ml-1">({total})</span>
            </h2>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">暂无建议，快来提交第一条吧</div>
          ) : (
            <>
              <div className="space-y-3">
                {suggestions.map((item) => (
                  <div key={item.id} className="border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{item.content}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                          <span>建议人：{item.suggester_company} {item.suggester_name}</span>
                          <span>{formatTime(item.created_at, 'MM-DD HH:mm')}</span>
                        </div>
                      </div>
                      {isAdmin && (
                        <button
                          className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                          onClick={() => setDeleteTarget(item)}
                          title="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400">
                    共 {total} 条，第 {page}/{totalPages} 页
                  </span>
                  <div className="flex gap-1">
                    <button
                      className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <button
                      className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── 删除确认弹窗 ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!isDeleting) setDeleteTarget(null); }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4 border-t-4 border-red-500" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">确认删除</h3>
                <p className="text-xs text-gray-500 mt-0.5">此操作不可撤销</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
              <p className="text-gray-700 line-clamp-3">{deleteTarget.content}</p>
              <p className="text-xs text-gray-400 mt-1">
                {deleteTarget.suggester_company} {deleteTarget.suggester_name}
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                取消
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1.5"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
