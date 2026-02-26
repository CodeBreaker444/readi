'use client';
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

  useEffect(() => {
    if (!chartRef.current || typeof window === 'undefined') return;
    const script = document.createElement('script');
    script.src   = 'https://cdn.jsdelivr.net/npm/apexcharts';
    script.async = true;
    script.onload = () => {
      if (chartRef.current && (window as any).ApexCharts) {
        const maxVal     = Math.max(...values, 100);
        const targetVal  = target || maxVal * 0.8;
        const chart = new (window as any).ApexCharts(chartRef.current, {
          chart: { type: 'line', height: 260, toolbar: { show: false }, background: 'transparent' },
          series: [{ name: indicatorName, data: values }],
          xaxis: {
            categories: labels,
            labels: { style: { colors: isDark ? '#64748b' : '#94a3b8', fontSize: '11px' } },
            axisBorder: { show: false }, axisTicks: { show: false },
          },
          yaxis: {
            min: 0, max: Math.ceil(maxVal * 1.2),
            labels: { style: { colors: isDark ? '#64748b' : '#94a3b8', fontSize: '11px' } },
          },
          stroke: { curve: 'smooth', width: 2.5 },
          colors: ['#6366f1'],
          markers: { size: 5, colors: ['#6366f1'], strokeColors: isDark ? '#1e293b' : '#fff', strokeWidth: 2 },
          tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: (v: number) => v.toFixed(2) } },
          grid: {
            borderColor: isDark ? '#1e293b' : '#f1f5f9',
            xaxis: { lines: { show: false } },
          },
          annotations: {
            yaxis: [
              { y: targetVal * 0.6, y2: 0,            fillColor: 'rgba(239,68,68,0.08)',  borderColor: 'transparent' },
              { y: targetVal * 0.9, y2: targetVal * 0.6, fillColor: 'rgba(245,158,11,0.08)', borderColor: 'transparent' },
              { y: targetVal * 1.2, y2: targetVal * 0.9, fillColor: 'rgba(16,185,129,0.08)', borderColor: 'transparent' },
            ],
          },
        });
        chart.render();
        return () => chart.destroy();
      }
    };
    document.body.appendChild(script);
    return () => { if (script.parentNode) script.parentNode.removeChild(script); };
  }, [indicatorName, labels, values, target, isDark]);

  return <div ref={chartRef} style={{ height: '260px' }} />;
};

export default IndicatorTrendChart;