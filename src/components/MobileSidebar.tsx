'use client';

import { SessionUser } from '@/lib/auth/server-session';
import { Role } from '@/lib/auth/roles';
import React, { useEffect, useState } from 'react';
import { TbLayoutSidebarFilled } from 'react-icons/tb';
import Sidebar from './Sidebar';

interface MobileSidebarProps {
  isDark: boolean;
  role: Role | null;
  userData?: SessionUser | null;
}

const MobileSidebar: React.FC<MobileSidebarProps> = ({ isDark, role, userData }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`lg:hidden fixed top-4 left-4 z-50 p-2  ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }  ${isDark
            ? 'hover:bg-slate-800 text-slate-500 hover:text-slate-300'
            : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
          }`}
      >
        <TbLayoutSidebarFilled size={20} />
      </button>

      <div
        className={`lg:hidden fixed inset-0 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        onClick={() => setIsOpen(false)}
      />

      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="relative h-full">
          <Sidebar
            isDark={isDark}
            role={role}
            isCollapsed={false}
            onToggleCollapse={() => setIsOpen(false)}
            userData={userData}
          />

        </div>
      </div>
    </>
  );
};

export default MobileSidebar;