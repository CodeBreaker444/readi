'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { SessionUser } from '@/lib/auth/server-session';
import { AlertTriangle, Check, ChevronDown, FileText, Moon, Search, Send, Settings, Sparkles, Sun, User, UserCog, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSelect } from './LanguageSelect';
import NotificationDropdown from './NotificationDropdown';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  references?: Array<{ url: string; title: string; source: string }>;
}

interface OpmUser {
  userId: number;
  email: string;
  fullname: string;
  username?: string;
}

interface TopBarProps {
  isDark: boolean;
  toggleTheme: () => void;
  userData: SessionUser | null;
}

// Only SUPERADMIN has chat fully disabled; ADMIN gets OPM impersonation mode
const CHAT_RESTRICTED_ROLES = ['SUPERADMIN'];

const TopBar: React.FC<TopBarProps> = ({ isDark, toggleTheme, userData }) => {
  const { t } = useTranslation();
  const isChatRestricted = CHAT_RESTRICTED_ROLES.includes(userData?.role ?? '');
  const isAdmin = userData?.role === 'ADMIN';

  const [showSearch, setShowSearch] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [tokenUsage, setTokenUsage] = useState<{ percent: number; remaining: number } | null>(null);

  // OPM impersonation (admin only)
  const [opmUsers, setOpmUsers] = useState<OpmUser[]>([]);
  const [impersonatedOpm, setImpersonatedOpm] = useState<OpmUser | null>(null);
  const [showOpmPicker, setShowOpmPicker] = useState(false);
  const [opmLoading, setOpmLoading] = useState(false);

  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!isChatRestricted) setShowSearch(true);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
        setShowOpmPicker(false);
      }
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

      // Fetch OPM users for admin when chat opens (only once)
      if (isAdmin && opmUsers.length === 0) {
        setOpmLoading(true);
        fetch('/api/agent/opm-users')
          .then((r) => r.json())
          .then((d) => { if (Array.isArray(d.users)) setOpmUsers(d.users); })
          .catch(() => null)
          .finally(() => setOpmLoading(false));
      }
    }
  }, [showSearch, isAdmin, opmUsers.length]);

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
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      // Admin impersonating an OPM user — agent answers as if it were that OPM user
      if (isAdmin && impersonatedOpm) {
        headers['x-opm-impersonate'] = impersonatedOpm.email;
      }

      const res = await fetch('/api/agent/ask', {
        method: 'POST',
        headers,
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setChatMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer ?? data.error ?? 'No response.',
          references: data.references || [],
        },
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

  const selectOpm = (user: OpmUser) => {
    setImpersonatedOpm(user);
    setShowOpmPicker(false);
    setChatMessages([]); // clear history when switching OPM context
  };

  const clearOpm = () => {
    setImpersonatedOpm(null);
    setChatMessages([]);
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
            style={{ border: '1px solid transparent', backgroundClip: 'padding-box' }}
          >
            <span
              className={`pointer-events-none absolute inset-0 rounded-xl transition-opacity duration-200 ${isDark ? 'opacity-40 group-hover:opacity-70' : 'opacity-30 group-hover:opacity-50'}`}
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
            <span className={`pointer-events-none absolute -inset-px rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm ${isDark ? 'bg-linear-to-r from-violet-500/10 via-transparent to-indigo-500/10' : 'bg-linear-to-r from-violet-400/5 via-transparent to-indigo-400/5'}`} />
            <div className={`relative flex items-center justify-center w-5 h-5 rounded-md ${isDark ? 'bg-violet-500/10 group-hover:bg-violet-500/15' : 'bg-violet-50 group-hover:bg-violet-100/80'} transition-colors duration-200`}>
              <Search size={12} className={`shrink-0 transition-colors duration-200 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
            </div>
            <span className="relative flex-1 text-left text-[13px] tracking-wide">{t('topbar.askAnything')}</span>
            {isChatRestricted ? (
              <span className={`relative inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${isDark ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                {t('topbar.comingSoon')}
              </span>
            ) : (
              <kbd className={`relative inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium transition-colors duration-200 ${isDark ? 'bg-slate-700/60 text-slate-500 group-hover:bg-slate-700 group-hover:text-slate-400 border border-slate-600/50' : 'bg-white/80 text-gray-400 group-hover:bg-white group-hover:text-gray-500 border border-gray-200/80 shadow-sm'}`}>
                {isMac ? <><span className="text-[11px]">⌘</span>K</> : 'Ctrl K'}
              </kbd>
            )}
          </button>

          <LanguageSelect isDark={isDark} />

          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
            aria-label={t('topbar.toggleTheme')}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>


          <NotificationDropdown isDark={isDark} />
        </div>
      </div>

      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowSearch(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          <div
            className={`relative w-full max-w-2xl mx-4 rounded-2xl shadow-2xl border flex flex-col overflow-hidden ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}
            style={{ height: 'min(90vh, 600px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between px-5 py-4 border-b shrink-0 ${isDark ? 'border-slate-700/80' : 'border-gray-100'}`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${isDark ? 'bg-violet-500/15' : 'bg-violet-50'}`}>
                  <Sparkles size={14} className="text-violet-500" />
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold leading-none ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('chat.title')}</p>
                  <p className={`text-[11px] mt-0.5 truncate ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    {impersonatedOpm
                      ? t('chat.actingAs', { name: impersonatedOpm.fullname })
                      : (userData?.role ?? 'Assistant')}
                  </p>
                </div>

                {isAdmin && (
                  <div className="relative ml-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowOpmPicker(!showOpmPicker); }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all ${
                        impersonatedOpm
                          ? (isDark ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700')
                          : (isDark ? 'bg-slate-700/60 border-slate-600 text-slate-400 hover:text-slate-300' : 'bg-gray-100 border-gray-200 text-gray-500 hover:text-gray-700')
                      }`}
                      title={t('chat.actAsOpmUser')}
                    >
                      <UserCog size={11} />
                      <span>{impersonatedOpm ? impersonatedOpm.username || impersonatedOpm.fullname : t('chat.opmView')}</span>
                      {impersonatedOpm
                        ? <X size={9} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); clearOpm(); }} />
                        : <ChevronDown size={9} className="opacity-60" />
                      }
                    </button>

                    {showOpmPicker && (
                      <div
                        className={`absolute left-0 top-full mt-1.5 w-72 rounded-xl border shadow-2xl z-50 overflow-hidden ${isDark ? 'bg-slate-900 border-slate-700/80' : 'bg-white border-gray-200'}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Header */}
                        <div className={`flex items-center gap-2 px-3 py-2.5 border-b ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
                          <UserCog size={12} className={isDark ? 'text-slate-500' : 'text-gray-400'} />
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                            {t('chat.chatAsOpm')}
                          </span>
                        </div>

                        <div className="p-1.5 max-h-56 overflow-y-auto space-y-0.5">
                          {opmLoading ? (
                            // Skeleton rows
                            Array.from({ length: 4 }).map((_, i) => (
                              <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${isDark ? 'bg-slate-800/40' : 'bg-gray-50/60'}`}>
                                <Skeleton className={`w-7 h-7 rounded-full shrink-0 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                                <div className="flex-1 space-y-1.5">
                                  <Skeleton className={`h-2.5 w-28 rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                                  <Skeleton className={`h-2 w-36 rounded ${isDark ? 'bg-slate-700/70' : 'bg-gray-100'}`} />
                                </div>
                              </div>
                            ))
                          ) : opmUsers.length === 0 ? (
                            <div className={`px-3 py-6 text-center text-[11px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                              {t('chat.noOpmUsers')}
                            </div>
                          ) : (
                            opmUsers.map((u) => {
                              const isActive = impersonatedOpm?.userId === u.userId;
                              const initial = u.fullname?.charAt(0)?.toUpperCase() ?? '?';
                              return (
                                <button
                                  key={u.userId}
                                  onClick={() => selectOpm(u)}
                                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                                    isActive
                                      ? isDark ? 'bg-amber-500/15 border border-amber-500/25' : 'bg-amber-50 border border-amber-200'
                                      : isDark ? 'hover:bg-slate-800 border border-transparent' : 'hover:bg-gray-50 border border-transparent'
                                  }`}
                                >
                                  {/* Avatar with initial */}
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold ${
                                    isActive
                                      ? isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
                                      : isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {initial}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className={`text-[11px] font-semibold truncate ${
                                      isActive
                                        ? isDark ? 'text-amber-300' : 'text-amber-700'
                                        : isDark ? 'text-slate-200' : 'text-gray-800'
                                    }`}>
                                      {u.fullname}
                                    </p>
                                    <p className={`text-[10px] truncate mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                                      {u.username ? `@${u.username}` : u.email}
                                    </p>
                                  </div>
                                  {isActive && <Check size={11} className={`shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />}
                                </button>
                              );
                            })
                          )}
                        </div>

                        {impersonatedOpm && (
                          <div className={`border-t px-2 py-1.5 ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
                            <button
                              onClick={(e) => { e.stopPropagation(); clearOpm(); setShowOpmPicker(false); }}
                              className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                                isDark ? 'text-slate-500 hover:text-rose-400 hover:bg-rose-500/10' : 'text-gray-400 hover:text-rose-500 hover:bg-rose-50'
                              }`}
                            >
                              <X size={10} />
                              {t('chat.clearOpmView')}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-2">
                {tokenUsage && tokenUsage.percent >= 70 && (
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium ${
                    tokenUsage.percent >= 90
                      ? (isDark ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-600')
                      : (isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-600')
                  }`}>
                    <AlertTriangle size={11} />
                    <span>{t('chat.tokenWarning', { percent: 100 - tokenUsage.percent })}</span>
                  </div>
                )}
                {isAdmin && (
                  <button
                    onClick={() => { setShowSearch(false); router.push('/knowledge-config'); }}
                    className={`p-1.5 cursor-pointer rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-violet-400' : 'text-gray-400 hover:bg-gray-100 hover:text-violet-600'}`}
                    aria-label={t('knowledge.title')}
                    title={t('knowledge.title')}
                  >
                    <Settings size={15} />
                  </button>
                )}
                <button
                  onClick={() => setShowSearch(false)}
                  className={`text-[10px] cursor-pointer font-medium px-2 py-1 rounded border transition-colors ${isDark ? 'bg-slate-800 border-slate-600 text-slate-400 hover:text-slate-200' : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-600'}`}
                >
                  Esc
                </button>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
              {chatMessages.length === 0 && !chatLoading ? (
                <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
                  <div className={`flex items-center justify-center w-14 h-14 rounded-2xl ${isDark ? 'bg-violet-500/10' : 'bg-violet-50'}`}>
                    <Sparkles size={26} className="text-violet-500" />
                  </div>
                  <div className="space-y-1.5">
                    <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('chat.howCanIHelp')}</p>
                    <p className={`text-xs max-w-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      {isAdmin && impersonatedOpm
                        ? t('chat.descriptionOpm', { name: impersonatedOpm.fullname })
                        : t('chat.description')}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 w-full max-w-sm mt-2">
                    {(['chat.missions', 'chat.alerts', 'chat.maintenance', 'chat.kpi'] as const).map((key) => (
                      <button
                        key={key}
                        onClick={() => { setChatInput(t(key)); chatInputRef.current?.focus(); }}
                        className={`text-left text-[11px] px-3 py-2 rounded-xl border transition-colors leading-snug ${isDark
                          ? 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                          : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-200 hover:text-gray-700'}`}
                      >
                        {t(key)}
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
                      <div className={`max-w-[78%] ${msg.role === 'user' ? '' : 'flex flex-col gap-1.5'}`}>
                        <div className={`text-sm leading-relaxed px-4 py-2.5 rounded-2xl whitespace-pre-wrap ${msg.role === 'user'
                          ? 'bg-violet-600 text-white rounded-tr-sm'
                          : (isDark ? 'bg-slate-800 text-slate-200 rounded-tl-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm')}`}>
                          {msg.content}
                        </div>

                        {/* Reference links on assistant messages */}
                        {msg.role === 'assistant' && msg.references && msg.references.length > 0 && (
                          <div className={`flex flex-wrap gap-1.5 px-1`}>
                            {msg.references.map((ref, ri) => (
                              <a
                                key={ri}
                                href={ref.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg border transition-colors no-underline ${isDark
                                  ? 'bg-slate-800/60 border-slate-700 text-violet-400 hover:border-violet-500/50 hover:bg-slate-700'
                                  : 'bg-gray-50 border-gray-200 text-violet-600 hover:border-violet-300 hover:bg-violet-50'}`}
                              >
                                <FileText size={9} />
                                <span className="truncate max-w-[140px]">{ref.title || ref.source}</span>
                              </a>
                            ))}
                          </div>
                        )}
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
              {/* Impersonation banner */}
              {isAdmin && impersonatedOpm && (
                <div className={`flex items-center justify-between mb-2 px-3 py-1.5 rounded-lg text-[11px] font-medium ${isDark ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
                  <span>{t('chat.actingAs', { name: impersonatedOpm.fullname })}</span>
                  <button onClick={clearOpm} className="hover:opacity-70 transition-opacity ml-2">
                    <X size={11} />
                  </button>
                </div>
              )}
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
                  placeholder={isAdmin && impersonatedOpm ? t('chat.placeholderAs', { name: impersonatedOpm.fullname }) : t('chat.placeholder')}
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
                {t('chat.pressEnterPrefix')} <kbd className={`px-1 rounded text-[9px] border ${isDark ? 'border-slate-600 bg-slate-700' : 'border-gray-200 bg-gray-100'}`}>Enter</kbd> {t('chat.pressEnterSuffix')}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TopBar;
