'use client';

import { useTheme } from '@/components/useTheme';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import { heading, muted } from './ui';

type Access = { canManage: boolean; canBook: boolean };
const STORAGE_KEY = 'slot-booking-access';
/** Survives client-side tab changes, so the tab bar never blanks while a page loads its own data. */
let lastAccess: Access | null = null;

export function SlotBookingShell({
  title,
  subtitle,
  canManage,
  canBook,
  actions,
  children,
}: {
  title: string;
  subtitle: string;
  canManage?: boolean;
  /** Pilots get the Today tab with their slots of the day. */
  canBook?: boolean;
  actions?: ReactNode;
  children: (isDark: boolean) => ReactNode;
}) {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const pathname = usePathname();

  const known = canManage !== undefined || canBook !== undefined;
  const [cached, setCached] = useState<Access | null>(lastAccess);

  useEffect(() => {
    if (known) {
      lastAccess = { canManage: !!canManage, canBook: !!canBook };
      setCached(lastAccess);
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(lastAccess)); } catch { /* storage unavailable */ }
    } else if (!lastAccess) {
      // Full page reload: reuse what this browser tab last saw until the page's own request answers.
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) { lastAccess = JSON.parse(raw) as Access; setCached(lastAccess); }
      } catch { /* ignore */ }
    }
  }, [known, canManage, canBook]);

  const access: Access | null = known ? { canManage: !!canManage, canBook: !!canBook } : cached;

  const tabs = !access ? [] : [
    { href: '/operations/slot-booking', label: t('slotBooking.tabs.slotBooking') },
    ...(access.canBook ? [{ href: '/operations/slot-booking/today', label: t('slotBooking.tabs.today') }] : []),
    { href: '/operations/slot-booking/approved', label: access.canManage ? t('slotBooking.tabs.approved') : t('slotBooking.tabs.myApproved') },
    ...(access.canManage ? [{ href: '/operations/slot-booking/calendar', label: t('slotBooking.tabs.calendar') }] : []),
    ...(access.canManage ? [{ href: '/operations/slot-booking/day-preview', label: t('slotBooking.tabs.dayPreview') }] : []),
    ...(access.canManage ? [{ href: '/operations/slot-booking/pilot-groups', label: t('slotBooking.tabs.pilotGroups') }] : []),
    ...(access.canManage ? [{ href: '/operations/slot-booking/merits', label: t('slotBooking.tabs.merits') }] : []),
    ...(access.canManage ? [{ href: '/operations/slot-booking/audit', label: t('slotBooking.tabs.audit') }] : []),
  ];

  return (
    <div className={cn('min-h-screen', isDark ? 'bg-[#0a0e1a]' : 'bg-[#f4f6f9]')}>
      <div
        className={cn(
          'border-b backdrop-blur-xl',
          isDark ? 'bg-[#0a0e1a]/90 border-white/[0.06]' : 'bg-white/80 border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
        )}
      >
        <div className="px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-1 h-6 rounded-full bg-violet-600" />
            <div>
              <h1 className={cn('text-[15px] font-semibold tracking-[-0.01em]', heading(isDark))}>{title}</h1>
              <p className={cn('text-[11px] mt-0.5 tracking-wide', muted(isDark))}>{subtitle}</p>
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
        </div>

        <div className="px-6 flex gap-1">
          {!access &&
            [72, 64, 80].map((w, i) => (
              <div key={i} className="px-3 py-2.5 border-b-2 border-transparent -mb-px">
                <Skeleton className={cn('h-3.5', isDark && 'bg-white/[0.06]')} style={{ width: w }} />
              </div>
            ))}
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors',
                pathname === tab.href
                  ? 'border-violet-600 text-violet-600'
                  : cn('border-transparent', muted(isDark), 'hover:text-violet-500'),
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="px-6 py-6">{children(isDark)}</div>
    </div>
  );
}
