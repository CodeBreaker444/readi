'use client';
import { cn } from '@/lib/utils';
import React, { useEffect, useRef } from 'react';

interface IndicatorTrendChartProps {
  indicatorName: string;
  labels: string[];
  values: number[];
  target: number;
  isDark?: boolean;
}

const IndicatorTrendChart: React.FC<IndicatorTrendChartProps> = ({
  indicatorName, labels, values, target, isDark = false,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<any>(null);

  const latest = values[values.length - 1] ?? 0;
  const prev = values[values.length - 2] ?? latest;
  const delta = latest - prev;
  const deltaSign = delta >= 0 ? '+' : '';
  const targetPct = target > 0 ? Math.min(100, Math.round((latest / target) * 100)) : 0;
  const statusColor = targetPct >= 90 ? '#10b981' : targetPct >= 60 ? '#f59e0b' : '#ef4444';
  const statusLabel = targetPct >= 90 ? 'On Target' : targetPct >= 60 ? 'Marginal' : 'Below Target';
  const statusBadge = targetPct >= 90
    ? isDark ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/25' : 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200'
    : targetPct >= 60
    ? isDark ? 'bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/25' : 'bg-yellow-50 text-yellow-600 ring-1 ring-yellow-200'
    : isDark ? 'bg-red-500/10 text-red-400 ring-1 ring-red-500/25' : 'bg-red-50 text-red-600 ring-1 ring-red-200';

  useEffect(() => {
    if (!chartRef.current || typeof window === 'undefined') return;

    const init = () => {
      if (!chartRef.current || !(window as any).ApexCharts) return;
      chartInstance.current?.destroy();

      const maxVal = Math.max(...values, target, 10);
      const targetVal = target || maxVal * 0.8;

      chartInstance.current = new (window as any).ApexCharts(chartRef.current, {
        chart: {
          type: 'area',
          height: 220,
          toolbar: { show: false },
          background: 'transparent',
          sparkline: { enabled: false },
          animations: { enabled: true, easing: 'easeinout', speed: 600 },
        },
        series: [
          { name: indicatorName, data: values },
          { name: 'Target', data: Array(values.length).fill(targetVal), type: 'line' },
        ],
        xaxis: {
          categories: labels,
          labels: { style: { colors: isDark ? '#475569' : '#94a3b8', fontSize: '10px', fontFamily: 'DM Sans, system-ui' } },
          axisBorder: { show: false },
          axisTicks: { show: false },
        },
        yaxis: {
          min: 0,
          max: Math.ceil(maxVal * 1.25),
          labels: { style: { colors: isDark ? '#475569' : '#94a3b8', fontSize: '10px', fontFamily: 'DM Sans, system-ui' } },
        },
        stroke: { curve: 'smooth', width: [2.5, 1.5], dashArray: [0, 5] },
        colors: ['#6366f1', isDark ? '#334155' : '#cbd5e1'],
        fill: {
          type: ['gradient', 'solid'],
          gradient: {
            shadeIntensity: 1,
            opacityFrom: isDark ? 0.2 : 0.12,
            opacityTo: 0.01,
            stops: [0, 100],
          },
        },
        markers: {
          size: [4, 0],
          colors: ['#6366f1'],
          strokeColors: isDark ? '#1e293b' : '#fff',
          strokeWidth: 2,
        },
        tooltip: {
          theme: isDark ? 'dark' : 'light',
          y: { formatter: (v: number) => v.toFixed(2) },
          style: { fontSize: '11px', fontFamily: 'DM Sans, system-ui' },
        },
        grid: {
          borderColor: isDark ? '#1e293b' : '#f1f5f9',
          strokeDashArray: 4,
          xaxis: { lines: { show: false } },
          padding: { left: 4, right: 4 },
        },
        legend: { show: false },
        annotations: {
          yaxis: [
            { y: targetVal * 0.6, y2: 0, fillColor: 'rgba(239,68,68,0.05)', borderColor: 'transparent' },
            { y: targetVal * 0.9, y2: targetVal * 0.6, fillColor: 'rgba(245,158,11,0.05)', borderColor: 'transparent' },
            { y: Math.ceil(maxVal * 1.25), y2: targetVal * 0.9, fillColor: 'rgba(16,185,129,0.05)', borderColor: 'transparent' },
          ],
        },
      });
      chartInstance.current.render();
    };

    if ((window as any).ApexCharts) {
      init();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/apexcharts';
      script.async = true;
      script.onload = init;
      document.body.appendChild(script);
    }

    return () => { chartInstance.current?.destroy(); };
  }, [indicatorName, labels, values, target, isDark]);

  return (
    <div className={cn(
      'rounded-xl border flex flex-col',
      isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-gray-200'
    )}>
      {/* Header */}
      <div className={cn('px-5 py-4 border-b flex items-start justify-between gap-4', isDark ? 'border-slate-700/60' : 'border-gray-100')}>
        <div className="min-w-0">
          <p className={cn('text-xs font-semibold uppercase tracking-widest mb-0.5', isDark ? 'text-slate-500' : 'text-gray-400')}>
            Indicator Trend
          </p>
          <h2 className={cn('text-sm font-semibold truncate', isDark ? 'text-white' : 'text-gray-800')}>
            {indicatorName}
          </h2>
        </div>
        <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0', statusBadge)}>
          {statusLabel}
        </span>
      </div>

      {/* KPI row */}
      <div className={cn('grid grid-cols-3 divide-x', isDark ? 'divide-slate-700/60' : 'divide-gray-100')}>
        {[
          { label: 'Latest', value: latest.toFixed(2) },
          { label: 'Target', value: target.toFixed(2) },
          { label: 'vs Prev', value: `${deltaSign}${delta.toFixed(2)}`, color: delta >= 0 ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : (isDark ? 'text-red-400' : 'text-red-500') },
        ].map(({ label, value, color }) => (
          <div key={label} className="px-5 py-3 flex flex-col gap-0.5">
            <span className={cn('text-[10px] font-semibold uppercase tracking-widest', isDark ? 'text-slate-500' : 'text-gray-400')}>{label}</span>
            <span className={cn('text-base font-bold tabular-nums', color ?? (isDark ? 'text-white' : 'text-gray-900'))}>{value}</span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className={cn('px-5 py-3 border-t', isDark ? 'border-slate-700/60' : 'border-gray-100')}>
        <div className="flex items-center justify-between mb-1.5">
          <span className={cn('text-[10px] font-semibold uppercase tracking-wider', isDark ? 'text-slate-500' : 'text-gray-400')}>
            Target progress
          </span>
          <span className="text-[11px] font-bold tabular-nums" style={{ color: statusColor }}>{targetPct}%</span>
        </div>
        <div className={cn('h-1.5 w-full rounded-full overflow-hidden', isDark ? 'bg-slate-700' : 'bg-gray-100')}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${targetPct}%`, backgroundColor: statusColor }}
          />
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 pb-4 pt-2">
        <div className="flex items-center gap-4 px-3 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-sm bg-indigo-500 inline-block" />
            <span className={cn('text-[10px]', isDark ? 'text-slate-400' : 'text-gray-500')}>{indicatorName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn('h-[2px] w-4 inline-block border-t-2 border-dashed', isDark ? 'border-slate-600' : 'border-slate-300')} />
            <span className={cn('text-[10px]', isDark ? 'text-slate-400' : 'text-gray-500')}>Target</span>
          </div>
        </div>
        <div ref={chartRef} />
      </div>
    </div>
  );
};

export default IndicatorTrendChart;