'use client';

import { useTheme } from '@/components/useTheme';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { Clock, Navigation, Plane, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface DashboardData {
  total_missions: number;
  planned: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  total_flight_hours: number;
  total_distance_km: number;
  systems_used: { tool_id: number; tool_code: string; tool_name: string | null; mission_count: number }[];
}

export default function ClientDashboardPage() {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axios
      .get('/api/client-portal/dashboard')
      .then((res) => setData(res.data))
      .catch((e) => setError(e.response?.data?.error ?? t('common.error', 'Failed to load')))
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    {
      label: t('clientPortal.totalMissions'),
      value: data?.total_missions ?? 0,
      icon: Plane,
      iconBg: 'bg-indigo-500/10',
      iconColor: 'text-indigo-500',
    },
    {
      label: t('clientPortal.flightHours'),
      value: data?.total_flight_hours ?? 0,
      icon: Clock,
      iconBg: 'bg-pink-500/10',
      iconColor: 'text-pink-500',
    },
    {
      label: t('clientPortal.distanceKm'),
      value: data?.total_distance_km ?? 0,
      icon: TrendingUp,
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-500',
    },
    {
      label: t('clientPortal.systemsUsed'),
      value: data?.systems_used.length ?? 0,
      icon: Navigation,
      iconBg: 'bg-cyan-500/10',
      iconColor: 'text-cyan-500',
    },
  ];

  const statusBreakdown = [
    { label: t('clientPortal.statusPlanned'),    value: data?.planned    ?? 0, color: 'bg-blue-500' },
    { label: t('clientPortal.statusInProgress'), value: data?.in_progress ?? 0, color: 'bg-amber-500' },
    { label: t('clientPortal.statusCompleted'),  value: data?.completed  ?? 0, color: 'bg-emerald-500' },
    { label: t('clientPortal.statusCancelled'),  value: data?.cancelled  ?? 0, color: 'bg-red-500' },
  ];

  const total = data?.total_missions || 1;

  const card = cn(
    'rounded-xl border p-5 flex flex-col gap-3',
    isDark ? 'bg-[#1a1f2e] border-white/10' : 'bg-white border-slate-200 shadow-sm',
  );

  return (
    <div className="flex flex-col min-h-screen">
      {/* Page header — matches OperationsPageHeader style */}
      <div
        className={cn(
          'top-0 z-10 backdrop-blur-md transition-colors px-4 sm:px-6 py-4 mb-6',
          isDark
            ? 'bg-slate-900/80 border-b border-slate-800 text-white'
            : 'bg-white/80 border-b border-slate-200 text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)]',
        )}
      >
        <div className="mx-auto max-w-[1800px] flex items-center gap-3">
          <div className="w-1 h-6 rounded-full bg-violet-600 shrink-0" />
          <div>
            <h1 className={cn('font-semibold text-base tracking-tight', isDark ? 'text-white' : 'text-slate-900')}>
              {t('clientPortal.dashboardTitle')}
            </h1>
            <p className={cn('text-xs', isDark ? 'text-slate-500' : 'text-slate-400')}>
              {t('clientPortal.dashboardSubtitle')}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-6 pb-8 space-y-6 max-w-[1800px] mx-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
          </div>
        ) : error ? (
          <div className={cn('flex items-center justify-center h-64 text-sm', isDark ? 'text-red-400' : 'text-red-500')}>
            {error}
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className={card}>
                  <div className="flex items-center justify-between">
                    <span className={cn('text-xs sm:text-sm font-medium', isDark ? 'text-slate-400' : 'text-slate-500')}>
                      {stat.label}
                    </span>
                    <div className={cn('p-1.5 sm:p-2 rounded-lg', stat.iconBg)}>
                      <stat.icon className={cn('h-3.5 w-3.5 sm:h-4 sm:w-4', stat.iconColor)} />
                    </div>
                  </div>
                  <span className={cn('text-2xl sm:text-3xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Mission Status */}
              <div className={card}>
                <h2 className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-slate-900')}>
                  {t('clientPortal.missionStatus')}
                </h2>
                <div className="space-y-3">
                  {statusBreakdown.map((item) => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{item.label}</span>
                        <span className={cn('font-medium tabular-nums', isDark ? 'text-white' : 'text-slate-900')}>
                          {item.value}
                        </span>
                      </div>
                      <div className={cn('h-1.5 rounded-full', isDark ? 'bg-white/10' : 'bg-slate-100')}>
                        <div
                          className={cn('h-1.5 rounded-full transition-all duration-500', item.color)}
                          style={{ width: `${Math.round((item.value / total) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Systems Used */}
              <div className={card}>
                <h2 className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-slate-900')}>
                  {t('clientPortal.systemsDrones')}
                </h2>
                {(data?.systems_used.length ?? 0) === 0 ? (
                  <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>
                    {t('clientPortal.noSystems')}
                  </p>
                ) : (
                  <div className="space-y-2 overflow-y-auto max-h-52">
                    {data?.systems_used.map((sys) => (
                      <div
                        key={sys.tool_id}
                        className={cn(
                          'flex items-center justify-between rounded-lg px-3 py-2',
                          isDark ? 'bg-white/5' : 'bg-slate-50',
                        )}
                      >
                        <div className="min-w-0">
                          <p className={cn('text-sm font-medium truncate', isDark ? 'text-white' : 'text-slate-900')}>
                            {sys.tool_code}
                          </p>
                          {sys.tool_name && (
                            <p className={cn('text-xs truncate', isDark ? 'text-slate-400' : 'text-slate-500')}>
                              {sys.tool_name}
                            </p>
                          )}
                        </div>
                        <span
                          className={cn(
                            'text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2',
                            isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-700',
                          )}
                        >
                          {t('clientPortal.missionCount_one', { count: sys.mission_count, defaultValue: `${sys.mission_count} ${sys.mission_count === 1 ? 'mission' : 'missions'}` })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
