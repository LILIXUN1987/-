import { useAuthStore } from '../../store/authStore';
import ComplaintZone from '../../components/admin/ComplaintZone';

export default function ComplaintPage() {
  const lang = useAuthStore((s) => s.lang);
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{lang === 'en' ? 'Complaints' : '吐槽专区'}</h1>
      <p className="text-gray-500 mb-6">{lang === 'en' ? 'Report and view industry complaints, community warning system' : '发布和查看行业吐槽信息，互相警示'}</p>
      <ComplaintZone />
    </div>
  );
}
