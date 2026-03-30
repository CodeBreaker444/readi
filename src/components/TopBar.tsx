'use client';

import { SessionUser } from '@/lib/auth/server-session';
import { ChevronDown, LogOut, Moon, Search, Sparkles, Sun, User, UserCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
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
  const [showSearch, setShowSearch] = useState(false);
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') setShowSearch(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);


  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      await supabase.auth.signOut();

      await fetch('/api/auth/logout', { method: 'POST' });

      setShowUserMenu(false);

      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Unexpected logout error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <div className={`h-[69px] ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'} border-b flex items-center justify-between px-6`}>
        <div />

        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowSearch(true)}
            className={`group relative flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm transition-all duration-200 w-60 ${isDark
                ? 'bg-slate-800/80 text-slate-400 hover:text-slate-300 hover:bg-slate-800'
                : 'bg-gray-50/80 text-gray-400 hover:text-gray-500 hover:bg-gray-100/80'
              }`}
            style={{
              border: '1px solid transparent',
              backgroundClip: 'padding-box',
            }}
          >
            <span
              className={`pointer-events-none absolute inset-0 rounded-xl transition-opacity duration-200 ${isDark
                  ? 'opacity-40 group-hover:opacity-70'
                  : 'opacity-30 group-hover:opacity-50'
                }`}
              style={{
                padding: '1px',
                background: isDark
                  ? 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(99,102,241,0.15), rgba(71,85,105,0.3))'
                  : 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(99,102,241,0.1), rgba(209,213,219,0.5))',
                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude',
                borderRadius: 'inherit',
              }}
            />

            <span
              className={`pointer-events-none absolute -inset-px rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm ${isDark
                  ? 'bg-gradient-to-r from-violet-500/10 via-transparent to-indigo-500/10'
                  : 'bg-gradient-to-r from-violet-400/5 via-transparent to-indigo-400/5'
                }`}
            />

            <div className={`relative flex items-center justify-center w-5 h-5 rounded-md ${isDark
                ? 'bg-violet-500/10 group-hover:bg-violet-500/15'
                : 'bg-violet-50 group-hover:bg-violet-100/80'
              } transition-colors duration-200`}>
              <Search size={12} className={`shrink-0 transition-colors duration-200 ${isDark ? 'text-violet-400' : 'text-violet-500'
                }`} />
            </div>

            <span className="relative flex-1 text-left text-[13px] tracking-wide">
              Ask anything…
            </span>

            <kbd className={`relative hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium transition-colors duration-200 ${isDark
                ? 'bg-slate-700/60 text-slate-500 group-hover:bg-slate-700 group-hover:text-slate-400 border border-slate-600/50'
                : 'bg-white/80 text-gray-400 group-hover:bg-white group-hover:text-gray-500 border border-gray-200/80 shadow-sm'
              }`}>
              {isMac ? <><span className="text-[11px]">⌘</span>K</> : 'Ctrl K'}
            </kbd>
          </button>
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

      {showSearch && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
          onClick={() => setShowSearch(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          <div
            className={`relative w-full max-w-xl mx-4 rounded-2xl shadow-2xl border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'
              }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center gap-3 px-4 py-3.5 border-b ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
              <Search size={16} className={isDark ? 'text-slate-500' : 'text-gray-400'} />
              <input
                autoFocus
                readOnly
                placeholder="Ask anything…"
                className={`flex-1 bg-transparent text-sm outline-none placeholder:text-sm ${isDark ? 'text-white placeholder-slate-500' : 'text-gray-900 placeholder-gray-400'
                  }`}
              />
              <kbd
                onClick={() => setShowSearch(false)}
                className={`cursor-pointer text-[10px] px-1.5 py-0.5 rounded border font-medium ${isDark ? 'bg-slate-800 border-slate-600 text-slate-400' : 'bg-gray-100 border-gray-300 text-gray-400'
                  }`}
              >
                Esc
              </kbd>
            </div>

            <div className="flex flex-col items-center justify-center gap-3 px-6 py-12">
              <div className={`flex items-center justify-center w-12 h-12 rounded-2xl ${isDark ? 'bg-violet-500/10' : 'bg-violet-50'}`}>
                <Sparkles size={22} className="text-violet-500" />
              </div>
              <div className="text-center space-y-1">
                <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  AI Chat Agent — Coming Soon
                </p>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  Ask questions about your fleet, operations, and maintenance — all in one place.
                </p>
                <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
                  Press{' '}
                  <kbd className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] border ${isDark ? 'bg-slate-800 border-slate-600 text-slate-400' : 'bg-gray-100 border-gray-300 text-gray-500'}`}>
                    {isMac ? <><span className="text-[12px]">⌘</span>K</> : 'Ctrl K'}
                  </kbd>{' '}
                  to open anytime
                </p>
              </div>
              <span className={`mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${isDark ? 'bg-violet-500/10 text-violet-400' : 'bg-violet-50 text-violet-600'
                }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                In development
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TopBar;