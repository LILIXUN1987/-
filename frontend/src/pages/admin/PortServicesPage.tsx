import { useAuthStore } from '../../store/authStore';
import PortServicesBrowser from '../../components/admin/PortServicesBrowser';

export default function PortServicesPage() {
  const lang = useAuthStore((s) => s.lang);
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{lang === 'en' ? 'Port Services' : '口岸服务查询'}</h1>
      <p className="text-gray-500 mb-6">{lang === 'en' ? 'Find customs brokers, trucking, insurance, inspection & lawyers by port' : '输入口岸/城市名或三字代码，查询报关、车队、保险、检测、律师等口岸配套服务'}</p>
      <PortServicesBrowser />
    </div>
  );
}
