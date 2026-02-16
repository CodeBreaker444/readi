'use client';

import { Session, SessionUser } from '@/lib/auth/server-session';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { Role } from '../lib/auth/roles';
import MobileSidebar from './MobileSidebar';
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

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className={`flex h-screen ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <div className="hidden lg:block">
        <Sidebar isDark={isDark} role={role}/>
      </div>
      
      <MobileSidebar isDark={isDark} role={role}/>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar isDark={isDark} toggleTheme={toggleTheme} userData={userData} />
        
        <main className={`flex-1 overflow-y-auto ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default ClientLayoutWrapper;