'use client';

import { FlightRequest } from '@/components/tables/flightRequestsColumns';
import { AlertCircle, CheckCircle2, Clock, LucideIcon, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FlightRequestsStatsProps {
  isDark: boolean;
  requests: FlightRequest[];
}

interface StatItem {
  key: string;
  value: number;
  icon: LucideIcon;
  color: string;
}

export function FlightRequestsStats({ isDark, requests }: FlightRequestsStatsProps) {
  const { t } = useTranslation();
  const card = isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-gray-200';

  const stats: StatItem[] = [
    { key: 'total', value: requests.length, icon: Send, color: 'text-violet-500' },
    { key: 'new', value: requests.filter((r) => r.dcc_status === 'NEW').length, icon: AlertCircle, color: 'text-blue-500' },
    { key: 'acknowledged', value: requests.filter((r) => r.dcc_status === 'ACKNOWLEDGED').length, icon: Clock, color: 'text-yellow-500' },
    { key: 'assigned', value: requests.filter((r) => r.dcc_status === 'ASSIGNED').length, icon: CheckCircle2, color: 'text-violet-500' },
  ];

  return (
    <div className="max-w-[1600px] mx-auto w-full px-6 pt-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {stats.map(({ key, value, icon: Icon, color }) => (
          <div key={key} className={`rounded-xl border p-4 flex items-center gap-3 ${card}`}>
            <Icon className={`h-5 w-5 ${color}`} />
            <div>
              <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
              <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{t(`planning.flightRequests.${key}`)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
