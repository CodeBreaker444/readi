'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  HiOutlineAdjustments,
  HiOutlineBell,
  HiOutlineInformationCircle,
  HiOutlinePaperAirplane,
  HiOutlineUsers,
} from 'react-icons/hi';

export interface GroupedToast {
  id: string;
  category: string;
  count: number;
  latestMessage: string;
  tabKey: string;
}

const CAT_META: Record<string, {
  icon: React.ElementType;
  label: string;
  accent: string;       // left border colour
  iconBg: string;       // icon container — light mode
  iconBgDark: string;   // icon container — dark mode
  iconText: string;
  badgeBg: string;
  bar: string;
}> = {
  MAINTENANCE: {
    icon: HiOutlineAdjustments,
    label: 'Maintenance',
    accent:     'border-l-amber-500',
    iconBg:     'bg-amber-50 text-amber-600',
    iconBgDark: 'bg-amber-500/15 text-amber-400',
    iconText:   'text-amber-500',
    badgeBg:    'bg-amber-500',
    bar:        'bg-amber-500',
  },
  MISSION: {
    icon: HiOutlinePaperAirplane,
    label: 'Mission',
    accent:     'border-l-blue-500',
    iconBg:     'bg-blue-50 text-blue-600',
    iconBgDark: 'bg-blue-500/15 text-blue-400',
    iconText:   'text-blue-500',
    badgeBg:    'bg-blue-500',
    bar:        'bg-blue-500',
  },
  GENERAL: {
    icon: HiOutlineBell,
    label: 'General',
    accent:     'border-l-slate-400',
    iconBg:     'bg-slate-100 text-slate-600',
    iconBgDark: 'bg-slate-500/20 text-slate-400',
    iconText:   'text-slate-500',
    badgeBg:    'bg-slate-500',
    bar:        'bg-slate-400',
  },
  ASSIGNMENT: {
    icon: HiOutlineUsers,
    label: 'Assignment',
    accent:     'border-l-violet-500',
    iconBg:     'bg-violet-50 text-violet-600',
    iconBgDark: 'bg-violet-500/15 text-violet-400',
    iconText:   'text-violet-500',
    badgeBg:    'bg-violet-500',
    bar:        'bg-violet-500',
  },
  OTHER: {
    icon: HiOutlineInformationCircle,
    label: 'Alert',
    accent:     'border-l-slate-400',
    iconBg:     'bg-slate-100 text-slate-500',
    iconBgDark: 'bg-slate-500/20 text-slate-400',
    iconText:   'text-slate-400',
    badgeBg:    'bg-slate-400',
    bar:        'bg-slate-400',
  },
};

const AUTO_DISMISS_MS = 5000;
const DM = "'DM Sans', system-ui, sans-serif";

interface Props {
  toast: GroupedToast;
  isDark: boolean;
  onDismiss: () => void;
}

export const GroupedNotificationToast: React.FC<Props> = ({ toast, isDark, onDismiss }) => {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [progressWidth, setProgressWidth] = useState(100);

  const meta = CAT_META[toast.category] ?? CAT_META.OTHER;
  const Icon = meta.icon;

  useEffect(() => {
    const showTimer = setTimeout(() => { setVisible(true); setProgressWidth(0); }, 20);
    const hideTimer = setTimeout(() => { setVisible(false); setTimeout(onDismiss, 300); }, AUTO_DISMISS_MS);
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  }, [onDismiss]);

  const dismiss = () => { setVisible(false); setTimeout(onDismiss, 300); };

  const handleClick = () => {
    dismiss();
    router.push(`/notifications?tab=${toast.tabKey}`);
  };

  return (
    <div
      onClick={handleClick}
      style={{ fontFamily: DM }}
      className={`
        relative w-[340px] flex items-start gap-3 pl-4 pr-3 pt-3 pb-3 cursor-pointer select-none
        rounded-xl border-l-4 border border-l-[length:4px]
        transition-all duration-300 ease-out
        ${meta.accent}
        ${isDark
          ? 'bg-slate-800 border-slate-700 shadow-[0_8px_24px_rgba(0,0,0,0.4)]'
          : 'bg-white border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.12)]'
        }
        ${visible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}
      `}
    >
      {/* Category icon */}
      <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
        isDark ? meta.iconBgDark : meta.iconBg
      }`}>
        <Icon size={15} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-[12px] font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {toast.count > 1 ? `${toast.count} ${meta.label} alerts` : `New ${meta.label} alert`}
          </span>
          {toast.count > 1 && (
            <span className={`text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full leading-none ${meta.badgeBg}`}>
              {toast.count}
            </span>
          )}
        </div>
        <p className={`text-[11px] leading-snug line-clamp-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {toast.latestMessage}
        </p>
      </div>

      {/* Dismiss */}
      <button
        onClick={(e) => { e.stopPropagation(); dismiss(); }}
        aria-label="Dismiss"
        className={`shrink-0 mt-0.5 p-1 rounded-md cursor-pointer transition-colors ${
          isDark
            ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700'
            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
        }`}
      >
        <X size={13} />
      </button>

      {/* Progress bar */}
      <div className={`absolute bottom-0 left-4 right-0 h-[2px] rounded-b-xl overflow-hidden ${
        isDark ? 'bg-slate-700' : 'bg-slate-100'
      }`}>
        <div
          className={`h-full ${meta.bar} opacity-70`}
          style={{ width: `${progressWidth}%`, transition: `width ${AUTO_DISMISS_MS}ms linear` }}
        />
      </div>
    </div>
  );
};
