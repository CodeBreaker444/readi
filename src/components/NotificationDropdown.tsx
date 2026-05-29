'use client';

import type { Notification } from '@/config/types/notification';
import { NotificationToast } from '@/components/notifications/NotificationToast';
import { Bell, BellOff, Check, CheckCheck, Loader2, X } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

interface NotificationDropdownProps {
  isDark: boolean;
}

interface ItemProps {
  notif: Notification;
  isUnread: boolean;
  isDark: boolean;
  subtext: string;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = Math.floor((now - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const POLL_INTERVAL = 2_000;

const NotificationItem: React.FC<ItemProps> = ({ notif, isUnread, isDark, subtext }) => (
  <div className="flex items-start gap-3">
    <div
      className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold overflow-hidden ${
        isDark ? 'bg-slate-600 text-gray-300' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {notif.sender_profile ? (
        <img src={notif.sender_profile} alt={notif.sender_fullname ?? ''} className="w-full h-full object-cover" />
      ) : notif.sender_fullname ? (
        notif.sender_fullname.charAt(0).toUpperCase()
      ) : (
        <Bell size={14} />
      )}
    </div>

    <div className="flex-1 min-w-0">
      {notif.procedure_name && (
        <span
          className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mb-0.5 ${
            isDark ? 'bg-slate-600 text-gray-300' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {notif.procedure_name.charAt(0).toUpperCase() +
            notif.procedure_name.slice(1).toLowerCase().replace(/_/g, ' ')}
        </span>
      )}
      <p
        className={`text-xs leading-snug line-clamp-2 ${
          isUnread ? (isDark ? 'text-white font-medium' : 'text-gray-900 font-medium') : subtext
        }`}
      >
        {notif.message}
      </p>
      <div className="flex items-center gap-1.5 mt-0.5">
        {notif.sender_fullname && (
          <span className={`text-[10px] ${subtext}`}>{notif.sender_fullname}</span>
        )}
        {notif.sender_fullname && <span className={`text-[10px] ${subtext}`}>·</span>}
        <span className={`text-[10px] ${subtext}`}>{timeAgo(notif.created_at)}</span>
      </div>
    </div>
  </div>
);

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isDark }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [toasts, setToasts] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const knownIdsRef = useRef<Set<number> | null>(null);

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/notification/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 20 }),
      });
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const all: Notification[] = json.data;
        const unread = all.filter((n) => n.is_read === 'N');
        const read = all.filter((n) => n.is_read === 'Y').slice(0, 5);
        setNotifications([...unread, ...read]);
        setUnreadCount(unread.length);
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
    fetchUnreadCount();
    const timer = setInterval(fetchUnreadCount, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen, fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

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
    } catch {
      fetchNotifications(true);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: 'Y' as const, read_at: n.read_at ?? new Date().toISOString() }))
    );
    setUnreadCount(0);
    try {
      await fetch('/api/notification/mark-all-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
    } catch {
      fetchNotifications(true);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleDismiss = async (notif: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.notification_id !== notif.notification_id));
    if (notif.is_read === 'N') setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await fetch('/api/notification/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_id: notif.notification_id }),
      });
    } catch {
      fetchNotifications(true);
    }
  };

  const dismissToast = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.notification_id !== id));

  const bg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200';
  const subtext = isDark ? 'text-gray-400' : 'text-gray-500';
  const itemHover = isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-50';
  const divider = isDark ? 'border-slate-700' : 'border-gray-100';

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen((o) => !o)}
          className={`relative p-2 rounded-lg transition-colors ${
            isDark ? 'hover:bg-slate-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
          } ${isOpen ? (isDark ? 'bg-slate-700' : 'bg-gray-100') : ''}`}
          aria-label={t('notifications.title')}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold px-0.5 leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div
            className={`absolute right-0 mt-2 w-80 rounded-xl shadow-xl border z-50 flex flex-col overflow-hidden ${bg}`}
            style={{ maxHeight: '480px' }}
          >
            <div className={`flex items-center justify-between px-4 py-3 border-b ${divider} flex-shrink-0`}>
              <div className="flex items-center gap-2">
                <Bell size={16} className={subtext} />
                <span className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-800'}`}>{t('notifications.title')}</span>
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
                  className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                    isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                  } disabled:opacity-50`}
                  title={t('notifications.markAllRead')}
                >
                  {markingAll ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={12} />}
                  {t('notifications.markAllRead')}
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={22} className={`animate-spin ${subtext}`} />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <BellOff size={28} className={subtext} />
                  <p className={`text-sm ${subtext}`}>{t('notifications.empty')}</p>
                </div>
              ) : (
                <ul>
                  {notifications.map((notif, idx) => {
                    const isUnread = notif.is_read === 'N';
                    return (
                      <li
                        key={notif.notification_id}
                        className={`relative group cursor-pointer transition-colors ${itemHover} ${
                          idx !== 0 ? `border-t ${divider}` : ''
                        }`}
                        onClick={() => handleMarkRead(notif)}
                      >
                        {notif.action_url ? (
                          <Link
                            href={notif.action_url}
                            className="block px-4 py-3 pr-16"
                            onClick={() => handleMarkRead(notif)}
                          >
                            <NotificationItem
                              notif={notif}
                              isUnread={isUnread}
                              isDark={isDark}
                              subtext={subtext}
                            />
                          </Link>
                        ) : (
                          <div className="px-4 py-3 pr-16">
                            <NotificationItem
                              notif={notif}
                              isUnread={isUnread}
                              isDark={isDark}
                              subtext={subtext}
                            />
                          </div>
                        )}

                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          {isUnread && (
                            <button
                              title={t('notifications.markAsRead')}
                              onClick={(e) => handleMarkRead(notif, e)}
                              className={`p-1 rounded-md transition-colors ${
                                isDark ? 'hover:bg-slate-600 text-gray-400' : 'hover:bg-gray-200 text-gray-500'
                              }`}
                            >
                              <Check size={13} />
                            </button>
                          )}
                          <button
                            title={t('notifications.dismiss')}
                            onClick={(e) => handleDismiss(notif, e)}
                            className={`p-1 rounded-md transition-colors ${
                              isDark ? 'hover:bg-slate-600 text-gray-400' : 'hover:bg-gray-200 text-gray-500'
                            }`}
                          >
                            <X size={13} />
                          </button>
                        </div>

                        {isUnread && (
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full" />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className={`border-t ${divider} flex-shrink-0`}>
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className={`block text-center text-sm font-medium py-3 transition-colors ${
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
