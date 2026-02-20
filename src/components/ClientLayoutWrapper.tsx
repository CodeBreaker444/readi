'use client';

import { Session, SessionUser } from '@/lib/auth/server-session';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { Role } from '../lib/auth/roles';
import MobileSidebar from './MobileSidebar';
import { RoleIndicator } from './RoleIndicator';
import { RouteLoadingOverlay, RouteLoadingProvider } from './RouteLoading';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useTheme } from './useTheme';

interface ClientLayoutWrapperProps {
  children: React.ReactNode;
  sessionPromise: Promise<Session | null>;
}

const ClientLayoutWrapper: React.FC<ClientLayoutWrapperProps> = ({
  children,
  sessionPromise
}) => {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith('/auth');
  const { isDark, toggleTheme } = useTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sessionPromise.then((sess) => {
      setSession(sess);
      setLoading(false);
    });
  }, [sessionPromise]);

  const role: Role | null = session?.user?.role ?? null;
  const userData: SessionUser | null = session?.user ?? null;

  return (
    <RouteLoadingProvider>
      {isAuthPage ? (
        <>
          {children}
          <RouteLoadingOverlay variant="fullscreen" isDark={isDark} />
        </>
      ) : (
        <div className={`flex h-screen ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
          {!loading && <RoleIndicator role={role} />}

          <div className="hidden lg:block">
            <Sidebar isDark={isDark} role={role} />
          </div>

          <MobileSidebar isDark={isDark} role={role} />

          <div className="flex-1 flex flex-col overflow-hidden pt-1">
            <TopBar isDark={isDark} toggleTheme={toggleTheme} userData={userData} />

            <main
              className={`relative flex-1 overflow-y-auto ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}
            >
              {children}
              <RouteLoadingOverlay variant="main" isDark={isDark} />
            </main>
          </div>
        </div>
      )}
    </RouteLoadingProvider>
  );
};

export default ClientLayoutWrapper;