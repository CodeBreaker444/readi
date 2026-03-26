'use client';

import { SessionUser } from '@/lib/auth/server-session';
import { ChevronDown, LogOut, Moon, Sun, User, UserCircle } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabase/client';
import NotificationDropdown from './NotificationDropdown';
import ProfileModal from './ProfileModal';

interface TopBarProps {
  isDark: boolean;
  toggleTheme: () => void;
  userData: SessionUser | null;
}

const TopBar: React.FC<TopBarProps> = ({ isDark, toggleTheme, userData }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);


  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      await supabase.auth.signOut();

      await fetch('/api/auth/logout', { method: 'POST' });

      setShowUserMenu(false);

      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Unexpected logout error:', error);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <div className={`h-16 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'} border-b flex items-center justify-between px-6`}>
        <div className="flex items-center space-x-4">
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
          </h2>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
              }`}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <NotificationDropdown isDark={isDark} />

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`flex items-center space-x-3 p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
                }`}
            >
              <div className="w-9 h-9 overflow-hidden rounded-full flex items-center justify-center border-2 border-transparent">
                {userData?.avatar ? (
                  <img
                    src={userData.avatar}
                    alt={userData?.username || 'Profile'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <User size={18} className="text-white" />
                )}
              </div>
              <div className="hidden md:block text-left">
                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  {userData?.username ? (
                    userData.username
                  ) : (
                    <span
                      className={`inline-block h-4 w-24 rounded-md animate-pulse ${isDark ? 'bg-slate-700' : 'bg-gray-300'
                        }`}
                    />
                  )}
                </p>

                <p className="text-xs text-gray-500">
                  {userData?.role ? (
                    userData.role
                  ) : (
                    <span
                      className={`inline-block h-3 w-16 rounded-md animate-pulse ${isDark ? 'bg-slate-700' : 'bg-gray-200'
                        }`}
                    />
                  )}
                </p>
              </div>
              <ChevronDown size={16} className={isDark ? 'text-gray-400' : 'text-gray-600'} />
            </button>

            {showUserMenu && (
              <div className={`absolute right-0 mt-2 w-72 rounded-xl shadow-xl border z-50 overflow-hidden backdrop-blur-sm ${isDark ? 'bg-slate-800/95 border-slate-700/80' : 'bg-white/95 border-gray-200/80'
                }`}>
                {/* User info header */}
                <div className={`px-5 py-4 border-b ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-br from-indigo-400 to-purple-500'}`}>
                      {userData?.avatar ? (
                        <img
                          src={userData.avatar}
                          alt={userData?.username || 'Profile'}
                          className="w-full h-full rounded-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <User size={18} className="text-white" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {userData?.username || 'User'}
                      </p>
                      <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {userData?.email || ''}
                      </p>
                    </div>
                  </div>
                  {userData?.userId && (
                    <div className={`mt-3 px-2.5 py-1.5 rounded-md text-[11px] font-mono ${isDark ? 'bg-slate-700/50 text-gray-400' : 'bg-gray-50 text-gray-400'}`}>
                      ID: {userData.userId}
                    </div>
                  )}
                </div>

                {/* Account section */}
                <div className="px-2 py-2">
                  <button
                    onClick={() => {
                      setShowProfileModal(true);
                      setShowUserMenu(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-150 group ${isDark
                        ? 'hover:bg-slate-700/70 text-gray-300 hover:text-white'
                        : 'hover:bg-gray-50 text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    <div className={`p-1.5 rounded-md transition-colors ${isDark
                        ? 'bg-slate-700/50 group-hover:bg-slate-600/70'
                        : 'bg-gray-100 group-hover:bg-gray-200'
                      }`}>
                      <UserCircle size={16} />
                    </div>
                    <span className="text-sm font-medium">Profile</span>
                  </button>
                </div>

                {/* Logout section */}
                <div className={`px-2 py-2 border-t ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-150 group ${isDark
                        ? 'hover:bg-red-500/10 text-red-400 hover:text-red-300'
                        : 'hover:bg-red-50 text-red-500 hover:text-red-600'
                      } ${isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className={`p-1.5 rounded-md transition-colors ${isDark
                        ? 'bg-red-500/10 group-hover:bg-red-500/20'
                        : 'bg-red-50 group-hover:bg-red-100'
                      }`}>
                      <LogOut size={16} />
                    </div>
                    <span className="text-sm font-medium">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        isDark={isDark}
        userData={userData}
      />
    </>
  );
};

export default TopBar;