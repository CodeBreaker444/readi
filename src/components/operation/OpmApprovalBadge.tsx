'use client';

import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type OpmApprovalStatus = 'PENDING' | 'APPROVED' | 'DENIED';

const STYLES: Record<OpmApprovalStatus, { light: string; dark: string; icon: typeof Clock; key: string }> = {
  PENDING:  { light: 'border-amber-200 bg-amber-50 text-amber-700',       dark: 'border-amber-500/30 bg-amber-500/10 text-amber-400',       icon: Clock,        key: 'pending' },
  APPROVED: { light: 'border-emerald-200 bg-emerald-50 text-emerald-700', dark: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400', icon: CheckCircle2, key: 'approved' },
  DENIED:   { light: 'border-red-200 bg-red-50 text-red-700',             dark: 'border-red-500/30 bg-red-500/10 text-red-400',             icon: XCircle,      key: 'denied' },
};

/** Renders nothing when the mission never needed OPM approval (status is null). */
export function OpmApprovalBadge({
  status,
  decidedByAdmin = false,
  isDark = false,
  className,
}: {
  status?: string | null;
  /** True when an Admin (fallback approver, no OPM in the department) made the decision. */
  decidedByAdmin?: boolean;
  isDark?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const cfg = status ? STYLES[status as OpmApprovalStatus] : undefined;
  if (!cfg) return null;
  const Icon = cfg.icon;

  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
        isDark ? cfg.dark : cfg.light,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {t(`operations.opmApproval.badge.${decidedByAdmin && status !== 'PENDING' ? `admin_${cfg.key}` : cfg.key}`)}
    </span>
  );
}
