import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, lazy, Suspense } from 'react';
import { useAuthStore } from './store/authStore';

// Layouts（布局组件保持同步导入）
import PublicLayout from './components/layout/PublicLayout';
import AdminLayout from './components/layout/AdminLayout';
import ProtectedRoute from './components/common/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import { usePushNotifications } from './hooks/usePushNotifications';
import { useBrowserNotifications } from './hooks/useBrowserNotifications';

// Pages — 懒加载，按需下载
const LandingPage = lazy(() => import('./pages/public/LandingPage'));
const SearchPage = lazy(() => import('./pages/public/SearchPage'));
const RegisterPage = lazy(() => import('./pages/public/RegisterPage'));
const LoginPage = lazy(() => import('./pages/public/LoginPage'));
const CompanyPublicPage = lazy(() => import('./pages/public/CompanyPublicPage'));
const FileUploadPage = lazy(() => import('./pages/admin/FileUploadPage'));
const RawRecordsPage = lazy(() => import('./pages/admin/RawRecordsPage'));
const LawyersPage = lazy(() => import('./pages/admin/LawyersPage'));
const ProfilePage = lazy(() => import('./pages/admin/ProfilePage'));
const ComplaintPage = lazy(() => import('./pages/admin/ComplaintPage'));
const SuggestionPage = lazy(() => import('./pages/admin/SuggestionPage'));
const InboxPage = lazy(() => import('./pages/admin/InboxPage'));
const RiskCenterPage = lazy(() => import('./pages/admin/RiskCenterPage'));
const FavoritesPage = lazy(() => import('./pages/admin/FavoritesPage'));
const AdminStatsPage = lazy(() => import('./pages/admin/AdminStatsPage'));
const AdminRenewPage = lazy(() => import('./pages/admin/AdminRenewPage'));
const AdminImportPage = lazy(() => import('./pages/admin/AdminImportPage'));
const CompanyVerificationPage = lazy(() => import('./pages/admin/CompanyVerificationPage'));
const PriceTablePage = lazy(() => import('./pages/admin/PriceTablePage'));
const InspectorDirectoryPage = lazy(() => import('./pages/admin/InspectorDirectoryPage'));
const InsurerDirectoryPage = lazy(() => import('./pages/admin/InsurerDirectoryPage'));
const DgReviewPage = lazy(() => import('./pages/admin/DgReviewPage'));
const ComplaintAppealPage = lazy(() => import('./pages/admin/ComplaintAppealPage'));
const AuditLogPage = lazy(() => import('./pages/admin/AuditLogPage'));
const ChatPage = lazy(() => import('./pages/public/ChatPage'));
const ToolsPage = lazy(() => import('./pages/admin/ToolsPage'));
const CardDirectoryPage = lazy(() => import('./pages/admin/CardDirectoryPage'));
const ExpoQuickEntry = lazy(() => import('./pages/admin/ExpoQuickEntry'));
const AdminCenter = lazy(() => import('./pages/admin/AdminCenter'));
const QuotePage = lazy(() => import('./pages/admin/QuotePage'));
const DDPPage = lazy(() => import('./pages/admin/DDPPage'));
const OverseasPartnersPage = lazy(() => import('./pages/admin/OverseasPartnersPage'));
const PortServicesPage = lazy(() => import('./pages/admin/PortServicesPage'));
const CouponPage = lazy(() => import('./pages/admin/CouponPage'));
const MyCouponWalletPage = lazy(() => import('./pages/admin/MyCouponWalletPage'));
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'));
const BrokerManagementPage = lazy(() => import('./pages/admin/BrokerManagementPage'));
const ApiKeysPage = lazy(() => import('./pages/admin/ApiKeysPage'));
const SubscribePage = lazy(() => import('./pages/admin/SubscribePage'));
const BrokerConsolePage = lazy(() => import('./pages/admin/BrokerConsolePage'));
const CouponPoolPage = lazy(() => import('./pages/admin/CouponPoolPage'));
const BrokerDirectoryPage = lazy(() => import('./pages/admin/BrokerDirectoryPage'));
const InquiriesPage = lazy(() => import('./pages/admin/InquiriesPage'));
const CustomerRelationsPage = lazy(() => import('./pages/admin/CustomerRelationsPage'));
const MyPostsPage = lazy(() => import('./pages/admin/MyPostsPage'));
const FrequentPartnersPage = lazy(() => import('./pages/admin/FrequentPartnersPage'));
const AdminCompanyProfilePage = lazy(() => import('./pages/admin/AdminCompanyProfilePage'));
const LawyerConsultPage = lazy(() => import('./pages/admin/LawyerConsultPage'));
const ServiceConsultPage = lazy(() => import('./pages/admin/ServiceConsultPage'));
const CustomerFinderPage = lazy(() => import('./pages/admin/CustomerFinderPage'));
const ConsigneePoolPage = lazy(() => import('./pages/admin/ConsigneePoolPage'));

function PageLoading() {
  return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 60000,
      gcTime: 5 * 60 * 1000,
    },
  },
});

function AppInit() {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return null;
}

