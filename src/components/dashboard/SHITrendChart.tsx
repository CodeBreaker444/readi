'use client';
import { cn } from '@/lib/utils';
import React, { useEffect, useRef } from 'react';

interface SHITrendChartProps {
  labels: string[];
  values: number[];
  isDark?: boolean;
}

const SHITrendChart: React.FC<SHITrendChartProps> = ({ labels, values, isDark = false }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<any>(null);

  const latest = values[values.length - 1] ?? 0;
  const prev = values[values.length - 2] ?? latest;
  const delta = latest - prev;
  const deltaSign = delta >= 0 ? '+' : '';
  const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const peak = Math.max(...values);

  const statusColor = latest >= 85 ? '#10b981' : latest >= 70 ? '#f59e0b' : '#ef4444';
  const statusLabel = latest >= 85 ? 'Excellent' : latest >= 70 ? 'Marginal' : 'Unsatisfactory';
  const statusBadge = latest >= 85
    ? isDark ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/25' : 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200'
    : latest >= 70
    ? isDark ? 'bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/25' : 'bg-yellow-50 text-yellow-600 ring-1 ring-yellow-200'
    : isDark ? 'bg-red-500/10 text-red-400 ring-1 ring-red-500/25' : 'bg-red-50 text-red-600 ring-1 ring-red-200';

  useEffect(() => {
    if (!chartRef.current || typeof window === 'undefined') return;

    const init = () => {
      if (!chartRef.current || !(window as any).ApexCharts) return;
      chartInstance.current?.destroy();

      chartInstance.current = new (window as any).ApexCharts(chartRef.current, {
        chart: {
          type: 'area',
          height: 200,
          toolbar: { show: false },
          background: 'transparent',
          animations: { enabled: true, easing: 'easeinout', speed: 600 },
        },
        series: [{ name: 'SHI', data: values }],
        xaxis: {
          categories: labels,
          labels: { style: { colors: isDark ? '#475569' : '#94a3b8', fontSize: '10px', fontFamily: 'DM Sans, system-ui' } },
          axisBorder: { show: false },
          axisTicks: { show: false },
        },
        yaxis: {
          min: 0, max: 100, tickAmount: 4,
          labels: {
            style: { colors: isDark ? '#475569' : '#94a3b8', fontSize: '10px', fontFamily: 'DM Sans, system-ui' },
            formatter: (v: number) => v + '%',
          },
        },
        stroke: { curve: 'smooth', width: 2.5 },
        colors: ['#10b981'],
        fill: {
          type: 'gradient',
          gradient: {
            shadeIntensity: 1,
            opacityFrom: isDark ? 0.22 : 0.14,
            opacityTo: 0.01,
            stops: [0, 100],
          },
        },
        markers: {
          size: 4,
          colors: ['#10b981'],
          strokeColors: isDark ? '#1e293b' : '#fff',
          strokeWidth: 2,
        },
        tooltip: {
          theme: isDark ? 'dark' : 'light',
          y: { formatter: (v: number) => v.toFixed(1) + '%' },
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
            { y: 70, y2: 0,   fillColor: 'rgba(239,68,68,0.05)',  borderColor: 'transparent' },
            { y: 85, y2: 70,  fillColor: 'rgba(245,158,11,0.05)', borderColor: 'transparent' },
            { y: 100, y2: 85, fillColor: 'rgba(16,185,129,0.05)', borderColor: 'transparent' },
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
  }, [labels, values, isDark]);

  return (
    <div className={cn(
      'rounded-xl border h-full flex flex-col',
      isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-gray-200'
    )}>
      {/* Header */}
      <div className={cn('px-5 py-4 border-b flex items-start justify-between gap-4', isDark ? 'border-slate-700/60' : 'border-gray-100')}>
        <div>
          <p className={cn('text-xs font-semibold uppercase tracking-widest mb-0.5', isDark ? 'text-slate-500' : 'text-gray-400')}>
            Trend
          </p>
          <h2 className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-800')}>
            Monthly SHI Trend
          </h2>
        </div>
        <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0', statusBadge)}>
          {statusLabel}
        </span>
      </div>

      {/* KPI row */}
      <div className={cn('grid grid-cols-4 divide-x', isDark ? 'divide-slate-700/60' : 'divide-gray-100')}>
        {[
          { label: 'Current', value: latest.toFixed(1) + '%' },
          { label: 'Average', value: avg.toFixed(1) + '%' },
          { label: 'Peak', value: peak.toFixed(1) + '%' },
          {
            label: 'vs Prev',
            value: `${deltaSign}${delta.toFixed(1)}%`,
            color: delta >= 0 ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : (isDark ? 'text-red-400' : 'text-red-500'),
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="px-4 py-3 flex flex-col gap-0.5">
            <span className={cn('text-[10px] font-semibold uppercase tracking-widest', isDark ? 'text-slate-500' : 'text-gray-400')}>{label}</span>
            <span className={cn('text-sm font-bold tabular-nums', color ?? (isDark ? 'text-white' : 'text-gray-900'))}>{value}</span>
          </div>
        ))}
      </div>

      {/* Zone legend */}
      <div className={cn('px-5 py-2.5 border-t flex items-center gap-4', isDark ? 'border-slate-700/60' : 'border-gray-100')}>
        {[
          { color: 'bg-emerald-500', label: 'Excellent ≥85%' },
          { color: 'bg-yellow-500',  label: 'Marginal 70–84%' },
          { color: 'bg-red-500',     label: 'Unsatisfactory <70%' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-sm shrink-0', color)} />
            <span className={cn('text-[10px]', isDark ? 'text-slate-500' : 'text-gray-400')}>{label}</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="flex-1 px-2 pb-3 pt-1">
        <div ref={chartRef} />
      </div>
    </div>
  );
};

export default SHITrendChart;