import { useState } from 'react';
import client from '../../api/client';
import { Trash2, Download, FileText, Loader2, AlertTriangle, Eye, MessageSquare, X, Send } from 'lucide-react';
import { UploadedFile } from '../../types';
import { filesApi } from '../../api/files.api';
import { formatTime } from '../../utils/time';
import { useAuthStore } from '../../store/authStore';
import { getRoleChecks } from '../../types';

interface FileRow extends UploadedFile {
  uploader_name?: string;
  uploader_company?: string;
}

interface UploadedFilesTableProps {
  files: FileRow[];
  loading: boolean;
  onDelete: (id: string) => void;
}

interface Downloader {
  id: string;
  file_id: string;
  user_id: string;
  file_name: string;
  downloader_company: string | null;
  downloader_name: string | null;
  created_at: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadedFilesTable({ files, loading, onDelete }: UploadedFilesTableProps) {
  const user = useAuthStore((s) => s.user);
  const lang = useAuthStore((s) => s.lang);
  const [deleteTarget, setDeleteTarget] = useState<FileRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloadersModal, setDownloadersModal] = useState<{ file: FileRow; downloaders: Downloader[]; loading: boolean } | null>(null);
  const [contactModal, setContactModal] = useState<{ userId: string; name: string; company: string } | null>(null);
  const [contactText, setContactText] = useState('');
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await filesApi.delete(deleteTarget.id);
      onDelete(deleteTarget.id);
    } catch { /* handled by interceptor */ }
    setIsDeleting(false);
    setDeleteTarget(null);
  };

  const handleViewDownloaders = async (file: FileRow) => {
    setDownloadersModal({ file, downloaders: [], loading: true });
    try {
      const res = await client.get<{ data: Downloader[] }>(`/files/${file.id}/downloaders`);
      setDownloadersModal({ file, downloaders: res.data.data || [], loading: false });
    } catch {
      setDownloadersModal({ file, downloaders: [], loading: false });
    }
  };

  const handleContactSend = async () => {
    if (!contactModal || !contactText.trim()) return;
    setContactSending(true);
    try {
      await client.post('/messages', {
        receiver_id: contactModal.userId,
        content: `[价格表关注] 您好，看到您下载了我们的价格表，如有任何航线或报价需求，欢迎随时沟通！\n\n${contactText.trim()}`,
      });
      setContactSent(true);
      setTimeout(() => { setContactModal(null); setContactSent(false); setContactText(''); }, 2000);
    } catch { alert(lang === 'en' ? 'Send failed' : '发送失败'); }
    setContactSending(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p>{lang === 'en' ? 'No files uploaded yet' : '暂无上传文件'}</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
              <th className="pb-3 font-medium">{lang === 'en' ? 'File Name' : '文件名'}</th>
              <th className="pb-3 font-medium">{lang === 'en' ? 'Size' : '大小'}</th>
              <th className="pb-3 font-medium">{lang === 'en' ? 'Uploader' : '上传人'}</th>
              <th className="pb-3 font-medium">{lang === 'en' ? 'Company' : '公司'}</th>
              <th className="pb-3 font-medium">{lang === 'en' ? 'Downloads' : '下载'}</th>
              <th className="pb-3 font-medium">{lang === 'en' ? 'Time' : '上传时间'}</th>
              <th className="pb-3 font-medium text-right">{lang === 'en' ? 'Actions' : '操作'}</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => {
              const rc = getRoleChecks(user?.role);
              const isOwner = user?.id === file.uploaded_by || rc.isAdmin;
              return (
              <tr key={file.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="font-medium text-gray-900 text-sm truncate max-w-[160px]" title={file.original_filename}>
                      {file.original_filename}
                    </span>
                  </div>
                </td>
                <td className="py-3 text-sm text-gray-500 whitespace-nowrap">{formatFileSize(file.file_size_bytes)}</td>
                <td className="py-3 text-sm text-gray-600">{file.uploader_name || '-'}</td>
                <td className="py-3 text-sm text-gray-600">{file.uploader_company || '-'}</td>
                <td className="py-3 text-sm whitespace-nowrap">
                  <button
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium transition-colors ${
                      isOwner
                        ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                        : 'text-gray-400'
                    }`}
                    onClick={() => isOwner && handleViewDownloaders(file)}
                    title={isOwner ? (lang === 'en' ? 'View downloaders' : '查看下载者') : ''}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{file.download_count ?? 0}</span>
                  </button>
                </td>
                <td className="py-3 text-sm text-gray-500 whitespace-nowrap">
                  {formatTime(file.created_at, 'MM-DD HH:mm')}
                </td>
                <td className="py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                      title={lang === 'en' ? 'Download' : '下载'}
                      onClick={() => filesApi.download(file.id, file.original_filename)}
                    >
                      <Download className="w-3.5 h-3.5" />
                      {lang === 'en' ? 'DL' : '下载'}
                    </button>
                    {isOwner && (
                      <button
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title={lang === 'en' ? 'Delete' : '删除'}
                        onClick={() => setDeleteTarget(file)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── 下载者列表弹窗 ── */}
      {downloadersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDownloadersModal(null)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4 border-t-4 border-blue-500 modal-mobile" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-500" />
                {lang === 'en' ? 'Downloaders' : '下载者'} — {downloadersModal.file.original_filename}
              </h3>
              <button onClick={() => setDownloadersModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>

            {downloadersModal.loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
            ) : downloadersModal.downloaders.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">{lang === 'en' ? 'No one has downloaded this file yet' : '暂无人下载此文件'}</div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {downloadersModal.downloaders.map((d) => (
                  <div key={d.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-700">{d.downloader_name || d.downloader_company || d.user_id}</p>
                      <p className="text-xs text-gray-400">{d.downloader_company || ''} · {d.created_at?.slice(0, 10)}</p>
                    </div>
                    <button
                      className="flex items-center gap-1 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg px-3 py-1.5 transition-colors flex-shrink-0 ml-2"
                      onClick={() => { setContactModal({ userId: d.user_id, name: d.downloader_name || '', company: d.downloader_company || '' }); setDownloadersModal(null); }}
                    >
                      <MessageSquare className="w-3 h-3" />
                      {lang === 'en' ? 'Contact' : '联系'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 text-xs text-gray-400 text-center">
              {lang === 'en' ? 'Only you and admin can see who downloaded your files' : '仅您和管理员可查看谁下载了您的文件'}
            </div>
          </div>
        </div>
      )}

      {/* ── 联系下载者弹窗 ── */}
      {contactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!contactSending) setContactModal(null); }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 border-t-4 border-primary-500 modal-mobile" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary-500" />
                {lang === 'en' ? 'Contact' : '联系'} {contactModal.name || contactModal.company}
              </h3>
              <button onClick={() => setContactModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            {contactSent ? (
              <div className="text-center py-6 text-green-600 text-sm font-medium">✅ {lang === 'en' ? 'Message sent' : '消息已发送'}</div>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-3">
                  {lang === 'en'
                    ? `Send a message to ${contactModal.name || contactModal.company} regarding your price table.`
                    : `给 ${contactModal.name || contactModal.company} 发送站内信，沟通价格表相关事宜。`}
                </p>
                <textarea
                  className="input-field w-full min-h-[100px] text-sm resize-none mb-3"
                  placeholder={lang === 'en' ? 'e.g. Hi, thanks for downloading our price table. Feel free to reach out for any inquiries!' : '如：您好，感谢关注我们的价格表，如有任何询价需求欢迎联系！'}
                  value={contactText}
                  onChange={e => setContactText(e.target.value)}
                  disabled={contactSending}
                  autoFocus
                />
                <button
                  className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2.5"
                  onClick={handleContactSend}
                  disabled={contactSending || !contactText.trim()}
                >
                  {contactSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {lang === 'en' ? 'Send Message' : '发送站内信'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── 删除确认弹窗 ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!isDeleting) setDeleteTarget(null); }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4 border-t-4 border-red-500" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{lang === 'en' ? 'Confirm Delete' : '确认删除'}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{lang === 'en' ? 'This cannot be undone' : '此操作不可撤销'}</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
              <div className="font-medium text-gray-900 truncate">{deleteTarget.original_filename}</div>
              <div className="text-xs text-gray-500 mt-1">
                {formatFileSize(deleteTarget.file_size_bytes)} · {lang === 'en' ? 'Uploaded' : '上传于'} {formatTime(deleteTarget.created_at, 'MM-DD HH:mm')}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                {lang === 'en' ? 'Cancel' : '取消'}
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1.5"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {lang === 'en' ? 'Delete' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
