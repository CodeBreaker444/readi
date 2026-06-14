'use client';
import { Skeleton } from '@/components/ui/skeleton';
import { SessionUser } from '@/lib/auth/server-session';
import { cn } from '@/lib/utils';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../useTheme';
import AreaGauges from './AreaGauges';
import IndicatorCards from './IndicatorCards';
import IndicatorTrendChart from './IndicatorTrendChart';
import SafetyHealthGauge from './SafetyHealthGauge';
import SHITrendChart from './SHITrendChart';

interface SHIData { code: number; safety_index: number; data: Record<string, any[]> }
interface TrendData { code: number; labels: string[]; values: number[]; target?: number }
interface shiIndexProps { user: SessionUser }

function GaugeSkeleton({ isDark }: { isDark: boolean }) {
  const card    = isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-gray-200';
  const divider = isDark ? 'border-slate-700/60 divide-slate-700/60' : 'border-gray-100 divide-gray-100';
  return (
    <div className={cn('rounded-xl border h-full flex flex-col', card)}>
      <div className={cn('px-5 py-4 border-b flex items-start justify-between', divider)}>
        <div className="space-y-1.5">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className={cn('grid grid-cols-2 divide-x border-b', divider)}>
        <div className="px-5 py-4 space-y-2">
          <Skeleton className="h-2.5 w-14" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="px-5 py-4 space-y-2">
          <Skeleton className="h-2.5 w-14" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center px-6 py-6">
        <Skeleton className="w-44 h-28 rounded-full" />
      </div>
      <div className={cn('px-5 py-4 border-t space-y-3', divider)}>
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-3.5 w-full" />)}
      </div>
    </div>
  );
}

function TrendChartSkeleton({ isDark }: { isDark: boolean }) {
  const card    = isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-gray-200';
  const divider = isDark ? 'border-slate-700/60 divide-slate-700/60' : 'border-gray-100 divide-gray-100';
  return (
    <div className={cn('rounded-xl border h-full flex flex-col', card)}>
      <div className={cn('px-5 py-4 border-b flex items-start justify-between gap-4', divider)}>
        <div className="space-y-1.5">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-4 w-44" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full shrink-0" />
      </div>
      <div className={cn('grid grid-cols-4 divide-x', divider)}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="px-4 py-3 space-y-2">
            <Skeleton className="h-2.5 w-12" />
            <Skeleton className="h-5 w-14" />
          </div>
        ))}
      </div>
      <div className={cn('px-5 py-2.5 border-t flex items-center gap-4', divider)}>
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-3 w-16" />)}
      </div>
      <div className="flex-1 px-3 pb-3 pt-2">
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    </div>
  );
}

function AreaGaugesSkeleton({ isDark }: { isDark: boolean }) {
  const card  = isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-gray-200';
  const inner = isDark ? 'bg-slate-700/40 border-slate-700/60' : 'bg-gray-50 border-gray-100';
  const divider = isDark ? 'border-slate-700/60' : 'border-gray-100';
  return (
    <div className={cn('rounded-xl border', card)}>
      <div className={cn('px-5 py-4 border-b flex items-center justify-between', divider)}>
        <div className="space-y-1.5">
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="hidden sm:flex items-center gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-3 w-14" />)}
        </div>
      </div>
      <div className="p-5 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={cn('rounded-xl border p-4 flex flex-col items-center gap-3', inner)}>
            <Skeleton className="h-3 w-24 self-start" />
            <Skeleton className="w-32.5 h-22 rounded-lg" />
            <Skeleton className="h-6 w-14" />
            <Skeleton className="h-1.5 w-full rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

