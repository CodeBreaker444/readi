'use client';

import { GroupedNotificationToast, type GroupedToast } from '@/components/notifications/GroupedNotificationToast';
import { Skeleton } from '@/components/ui/skeleton';
import type { Notification } from '@/config/types/notification';
import { Bell, BellOff, CheckCheck, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  HiOutlineAdjustments,
  HiOutlineBell,
  HiOutlineInformationCircle,
  HiOutlinePaperAirplane,
  HiOutlineUsers,
} from 'react-icons/hi';


interface CatConfig {
  label: string;
  icon: React.ElementType;
  bg: string;
  text: string;
  dot: string;
  tabKey: string;
}

const CATEGORY_CONFIG: Record<string, CatConfig> = {
  MAINTENANCE: { label: 'Maintenance', icon: HiOutlineAdjustments,          bg: 'bg-amber-500/10',  text: 'text-amber-600',  dot: 'bg-amber-500',  tabKey: 'maintenance' },
  MISSION:     { label: 'Mission',     icon: HiOutlinePaperAirplane,   bg: 'bg-blue-500/10',   text: 'text-blue-600',   dot: 'bg-blue-500',   tabKey: 'mission'      },
  GENERAL:     { label: 'General',     icon: HiOutlineBell,            bg: 'bg-slate-500/10',  text: 'text-slate-500',  dot: 'bg-slate-400',  tabKey: 'general'      },
  ASSIGNMENT:  { label: 'Assignment',  icon: HiOutlineUsers,           bg: 'bg-violet-500/10', text: 'text-violet-600', dot: 'bg-violet-500', tabKey: 'assignment'   },
  OTHER:       { label: 'Other',       icon: HiOutlineInformationCircle, bg: 'bg-gray-500/10', text: 'text-gray-500',   dot: 'bg-gray-400',   tabKey: 'other'        },
};

function normalizeCategory(procedureName?: string): string {
  if (!procedureName) return 'GENERAL';
  const u = procedureName.toUpperCase().replace(/[\s\-]/g, '_');
  if (u.includes('MAINTENANCE')) return 'MAINTENANCE';
  if (u.includes('MISSION'))     return 'MISSION';
  if (u.includes('ASSIGNMENT') || u.includes('ASSIGN')) return 'ASSIGNMENT';
  if (u.includes('GENERAL'))     return 'GENERAL';
  return 'OTHER';
}

const KNOWN_IDS_KEY = 'notif_known_ids';

function loadKnownIds(): Set<number> | null {
  try {
    const raw = sessionStorage.getItem(KNOWN_IDS_KEY);
    return raw ? new Set(JSON.parse(raw) as number[]) : null;
  } catch { return null; }
}

function persistKnownIds(ids: Set<number>) {
  try {
    let arr = [...ids];
    if (arr.length > 2000) arr = arr.slice(arr.length - 2000);
    sessionStorage.setItem(KNOWN_IDS_KEY, JSON.stringify(arr));
  } catch {}
}

// Supabase returns `timestamp without time zone` values without a trailing Z
// (e.g. "2026-06-05T10:30:00"), but they were stored as UTC via toISOString().
// Appending Z ensures JS parses them as UTC, not as local time.
function parseNotifDate(s: string): Date {
  return new Date(!s.endsWith('Z') && !s.includes('+') ? s + 'Z' : s);
}

