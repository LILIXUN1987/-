import { Loader2, Mail, CheckCircle, Clock } from 'lucide-react';
import { formatTime } from '../../../utils/time';
import { InquiryItem } from '../../../api/messages.api';
import { InboxT, t, Lang } from '../../../i18n';

interface InquiryTabProps {
  inquiries: InquiryItem[];
  total: number;
  page: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  lang: Lang;
}

export function InquiryTab({
  inquiries,
  total,
  page,
  isLoading,
  onPageChange,
  lang,
}: InquiryTabProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <p className="text-xs text-gray-500 mb-4">
        {t(InboxT.inquiriesDesc(total), lang)}
      </p>
      {isLoading && inquiries.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : inquiries.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Mail className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>{t(InboxT.noInquiries, lang)}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {inquiries.map((item, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 p-3 rounded-lg ${
                item.has_reply
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-yellow-50 border border-yellow-200'
              }`}
            >
              {item.has_reply ? (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <Clock className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <div className="text-xs text-gray-500">
                  {formatTime(item.created_at, 'MM-DD HH:mm')}
                  {item.reply_count > 0 && (
                    <span className="ml-2 text-green-600 font-medium">
                      {t(InboxT.replies(item.reply_count), lang)}
                    </span>
                  )}
                </div>
                <div className="text-sm mt-0.5 text-gray-700">
                  {item.inquiry_keyword}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  → {item.receiver_company || item.receiver_name}
                </div>
              </div>
            </div>
          ))}

          {/* 加载更多询价 */}
          {inquiries.length < total && (
            <button
              className="w-full py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              onClick={() => onPageChange(page + 1)}
            >
              {t(InboxT.loadMoreInquiries(total - inquiries.length), lang)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
