import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import client from '../../api/client';
import {
  FileUp, Loader2, MapPin, Eye, MessageSquare,
  Package, Clock, AlertTriangle, ExternalLink,
  ChevronLeft, ChevronRight, Trash2,
} from 'lucide-react';
import { toast } from '../../components/common/Toast';

interface PostItem {
  id: string;
  origin_port: string;
  dest_port: string;
  region: string;
  airline_code: string;
  cargo_type: string;
  price_per_cbm: number;
  price_per_kg: number;
  currency: string;
  available_cbm: number;
  available_kg: number;
  valid_from: string;
  valid_to: string;
  status: string;
  view_count: number;
  inquiry_count: number;
  notes: string;
  contact_info: string;
  created_at: string;
  updated_at: string;
  original_text: string;
}

export default function MyPostsPage() {
  const lang = useAuthStore((s) => s.lang);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const fetch = async (p: number) => {
    setLoading(true);
    try {
      const res = await client.get('/cargo-spaces/my-publications', { params: { page: p, limit } });
      setPosts(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetch(page); }, [page]);

  const isExpired = (item: PostItem) =>
    item.status === 'expired' || (item.valid_to && item.valid_to < new Date().toISOString().split('T')[0]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <FileUp className="w-7 h-7 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{lang === 'en' ? '📦 My Published Posts' : '📦 我的发布'}</h1>
          <p className="text-sm text-gray-500">{lang === 'en' ? 'Cargo spaces and promotions you published' : '您发布的舱位和推广信息'}</p>
        </div>
        <div className="ml-auto text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg">
          {lang === 'en' ? `Total ${total}` : `共 ${total} 条`}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileUp className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">{lang === 'en' ? 'No posts yet' : '暂未发布'}</p>
          <p className="text-xs text-gray-400 mt-1">{lang === 'en' ? 'Go to Post Cargo Space to publish' : '前往「发布舱位」发布您的第一条推广'}</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {posts.map((item) => {
              const expired = isExpired(item);
              return (
                <div key={item.id} className={`bg-white rounded-xl border shadow-sm p-4 transition-all hover:shadow-md ${expired ? 'border-gray-200 opacity-60' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-lg">{item.airline_code ? '✈️' : '🚢'}</span>
                      <span className="font-bold text-gray-900 text-sm">{item.origin_port || '?'} <span className="text-gray-300 mx-1">→</span> {item.dest_port || item.region || '?'}</span>
                      {item.airline_code && <span className="text-[10px] font-mono bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{item.airline_code}</span>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {expired
                        ? <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{lang === 'en' ? 'Expired' : '已过期'}</span>
                        : <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{lang === 'en' ? 'Active' : '有效'}</span>}
                    </div>
                  </div>

                  {/* 价格/体积信息 */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 mb-2">
                    {item.price_per_cbm && <span className="font-medium text-primary-600">¥{item.price_per_cbm}/CBM</span>}
                    {item.price_per_kg && <span className="font-medium text-primary-600">¥{item.price_per_kg}/KG</span>}
                    {item.available_cbm != null && <span><Package className="w-3 h-3 inline" /> {Number(item.available_cbm).toLocaleString()} CBM</span>}
                    {item.available_kg != null && <span>⚖️ {Number(item.available_kg).toLocaleString()} KG</span>}
                    {item.cargo_type && <span className="bg-gray-100 px-1.5 py-0.5 rounded">{item.cargo_type}</span>}
                  </div>

                  {item.notes && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{item.notes}</p>}

                  {/* ── 全链路可视化管道 ── */}
                  {(() => {
                    const views = item.view_count || 0;
                    const inquiries = item.inquiry_count || 0;
                    const maxVal = Math.max(views, inquiries, 1);
                    const viewPct = Math.round((views / maxVal) * 100);
                    const inqPct = Math.round((inquiries / maxVal) * 100);

                    return (
                      <div className="border-t border-gray-100 pt-3 mt-2">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{lang === 'en' ? 'Conversion Funnel' : '转化漏斗'}</span>
                        </div>
                        {/* 管道条 */}
                        <div className="flex items-stretch gap-1 h-14">
                          {/* 已浏览 */}
                          <div className="flex-1 flex flex-col justify-center items-center bg-blue-50 rounded-xl border border-blue-100 relative overflow-hidden">
                            <div className="absolute bottom-0 left-0 right-0 bg-blue-200/50 rounded-b-xl" style={{ height: `${Math.max(viewPct, 10)}%` }} />
                            <span className="relative text-lg">👁</span>
                            <span className="relative text-[10px] font-bold text-blue-700">{views}</span>
                          </div>
                          {/* 箭头 */}
                          <div className="flex items-center text-gray-300 text-lg">→</div>
                          {/* 已询价 */}
                          <div className="flex-1 flex flex-col justify-center items-center bg-amber-50 rounded-xl border border-amber-100 relative overflow-hidden">
                            <div className="absolute bottom-0 left-0 right-0 bg-amber-200/50 rounded-b-xl" style={{ height: `${Math.max(inqPct, 8)}%` }} />
                            <span className="relative text-lg">💬</span>
                            <span className="relative text-[10px] font-bold text-amber-700">{inquiries}</span>
                          </div>
                          {/* 箭头 */}
                          <div className="flex items-center text-gray-300 text-lg">→</div>
                          {/* 转化率 */}
                          <div className="flex-1 flex flex-col justify-center items-center bg-green-50 rounded-xl border border-green-100">
                            <span className="text-lg">📈</span>
                            <span className="text-[10px] font-bold text-green-700">
                              {views > 0 ? Math.round((inquiries / views) * 100) : 0}%
                            </span>
                          </div>
                        </div>
                        {/* 底部标签 */}
                        <div className="flex items-center gap-1 mt-1.5">
                          <div className="flex-1 text-center text-[9px] text-blue-500">{lang === 'en' ? 'Viewed' : '浏览'}</div>
                          <div className="w-4" />
                          <div className="flex-1 text-center text-[9px] text-amber-500">{lang === 'en' ? 'Inquired' : '询价'}</div>
                          <div className="w-4" />
                          <div className="flex-1 text-center text-[9px] text-green-500">{lang === 'en' ? 'Conversion' : '转化率'}</div>
                        </div>
                        {/* 时效信息 */}
                        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-50 text-[10px] text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span>{item.created_at?.slice(0, 10)}</span>
                          {item.valid_to && <span className="ml-auto">{lang === 'en' ? 'Expires' : '有效期'}: {item.valid_to}</span>}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200">
              <span className="text-xs text-gray-500">{lang === 'en' ? `Page ${page}/${totalPages}` : `第 ${page}/${totalPages} 页`}</span>
              <div className="flex gap-2">
                <button className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <button className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
