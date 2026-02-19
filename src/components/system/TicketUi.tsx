'use client';

import { MaintenanceTicket, TicketPriority } from '@/config/types/maintenance';
import { useEffect } from 'react';
import {
  MdCheckCircleOutline,
  MdConfirmationNumber,
  MdErrorOutline,
  MdOutlineWatchLater
} from 'react-icons/md';

export const PRIORITY_STYLES: Record<TicketPriority, string> = {
  HIGH: 'bg-red-100 text-red-700 border border-red-200',
  MEDIUM: 'bg-amber-100 text-amber-700 border border-amber-200',
  LOW: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
};

export const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-rose-100 text-rose-700 border border-rose-200',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 border border-blue-200',
  CLOSED: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
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
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${style}`}
    >
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
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className={`relative z-10 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col border transition-colors duration-200
        ${isDark 
          ? 'bg-slate-900 border-slate-700 text-white' 
          : 'bg-white border-slate-100 text-slate-800'
        }`}
      >
        <div className={`flex items-center justify-between px-6 py-4 border-b 
          ${isDark ? 'border-slate-800' : 'border-slate-100'}`}
        >
          <h2 className={`text-base font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className={`transition-colors ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}

export function Field({ 
  label, 
  children, 
  isDark 
}: { 
  label: string; 
  children: React.ReactNode; 
  isDark: boolean 
}) {
  return (
    <div className="mb-4">
      <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 
        ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
 


const ACTION_COLORS: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200',
  violet: 'bg-violet-50 text-violet-700 hover:bg-violet-100 border-violet-200',
  teal: 'bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-200',
  slate: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200',
  emerald: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200',
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
      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
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
      label: 'Total Tickets',
      value: tickets.length,
      icon: MdConfirmationNumber,
      color: isDark ? 'text-slate-200' : 'text-slate-700',
      iconColor: isDark ? 'text-slate-500' : 'text-slate-400',
      bg: isDark ? 'bg-slate-800' : 'bg-white',
    },
    {
      label: 'Open',
      value: tickets.filter((t) => t.ticket_status === 'OPEN').length,
      icon: MdOutlineWatchLater,
      color: isDark ? 'text-rose-400' : 'text-rose-600',
      iconColor: isDark ? 'text-rose-500/80' : 'text-rose-500',
      bg: isDark ? 'bg-rose-900/20' : 'bg-rose-50',
    },
    {
      label: 'Closed',
      value: tickets.filter((t) => t.ticket_status === 'CLOSED').length,
      icon: MdCheckCircleOutline,
      color: isDark ? 'text-emerald-400' : 'text-emerald-600',
      iconColor: isDark ? 'text-emerald-500/80' : 'text-emerald-500',
      bg: isDark ? 'bg-emerald-900/20' : 'bg-emerald-50',
    },
    {
      label: 'High Priority',
      value: tickets.filter(
        (t) => t.ticket_priority === 'HIGH' && t.ticket_status === 'OPEN'
      ).length,
      icon: MdErrorOutline,
      color: isDark ? 'text-amber-400' : 'text-amber-600',
      iconColor: isDark ? 'text-amber-500/80' : 'text-amber-500',
      bg: isDark ? 'bg-amber-900/20' : 'bg-amber-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className={`${s.bg} rounded-2xl border ${
              isDark ? 'border-slate-700' : 'border-slate-200'
            } p-5 shadow-sm transition-all hover:translate-y-[-2px] duration-200`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  {s.label}
                </p>
                <p className={`text-3xl font-bold mt-2 ${s.color} tabular-nums`}>
                  {s.value}
                </p>
              </div>
              <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-white shadow-sm'}`}>
                <Icon size={22} className={s.iconColor} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}