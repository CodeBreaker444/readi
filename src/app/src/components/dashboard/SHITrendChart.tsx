'use client';
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

    // Dynamically load ApexCharts
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/apexcharts';
    script.async = true;

    script.onload = () => {
      if (chartRef.current && (window as any).ApexCharts) {
        const chart = new (window as any).ApexCharts(chartRef.current, {
          chart: {
            type: 'line',
            height: 300,
            toolbar: { show: false },
            background: 'transparent'
          },
          series: [{
            name: 'Safety Health Index',
            data: values
          }],
          xaxis: {
            categories: labels,
            labels: { 
              style: { 
                colors: isDark ? '#9ca3af' : '#6b7280' 
              } 
            }
          },
          yaxis: {
            min: 0,
            max: 100,
            tickAmount: 5,
            title: { 
              text: 'Index (%)',
              style: {
                color: isDark ? '#9ca3af' : '#6b7280'
              }
            },
            labels: { 
              style: { 
                colors: isDark ? '#9ca3af' : '#6b7280' 
              } 
            }
          },
          stroke: { 
            curve: 'smooth', 
            width: 3 
          },
          colors: ['#00b300'],
          markers: { 
            size: 8, 
            colors: ['#0d6efd'], 
            strokeColors: '#00b300',
            strokeWidth: 2
          },
          tooltip: {
            theme: isDark ? 'dark' : 'light',
            y: { 
              formatter: (v: number) => v.toFixed(1) + '%' 
            }
          },
          grid: {
            borderColor: isDark ? '#374151' : '#e5e7eb',
            row: { colors: ['transparent', 'transparent'] }
          },
          annotations: {
            yaxis: [
              {
                y: 70,
                y2: 0,
                borderColor: '#ff3300',
                fillColor: 'rgba(255, 51, 51, 0.15)',
                label: {
                  text: 'Unsatisfactory',
                  style: { color: '#fff', background: '#ff3300' }
                }
              },
              {
                y: 85,
                y2: 70,
                borderColor: '#ffcc00',
                fillColor: 'rgba(255, 204, 0, 0.15)',
                label: {
                  text: 'Marginal',
                  style: { color: '#333', background: '#ffcc00' }
                }
              },
              {
                y: 100,
                y2: 85,
                borderColor: '#00b300',
                fillColor: 'rgba(0, 179, 0, 0.15)',
                label: {
                  text: 'Acceptable / Excellent',
                  style: { color: '#fff', background: '#00b300' }
                }
              }
            ]
          }
        });

        chart.render();

        return () => {
          chart.destroy();
        };
      }
    };

    document.body.appendChild(script);

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [labels, values, isDark]);

  return (
    <div className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-6`}>
      <h5 className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
        Monthly Safety Health Index (SHI) Trend
      </h5>
      <div ref={chartRef} style={{ height: '300px' }} />
    </div>
  );
};

export default SHITrendChart;