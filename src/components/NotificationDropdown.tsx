'use client';

import { NotificationToast } from '@/components/notifications/NotificationToast';
import type { Notification } from '@/config/types/notification';
import { Bell, BellOff, CheckCheck, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  HiOutlineBell,
  HiOutlineInformationCircle,
  HiOutlinePaperAirplane,
  HiOutlineUsers,
  HiOutlineAdjustments,
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

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

const POLL_INTERVAL = 10_000;

// ─── Component ────────────────────────────────────────────────────────────────

interface NotificationDropdownProps { isDark: boolean }

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isDark }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen]           = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading]         = useState(false);
  const [markingAll, setMarkingAll]   = useState(false);
  const [toasts, setToasts]           = useState<Notification[]>([]);
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
        if (knownIdsRef.current === null)
          knownIdsRef.current = new Set(all.map((n) => n.notification_id));
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
        } else {
          const newNotifs = incoming.filter((n) => !knownIdsRef.current!.has(n.notification_id));
          if (newNotifs.length > 0) {
            newNotifs.forEach((n) => knownIdsRef.current!.add(n.notification_id));
            setToasts((prev) => [...prev, ...newNotifs]);
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

  // ── Group notifications by category ──
  const grouped = useMemo(() => {
    const map: Record<string, { unread: number; total: number; latest: Notification; key: string }> = {};
    for (const n of notifications) {
      const key = normalizeCategory(n.procedure_name);
      if (!map[key]) map[key] = { unread: 0, total: 0, latest: n, key };
      map[key].total++;
      if (n.is_read === 'N') map[key].unread++;
    }
    return Object.values(map).sort((a, b) => b.unread - a.unread);
  }, [notifications]);

  const dismissToast = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.notification_id !== id));

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

            {/* Group cards */}
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={22} className={`animate-spin ${subtext}`} />
                </div>
              ) : grouped.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <BellOff size={28} className={subtext} />
                  <p className={`text-sm ${subtext}`}>{t('notifications.empty')}</p>
                </div>
              ) : (
                <div className="p-2 space-y-1.5">
                  {grouped.map((group) => {
                    const cfg = CATEGORY_CONFIG[group.key] ?? CATEGORY_CONFIG.OTHER;
                    const Icon = cfg.icon;
                    return (
                      <Link
                        key={group.key}
                        href={`/notifications?tab=${cfg.tabKey}`}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 px-3 py-3 rounded-xl border transition-all cursor-pointer ${
                          isDark
                            ? 'hover:bg-slate-700/60 border-slate-700/50 hover:border-slate-600'
                            : 'hover:bg-slate-50 border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        {/* Icon */}
                        <span className={`shrink-0 p-2.5 rounded-xl ${cfg.bg}`}>
                          <Icon size={16} className={cfg.text} />
                        </span>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-[13px] font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                              {cfg.label}
                            </span>
                            {group.unread > 0 && (
                              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                                {group.unread} new
                              </span>
                            )}
                          </div>
                          <p className={`text-[11px] mt-0.5 leading-snug line-clamp-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {group.latest.message}
                          </p>
                        </div>

                        {/* Total count + time */}
                        <div className="shrink-0 text-right">
                          <p className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {group.total} total
                          </p>
                          <p className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                            {timeAgo(group.latest.created_at)}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`border-t ${divider} shrink-0`}>
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className={`flex items-center justify-center gap-1.5 text-sm font-medium py-3 transition-colors cursor-pointer ${
                  isDark
                    ? 'text-blue-400 hover:text-blue-300 hover:bg-slate-700'
                    : 'text-blue-600 hover:text-blue-700 hover:bg-gray-50'
                }`}
              >
                {t('notifications.viewAll')}
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Toasts */}
      {toasts.length > 0 &&
        createPortal(
          <div className="fixed top-6 right-6 z-9999 flex flex-col gap-2 items-end pointer-events-none">
            {toasts.map((notif) => (
              <div key={notif.notification_id} className="pointer-events-auto">
                <NotificationToast
                  notification={notif}
                  isDark={isDark}
                  onDismiss={() => dismissToast(notif.notification_id)}
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
