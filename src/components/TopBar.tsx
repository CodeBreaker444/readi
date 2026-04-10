'use client';

import { SessionUser } from '@/lib/auth/server-session';
import { AlertTriangle, ChevronDown, LogOut, Moon, Search, Send, Sparkles, Sun, User, UserCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase/client';
import NotificationDropdown from './NotificationDropdown';
import ProfileModal from './ProfileModal';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface TopBarProps {
  isDark: boolean;
  toggleTheme: () => void;
  userData: SessionUser | null;
}

const CHAT_RESTRICTED_ROLES = ['SUPERADMIN', 'ADMIN'];

const TopBar: React.FC<TopBarProps> = ({ isDark, toggleTheme, userData }) => {
  const isChatRestricted = CHAT_RESTRICTED_ROLES.includes(userData?.role ?? '');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [tokenUsage, setTokenUsage] = useState<{ percent: number; remaining: number } | null>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!isChatRestricted) setShowSearch(true);
      }
      if (e.key === 'Escape') setShowSearch(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isChatRestricted]);

  useEffect(() => {
    if (showSearch) {
      setTimeout(() => chatInputRef.current?.focus(), 50);
      fetch('/api/agent/usage/me')
        .then((r) => r.json())
        .then((d) => {
          if (d?.user) setTokenUsage({ percent: d.user.percent, remaining: d.user.remaining });
        })
        .catch(() => null);
    }
  }, [showSearch]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  const handleChatSend = async () => {
    const question = chatInput.trim();
    if (!question || chatLoading) return;

    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: question }]);
    setChatLoading(true);

    try {
      const res = await fetch('/api/agent/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.answer ?? data.error ?? 'No response.' },
      ]);
    } catch {
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Failed to connect to the server.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  };


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
      <div className={`h-[69px] ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'} border-b flex items-center justify-between px-3 sm:px-6`}>
        <div />

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => { if (!isChatRestricted) setShowSearch(true); }}
            className={`sm:hidden flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 ${isDark
                ? 'bg-slate-800/80 text-violet-400 hover:bg-slate-800'
                : 'bg-gray-50/80 text-violet-500 hover:bg-gray-100/80'
              } ${isChatRestricted ? 'cursor-not-allowed opacity-70' : ''}`}
          >
            <Search size={16} />
          </button>

          <button
            onClick={() => { if (!isChatRestricted) setShowSearch(true); }}
            className={`group relative hidden sm:flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm transition-all duration-200 w-60 ${isDark
                ? 'bg-slate-800/80 text-slate-400 hover:text-slate-300 hover:bg-slate-800'
                : 'bg-gray-50/80 text-gray-400 hover:text-gray-500 hover:bg-gray-100/80'
              } ${isChatRestricted ? 'cursor-not-allowed opacity-70' : ''}`}
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
                  ? 'bg-linear-to-r from-violet-500/10 via-transparent to-indigo-500/10'
                  : 'bg-linear-to-r from-violet-400/5 via-transparent to-indigo-400/5'
                }`}
            />
            <div className={`relative flex items-center justify-center w-5 h-5 rounded-md ${isDark
                ? 'bg-violet-500/10 group-hover:bg-violet-500/15'
                : 'bg-violet-50 group-hover:bg-violet-100/80'
              } transition-colors duration-200`}>
              <Search size={12} className={`shrink-0 transition-colors duration-200 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
            </div>
            <span className="relative flex-1 text-left text-[13px] tracking-wide">
              Ask anything…
            </span>
            {isChatRestricted ? (
              <span className={`relative inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${isDark
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'bg-amber-50 text-amber-600 border border-amber-200'
              }`}>
                Coming Soon
              </span>
            ) : (
              <kbd className={`relative inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium transition-colors duration-200 ${isDark
                  ? 'bg-slate-700/60 text-slate-500 group-hover:bg-slate-700 group-hover:text-slate-400 border border-slate-600/50'
                  : 'bg-white/80 text-gray-400 group-hover:bg-white group-hover:text-gray-500 border border-gray-200/80 shadow-sm'
                }`}>
                {isMac ? <><span className="text-[11px]">⌘</span>K</> : 'Ctrl K'}
              </kbd>
            )}
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
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setShowSearch(false)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          <div
            className={`relative w-full max-w-2xl mx-4 rounded-2xl shadow-2xl border flex flex-col overflow-hidden ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}
            style={{ height: 'min(90vh, 560px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-5 py-4 border-b shrink-0 ${isDark ? 'border-slate-700/80' : 'border-gray-100'}`}>
              <div className="flex items-center gap-2.5">
                <div className={`flex items-center justify-center w-7 h-7 rounded-lg ${isDark ? 'bg-violet-500/15' : 'bg-violet-50'}`}>
                  <Sparkles size={14} className="text-violet-500" />
                </div>
                <div>
                  <p className={`text-sm font-semibold leading-none ${isDark ? 'text-white' : 'text-gray-900'}`}>READI AI Agent</p>
                  <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    {userData?.role ?? 'Assistant'}
                  </p>
                </div>
              </div>
              {tokenUsage && tokenUsage.percent >= 70 && (
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium ${
                  tokenUsage.percent >= 90
                    ? (isDark ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-600')
                    : (isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-600')
                }`}>
                  <AlertTriangle size={11} />
                  <span>Only {100 - tokenUsage.percent}% remaining</span>
                </div>
              )}
              <button
                onClick={() => setShowSearch(false)}
                className={`text-[10px] font-medium px-2 py-1 rounded border transition-colors ${isDark ? 'bg-slate-800 border-slate-600 text-slate-400 hover:text-slate-200' : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-600'}`}
              >
                Esc
              </button>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
              {chatMessages.length === 0 && !chatLoading ? (
                <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
                  <div className={`flex items-center justify-center w-14 h-14 rounded-2xl ${isDark ? 'bg-violet-500/10' : 'bg-violet-50'}`}>
                    <Sparkles size={26} className="text-violet-500" />
                  </div>
                  <div className="space-y-1.5">
                    <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      How can I help you?
                    </p>
                    <p className={`text-xs max-w-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      Ask about your missions, fleet, alerts, compliance, maintenance, and more.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 w-full max-w-sm mt-2">
                    {(['How many missions have I completed?', 'List active alerts', 'Show open maintenance tickets', 'What are my KPI values?'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => { setChatInput(s); chatInputRef.current?.focus(); }}
                        className={`text-left text-[11px] px-3 py-2 rounded-xl border transition-colors leading-snug ${isDark
                          ? 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                          : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-200 hover:text-gray-700'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${msg.role === 'user'
                        ? 'bg-violet-600'
                        : (isDark ? 'bg-slate-700' : 'bg-gray-100')}`}>
                        {msg.role === 'user'
                          ? <User size={13} className="text-white" />
                          : <Sparkles size={13} className={isDark ? 'text-violet-400' : 'text-violet-500'} />}
                      </div>
                      <div className={`text-sm leading-relaxed max-w-[78%] px-4 py-2.5 rounded-2xl whitespace-pre-wrap ${msg.role === 'user'
                        ? (isDark
                          ? 'bg-violet-600 text-white rounded-tr-sm'
                          : 'bg-violet-600 text-white rounded-tr-sm')
                        : (isDark
                          ? 'bg-slate-800 text-slate-200 rounded-tl-sm'
                          : 'bg-gray-100 text-gray-800 rounded-tl-sm')}`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex gap-3">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                        <Sparkles size={13} className={isDark ? 'text-violet-400' : 'text-violet-500'} />
                      </div>
                      <div className={`px-4 py-3 rounded-2xl rounded-tl-sm ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </>
              )}
            </div>

            {/* Input area */}
            <div className={`shrink-0 px-4 py-3 border-t ${isDark ? 'border-slate-700/80' : 'border-gray-100'}`}>
              <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-colors ${isDark
                ? 'bg-slate-800 border-slate-600 focus-within:border-violet-500/60'
                : 'bg-gray-50 border-gray-200 focus-within:border-violet-400/60'}`}>
                <input
                  ref={chatInputRef}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleChatSend();
                    }
                  }}
                  placeholder="Type a message…"
                  disabled={chatLoading}
                  className={`flex-1 bg-transparent text-sm outline-none ${isDark ? 'text-white placeholder-slate-500' : 'text-gray-900 placeholder-gray-400'}`}
                />
                <button
                  onClick={handleChatSend}
                  disabled={chatLoading || !chatInput.trim()}
                  className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${chatInput.trim() && !chatLoading
                    ? 'bg-violet-600 hover:bg-violet-700 text-white cursor-pointer'
                    : (isDark ? 'bg-slate-700 text-slate-600 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed')}`}
                >
                  <Send size={14} />
                </button>
              </div>
              <p className={`text-[10px] text-center mt-2 ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
                Press <kbd className={`px-1 rounded text-[9px] border ${isDark ? 'border-slate-600 bg-slate-700' : 'border-gray-200 bg-gray-100'}`}>Enter</kbd> to send
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TopBar;