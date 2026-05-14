'use client';

import type { Notification } from '@/config/types/notification';
import { Bell, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface NotificationToastProps {
  notification: Notification;
  isDark: boolean;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 5000;

export const NotificationToast: React.FC<NotificationToastProps> = ({ notification, isDark, onDismiss }) => {
  const [visible, setVisible] = useState(false);
  const [progressWidth, setProgressWidth] = useState(100);

  useEffect(() => {
    const showTimer = setTimeout(() => {
      setVisible(true);
      setProgressWidth(0);
    }, 20);

    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 350);
    }, AUTO_DISMISS_MS);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [onDismiss]);

  const dismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 350);
  };

  const bg = isDark
    ? 'bg-yellow-950/60 border-yellow-800/60'
    : 'bg-yellow-50 border-yellow-200';
  const text = isDark ? 'text-yellow-100' : 'text-gray-900';
  const subtext = isDark ? 'text-yellow-300/70' : 'text-gray-500';
  const tagBg = isDark ? 'bg-yellow-900/60 text-yellow-200' : 'bg-yellow-100 text-yellow-700';
  const avatarBg = isDark ? 'bg-yellow-900/50 text-yellow-200' : 'bg-yellow-100 text-yellow-700';
  const closeBtn = isDark
    ? 'hover:bg-yellow-900/50 text-yellow-400'
    : 'hover:bg-yellow-100 text-gray-500';

  return (
    <div
      className={`relative flex items-start gap-3 w-80 rounded-xl shadow-2xl border px-4 py-3 transition-all duration-300 ease-out ${bg} ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div
        className={`mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold overflow-hidden ${avatarBg}`}
      >
        {notification.sender_profile ? (
          <img
            src={notification.sender_profile}
            alt={notification.sender_fullname ?? ''}
            className="w-full h-full object-cover"
          />
        ) : notification.sender_fullname ? (
          notification.sender_fullname.charAt(0).toUpperCase()
        ) : (
          <Bell size={14} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        {notification.procedure_name && (
          <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mb-1 ${tagBg}`}>
            {notification.procedure_name}
          </span>
        )}
        <p className={`text-xs font-medium leading-snug line-clamp-2 ${text}`}>
          {notification.message}
        </p>
        {notification.sender_fullname && (
          <p className={`text-[10px] mt-0.5 ${subtext}`}>{notification.sender_fullname}</p>
        )}
      </div>

      <button
        onClick={dismiss}
        className={`shrink-0 p-0.5 rounded-md transition-colors ${closeBtn}`}
        aria-label="Dismiss"
      >
        <X size={13} />
      </button>

      {/* progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl overflow-hidden">
        <div
          className="h-full bg-yellow-400"
          style={{
            width: `${progressWidth}%`,
            transition: `width ${AUTO_DISMISS_MS}ms linear`,
          }}
        />
      </div>
    </div>
  );
};