function IndicatorCardsSkeleton({ isDark }: { isDark: boolean }) {
  const card    = isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-gray-200';
  const inner   = isDark ? 'bg-slate-700/30 divide-slate-700' : 'bg-gray-50 divide-gray-100';
  const divider = isDark ? 'bg-slate-700/60' : 'bg-gray-200';
  return (
    <div className="space-y-6">
      {[1, 2].map(area => (
        <div key={area}>
          <div className="flex items-center gap-3 mb-4">
            <div className={cn('h-px flex-1', divider)} />
            <Skeleton className="h-5 w-24 rounded-full" />
            <div className={cn('h-px flex-1', divider)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={cn('rounded-xl border flex flex-col overflow-hidden', card)}>
                <Skeleton className="h-0.5 w-full rounded-none" />
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <Skeleton className="h-3.5 flex-1" />
                    <Skeleton className="h-5 w-14 rounded-full shrink-0" />
                  </div>
                  <div className="flex justify-center">
                    <Skeleton className="w-27.5 h-18.5 rounded-lg" />
                  </div>
                  <div className={cn('grid grid-cols-2 divide-x rounded-lg overflow-hidden', inner)}>
                    <div className="px-3 py-2 space-y-1.5">
                      <Skeleton className="h-2 w-10" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                    <div className="px-3 py-2 space-y-1.5">
                      <Skeleton className="h-2 w-10" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <Skeleton className="h-2.5 w-14" />
                      <Skeleton className="h-2.5 w-8" />
                    </div>
                    <Skeleton className="h-1.5 w-full rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function IndicatorTrendSkeleton({ isDark }: { isDark: boolean }) {
  const card    = isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-gray-200';
  const divider = isDark ? 'border-slate-700/60 divide-slate-700/60' : 'border-gray-100 divide-gray-100';
  return (
    <div className={cn('rounded-xl border', card)}>
      <div className={cn('px-5 py-4 border-b flex items-start justify-between gap-4', divider)}>
        <div className="space-y-1.5">
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-8 w-48 rounded-lg shrink-0" />
      </div>
      <div className="p-5">
        <div className={cn('rounded-xl border flex flex-col', card)}>
          <div className={cn('px-5 py-4 border-b flex items-start justify-between gap-4', divider)}>
            <div className="space-y-1.5">
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full shrink-0" />
          </div>
          <div className={cn('grid grid-cols-3 divide-x', divider)}>
            {[1, 2, 3].map(i => (
              <div key={i} className="px-5 py-3 space-y-1.5">
                <Skeleton className="h-2.5 w-12" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
          <div className={cn('px-5 py-3 border-t space-y-2', divider)}>
            <div className="flex justify-between">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-2.5 w-8" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
          <div className="px-3 pb-4 pt-2">
            <div className="flex items-center gap-4 px-3 mb-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-52 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

const SHIIndex: React.FC<shiIndexProps> = (user) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [shiData, setSHIData] = useState<SHIData | null>(null);
  const [shiTrend, setSHITrend] = useState<TrendData | null>(null);
  const [selectedIndicator, setSelectedIndicator] = useState<string>('');
  const [indicatorTrend, setIndicatorTrend] = useState<TrendData | null>(null);
  const [allIndicators, setAllIndicators] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/dashboard/getSPIKPIData', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({})
        });
        const payload = await res.json();
        if (payload.code !== 1) return;
        setSHIData(payload);
        const indicators = new Set<string>();
        Object.values(payload.data).forEach((arr: any) => arr.forEach((ind: any) => indicators.add(ind.indicator_name)));
        const sorted = Array.from(indicators).sort();
        setAllIndicators(sorted);
        if (sorted.length > 0) setSelectedIndicator(sorted[0]);
      } catch (e) { console.error(e); }
      finally { setIsLoading(false); }
    };
    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/dashboard/getSHITrend', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ owner_id: user.user.ownerId, user_id: user.user.userId })
        });
        const data = await res.json();
        if (data.code === 1) setSHITrend(data);
      } catch (e) { console.error(e); }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedIndicator) return;
    const load = async () => {
      try {
        const res = await fetch('/api/dashboard/getSPIKPITrend', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ owner_id: user.user.ownerId, user_id: user.user.userId, name: selectedIndicator })
        });
        const data = await res.json();
        if (data.code === 1) setIndicatorTrend(data);
      } catch (e) { console.error(e); }
    };
    load();
  }, [selectedIndicator]);

  const card       = cn('rounded-xl border', isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-gray-200');
  const cardHeader = cn('px-5 py-4 border-b', isDark ? 'border-slate-700/60' : 'border-gray-100');
  const cardTitle  = cn('text-sm font-semibold mt-0.5', isDark ? 'text-white' : 'text-gray-800');
  const eyebrow    = cn('text-xs font-semibold uppercase tracking-widest', isDark ? 'text-slate-500' : 'text-gray-400');
  const selectCls  = cn(
    'text-xs border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500/40',
    isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-gray-50 border-gray-200 text-gray-700'
  );

  return (
    <div className={`min-h-screen ${isDark ? 'text-white' : 'text-gray-900'}`}>

      <div className={cn(
        'top-0 z-10 backdrop-blur-md px-6 py-4 mb-6 transition-colors',
        isDark
          ? 'bg-slate-900/80 border-b border-slate-800'
          : 'bg-white/80 border-b border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
      )}>
        <div className="mx-auto max-w-[1800px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full bg-violet-600" />
            <div>
              <p className={`font-semibold text-base tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {t('shi.safetyManagement')}
              </p>
              <h1 className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {t('shi.indexTitle')}
              </h1>
            </div>
          </div>
          <div className={cn('hidden sm:flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border', isDark ? 'border-slate-700 text-slate-400' : 'border-gray-200 text-gray-500')}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            {t('shi.easaModel')}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 pb-8 space-y-6">

        {/* Gauge + Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4">
            {isLoading
              ? <GaugeSkeleton isDark={isDark} />
              : shiData && <SafetyHealthGauge value={shiData.safety_index} isDark={isDark} />
            }
          </div>
          <div className="lg:col-span-8">
            {isLoading
              ? <TrendChartSkeleton isDark={isDark} />
              : shiTrend && <SHITrendChart labels={shiTrend.labels} values={shiTrend.values} isDark={isDark} />
            }
          </div>
        </div>

        {/* Area gauges */}
        {isLoading
          ? <AreaGaugesSkeleton isDark={isDark} />
          : shiData && <AreaGauges dataByArea={shiData.data} isDark={isDark} />
        }

        {/* Indicator cards */}
        {isLoading
          ? <IndicatorCardsSkeleton isDark={isDark} />
          : shiData && <IndicatorCards dataByArea={shiData.data} isDark={isDark} />
        }

        {/* Indicator trend */}
        {isLoading ? (
          <IndicatorTrendSkeleton isDark={isDark} />
        ) : (
          <div className={cn(card)}>
            <div className={cn(cardHeader, 'flex items-start justify-between gap-4')}>
              <div>
                <p className={eyebrow}>{t('shi.trendAnalysis')}</p>
                <h2 className={cardTitle}>{t('shi.indicatorTrend.title')}</h2>
              </div>
              <select
                value={selectedIndicator}
                onChange={(e) => setSelectedIndicator(e.target.value)}
                className={cn(selectCls, 'max-w-xs')}
              >
                {allIndicators.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div className="p-5">
              {indicatorTrend ? (
                <IndicatorTrendChart
                  indicatorName={selectedIndicator}
                  labels={indicatorTrend.labels}
                  values={indicatorTrend.values}
                  target={indicatorTrend.target || 100}
                  isDark={isDark}
                />
              ) : (
                <div className={cn('flex items-center justify-center h-40 text-xs', isDark ? 'text-slate-500' : 'text-gray-400')}>
                  {t('shi.indicatorTrend.selectIndicatorToView')}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SHIIndex;
