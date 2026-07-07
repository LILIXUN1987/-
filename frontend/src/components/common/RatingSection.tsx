import { useState, useEffect } from 'react';
import { Star, Loader2, User } from 'lucide-react';
import { reviewsApi, ReviewStats } from '../../api/reviews.api';

export default function RatingSection({ userId }: { userId: string }) {
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reviewsApi.stats(userId).then(setStats).catch((err) => { console.warn('[RatingSection] failed to load stats:', err); }).finally(() => setLoading(false));
  }, [userId]);

  if (loading) return null;
  if (!stats || stats.total === 0) return null;

  return (
    <div className="border-t border-gray-100 pt-5 mt-5">
      <div className="flex items-center gap-2 mb-3">
        <Star className="w-4 h-4 text-amber-500" fill="#f59e0b" />
        <h3 className="text-sm font-medium text-gray-700">信誉评分</h3>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-amber-700">{stats.average}</div>
            <div className="text-[10px] text-amber-500 mt-0.5">平均评分</div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1 mb-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  size={14}
                  fill={i <= Math.round(stats.average) ? '#f59e0b' : '#e5e7eb'}
                  stroke={i <= Math.round(stats.average) ? '#f59e0b' : '#e5e7eb'}
                />
              ))}
              <span className="text-xs text-amber-600 ml-1">({stats.total} 人评价)</span>
            </div>
            <div className="space-y-1 mt-2 max-h-[100px] overflow-y-auto">
              {(stats.list || []).slice(0, 3).map((item, i) => (
                <div key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                  <User className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>{item.reviewer_name}</strong>
                    {item.comment && <span>：{item.comment}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
