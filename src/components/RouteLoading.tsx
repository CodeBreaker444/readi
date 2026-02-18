'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

type RouteLoadingCtx = {
  isRouteLoading: boolean;
  startRouteLoading: () => void;
  stopRouteLoading: () => void;
};

const Ctx = createContext<RouteLoadingCtx | null>(null);

export function RouteLoadingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams?.toString() ?? '';

  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const safetyTimeoutRef = useRef<number | null>(null);

  const stopRouteLoading = () => {
    setIsRouteLoading(false);
    if (safetyTimeoutRef.current) {
      window.clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
  };

  const startRouteLoading = () => {
    setIsRouteLoading(true);

    // Safety: never get stuck loading forever
    if (safetyTimeoutRef.current) window.clearTimeout(safetyTimeoutRef.current);
    safetyTimeoutRef.current = window.setTimeout(() => {
      setIsRouteLoading(false);
      safetyTimeoutRef.current = null;
    }, 10_000);
  };

  // When url changes stop the global loader
  useEffect(() => {
    if (!isRouteLoading) return;
    const id = window.setTimeout(() => stopRouteLoading(), 0);
    return () => window.clearTimeout(id);
  }, [pathname, searchKey, isRouteLoading]);

  const value = useMemo(
    () => ({ isRouteLoading, startRouteLoading, stopRouteLoading }),
    [isRouteLoading]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRouteLoading() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useRouteLoading must be used within RouteLoadingProvider');
  return ctx;
}

export function MainContentSkeleton({ isDark }: { isDark: boolean }) {
  const card = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200';
  const line = isDark ? 'bg-slate-700' : 'bg-gray-200';

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-pulse">
      <div className={`h-7 w-48 rounded ${line}`} />
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`rounded-lg border shadow-sm p-4 sm:p-6 ${card}`}>
            <div className={`h-3 w-24 rounded ${line}`} />
            <div className={`mt-3 h-8 w-20 rounded ${line}`} />
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 rounded-lg border shadow-sm p-4 sm:p-6 ${card}`}>
          <div className={`h-4 w-40 rounded ${line}`} />
          <div className={`mt-4 h-64 rounded ${line}`} />
        </div>
        <div className={`rounded-lg border shadow-sm p-4 sm:p-6 ${card}`}>
          <div className={`h-4 w-40 rounded ${line}`} />
          <div className={`mt-4 h-64 rounded ${line}`} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`rounded-lg border shadow-sm p-4 sm:p-6 ${card}`}>
          <div className={`h-4 w-40 rounded ${line}`} />
          <div className={`mt-4 h-56 rounded ${line}`} />
        </div>
        <div className={`rounded-lg border shadow-sm p-4 sm:p-6 ${card}`}>
          <div className={`h-4 w-40 rounded ${line}`} />
          <div className={`mt-4 h-56 rounded ${line}`} />
        </div>
      </div>
    </div>
  );
}

export function RouteLoadingOverlay({
  variant,
  isDark,
}: {
  variant: 'main' | 'fullscreen';
  isDark: boolean;
}) {
  const { isRouteLoading } = useRouteLoading();
  if (!isRouteLoading) return null;

  if (variant === 'fullscreen') {
    return (
      <div
        className={`fixed inset-0 z-[9999] ${isDark ? 'bg-slate-950/60' : 'bg-black/40'}`}
        style={{ backdropFilter: 'blur(2px)' }}
      >
        <div className="h-full w-full overflow-auto">
          <MainContentSkeleton isDark={isDark} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`absolute inset-0 z-50 ${isDark ? 'bg-slate-900/60' : 'bg-white/60'}`}
      style={{ backdropFilter: 'blur(1px)' }}
    >
      <MainContentSkeleton isDark={isDark} />
    </div>
  );
}