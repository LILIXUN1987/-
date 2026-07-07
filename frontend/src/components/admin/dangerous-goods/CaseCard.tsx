import { useState } from 'react';
import client from '../../../api/client';
import { formatTime } from '../../../utils/time';
import { dgClass, CLASS_BADGES, assetUrl } from './DgConstants';
import {
  ChevronDown, ChevronUp, ClipboardList, Building2, User,
  Hash, MapPin, Plane, FileText, Download, Send, AlertTriangle,
  ListChecks, Star,
} from 'lucide-react';

interface CaseCardProps {
  item: any;
  isAdmin: boolean;
  agentsList?: any[];
}

export default function CaseCard({ item, isAdmin, agentsList }: CaseCardProps) {
  const [expanded, setExpanded] = useState(false);
  let files: { name: string; path: string }[] = [];
  if (item.file_paths) { try { files = JSON.parse(item.file_paths); } catch {} }
  let steps: { step: number; title: string; desc: string }[] = [];
  if (item.checklist) { try { steps = JSON.parse(item.checklist); } catch {} }
  const cls = dgClass(item.un_number || '');
  const badge = CLASS_BADGES[cls];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all">
      <button className="w-full flex items-center justify-between px-4 py-3.5 text-left" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <ClipboardList className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-800">{item.title}</span>
              {item.un_number && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-mono">{item.un_number}</span>}
              {badge && <span className={`text-[10px] ${badge.bg} ${badge.color} px-1.5 py-0.5 rounded-full`}>{badge.label}</span>}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {item.agent_name && <span className="text-[11px] text-gray-500">{item.agent_name}</span>}
              {item.port && <span className="text-[11px] text-gray-400">· {item.port}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-gray-400 hidden sm:inline">{formatTime(item.created_at, 'MM-DD')}</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-xs text-gray-500">
            {item.un_number && <span className="inline-flex items-center gap-1"><Hash className="w-3 h-3 text-gray-400" /> UN编号：<strong className="font-mono text-gray-700">{item.un_number}</strong></span>}
            {item.port && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3 text-gray-400" /> 口岸：{item.port}</span>}
            {item.awb_number && <span className="inline-flex items-center gap-1"><Plane className="w-3 h-3 text-gray-400" /> 提单号：<strong className="font-mono text-gray-700">{item.awb_number}</strong></span>}
            {item.agent_name && <span className="inline-flex items-center gap-1"><Building2 className="w-3 h-3 text-gray-400" /> {item.agent_name}</span>}
            {item.submitter_name && <span className="inline-flex items-center gap-1"><User className="w-3 h-3 text-gray-400" /> 提交人：{item.submitter_name}</span>}
          </div>
          {steps.length > 0 && (
            <div className="mt-3 bg-blue-50/70 border border-blue-100 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-700 mb-2 flex items-center gap-1"><ListChecks className="w-3.5 h-3.5" /> 操作步骤清单</p>
              <div className="space-y-2">{steps.map(s => (
                <div key={s.step} className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{s.step}</div>
                  <div><p className="text-xs font-medium text-gray-800">{s.title}</p>{s.desc && <p className="text-[11px] text-gray-500">{s.desc}</p>}</div>
                </div>
              ))}</div>
            </div>
          )}
          <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line mt-3 bg-gray-50 rounded-lg p-3">{item.content}</div>
          {files.length > 0 && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> 操作文件（{files.length}）</p>
              <div className="space-y-1">{files.map((f, i) => (
                <a key={i} href={assetUrl(f.path) || '#'} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-primary-600 hover:underline">
                  <FileText className="w-3 h-3" /><span className="truncate">{f.name || f.path.split('/').pop()}</span><Download className="w-3 h-3 ml-auto text-gray-400" />
                </a>
              ))}</div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            {item.created_by && (
              <button className="flex items-center gap-1 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg px-3 py-1.5 transition-colors"
                onClick={async () => { const msg = prompt(`发送站内信给发布此实例的业务员（${item.submitter_name || item.agent_name || '该业务员'}）：`); if (msg) { try { await client.post('/messages', { receiver_id: item.created_by, content: msg.trim() }); alert('✅ 消息已发送'); } catch { alert('发送失败'); } } }}>
                <Send className="w-3 h-3" />联系{item.submitter_name ? ` ${item.submitter_name}` : ''}
              </button>
            )}
            <button className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg px-3 py-1.5 transition-colors"
              onClick={async () => { const msg = prompt('请描述此实例的问题（将发送给管理员处理）：'); if (msg) { try { const admins = (await client.get('/admin/users', { params: { q: 'admin' } })).data?.data || []; const adminUser = admins.find((u: any) => u.role === 'admin') || admins[0]; if (adminUser) { await client.post('/messages', { receiver_id: adminUser.username, content: `⚠️ 走货实例纠错\n\n实例标题：${item.title}\n提交人：${item.submitter_name || ''}\nUN：${item.un_number || ''}\n\n反馈内容：${msg.trim()}` }); alert('✅ 已反馈给管理员'); } else alert('无法找到管理员'); } catch { alert('发送失败'); } } }}>
              <AlertTriangle className="w-3 h-3" />内容有误
            </button>
            {(() => { if (!item.agent_name || !agentsList) return null; const cols = agentsList.filter((a: any) => a.company_name === item.agent_name && a.created_by !== item.created_by); if (cols.length === 0) return null; return (
              <div className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-1.5">
                <Building2 className="w-3 h-3" /><span>同事:</span>
                {cols.slice(0, 2).map((c: any) => (
                  <button key={c.id} className="hover:underline font-medium" onClick={async () => { const m = prompt(`发站内信给 ${c.company_name}：`); if (m) { try { await client.post('/messages', { receiver_id: c.created_by, content: m.trim() }); alert('✅ 已发送'); } catch { alert('失败'); } } }}>{c.contact_person || '同事'}</button>
                ))}{cols.length > 2 && <span>+{cols.length - 2}</span>}
              </div>
            )})()}
          </div>
        </div>
      )}
    </div>
  );
}
