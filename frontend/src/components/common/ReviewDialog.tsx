import { useState } from 'react';
import { Star, X, Send, Loader2 } from 'lucide-react';
import { reviewsApi } from '../../api/reviews.api';

interface Props {
  userId: string;
  userName: string;
  onClose: () => void;
  onDone: () => void;
}

export default function ReviewDialog({ userId, userName, onClose, onDone }: Props) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) { setError('请选择评分'); return; }
    setSending(true);
    setError('');
    try {
      await reviewsApi.create(userId, rating, comment.trim() || undefined);
      setSuccess(true);
      setTimeout(() => { onDone(); onClose(); }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.error || '评价失败');
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        {success ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">⭐</div>
            <p className="text-green-600 font-medium">评价成功！</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">评价 {userName}</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>}
            <div className="text-center mb-4">
              <p className="text-sm text-gray-500 mb-2">点击星星评分</p>
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    size={32}
                    className={`cursor-pointer hover:scale-110 transition-all ${i <= rating ? 'drop-shadow-sm' : ''}`}
                    fill={i <= rating ? '#f59e0b' : 'none'}
                    stroke={i <= rating ? '#f59e0b' : '#d1d5db'}
                    onClick={() => setRating(i)}
                  />
                ))}
              </div>
            </div>
            <textarea
              className="input-field w-full min-h-[80px] text-sm resize-none mb-3"
              placeholder="写一句话评价（选填）"
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
            <button className="btn-primary w-full flex items-center justify-center gap-1" onClick={handleSubmit} disabled={sending}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              提交评价
            </button>
          </>
        )}
      </div>
    </div>
  );
}