function formatNotifTime(dateStr: string): string {
  const d = parseNotifDate(dateStr);
  const now = new Date();
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return timeStr;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday ${timeStr}`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + timeStr;
}

const POLL_INTERVAL = 10_000;


interface NotificationDropdownProps { isDark: boolean }

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isDark }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen]           = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading]         = useState(false);
  const [markingAll, setMarkingAll]   = useState(false);
  const [groupedToasts, setGroupedToasts] = useState<GroupedToast[]>([]);
  const dropdownRef     = useRef<HTMLDivElement>(null);
  const knownIdsRef     = useRef<Set<number> | null>(null);
  const lastFullFetchRef = useRef<number>(0);

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/notification/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 50 }),
      });
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const all: Notification[] = json.data;
        setNotifications(all);
        setUnreadCount(all.filter((n) => n.is_read === 'N').length);
        lastFullFetchRef.current = Date.now();
        if (knownIdsRef.current === null) {
          knownIdsRef.current = new Set(all.map((n) => n.notification_id));
          persistKnownIds(knownIdsRef.current);
        }
      }
    } catch {
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notification/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'UNREAD', limit: 100 }),
      });
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const incoming: Notification[] = json.data;
        setUnreadCount(incoming.length);
        if (knownIdsRef.current === null) {
          knownIdsRef.current = new Set(incoming.map((n) => n.notification_id));
          persistKnownIds(knownIdsRef.current);
        } else {
          const newNotifs = incoming.filter((n) => !knownIdsRef.current!.has(n.notification_id));
          if (newNotifs.length > 0) {
            newNotifs.forEach((n) => knownIdsRef.current!.add(n.notification_id));
            persistKnownIds(knownIdsRef.current!);

            // Group into one toast per category instead of one per notification
            const catMap: Record<string, Notification[]> = {};
            for (const n of newNotifs) {
              const cat = normalizeCategory(n.procedure_name);
              if (!catMap[cat]) catMap[cat] = [];
              catMap[cat].push(n);
            }
            const batched: GroupedToast[] = Object.entries(catMap).map(([cat, notifs]) => ({
              id: `${cat}-${Date.now()}-${Math.random()}`,
              category: cat,
              count: notifs.length,
              latestMessage: notifs[0].message,
              tabKey: CATEGORY_CONFIG[cat]?.tabKey ?? 'all',
            }));
            setGroupedToasts((prev) => [...prev, ...batched]);

            setNotifications((prev) => {
              const existingIds = new Set(prev.map((n) => n.notification_id));
              const fresh = newNotifs.filter((n) => !existingIds.has(n.notification_id));
              return fresh.length > 0 ? [...fresh, ...prev] : prev;
            });
          }
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (knownIdsRef.current === null) {
      knownIdsRef.current = loadKnownIds();
    }
  }, []);

  useEffect(() => {
    fetchNotifications(true);
    const timer = setInterval(fetchUnreadCount, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchNotifications, fetchUnreadCount]);

  useEffect(() => {
    if (!isOpen) return;
    if (Date.now() - lastFullFetchRef.current < POLL_INTERVAL) return;
    fetchNotifications();
  }, [isOpen, fetchNotifications]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: 'Y' as const, read_at: n.read_at ?? new Date().toISOString() }))
    );
    setUnreadCount(0);
    try {
      await fetch('/api/notification/mark-all-read', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
      });
    } catch { fetchNotifications(true); }
    finally { setMarkingAll(false); }
  };

  const recentFive = useMemo(() => notifications.slice(0, 5), [notifications]);

  const handleMarkRead = async (notif: Notification, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (notif.is_read === 'Y') return;
    setNotifications((prev) =>
      prev.map((n) =>
        n.notification_id === notif.notification_id
          ? { ...n, is_read: 'Y', read_at: new Date().toISOString() }
          : n
      )
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await fetch('/api/notification/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_id: notif.notification_id }),
      });
    } catch { fetchNotifications(true); }
  };

  const dismissGroupedToast = (id: string) =>
    setGroupedToasts((prev) => prev.filter((t) => t.id !== id));

  const bg     = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200';
  const subtext = isDark ? 'text-gray-400' : 'text-gray-500';
  const divider = isDark ? 'border-slate-700' : 'border-gray-100';

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen((o) => !o)}
          className={`relative p-2 rounded-lg transition-colors cursor-pointer ${
            isDark ? 'hover:bg-slate-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
          } ${isOpen ? (isDark ? 'bg-slate-700' : 'bg-gray-100') : ''}`}
          aria-label={t('notifications.title')}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-4.5 h-4.5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold px-0.5 leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div
            className={`absolute right-0 mt-2 w-80 rounded-xl shadow-xl border z-50 flex flex-col overflow-hidden ${bg}`}
            style={{ maxHeight: '480px' }}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b ${divider} shrink-0`}>
              <div className="flex items-center gap-2">
                <Bell size={15} className={subtext} />
                <span className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  {t('notifications.title')}
                </span>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {unreadCount}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={markingAll}
                  className={`flex items-center gap-1 text-xs font-medium transition-colors cursor-pointer ${
                    isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                  } disabled:opacity-50`}
                >
                  {markingAll ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={12} />}
                  {t('notifications.markAllRead')}
                </button>
              )}
            </div>

            {/* Recent 5 notifications */}
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <ul>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <li
                      key={i}
                      className={`flex items-start gap-3 px-4 py-3 ${
                        i !== 0 ? `border-t ${divider}` : ''
                      }`}
                    >
                      <Skeleton className="mt-0.5 w-7 h-7 rounded-lg shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-3.5 w-20 rounded" />
                          <Skeleton className="h-3 w-8 rounded" />
                        </div>
                        <Skeleton className="h-3 w-full rounded" />
                        <Skeleton className="h-3 w-2/3 rounded" />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : recentFive.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <BellOff size={28} className={subtext} />
                  <p className={`text-sm ${subtext}`}>{t('notifications.empty')}</p>
                </div>
              ) : (
                <ul>
                  {recentFive.map((notif, idx) => {
                    const isUnread = notif.is_read === 'N';
                    const cfg = CATEGORY_CONFIG[normalizeCategory(notif.procedure_name)] ?? CATEGORY_CONFIG.OTHER;
                    const CatIcon = cfg.icon;
                    return (
                      <li
                        key={notif.notification_id}
                        className={`relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                          idx !== 0 ? `border-t ${divider}` : ''
                        } ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}`}
                        onClick={() => handleMarkRead(notif)}
                      >
                        {/* Unread dot */}
                        {isUnread && (
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0" />
                        )}

                        {/* Category icon */}
                        <span className={`mt-0.5 shrink-0 p-1.5 rounded-lg ${cfg.bg}`}>
                          <CatIcon size={13} className={cfg.text} />
                        </span>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text}`}>
                              {cfg.label}
                            </span>
                            <span className={`text-[10px] ml-auto ${subtext}`}>
                              {formatNotifTime(notif.created_at)}
                            </span>
                          </div>
                          <p className={`text-xs leading-snug line-clamp-2 ${
                            isUnread
                              ? isDark ? 'text-white font-medium' : 'text-gray-900 font-medium'
                              : subtext
                          }`}>
                            {notif.message}
                          </p>
                          {notif.sender_fullname && (
                            <p className={`text-[10px] mt-0.5 ${subtext}`}>{notif.sender_fullname}</p>
                          )}
                        </div>

                        {/* Mark-read button */}
                        {isUnread && (
                          <button
                            title={t('notifications.markAsRead')}
                            onClick={(e) => handleMarkRead(notif, e)}
                            className={`shrink-0 mt-0.5 p-1 rounded cursor-pointer transition-colors ${
                              isDark ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-gray-200 text-gray-500'
                            }`}
                          >
                            <CheckCheck size={12} />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className={`border-t ${divider} shrink-0`}>
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className={`flex items-center justify-center gap-2 text-xs font-semibold py-3 transition-colors cursor-pointer ${
                  isDark
                    ? 'text-blue-400 hover:text-blue-300 hover:bg-slate-700/50'
                    : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50/60'
                }`}
              >
                <Bell size={12} />
                {t('notifications.viewAll')} ({unreadCount > 0 ? `${unreadCount} unread` : 'all read'})
              </Link>
            </div>
          </div>
        )}
      </div>

      {groupedToasts.length > 0 &&
        createPortal(
          <div className="fixed top-6 right-6 z-9999 flex flex-col gap-2 items-end pointer-events-none">
            {groupedToasts.map((toast) => (
              <div key={toast.id} className="pointer-events-auto">
                <GroupedNotificationToast
                  toast={toast}
                  isDark={isDark}
                  onDismiss={() => dismissGroupedToast(toast.id)}
                />
              </div>
            ))}
          </div>,
          document.body
        )}
    </>
  );
};

export default NotificationDropdown;