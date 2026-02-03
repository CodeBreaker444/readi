'use client';
import { useTheme } from 'next-themes';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import MobileSidebar from './MobileSidebar';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface ClientLayoutWrapperProps {
  children: React.ReactNode;
}

const ClientLayoutWrapper: React.FC<ClientLayoutWrapperProps> = ({ children }) => {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith('/auth');
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = theme === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (!mounted) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  return (
    <div className={`flex h-screen ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <div className="hidden lg:block">
        <Sidebar isDark={isDark} />
      </div>
      
      <MobileSidebar isDark={isDark} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar isDark={isDark} toggleTheme={toggleTheme} />
        
        <main className={`flex-1 overflow-y-auto ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default ClientLayoutWrapper;