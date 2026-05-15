'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/components/useTheme';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';

interface DailyFlight {
  date: string;
  count: number;
}

interface MonthlyStat {
  month: string;
  flights: number;
  hours: number;
  distance_km: number;
}

interface AnalyticsData {
  daily_flights: DailyFlight[];
  monthly_stats: MonthlyStat[];
}

const INTENSITY_DARK = ['#1a1f2e', '#1e3a5f', '#1d4ed8', '#2563eb', '#3b82f6'];
const INTENSITY_LIGHT = ['#f1f5f9', '#bfdbfe', '#60a5fa', '#2563eb', '#1d4ed8'];

function getIntensity(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface HeatmapProps {
  data: DailyFlight[];
  isDark: boolean;
}

function ContributionHeatmap({ data, isDark }: HeatmapProps) {
  const palette = isDark ? INTENSITY_DARK : INTENSITY_LIGHT;
  const byDate = new Map(data.map((d) => [d.date, d.count]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // start from the Sunday that is 52 weeks before the Sunday of the current week
  const currentSunday = new Date(today);
  currentSunday.setDate(today.getDate() - today.getDay()); // rewind to this week's Sunday

  const startDate = new Date(currentSunday);
  startDate.setDate(currentSunday.getDate() - 52 * 7); // 52 weeks back

  const cells: { date: string; count: number; weekIdx: number; dayIdx: number }[] = [];
  let weekIdx = 0;
  const d = new Date(startDate);

  while (d <= today) {
    const dateStr = localDateStr(d);
    const dayIdx = d.getDay();
    cells.push({ date: dateStr, count: byDate.get(dateStr) ?? 0, weekIdx, dayIdx });
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0) weekIdx++; // advance column on each new Sunday
  }

  const numWeeks = weekIdx + 1;

  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  for (const cell of cells) {
    if (cell.dayIdx === 0) {
      const m = new Date(cell.date + 'T00:00:00').getMonth();
      if (m !== lastMonth) {
        monthLabels.push({ label: MONTH_ABBR[m], col: cell.weekIdx });
        lastMonth = m;
      }
    }
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-max">
        {/* Month labels */}
        <div className="flex mb-1 ml-8">
          {Array.from({ length: numWeeks }, (_, w) => {
            const label = monthLabels.find((ml) => ml.col === w);
            return (
              <div key={w} className="w-[13px] mr-[2px] text-[9px] shrink-0" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                {label?.label ?? ''}
              </div>
            );
          })}
        </div>

        <div className="flex gap-0">
          {/* Day labels */}
          <div className="flex flex-col mr-1 gap-[2px]">
            {DAY_LABELS.map((d, i) => (
              <div key={d} className="h-[11px] text-[9px] leading-[11px] w-6 text-right pr-1"
                style={{ color: isDark ? '#64748b' : '#94a3b8', visibility: i % 2 === 0 ? 'visible' : 'hidden' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="flex gap-[2px]">
            {Array.from({ length: numWeeks }, (_, w) => (
              <div key={w} className="flex flex-col gap-[2px]">
                {Array.from({ length: 7 }, (_, d) => {
                  const cell = cells.find((c) => c.weekIdx === w && c.dayIdx === d);
                  if (!cell) return <div key={d} className="w-[11px] h-[11px] rounded-sm" style={{ background: 'transparent' }} />;
                  const intensity = getIntensity(cell.count);
                  return (
                    <div
                      key={d}
                      title={`${cell.date}: ${cell.count} flight${cell.count !== 1 ? 's' : ''}`}
                      className="w-[11px] h-[11px] rounded-sm cursor-default transition-opacity hover:opacity-75"
                      style={{ backgroundColor: palette[intensity] }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1 mt-2 ml-8">
          <span className="text-[9px]" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>Less</span>
          {palette.map((color, i) => (
            <div key={i} className="w-[11px] h-[11px] rounded-sm" style={{ backgroundColor: color }} />
          ))}
          <span className="text-[9px]" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>More</span>
        </div>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label, isDark }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className={cn('px-3 py-2 rounded-lg border shadow-lg text-xs', isDark ? 'bg-[#1a1f2e] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900')}>
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.fill }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

export default function ClientAnalyticsPage() {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get('/api/client-portal/analytics')
      .then((res) => setData(res.data))
      .catch((e) => toast.error(e.response?.data?.error ?? t('common.error', 'Error')))
      .finally(() => setLoading(false));
  }, []);

  const card = cn(
    'rounded-xl border p-5',
    isDark ? 'bg-[#1a1f2e] border-white/10' : 'bg-white border-slate-200 shadow-sm',
  );

  const textMain = isDark ? 'text-white' : 'text-slate-900';
  const textSub  = isDark ? 'text-slate-400' : 'text-slate-500';
  const gridLine = isDark ? '#1e293b' : '#f1f5f9';
  const axisColor = isDark ? '#475569' : '#94a3b8';

  const chartData = (data?.monthly_stats ?? []).map((m) => ({
    ...m,
    label: MONTH_ABBR[parseInt(m.month.slice(5, 7), 10) - 1],
  }));

  const last30 = (data?.daily_flights ?? []).slice(-30).reduce((s, d) => s + d.count, 0);
  const totalYear = (data?.monthly_stats ?? []).reduce((s, m) => s + m.flights, 0);
  const totalHours = (data?.monthly_stats ?? []).reduce((s, m) => s + m.hours, 0);
  const peakMonth = chartData.reduce((best, m) => (m.flights > (best?.flights ?? -1) ? m : best), chartData[0] ?? null);

  return (
    <div className="flex flex-col min-h-screen">
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
              {t('clientPortal.analyticsTitle', 'Flight Analytics')}
            </h1>
            <p className={cn('text-xs', textSub)}>
              {t('clientPortal.analyticsSubtitle', 'Activity over the last 12 months')}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-6 pb-8 space-y-5 max-w-[1800px] mx-auto w-full">
        {loading ? (
          <>
            {/* KPI skeleton */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={cn(card, 'flex flex-col gap-2')}>
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-7 w-16" />
                </div>
              ))}
            </div>
            {/* Heatmap skeleton */}
            <div className={cn(card)}>
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
              <div className="space-y-1.5">
                {Array.from({ length: 7 }).map((_, row) => (
                  <div key={row} className="flex gap-[2px]">
                    {Array.from({ length: 53 }).map((_, col) => (
                      <Skeleton key={col} className="w-[11px] h-[11px] rounded-sm shrink-0" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            {/* Chart skeletons */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className={cn(card)}>
                  <Skeleton className="h-4 w-36 mb-4" />
                  <div className="flex items-end gap-1 h-[200px]">
                    {Array.from({ length: 12 }).map((_, j) => (
                      <Skeleton
                        key={j}
                        className="flex-1 rounded-t-sm"
                        style={{ height: `${30 + Math.random() * 60}%` }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className={cn(card)}>
              <Skeleton className="h-4 w-48 mb-4" />
              <div className="flex items-end gap-1 h-[180px]">
                {Array.from({ length: 12 }).map((_, j) => (
                  <Skeleton
                    key={j}
                    className="flex-1 rounded-t-sm"
                    style={{ height: `${20 + Math.random() * 70}%` }}
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Summary KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Flights (last 30 days)', value: last30, color: 'text-violet-500' },
                { label: 'Flights (12 months)', value: totalYear, color: 'text-blue-500' },
                { label: 'Flight hours (12 months)', value: `${totalHours}h`, color: 'text-emerald-500' },
              ].map((s) => (
                <div key={s.label} className={cn(card, 'flex flex-col gap-1')}>
                  <span className={cn('text-xs', textSub)}>{s.label}</span>
                  <span className={cn('text-2xl font-bold tabular-nums', s.color)}>{s.value}</span>
                </div>
              ))}
            </div>

            {/* Contribution heatmap */}
            <div className={card}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={cn('text-sm font-semibold', textMain)}>
                  {t('clientPortal.flightActivity', 'Flight Activity')}
                </h2>
                <span className={cn('text-xs', textSub)}>{totalYear} flights in the past year</span>
              </div>
              {(data?.daily_flights.length ?? 0) === 0 ? (
                <p className={cn('text-sm', textSub)}>No flight data available.</p>
              ) : (
                <ContributionHeatmap data={data!.daily_flights} isDark={isDark} />
              )}
            </div>

            {/* Monthly bar charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Flights per month */}
              <div className={card}>
                <h2 className={cn('text-sm font-semibold mb-4', textMain)}>
                  {t('clientPortal.flightsPerMonth', 'Flights per Month')}
                </h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke={gridLine} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip content={<CustomTooltip isDark={isDark} />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }} />
                    <Bar dataKey="flights" name="Flights" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                {peakMonth && (
                  <p className={cn('text-xs mt-2', textSub)}>
                    Peak: <span className={cn('font-medium', textMain)}>{peakMonth.label}</span> with {peakMonth.flights} flights
                  </p>
                )}
              </div>

              {/* Flight hours per month */}
              <div className={card}>
                <h2 className={cn('text-sm font-semibold mb-4', textMain)}>
                  {t('clientPortal.hoursPerMonth', 'Flight Hours per Month')}
                </h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke={gridLine} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} width={35} />
                    <Tooltip content={<CustomTooltip isDark={isDark} />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }} />
                    <Bar dataKey="hours" name="Hours" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Distance bar chart */}
            <div className={card}>
              <h2 className={cn('text-sm font-semibold mb-4', textMain)}>
                {t('clientPortal.distancePerMonth', 'Distance Flown per Month (km)')}
              </h2>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke={gridLine} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip content={<CustomTooltip isDark={isDark} />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }} />
                  <Bar dataKey="distance_km" name="km" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
