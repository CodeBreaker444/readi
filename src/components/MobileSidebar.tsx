'use client';

import { Role } from '@/lib/auth/roles';
import { Menu, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';

interface MobileSidebarProps {
  isDark: boolean;
  role: Role | null;
}

const MobileSidebar: React.FC<MobileSidebarProps> = ({ isDark, role }) => {
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
        className={`lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg shadow-lg transition-all duration-200 ${
          isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        } ${isDark ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-gray-800 hover:bg-gray-50'}`}
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
      >
        <Menu size={22} />
      </button>

      <div
        className={`lg:hidden fixed inset-0 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
        onClick={() => setIsOpen(false)}
      />

      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="relative h-full">
          <Sidebar
            isDark={isDark}
            role={role}
            isCollapsed={false}
            onToggleCollapse={() => setIsOpen(false)}
          />

          <button
            onClick={() => setIsOpen(false)}
            className={`absolute top-4 right-3 p-1.5 rounded-md z-10 transition-colors duration-150 ${
              isDark
                ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </>
  );
};

export default MobileSidebar;