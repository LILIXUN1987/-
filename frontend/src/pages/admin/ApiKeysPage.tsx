import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { getRoleChecks } from '../../types';
import { Key, Plus, Copy, Trash2, Loader2, CheckCircle, AlertCircle, Clock, ExternalLink } from 'lucide-react';
import { toast } from '../../components/common/Toast';

interface ApiKey {
  id: string;
  key_prefix: string;
  name: string;
  status: string;
  last_used_at: string | null;
  created_at: string;
}

export default function ApiKeysPage() {
  const lang = useAuthStore((s) => s.lang);
  const queryClient = useQueryClient();
  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  const [keyName, setKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showDocs, setShowDocs] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => client.get('/api-keys').then(r => r.data),
  });

  const keys: ApiKey[] = data?.data || [];

  const handleCreate = async () => {
    if (!keyName.trim()) { toast.error(lang === 'en' ? 'Please enter a key name' : '请输入密钥名称'); return; }
    setCreating(true);
    try {
      const res = await client.post('/api-keys', { name: keyName.trim() });
      setShowNewKey(res.data.raw_key);
      setKeyName('');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success(lang === 'en' ? 'Key created - copy it now!' : '密钥已生成，请立即复制！');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || (lang === 'en' ? 'Failed to create' : '创建失败'));
    }
    setCreating(false);
  };

  const handleRevoke = async (id: string) => {
    if (!confirm(lang === 'en' ? 'Revoke this API key? This cannot be undone.' : '吊销此密钥？此操作不可撤销。')) return;
    try {
      await client.delete(`/api-keys/${id}`);
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success(lang === 'en' ? 'Key revoked' : '密钥已吊销');
    } catch { toast.error(lang === 'en' ? 'Failed to revoke' : '吊销失败'); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ═══ 头部 ═══ */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Key className="w-6 h-6 text-primary-500" />
            {lang === 'en' ? 'API Key Management' : '🔑 API 密钥管理'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {lang === 'en'
              ? 'Generate API keys for programmatic cargo rate import. Max 5 active keys.'
              : '生成API密钥用于程序化批量导入运价。最多同时存在5个活跃密钥。'}
          </p>
        </div>
        <button className="btn-outline text-sm" onClick={() => setShowDocs(!showDocs)}>
          <ExternalLink className="w-3.5 h-3.5 mr-1" />
          {lang === 'en' ? 'API Docs' : 'API 文档'}
        </button>
      </div>

      {/* ═══ API文档折叠面板 ═══ */}
      {showDocs && (
        <div className="bg-gradient-to-br from-gray-50 to-blue-50 border border-blue-200 rounded-xl p-5 text-sm space-y-3">
          <h3 className="font-bold text-gray-800">{lang === 'en' ? '📖 API Integration Guide' : '📖 API 对接说明'}</h3>
          <div className="space-y-1 text-gray-600">
            <p><span className="font-mono text-xs bg-gray-200 px-1.5 py-0.5 rounded">POST /api/cargo-spaces/batch-import</span> — {lang === 'en' ? 'Batch import cargo rates' : '批量导入运价'}</p>
            <p className="text-xs text-gray-400 ml-2">
              {lang === 'en' ? 'Header: X-API-Key: your_key_here' : '请求头: X-API-Key: 你的密钥'}
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 overflow-x-auto">
            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">{`POST /api/cargo-spaces/batch-import
Headers:
  X-API-Key: sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  Content-Type: application/json

Body:
{
  "mode": "replace",    // "replace" 全量替换 / "append" 增量追加
  "items": [
    {
      "origin_port": "深圳",
      "dest_port": "洛杉矶(LAX)",
      "airline_code": "EK",
      "available_kg": 500,
      "available_cbm": 5,
      "price_per_kg": 28.5,
      "price_per_cbm": 6500,
      "currency": "CNY",
      "valid_from": "2026-07-15",
      "valid_to": "2026-08-15",
      "cargo_type": "空运出口",
      "notes": "周135航班"
    }
  ]
}`}</pre>
          </div>
          <div className="text-xs text-gray-500">
            <p className="font-medium text-gray-700 mb-1">{lang === 'en' ? 'Response:' : '返回值：'}</p>
            <pre className="bg-gray-100 rounded p-2">{`{
  "imported": 1,        // 成功导入数
  "total": 1,           // 总提交数
  "errors": null,       // 校验错误列表
  "mode": "replace"     // 导入模式
}`}</pre>
          </div>
        </div>
      )}

      {/* ═══ 生成新密钥 ═══ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
            <Plus className="w-4 h-4 text-primary-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">{lang === 'en' ? 'Create New Key' : '生成新密钥'}</h3>
            <p className="text-xs text-gray-500">{lang === 'en' ? 'Name your key for easy identification' : '命名以便识别用途'}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            className="flex-1 input-field text-sm"
            placeholder={lang === 'en' ? 'e.g. ERP Auto Sync' : '例如：ERP自动同步'}
            value={keyName}
            onChange={e => setKeyName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <button className="btn-primary text-sm flex items-center gap-1" onClick={handleCreate} disabled={creating}>
            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            {lang === 'en' ? 'Generate' : '生成'}
          </button>
        </div>

        {showNewKey && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800">
                  {lang === 'en' ? '⚠️ Your API Key (copy now, won\'t show again)' : '⚠️ 你的API密钥（立即复制，不再显示）'}
                </p>
                <div className="mt-2 flex gap-2">
                  <code className="flex-1 block bg-white border border-amber-300 rounded-lg px-3 py-2 text-sm font-mono break-all select-all">
                    {showNewKey}
                  </code>
                  <button
                    className="flex-shrink-0 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm flex items-center gap-1"
                    onClick={() => { navigator.clipboard.writeText(showNewKey); toast.success(lang === 'en' ? 'Copied!' : '已复制！'); }}
                  >
                    <Copy className="w-3.5 h-3.5" /> {lang === 'en' ? 'Copy' : '复制'}
                  </button>
                </div>
                <p className="text-xs text-amber-700 mt-2">{lang === 'en' ? 'Keep it secret! Anyone with this key can import data on your behalf.' : '请保密！任何人持有此密钥都可以以你的身份导入数据。'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ 密钥列表 ═══ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          {lang === 'en' ? `My Keys (${keys.length}/5)` : `我的密钥（${keys.length}/5）`}
        </h3>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        ) : keys.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            {lang === 'en' ? 'No API keys yet. Create one above.' : '暂无API密钥，请在上方生成。'}
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((key) => (
              <div key={key.id} className={`border rounded-xl p-4 ${key.status === 'active' ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-gray-800">{key.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        key.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {key.status === 'active' ? (lang === 'en' ? 'Active' : '活跃') : (lang === 'en' ? 'Revoked' : '已吊销')}
                      </span>
                    </div>
                    <code className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {key.key_prefix}...
                    </code>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {lang === 'en' ? 'Created: ' : '创建于 '}{new Date(key.created_at).toLocaleDateString()}
                      </span>
                      {key.last_used_at && (
                        <span className="flex items-center gap-0.5">
                          <CheckCircle className="w-3 h-3" />
                          {lang === 'en' ? 'Last used: ' : '最后使用 '}{new Date(key.last_used_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {key.status === 'active' && (
                    <button
                      className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      onClick={() => handleRevoke(key.id)}
                      title={lang === 'en' ? 'Revoke' : '吊销'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
