import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import FileDropzone from '../../components/admin/FileDropzone';
import UploadedFilesTable from '../../components/admin/UploadedFilesTable';
import { filesApi } from '../../api/files.api';
import { UploadedFile } from '../../types';
import { Upload, FileText, Languages } from 'lucide-react';
import { getRoleChecks } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { FileT, t } from '../../i18n';

export default function PriceTablePage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const user = useAuthStore((s) => s.user);
  const lang = useAuthStore((s) => s.lang);
  const setLang = useAuthStore((s) => s.setLang);
  const rc = getRoleChecks(user?.role);
  const isTrader = rc.isTrader;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['files', page, search],
    queryFn: () => filesApi.list(page, 20, search || undefined),
  });

  const handleUploaded = useCallback((_file: UploadedFile) => { refetch(); }, [refetch]);
  const handleDelete = useCallback((_id: string) => { refetch(); }, [refetch]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-900">{t(FileT.priceTitle, lang)}</h1>
        <button
          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
          onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
          title={lang === 'zh' ? 'English' : '中文'}
        >
          <Languages className="w-4 h-4" />
        </button>
      </div>
      <p className="text-gray-500 mb-6">{t(FileT.priceSubtitle, lang)}</p>

      {/* 上传区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Upload className="w-5 h-5 text-primary-600" />
          <h3 className="font-semibold text-gray-900">{t(FileT.priceUploadTitle, lang)}</h3>
        </div>
        <FileDropzone onUploaded={handleUploaded} />
      </div>

      {/* 已上传文件列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-500" />
            <h2 className="font-semibold text-gray-900 text-sm">
              {isTrader ? t(FileT.priceTitle, lang) : t(FileT.priceTableTitle, lang)}
              {data && <span className="text-gray-400 font-normal ml-1">({data.total})</span>}
            </h2>
          </div>
          <button className="text-xs text-primary-600 hover:underline" onClick={() => refetch()}>
            {t(FileT.priceRefresh, lang)}
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <input
            className="w-full pl-9 pr-3 py-2 text-sm border-2 border-primary-300 bg-primary-50/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 placeholder-gray-400"
            placeholder={t(FileT.priceSearchPlaceholder, lang)}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          {search && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs px-1"
              onClick={() => { setSearch(''); setPage(1); }}
            >
              {t(FileT.priceClear, lang)}
            </button>
          )}
        </div>

        <UploadedFilesTable
          files={data?.data || []}
          loading={isLoading}
          onDelete={handleDelete}
        />

        {data && data.total > 20 && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-200 mt-3">
            <span className="text-xs text-gray-500">
              {t(FileT.pricePage(page, Math.ceil(data.total / 20)), lang)}
            </span>
            <div className="flex gap-1">
              <button
                className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                {t(FileT.pricePrev, lang)}
              </button>
              <button
                className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                disabled={page >= Math.ceil(data.total / 20)}
                onClick={() => setPage((p) => p + 1)}
              >
                {t(FileT.priceNext, lang)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
