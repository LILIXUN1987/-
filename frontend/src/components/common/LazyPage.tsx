import React, { Suspense } from 'react';
import ErrorBoundary from './ErrorBoundary';

/** 页面级加载指示器 */
function PageLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/** 路由级错误回退（不影响其他页面） */
function RouteErrorFallback({ error }: { error: Error | null }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="text-3xl mb-3">⚠️</div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">页面加载失败</h2>
        <p className="text-sm text-gray-500 mb-4">
          {error?.message || '请刷新页面后重试'}
        </p>
        <button
          className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 transition-colors"
          onClick={() => window.location.reload()}
        >
          刷新页面
        </button>
      </div>
    </div>
  );
}

interface LazyPageProps {
  children: React.ReactNode;
}

/**
 * 懒加载页面包装器
 * 组合 Suspense + ErrorBoundary，使单个页面崩溃不影响整个应用
 */
export default function LazyPage({ children }: LazyPageProps) {
  return (
    <ErrorBoundary fallback={<RouteErrorFallback error={null} />}>
      <Suspense fallback={<PageLoading />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}
