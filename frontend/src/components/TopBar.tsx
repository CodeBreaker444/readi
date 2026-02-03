'use client';
import { Bell, Mail, Moon, Sun, User } from 'lucide-react';
import React from 'react';

interface TopBarProps {
  isDark: boolean;
  toggleTheme: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ isDark, toggleTheme }) => {
  return (
    <div className={`h-16 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border-b flex items-center justify-between px-6`}>
      <div className="flex items-center space-x-4">
        <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
        </h2>
      </div>

      <div className="flex items-center space-x-4">
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-lg transition-colors ${
            isDark ? 'hover:bg-slate-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
          }`}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <button
          className={`relative p-2 rounded-lg transition-colors ${
            isDark ? 'hover:bg-slate-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
          }`}
          aria-label="Messages"
        >
          <Mail size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
        </button>

        <button
          className={`relative p-2 rounded-lg transition-colors ${
            isDark ? 'hover:bg-slate-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
          }`}
          aria-label="Notifications"
        >
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
            3
          </span>
        </button>

        <button
          className={`flex items-center space-x-3 p-2 rounded-lg transition-colors ${
            isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
          }`}
        >
          <div className="w-9 h-9 bg-linear-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <User size={18} className="text-white" />
          </div>
          <div className="hidden md:block text-left">
            <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
              John Doe
            </p>
            <p className="text-xs text-gray-500">Admin</p>
          </div>
        </button>
      </div>
    </div>
  );
};

export default TopBar;