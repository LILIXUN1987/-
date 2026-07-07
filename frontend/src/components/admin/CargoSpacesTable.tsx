import { useState } from 'react';
import { Pencil, Trash2, Loader2, AlertTriangle, MapPin, Plane, Package, Download } from 'lucide-react';
import { CargoSpace } from '../../types';
import { cargoApi } from '../../api/cargo.api';
import dayjs from 'dayjs';

interface CargoSpacesTableProps {
  data: CargoSpace[];
  loading: boolean;
  onEdit: (cargo: CargoSpace) => void;
  onDelete: () => void;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  available: { label: '可用', color: 'text-green-700 bg-green-50 border-green-200' },
  reserved: { label: '已预定', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  expired: { label: '已过期', color: 'text-gray-400 bg-gray-100 border-gray-200' },
};

/** 格式化价格展示 */
function formatPrice(cargo: CargoSpace): string {
  const parts: string[] = [];
  if (cargo.price_per_cbm) parts.push(`${cargo.price_per_cbm}/CBM`);
  if (cargo.price_per_kg) parts.push(`${cargo.price_per_kg}/KG`);
  return parts.length > 0 ? parts.join(' · ') : '-';
}

export default function CargoSpacesTable({ data, loading, onEdit, onDelete }: CargoSpacesTableProps) {
  // ── 删除确认弹窗 ──
  const [deleteTarget, setDeleteTarget] = useState<CargoSpace | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const handleExportQuote = async (id: string) => {
    setExportingId(id);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/cargo-spaces/${id}/export-quote`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('导出失败');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `报价单_${id.substring(0, 8)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert('导出失败'); }
    setExportingId(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await cargoApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      onDelete();
    } catch {
      // handled by interceptor
    }
    setIsDeleting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="font-medium">暂无货舱数据</p>
        <p className="text-xs mt-1">请先在数据录入页面录入推广信息</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto -mx-2">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-200 uppercase tracking-wider">
              <th className="pb-3 pr-2 font-medium">地区</th>
              <th className="pb-3 pr-2 font-medium">仓库/路线</th>
              <th className="pb-3 pr-2 font-medium">航司</th>
              <th className="pb-3 pr-2 font-medium text-right">CBM</th>
              <th className="pb-3 pr-2 font-medium text-right">KG</th>
              <th className="pb-3 pr-2 font-medium">价格</th>
              <th className="pb-3 pr-2 font-medium">有效期</th>
              <th className="pb-3 pr-2 font-medium">货物类型</th>
              <th className="pb-3 pr-2 font-medium">状态</th>
              <th className="pb-3 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {data.map((cargo) => {
              const status = STATUS_MAP[cargo.status] || { label: cargo.status, color: 'text-gray-500 bg-gray-50' };
              const isExpired = cargo.status === 'expired' || dayjs(cargo.valid_to).isBefore(dayjs(), 'day');

              return (
                <tr key={cargo.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${isExpired ? 'opacity-60' : ''}`}>
                  <td className="py-3 pr-2">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-900">{cargo.region}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-2">
                    <span className="text-sm text-gray-700 max-w-[180px] inline-block truncate" title={cargo.warehouse_name}>
                      {cargo.warehouse_name}
                    </span>
                    {(cargo.origin_port || cargo.dest_port) && (
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        {cargo.origin_port && <span>{cargo.origin_port}</span>}
                        {cargo.origin_port && cargo.dest_port && <span> → </span>}
                        {cargo.dest_port && <span className="font-mono">{cargo.dest_port}</span>}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-2">
                    {cargo.airline_code ? (
                      <span className="inline-block font-mono text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                        {cargo.airline_code}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">-</span>
                    )}
                  </td>
                  <td className="py-3 pr-2 text-sm text-gray-700 text-right font-medium tabular-nums">
                    {Number(cargo.available_cbm).toLocaleString()}
                  </td>
                  <td className="py-3 pr-2 text-sm text-gray-700 text-right font-medium tabular-nums">
                    {Number(cargo.available_kg).toLocaleString()}
                  </td>
                  <td className="py-3 pr-2 text-sm text-gray-600 whitespace-nowrap">
                    {formatPrice(cargo)}
                  </td>
                  <td className="py-3 pr-2 text-sm text-gray-500 whitespace-nowrap">
                    {dayjs(cargo.valid_from).format('MM/DD')}~{dayjs(cargo.valid_to).format('MM/DD')}
                  </td>
                  <td className="py-3 pr-2">
                    {cargo.cargo_type ? (
                      <span className="text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{cargo.cargo_type}</span>
                    ) : (
                      <span className="text-xs text-gray-300">-</span>
                    )}
                  </td>
                  <td className="py-3 pr-2">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${status.color}`}>
                      {isExpired && cargo.status !== 'expired' ? '将过期' : status.label}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <button
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="导出报价单"
                        onClick={() => handleExportQuote(cargo.id)}
                        disabled={exportingId === cargo.id}
                      >
                        {exportingId === cargo.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      </button>
                      <button
                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="编辑"
                        onClick={() => onEdit(cargo)}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除"
                        onClick={() => setDeleteTarget(cargo)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
              <div className="font-medium text-gray-900">{deleteTarget.warehouse_name}</div>
              <div className="text-xs text-gray-500 mt-1">
                {deleteTarget.region} · {deleteTarget.available_cbm} CBM / {deleteTarget.available_kg} KG
              </div>
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
    </>
  );
}
