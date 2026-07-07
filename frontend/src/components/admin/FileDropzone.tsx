import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { filesApi } from '../../api/files.api';
import { UploadedFile } from '../../types';

interface FileDropzoneProps {
  onUploaded: (file: UploadedFile) => void;
}

interface UploadItem {
  name: string;
  status: 'uploading' | 'success' | 'error';
  progress: number; // 0-100
  error?: string;
}

export default function FileDropzone({ onUploaded }: FileDropzoneProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<UploadItem[]>([]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setUploading(true);
      setError('');

      // 初始化上传列表
      const newItems: UploadItem[] = acceptedFiles.map((f) => ({
        name: f.name,
        status: 'uploading' as const,
        progress: 0,
      }));
      setItems(newItems);

      let hasError = false;
      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        try {
          // 更新进度到 10%
          setItems((prev) =>
            prev.map((item, idx) => (idx === i ? { ...item, progress: 10 } : item))
          );

          const result = await filesApi.upload(file);
          onUploaded(result);

          // 标记成功
          setItems((prev) =>
            prev.map((item, idx) =>
              idx === i ? { ...item, status: 'success' as const, progress: 100 } : item
            )
          );
        } catch (err: unknown) {
          const msg =
            (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
            `上传 ${file.name} 失败`;
          setItems((prev) =>
            prev.map((item, idx) =>
              idx === i
                ? { ...item, status: 'error' as const, error: msg, progress: 0 }
                : item
            )
          );
          hasError = true;
        }
      }

      if (hasError) {
        setError('部分文件上传失败，详情见下方列表');
      }

      // 3 秒后自动清空成功项
      setTimeout(() => {
        setItems((prev) => prev.filter((item) => item.status !== 'success'));
        if (!hasError) setUploading(false);
      }, 3000);

      if (!hasError) {
        setUploading(false);
      }
    },
    [onUploaded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 20 * 1024 * 1024, // 20MB
    disabled: uploading,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary-400 bg-primary-50' : 'border-yellow-300 bg-yellow-50 hover:border-yellow-400 hover:bg-yellow-100'}
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          ) : (
            <>
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <p className="text-gray-700 font-medium">
                  {isDragActive ? '释放文件以上传' : '拖曳价格表到此处或者点击上传'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  支持 Excel (.xlsx/.xls)、CSV、PDF 格式，最大 20MB
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 上传进度列表 */}
      {items.length > 0 && (
        <div className="mt-3 space-y-2">
          {items.map((item, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg px-3 py-2.5">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate">{item.name}</span>
                </div>
                <div className="flex-shrink-0">
                  {item.status === 'uploading' && (
                    <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                  )}
                  {item.status === 'success' && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  {item.status === 'error' && (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>
              {/* 进度条（仅上传中显示） */}
              {item.status === 'uploading' && (
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all duration-300"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}
              {item.status === 'error' && item.error && (
                <p className="text-xs text-red-500 mt-0.5">{item.error}</p>
              )}
              {item.status === 'success' && (
                <p className="text-xs text-green-500 mt-0.5">上传成功</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 全局错误提示 */}
      {error && !items.some((i) => i.status === 'error') && (
        <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
}