function PushInit() {
  usePushNotifications();
  useBrowserNotifications();
  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppInit />
          <PushInit />
          <Suspense fallback={<PageLoading />}>
          <Routes>
          {/* Public routes — Landing page as homepage */}
          <Route path="/" element={<LandingPage />} />
          <Route element={<PublicLayout />}>
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Unified login (no layout) */}
          <Route path="/login" element={<LoginPage />} />

          {/* Public search — no login required */}
          <Route path="/search" element={<SearchPage />} />

          {/* Legacy chat page */}
          <Route path="/chat" element={<ChatPage />} />

          {/* Public Company Profile */}
          <Route path="/company/:id" element={<CompanyPublicPage />} />

          {/* Admin login → redirect to unified login */}
          <Route path="/admin/login" element={<Navigate to="/login" replace />} />

          {/* Admin protected routes */}
          <Route
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<DashboardPage />} />
            <Route path="/admin/files" element={<FileUploadPage />} />
            <Route path="/admin/files/:id" element={<FileUploadPage />} />
            <Route path="/admin/raw-records" element={<RawRecordsPage />} />
            <Route path="/admin/lawyers" element={<LawyersPage />} />
            <Route path="/admin/profile" element={<ProfilePage />} />
            <Route path="/admin/complaints" element={<ComplaintPage />} />
            <Route path="/admin/suggestions" element={<SuggestionPage />} />
            <Route path="/admin/inbox" element={<InboxPage />} />
            <Route path="/admin/price-tables" element={<PriceTablePage />} />
            <Route path="/admin/inspector-directory" element={<InspectorDirectoryPage />} />
            <Route path="/admin/insurer-directory" element={<InsurerDirectoryPage />} />
            <Route path="/admin/dg-review" element={<ProtectedRoute requiredRole="admin"><DgReviewPage /></ProtectedRoute>} />
            <Route path="/admin/favorites" element={<FavoritesPage />} />
            {/* 仅管理员可访问的页面 */}
            <Route path="/admin/risk-center" element={<ProtectedRoute requiredRole="admin"><RiskCenterPage /></ProtectedRoute>} />
            <Route path="/admin/complaint-appeals" element={<ProtectedRoute requiredRole="admin"><ComplaintAppealPage /></ProtectedRoute>} />
            <Route path="/admin/stats" element={<ProtectedRoute requiredRole="admin"><AdminStatsPage /></ProtectedRoute>} />
            <Route path="/admin/renew" element={<ProtectedRoute><AdminRenewPage /></ProtectedRoute>} />
            <Route path="/admin/tools" element={<ProtectedRoute><ToolsPage /></ProtectedRoute>} />
            <Route path="/admin/port-services" element={<ProtectedRoute><PortServicesPage /></ProtectedRoute>} />
            <Route path="/admin/coupons" element={<ProtectedRoute><CouponPage /></ProtectedRoute>} />
            <Route path="/admin/coupon-wallet" element={<ProtectedRoute><MyCouponWalletPage /></ProtectedRoute>} />
            <Route path="/admin/quote" element={<ProtectedRoute><QuotePage /></ProtectedRoute>} />
            <Route path="/admin/ddp" element={<ProtectedRoute><DDPPage /></ProtectedRoute>} />
            <Route path="/admin/overseas-partners" element={<ProtectedRoute><OverseasPartnersPage /></ProtectedRoute>} />
            <Route path="/admin/card-directory" element={<ProtectedRoute><CardDirectoryPage /></ProtectedRoute>} />
            <Route path="/admin/expo-quick" element={<ProtectedRoute requiredRole="admin"><ExpoQuickEntry /></ProtectedRoute>} />
            <Route path="/admin/admin-center" element={<ProtectedRoute requiredRole="admin"><AdminCenter /></ProtectedRoute>} />
            <Route path="/admin/company-verification" element={<ProtectedRoute requiredRole="admin"><CompanyVerificationPage /></ProtectedRoute>} />
            <Route path="/admin/batch-import" element={<ProtectedRoute requiredRole="admin"><AdminImportPage /></ProtectedRoute>} />
            <Route path="/admin/audit-logs" element={<ProtectedRoute requiredRole="admin"><AuditLogPage /></ProtectedRoute>} />
            <Route path="/admin/broker-management" element={<ProtectedRoute requiredRole="admin"><BrokerManagementPage /></ProtectedRoute>} />
            <Route path="/admin/api-keys" element={<ProtectedRoute><ApiKeysPage /></ProtectedRoute>} />
            <Route path="/admin/subscribe" element={<ProtectedRoute><SubscribePage /></ProtectedRoute>} />
            <Route path="/admin/broker-console" element={<ProtectedRoute><BrokerConsolePage /></ProtectedRoute>} />
            <Route path="/admin/coupon-pool" element={<ProtectedRoute><CouponPoolPage /></ProtectedRoute>} />
            <Route path="/admin/broker-directory" element={<ProtectedRoute><BrokerDirectoryPage /></ProtectedRoute>} />
            <Route path="/admin/inquiries" element={<ProtectedRoute><InquiriesPage /></ProtectedRoute>} />
            <Route path="/admin/customer-relations" element={<ProtectedRoute><CustomerRelationsPage /></ProtectedRoute>} />
            <Route path="/admin/my-posts" element={<ProtectedRoute><MyPostsPage /></ProtectedRoute>} />
            <Route path="/admin/frequent-partners" element={<ProtectedRoute><FrequentPartnersPage /></ProtectedRoute>} />
            <Route path="/admin/company-profile" element={<ProtectedRoute><AdminCompanyProfilePage /></ProtectedRoute>} />
            <Route path="/admin/lawyer-consults" element={<ProtectedRoute><LawyerConsultPage /></ProtectedRoute>} />
            <Route path="/admin/service-consults" element={<ProtectedRoute><ServiceConsultPage /></ProtectedRoute>} />
            <Route path="/admin/customer-finder" element={<ProtectedRoute><CustomerFinderPage /></ProtectedRoute>} />
            <Route path="/admin/consignee-pool" element={<ProtectedRoute><ConsigneePoolPage /></ProtectedRoute>} />
          </Route>

          {/* 404 */}
          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <p className="text-4xl mb-4">404</p>
                <p className="text-gray-500 mb-4">页面不存在</p>
                <a href="/" className="text-primary-600 hover:underline">返回首页</a>
              </div>
            </div>
          } />
        </Routes>
          </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}
