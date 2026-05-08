'use client';

import { AuthorizationProvider } from '@/components/authorization/AuthorizationProvider';
import { Session, SessionUser } from '@/lib/auth/server-session';
import axios from 'axios';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
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
  sessionPromise,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = pathname?.startsWith('/auth');
  const { isDark, toggleTheme } = useTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const interceptorRef = useRef<number | null>(null);

  const handleExpiredSession = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch {
      // ignore — cookie will be cleared anyway
    }
    router.replace('/auth/login');
  };

  useEffect(() => {
    sessionPromise.then((sess) => {
      setSession(sess);
      setLoading(false);
      if (!sess && !isAuthPage) {
        router.replace('/auth/login');
      }
    });
  }, [sessionPromise]);

  useEffect(() => {
    interceptorRef.current = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error?.response?.status === 401 && !isAuthPage) {
          handleExpiredSession();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      if (interceptorRef.current !== null) {
        axios.interceptors.response.eject(interceptorRef.current);
      }
    };
  }, [isAuthPage]);

  const role: Role | null = session?.user?.role ?? null;
  const userData: SessionUser | null = session?.user ?? null;

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);

  return (
    <RouteLoadingProvider>
      <AuthorizationProvider>
      {isAuthPage ? (
        <>
          {children}
          <RouteLoadingOverlay variant="fullscreen" isDark={isDark} />
        </>
      ) : (
        <div className={`flex h-screen ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
          {!loading && <RoleIndicator role={role} />}

          <div className="hidden lg:block ">
            <Sidebar
              isDark={isDark}
              role={role}
              isCollapsed={sidebarCollapsed}
              onToggleCollapse={toggleSidebar}
              userData={userData}
            />
          </div>

          <MobileSidebar isDark={isDark} role={role} userData={userData} />

          <div className="flex-1 flex flex-col overflow-hidden pt-1">
            <TopBar isDark={isDark} toggleTheme={toggleTheme} userData={userData} />

            <main
              className={`relative flex-1 overflow-y-auto ${
                isDark ? 'bg-slate-900' : 'bg-gray-50'
              }`}
            >
              {children}
              <RouteLoadingOverlay variant="main" isDark={isDark} />
            </main>
          </div>
        </div>
      )}
      </AuthorizationProvider>
    </RouteLoadingProvider>
  );
};

export default ClientLayoutWrapper;