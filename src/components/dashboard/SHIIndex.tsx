'use client';
import { SessionUser } from '@/lib/auth/server-session';
import { cn } from '@/lib/utils';
import React, { useEffect, useState } from 'react';
import { useTheme } from '../useTheme';
import AreaGauges from './AreaGauges';
import IndicatorCards from './IndicatorCards';
import IndicatorTrendChart from './IndicatorTrendChart';
import SafetyHealthGauge from './SafetyHealthGauge';
import SHITrendChart from './SHITrendChart';

interface SHIData { code: number; safety_index: number; data: Record<string, any[]> }
interface TrendData { code: number; labels: string[]; values: number[]; target?: number }
interface shiIndexProps { user: SessionUser }

const SHIIndex: React.FC<shiIndexProps> = (user) => {
  const { isDark } = useTheme();
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

  const card        = cn('rounded-xl border', isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-gray-200');
  const cardHeader  = cn('px-5 py-4 border-b', isDark ? 'border-slate-700/60' : 'border-gray-100');
  const cardTitle   = cn('text-sm font-semibold mt-0.5', isDark ? 'text-white' : 'text-gray-800');
  const eyebrow     = cn('text-xs font-semibold uppercase tracking-widest', isDark ? 'text-slate-500' : 'text-gray-400');
  const selectCls   = cn(
    'text-xs border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500/40',
    isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-gray-50 border-gray-200 text-gray-700'
  );

  return (
    <div className={`min-h-screen ${isDark ? 'text-white' : 'text-gray-900'}`}>

      <div className={cn(
        ' top-0 z-10 backdrop-blur-md px-6 py-4 mb-6 transition-colors',
        isDark
          ? 'bg-slate-900/80 border-b border-slate-800'
          : 'bg-white/80 border-b border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
      )}>
        <div className="mx-auto max-w-[1800px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full bg-violet-600" />
            <div>
              <p className={`font-semibold text-base tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                Safety Management
              </p>
              <h1 className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                Safety Health Index
              </h1>
            </div>
          </div>
          <div className={cn('hidden sm:flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border', isDark ? 'border-slate-700 text-slate-400' : 'border-gray-200 text-gray-500')}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            EASA Model
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 pb-8 space-y-6">

        {/* Gauge + Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4">
            {shiData && <SafetyHealthGauge value={shiData.safety_index} isDark={isDark} />}
          </div>
          <div className="lg:col-span-8">
            {shiTrend && <SHITrendChart labels={shiTrend.labels} values={shiTrend.values} isDark={isDark} />}
          </div>
        </div>

        {/* Area gauges */}
        {shiData && <AreaGauges dataByArea={shiData.data} isDark={isDark} />}

        {/* Indicator cards */}
        {shiData && <IndicatorCards dataByArea={shiData.data} isDark={isDark} />}

        {/* Indicator trend */}
        <div className={cn(card)}>
          <div className={cn(cardHeader, 'flex items-start justify-between gap-4')}>
            <div>
              <p className={eyebrow}>Trend Analysis</p>
              <h2 className={cardTitle}>Indicator Trend</h2>
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
                Select an indicator to view trend
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default SHIIndex;