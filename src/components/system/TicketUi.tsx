'use client';

import { MaintenanceTicket, TicketPriority } from '@/config/types/maintenance';
import { useEffect } from 'react';
import {
  MdCheckCircleOutline,
  MdConfirmationNumber,
  MdErrorOutline,
  MdOutlineWatchLater,
} from 'react-icons/md';

export const PRIORITY_STYLES: Record<TicketPriority, string> = {
  HIGH: 'bg-red-500/10 text-red-500 border border-red-500/20',
  MEDIUM: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
  LOW: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
};

export const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
  IN_PROGRESS: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
  CLOSED: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
};

export function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function Badge({ label, style }: { label: string; style: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide ${style}`}>
      {label}
    </span>
  );
}

export function Modal({
  title,
  open,
  onClose,
  children,
  isDark,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  isDark: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className={`relative z-10 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col overflow-hidden border transition-colors duration-200
        ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}
      >
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

        <div className={`flex items-center justify-between px-6 py-4 border-b
          ${isDark ? 'border-gray-800' : 'border-gray-100'}`}
        >
          <h2 className={`text-sm font-semibold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark
                ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
            aria-label="Close modal"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
  isDark,
}: {
  label: string;
  children: React.ReactNode;
  isDark: boolean;
}) {
  return (
    <div className="mb-4">
      <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5
        ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const ACTION_COLORS: Record<string, string> = {
  blue: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20',
  violet: 'bg-violet-500/10 text-violet-500 hover:bg-violet-500/20 border-violet-500/20',
  teal: 'bg-teal-500/10 text-teal-500 hover:bg-teal-500/20 border-teal-500/20',
  slate: 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20 border-gray-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20',
};

export function ActionBtn({
  children,
  onClick,
  color = 'slate',
}: {
  children: React.ReactNode;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide border transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] ${
        ACTION_COLORS[color] ?? ACTION_COLORS.slate
      }`}
    >
      {children}
    </button>
  );
}

interface Props {
  tickets: MaintenanceTicket[];
  isDark: boolean;
}

export function TicketStats({ tickets, isDark }: Props) {
  const stats = [
    {
      label: 'Total',
      value: tickets.length,
      icon: MdConfirmationNumber,
      accent: isDark ? 'from-slate-700 to-slate-800' : 'from-slate-100 to-slate-50',
      valueColor: isDark ? 'text-white' : 'text-slate-800',
      labelColor: isDark ? 'text-slate-400' : 'text-slate-500',
      iconBg: isDark ? 'bg-slate-700' : 'bg-white',
      iconColor: isDark ? 'text-slate-300' : 'text-slate-500',
      border: isDark ? 'border-slate-700' : 'border-slate-200',
    },
    {
      label: 'Open',
      value: tickets.filter((t) => t.ticket_status === 'OPEN').length,
      icon: MdOutlineWatchLater,
      accent: isDark ? 'from-rose-900/40 to-rose-900/10' : 'from-rose-50 to-white',
      valueColor: isDark ? 'text-rose-400' : 'text-rose-600',
      labelColor: isDark ? 'text-rose-400/70' : 'text-rose-500/80',
      iconBg: isDark ? 'bg-rose-900/40' : 'bg-rose-100',
      iconColor: isDark ? 'text-rose-400' : 'text-rose-500',
      border: isDark ? 'border-rose-900/30' : 'border-rose-100',
    },
    {
      label: 'Closed',
      value: tickets.filter((t) => t.ticket_status === 'CLOSED').length,
      icon: MdCheckCircleOutline,
      accent: isDark ? 'from-emerald-900/40 to-emerald-900/10' : 'from-emerald-50 to-white',
      valueColor: isDark ? 'text-emerald-400' : 'text-emerald-600',
      labelColor: isDark ? 'text-emerald-400/70' : 'text-emerald-500/80',
      iconBg: isDark ? 'bg-emerald-900/40' : 'bg-emerald-100',
      iconColor: isDark ? 'text-emerald-400' : 'text-emerald-500',
      border: isDark ? 'border-emerald-900/30' : 'border-emerald-100',
    },
    {
      label: 'High Priority',
      value: tickets.filter((t) => t.ticket_priority === 'HIGH' && t.ticket_status === 'OPEN').length,
      icon: MdErrorOutline,
      accent: isDark ? 'from-amber-900/40 to-amber-900/10' : 'from-amber-50 to-white',
      valueColor: isDark ? 'text-amber-400' : 'text-amber-600',
      labelColor: isDark ? 'text-amber-400/70' : 'text-amber-500/80',
      iconBg: isDark ? 'bg-amber-900/40' : 'bg-amber-100',
      iconColor: isDark ? 'text-amber-400' : 'text-amber-500',
      border: isDark ? 'border-amber-900/30' : 'border-amber-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${s.accent} ${s.border} p-5 shadow-sm transition-all  `}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${s.labelColor}`}>
                  {s.label}
                </p>
                <p className={`text-4xl font-black mt-2 tabular-nums leading-none ${s.valueColor}`}>
                  {s.value}
                </p>
              </div>
              <div className={`p-2 rounded-xl shadow-sm ${s.iconBg}`}>
                <Icon size={20} className={s.iconColor} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}