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

  useEffect(() => {
    if (!chartRef.current || typeof window === 'undefined') return;
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/apexcharts';
    script.async = true;
    script.onload = () => {
      if (chartRef.current && (window as any).ApexCharts) {
        const chart = new (window as any).ApexCharts(chartRef.current, {
          chart: { type: 'line', height: 260, toolbar: { show: false }, background: 'transparent' },
          series: [{ name: 'SHI', data: values }],
          xaxis: {
            categories: labels,
            labels: { style: { colors: isDark ? '#64748b' : '#94a3b8', fontSize: '11px' } },
            axisBorder: { show: false }, axisTicks: { show: false },
          },
          yaxis: {
            min: 0, max: 100, tickAmount: 5,
            labels: { style: { colors: isDark ? '#64748b' : '#94a3b8', fontSize: '11px' } },
          },
          stroke: { curve: 'smooth', width: 2.5 },
          colors: ['#10b981'],
          markers: { size: 5, colors: ['#10b981'], strokeColors: isDark ? '#1e293b' : '#fff', strokeWidth: 2 },
          tooltip: {
            theme: isDark ? 'dark' : 'light',
            y: { formatter: (v: number) => v.toFixed(1) + '%' },
          },
          grid: {
            borderColor: isDark ? '#1e293b' : '#f1f5f9',
            xaxis: { lines: { show: false } },
          },
          annotations: {
            yaxis: [
              { y: 70, y2: 0,   fillColor: 'rgba(239,68,68,0.08)',  borderColor: 'transparent' },
              { y: 85, y2: 70,  fillColor: 'rgba(245,158,11,0.08)', borderColor: 'transparent' },
              { y: 100, y2: 85, fillColor: 'rgba(16,185,129,0.08)', borderColor: 'transparent' },
            ],
          },
        });
        chart.render();
        return () => chart.destroy();
      }
    };
    document.body.appendChild(script);
    return () => { if (script.parentNode) script.parentNode.removeChild(script); };
  }, [labels, values, isDark]);

  return (
    <div className={cn(
      'rounded-xl border h-full flex flex-col',
      isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-gray-200'
    )}>
      <div className={cn('px-5 py-4 border-b', isDark ? 'border-slate-700/60' : 'border-gray-100')}>
        <p className={cn('text-xs font-semibold uppercase tracking-widest', isDark ? 'text-slate-500' : 'text-gray-400')}>
          Trend
        </p>
        <h2 className={cn('text-sm font-semibold mt-0.5', isDark ? 'text-white' : 'text-gray-800')}>
          Monthly SHI Trend
        </h2>
      </div>
      <div className="flex-1 p-5">
        <div ref={chartRef} style={{ height: '260px' }} />
      </div>
    </div>
  );
};

export default SHITrendChart;