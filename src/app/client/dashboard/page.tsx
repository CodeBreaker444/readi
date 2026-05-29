'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/components/useTheme';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { Calendar, Clock, Globe, Mail, MapPin, Navigation, Phone, Plane, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface ClientInfo {
  client_name: string;
  client_legal_name: string | null;
  client_code: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_website: string | null;
  client_city: string | null;
  client_state: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
}

interface DashboardData {
  total_missions: number;
  planned: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  total_flight_hours: number;
  total_distance_km: number;
  systems_used: { tool_id: number; tool_code: string; tool_name: string | null; mission_count: number }[];
  client_info: ClientInfo | null;
}

const STATUS_COLORS = {
  planned:     '#3b82f6',
  in_progress: '#f59e0b',
  completed:   '#10b981',
  cancelled:   '#ef4444',
};

function CustomPieTooltip({ active, payload, isDark }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className={cn('px-3 py-2 rounded-lg border shadow-lg text-xs', isDark ? 'bg-[#1a1f2e] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900')}>
      <p className="font-semibold">{payload[0].name}</p>
      <p style={{ color: payload[0].payload.fill }}>{payload[0].value} missions</p>
    </div>
  );
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

  const textMain = isDark ? 'text-white' : 'text-slate-900';
  const textSub  = isDark ? 'text-slate-400' : 'text-slate-500';
  const card = cn(
    'rounded-2xl border p-5 flex flex-col gap-4',
    isDark ? 'bg-[#1a1f2e] border-white/10' : 'bg-white border-slate-200 shadow-sm',
  );

  const stats = [
    {
      label: t('clientPortal.totalMissions'),
      value: data?.total_missions ?? 0,
      icon: Plane,
      gradient: 'from-violet-500 to-indigo-600',
      iconBg: isDark ? 'bg-violet-500/15' : 'bg-violet-50',
      iconColor: 'text-violet-500',
      change: null as string | null,
    },
    {
      label: t('clientPortal.flightHours'),
      value: data?.total_flight_hours ?? 0,
      icon: Clock,
      gradient: 'from-sky-500 to-cyan-600',
      iconBg: isDark ? 'bg-sky-500/15' : 'bg-sky-50',
      iconColor: 'text-sky-500',
      change: null,
    },
    {
      label: t('clientPortal.distanceKm'),
      value: `${data?.total_distance_km ?? 0} km`,
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-teal-600',
      iconBg: isDark ? 'bg-emerald-500/15' : 'bg-emerald-50',
      iconColor: 'text-emerald-500',
      change: null,
    },
    {
      label: t('clientPortal.systemsUsed'),
      value: data?.systems_used.length ?? 0,
      icon: Navigation,
      gradient: 'from-amber-500 to-orange-500',
      iconBg: isDark ? 'bg-amber-500/15' : 'bg-amber-50',
      iconColor: 'text-amber-500',
      change: null,
    },
  ];

  const statusBreakdown = [
    { label: t('clientPortal.statusPlanned'),    key: 'planned',     value: data?.planned    ?? 0, color: STATUS_COLORS.planned,     fill: STATUS_COLORS.planned },
    { label: t('clientPortal.statusInProgress'), key: 'in_progress', value: data?.in_progress ?? 0, color: STATUS_COLORS.in_progress, fill: STATUS_COLORS.in_progress },
    { label: t('clientPortal.statusCompleted'),  key: 'completed',   value: data?.completed  ?? 0, color: STATUS_COLORS.completed,   fill: STATUS_COLORS.completed },
    { label: t('clientPortal.statusCancelled'),  key: 'cancelled',   value: data?.cancelled  ?? 0, color: STATUS_COLORS.cancelled,   fill: STATUS_COLORS.cancelled },
  ];

  const pieData = statusBreakdown.filter((s) => s.value > 0).map((s) => ({
    name: s.label,
    value: s.value,
    fill: s.fill,
  }));

  const total = data?.total_missions || 1;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
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
            <h1 className={cn('font-semibold text-base tracking-tight', textMain)}>
              {t('clientPortal.dashboardTitle')}
            </h1>
            <p className={cn('text-xs', textSub)}>
              {t('clientPortal.dashboardSubtitle')}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-6 pb-8 space-y-5 max-w-[1800px] mx-auto w-full">
        {loading ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={cn('rounded-2xl border p-5 flex flex-col gap-3', isDark ? 'bg-[#1a1f2e] border-white/10' : 'bg-white border-slate-200 shadow-sm')}>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-8 rounded-xl" />
                  </div>
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
              <div className={cn('rounded-2xl border p-5 lg:col-span-2', isDark ? 'bg-[#1a1f2e] border-white/10' : 'bg-white border-slate-200 shadow-sm')}>
                <Skeleton className="h-4 w-32 mb-4" />
                <div className="flex gap-6">
                  <Skeleton className="h-40 w-40 rounded-full shrink-0" />
                  <div className="flex-1 space-y-3 pt-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="flex justify-between">
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-3 w-6" />
                        </div>
                        <Skeleton className="h-1.5 w-full rounded-full" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className={cn('rounded-2xl border p-5', isDark ? 'bg-[#1a1f2e] border-white/10' : 'bg-white border-slate-200 shadow-sm')}>
                <Skeleton className="h-4 w-28 mb-4" />
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-xl" />
                  ))}
                </div>
              </div>
            </div>
            {/* Client info skeleton */}
            <div className={cn('rounded-2xl border p-5', isDark ? 'bg-[#1a1f2e] border-white/10' : 'bg-white border-slate-200 shadow-sm')}>
              <div className="flex items-start gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-3 w-32" />
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-3 w-full" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : error ? (
          <div className={cn('flex items-center justify-center h-64 text-sm', isDark ? 'text-red-400' : 'text-red-500')}>
            {error}
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className={cn(
                    'rounded-2xl border p-5 flex flex-col gap-3 relative overflow-hidden group transition-shadow hover:shadow-md',
                    isDark ? 'bg-[#1a1f2e] border-white/10' : 'bg-white border-slate-200 shadow-sm',
                  )}
                >
                  {/* subtle gradient accent top-right */}
                  <div className={cn('absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-10 bg-gradient-to-br', stat.gradient)} />
                  <div className="flex items-center justify-between relative">
                    <span className={cn('text-xs sm:text-sm font-medium', textSub)}>{stat.label}</span>
                    <div className={cn('p-2 rounded-xl', stat.iconBg)}>
                      <stat.icon className={cn('h-4 w-4', stat.iconColor)} />
                    </div>
                  </div>
                  <span className={cn('text-2xl sm:text-3xl font-bold tabular-nums relative', textMain)}>
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
              {/* Mission Status Breakdown */}
              <div className={cn(card, 'lg:col-span-2')}>
                <div className="flex items-start justify-between">
                  <h2 className={cn('text-sm font-semibold', textMain)}>{t('clientPortal.missionStatus')}</h2>
                  <span className={cn('text-xs tabular-nums', textSub)}>{data?.total_missions ?? 0} total</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-6 items-center">
                  {/* Donut chart */}
                  {pieData.length > 0 ? (
                    <div className="shrink-0">
                      <ResponsiveContainer width={160} height={160}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={48}
                            outerRadius={72}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="none"
                          >
                            {pieData.map((entry, i) => (
                              <Cell key={i} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomPieTooltip isDark={isDark} />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="shrink-0 w-40 h-40 flex items-center justify-center">
                      <div className={cn('w-36 h-36 rounded-full border-4', isDark ? 'border-white/5' : 'border-slate-100')} />
                    </div>
                  )}

                  {/* Status bars */}
                  <div className="flex-1 space-y-3 w-full">
                    {statusBreakdown.map((item) => (
                      <div key={item.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>{item.label}</span>
                          </div>
                          <span className={cn('font-semibold tabular-nums', textMain)}>{item.value}</span>
                        </div>
                        <div className={cn('h-1.5 rounded-full overflow-hidden', isDark ? 'bg-white/8' : 'bg-slate-100')}>
                          <div
                            className="h-1.5 rounded-full transition-all duration-700"
                            style={{ width: `${Math.round((item.value / total) * 100)}%`, backgroundColor: item.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Systems / Drones */}
              <div className={card}>
                <h2 className={cn('text-sm font-semibold', textMain)}>{t('clientPortal.systemsDrones')}</h2>
                {(data?.systems_used.length ?? 0) === 0 ? (
                  <p className={cn('text-sm', textSub)}>{t('clientPortal.noSystems')}</p>
                ) : (
                  <div className="space-y-2 overflow-y-auto max-h-56 pr-1">
                    {data?.systems_used.map((sys, idx) => (
                      <div
                        key={sys.tool_id}
                        className={cn(
                          'flex items-center gap-3 rounded-xl px-3 py-2.5',
                          isDark ? 'bg-white/5 hover:bg-white/8' : 'bg-slate-50 hover:bg-slate-100',
                          'transition-colors',
                        )}
                      >
                        {/* Rank */}
                        <span className={cn('text-xs font-bold tabular-nums w-4 shrink-0', textSub)}>
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={cn('text-sm font-semibold truncate', textMain)}>{sys.tool_code}</p>
                          {sys.tool_name && (
                            <p className={cn('text-xs truncate', textSub)}>{sys.tool_name}</p>
                          )}
                        </div>
                        <span className={cn(
                          'text-xs font-semibold px-2 py-0.5 rounded-full shrink-0',
                          isDark ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-100 text-violet-700',
                        )}>
                          {sys.mission_count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Completion rate banner */}
            {(data?.total_missions ?? 0) > 0 && (
              <div className={cn(
                'rounded-2xl border px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3',
                isDark ? 'bg-[#1a1f2e] border-white/10' : 'bg-white border-slate-200 shadow-sm',
              )}>
                <div>
                  <p className={cn('text-sm font-semibold', textMain)}>Mission Completion Rate</p>
                  <p className={cn('text-xs mt-0.5', textSub)}>
                    {data!.completed} of {data!.total_missions} missions completed
                  </p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-64">
                  <div className={cn('flex-1 h-2 rounded-full overflow-hidden', isDark ? 'bg-white/8' : 'bg-slate-100')}>
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
                      style={{ width: `${Math.round((data!.completed / data!.total_missions) * 100)}%` }}
                    />
                  </div>
                  <span className={cn('text-sm font-bold tabular-nums shrink-0', 'text-emerald-500')}>
                    {Math.round((data!.completed / data!.total_missions) * 100)}%
                  </span>
                </div>
              </div>
            )}

            {/* Client Info Card */}
            {data?.client_info && (
              <div className={cn(
                'rounded-2xl border p-5',
                isDark ? 'bg-[#1a1f2e] border-white/10' : 'bg-white border-slate-200 shadow-sm',
              )}>
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className={cn('text-base font-semibold truncate', textMain)}>
                        {data.client_info.client_name}
                      </h2>
                      {data.client_info.client_code && (
                        <span className={cn('text-xs font-mono px-1.5 py-0.5 rounded', isDark ? 'bg-white/8 text-slate-400' : 'bg-slate-100 text-slate-500')}>
                          {data.client_info.client_code}
                        </span>
                      )}
                    </div>
                    {data.client_info.client_legal_name && (
                      <p className={cn('text-xs mt-0.5', textSub)}>{data.client_info.client_legal_name}</p>
                    )}

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
                      {data.client_info.client_email && (
                        <div className="flex items-center gap-2 min-w-0">
                          <Mail className={cn('h-3.5 w-3.5 shrink-0', textSub)} />
                          <span className={cn('text-xs truncate', textSub)}>{data.client_info.client_email}</span>
                        </div>
                      )}
                      {data.client_info.client_phone && (
                        <div className="flex items-center gap-2 min-w-0">
                          <Phone className={cn('h-3.5 w-3.5 shrink-0', textSub)} />
                          <span className={cn('text-xs truncate', textSub)}>{data.client_info.client_phone}</span>
                        </div>
                      )}
                      {data.client_info.client_website && (
                        <div className="flex items-center gap-2 min-w-0">
                          <Globe className={cn('h-3.5 w-3.5 shrink-0', textSub)} />
                          <a
                            href={data.client_info.client_website.startsWith('http') ? data.client_info.client_website : `https://${data.client_info.client_website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-violet-500 hover:underline truncate"
                          >
                            {data.client_info.client_website}
                          </a>
                        </div>
                      )}
                      {(data.client_info.client_city || data.client_info.client_state) && (
                        <div className="flex items-center gap-2 min-w-0">
                          <MapPin className={cn('h-3.5 w-3.5 shrink-0', textSub)} />
                          <span className={cn('text-xs truncate', textSub)}>
                            {[data.client_info.client_city, data.client_info.client_state].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}
                      {data.client_info.contract_start_date && (
                        <div className="flex items-center gap-2 min-w-0">
                          <Calendar className={cn('h-3.5 w-3.5 shrink-0', textSub)} />
                          <span className={cn('text-xs', textSub)}>
                            Contract: {new Date(data.client_info.contract_start_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                            {data.client_info.contract_end_date && (
                              <> → {new Date(data.client_info.contract_end_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
