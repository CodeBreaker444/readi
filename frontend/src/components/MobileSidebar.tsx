'use client';
import { Menu, X } from 'lucide-react';
import React, { useState } from 'react';
import Sidebar from './Sidebar';

interface MobileSidebarProps {
  isDark: boolean;
}

const MobileSidebar: React.FC<MobileSidebarProps> = ({ isDark }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg shadow-lg ${
          isDark ? 'bg-slate-800 text-white' : 'bg-white text-gray-800'
        }`}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar isDark={isDark} />
      </div>
    </>
  );
};

export default MobileSidebar;