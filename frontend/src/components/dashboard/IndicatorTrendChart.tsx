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
  indicatorName, 
  labels, 
  values, 
  target,
  isDark = false 
}) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || typeof window === 'undefined') return;

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/apexcharts';
    script.async = true;

    script.onload = () => {
      if (chartRef.current && (window as any).ApexCharts) {
        const maxVal = Math.max(...values, 100);
        const targetValue = target || (maxVal * 0.8);

        const chart = new (window as any).ApexCharts(chartRef.current, {
          chart: { 
            type: 'line', 
            height: 300, 
            toolbar: { show: false },
            background: 'transparent'
          },
          series: [{ 
            name: indicatorName, 
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
            max: Math.ceil(maxVal * 1.2),
            labels: { 
              style: { 
                colors: isDark ? '#9ca3af' : '#6b7280' 
              } 
            },
            title: { 
              text: 'Value / Target',
              style: {
                color: isDark ? '#9ca3af' : '#6b7280'
              }
            }
          },
          stroke: { 
            curve: 'smooth', 
            width: 3 
          },
          colors: ['#0dcaf0'],
          grid: { 
            borderColor: isDark ? '#374151' : '#e5e7eb' 
          },
          markers: { 
            size: 8,
            colors: ['#0dcaf0'],
            strokeColors: '#fff',
            strokeWidth: 2
          },
          tooltip: {
            theme: isDark ? 'dark' : 'light',
            y: { 
              formatter: (v: number) => v.toFixed(2) 
            }
          },
          annotations: {
            yaxis: [
              {
                y: targetValue * 0.6,
                y2: 0,
                borderColor: '#ff3300',
                fillColor: 'rgba(255, 51, 51, 0.15)',
                label: { 
                  text: 'Unsatisfactory', 
                  style: { color: '#fff', background: '#ff3300' } 
                }
              },
              {
                y: targetValue * 0.9,
                y2: targetValue * 0.6,
                borderColor: '#ffcc00',
                fillColor: 'rgba(255, 204, 0, 0.15)',
                label: { 
                  text: 'Marginal', 
                  style: { color: '#333', background: '#ffcc00' } 
                }
              },
              {
                y: targetValue * 1.2,
                y2: targetValue * 0.9,
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
  }, [indicatorName, labels, values, target, isDark]);

  return (
    <div ref={chartRef} style={{ height: '300px' }} />
  );
};

export default IndicatorTrendChart;