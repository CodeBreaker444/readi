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
  category: string;   // normalised key e.g. 'MAINTENANCE'
  count: number;
  latestMessage: string;
  tabKey: string;     // e.g. 'maintenance'
}

const CAT_META: Record<string, {
  icon: React.ElementType;
  label: string;
  bg: string;
  text: string;
  iconBg: string;
  bar: string;
}> = {
  MAINTENANCE: { icon: HiOutlineAdjustments,       label: 'Maintenance', bg: 'bg-amber-950/60 border-amber-800/60',   text: 'text-amber-100',  iconBg: 'bg-amber-500/20 text-amber-300', bar: 'bg-amber-400' },
  MISSION:     { icon: HiOutlinePaperAirplane,      label: 'Mission',     bg: 'bg-blue-950/60 border-blue-800/60',     text: 'text-blue-100',   iconBg: 'bg-blue-500/20 text-blue-300',   bar: 'bg-blue-400'  },
  GENERAL:     { icon: HiOutlineBell,               label: 'General',     bg: 'bg-slate-900/80 border-slate-700/60',   text: 'text-slate-100',  iconBg: 'bg-slate-500/20 text-slate-300', bar: 'bg-slate-400' },
  ASSIGNMENT:  { icon: HiOutlineUsers,              label: 'Assignment',  bg: 'bg-violet-950/60 border-violet-800/60', text: 'text-violet-100', iconBg: 'bg-violet-500/20 text-violet-300',bar: 'bg-violet-400'},
  OTHER:       { icon: HiOutlineInformationCircle,  label: 'Alert',       bg: 'bg-slate-900/80 border-slate-700/60',   text: 'text-slate-100',  iconBg: 'bg-slate-500/20 text-slate-300', bar: 'bg-slate-400' },
};
const FALLBACK = CAT_META.OTHER;

const AUTO_DISMISS_MS = 5000;

interface Props {
  toast: GroupedToast;
  isDark: boolean;
  onDismiss: () => void;
}

export const GroupedNotificationToast: React.FC<Props> = ({ toast, isDark, onDismiss }) => {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [progressWidth, setProgressWidth] = useState(100);

  const meta = CAT_META[toast.category] ?? FALLBACK;
  const Icon = meta.icon;

  useEffect(() => {
    const showTimer = setTimeout(() => {
      setVisible(true);
      setProgressWidth(0);
    }, 20);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 350);
    }, AUTO_DISMISS_MS);
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  }, [onDismiss]);

  const dismiss = () => { setVisible(false); setTimeout(onDismiss, 350); };

  const handleClick = () => {
    dismiss();
    router.push(`/notifications?tab=${toast.tabKey}`);
  };

  return (
    <div
      onClick={handleClick}
      className={`relative flex items-start gap-3 w-80 rounded-xl shadow-2xl border px-4 py-3 cursor-pointer
        transition-all duration-300 ease-out select-none
        ${meta.bg}
        ${visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
    >
      {/* Icon */}
      <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${meta.iconBg}`}>
        <Icon size={15} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${meta.text}`}>
            {toast.count > 1 ? `${toast.count} ${meta.label} alerts` : `New ${meta.label} alert`}
          </span>
          {toast.count > 1 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
              {toast.count}
            </span>
          )}
        </div>
        <p className={`text-[11px] mt-0.5 leading-snug line-clamp-1 ${isDark ? 'text-slate-300' : 'text-slate-200'}`}>
          {toast.latestMessage}
        </p>
        <p className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          Tap to view →
        </p>
      </div>

      {/* Dismiss */}
      <button
        onClick={(e) => { e.stopPropagation(); dismiss(); }}
        className="shrink-0 cursor-pointer p-0.5 rounded-md transition-colors hover:bg-white/10 text-white/60 hover:text-white/90"
        aria-label="Dismiss"
      >
        <X size={13} />
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl overflow-hidden">
        <div
          className={`h-full ${meta.bar}`}
          style={{ width: `${progressWidth}%`, transition: `width ${AUTO_DISMISS_MS}ms linear` }}
        />
      </div>
    </div>
  );
};
