'use client';

import { useTheme } from '@/components/useTheme';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { heading, muted } from './ui';

export function SlotBookingShell({
  title,
  subtitle,
  canManage,
  actions,
  children,
}: {
  title: string;
  subtitle: string;
  canManage?: boolean;
  actions?: ReactNode;
  children: (isDark: boolean) => ReactNode;
}) {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const pathname = usePathname();

  const tabs = [
    { href: '/operations/slot-booking', label: t('slotBooking.tabs.slotBooking') },
    { href: '/operations/slot-booking/approved', label: canManage ? t('slotBooking.tabs.approved') : t('slotBooking.tabs.myApproved') },
    ...(canManage ? [{ href: '/operations/slot-booking/audit', label: t('slotBooking.tabs.audit') }] : []),
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
