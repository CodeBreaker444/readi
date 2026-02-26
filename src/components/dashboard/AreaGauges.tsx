'use client';
import { cn } from '@/lib/utils';
import React, { useEffect, useRef } from 'react';

interface AreaGaugesProps {
  dataByArea: Record<string, any[]>;
  isDark?: boolean;
}

const computeAreaIndex = (indicators: any[]) => {
  if (!indicators?.length) return 0;
  const score = indicators.reduce((acc, ind) =>
    acc + (ind.status === 'GREEN' ? 1 : ind.status === 'YELLOW' ? 0.5 : 0), 0);
  return Math.round((score / indicators.length) * 1000) / 10;
};

const AreaGauges: React.FC<AreaGaugesProps> = ({ dataByArea, isDark = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gaugeRefs    = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return;
    const raphaelScript = document.createElement('script');
    raphaelScript.src   = 'https://cdnjs.cloudflare.com/ajax/libs/raphael/2.3.0/raphael.min.js';
    raphaelScript.async = true;
    const script = document.createElement('script');
    script.src   = 'https://cdnjs.cloudflare.com/ajax/libs/justgage/1.4.0/justgage.min.js';
    script.async = true;
    raphaelScript.onload = () => {
      script.onload = () => {
        if (containerRef.current && (window as any).JustGage) {
          gaugeRefs.current.forEach(g => g?.destroy?.());
          gaugeRefs.current.clear();
          Object.entries(dataByArea).forEach(([area, indicators]) => {
            const idx = computeAreaIndex(indicators);
            const id  = `gauge_area_${area.replace(/\W+/g, '_')}`;
            const el  = document.getElementById(id);
            if (el) {
              const g = new (window as any).JustGage({
                id, value: idx, min: 0, max: 100, symbol: ' %',
                pointer: true, gaugeWidthScale: 0.7, counter: true,
                hideInnerShadow: true, donut: false, title: '',
                valueFontColor: idx >= 85 ? '#10b981' : idx >= 70 ? '#f59e0b' : '#ef4444',
                customSectors: [
                  { color: '#ef4444', lo: 0,  hi: 69  },
                  { color: '#f59e0b', lo: 70, hi: 84  },
                  { color: '#10b981', lo: 85, hi: 100 },
                ],
              });
              gaugeRefs.current.set(id, g);
            }
          });
        }
      };
      document.body.appendChild(script);
    };
    document.body.appendChild(raphaelScript);
    return () => {
      gaugeRefs.current.forEach(g => g?.destroy?.());
      gaugeRefs.current.clear();
      if (script.parentNode) script.parentNode.removeChild(script);
      if (raphaelScript.parentNode) raphaelScript.parentNode.removeChild(raphaelScript);
    };
  }, [dataByArea]);

  return (
    <div className={cn(
      'rounded-xl border',
      isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-gray-200'
    )}>
      <div className={cn('px-5 py-4 border-b', isDark ? 'border-slate-700/60' : 'border-gray-100')}>
        <p className={cn('text-xs font-semibold uppercase tracking-widest', isDark ? 'text-slate-500' : 'text-gray-400')}>
          Breakdown
        </p>
        <h2 className={cn('text-sm font-semibold mt-0.5', isDark ? 'text-white' : 'text-gray-800')}>
          Safety Score by Area
        </h2>
      </div>

      <div ref={containerRef} className="p-5 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {Object.entries(dataByArea).map(([area, indicators]) => {
          const idx   = computeAreaIndex(indicators);
          const id    = `gauge_area_${area.replace(/\W+/g, '_')}`;
          const color = idx >= 85 ? 'text-emerald-500' : idx >= 70 ? 'text-yellow-500' : 'text-red-500';
          const dot   = idx >= 85 ? 'bg-emerald-500' : idx >= 70 ? 'bg-yellow-500' : 'bg-red-500';

          return (
            <div key={area} className={cn(
              'rounded-lg p-4 flex flex-col items-center gap-1',
              isDark ? 'bg-slate-700/50' : 'bg-gray-50'
            )}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dot)} />
                <span className={cn('text-[11px] font-semibold uppercase tracking-wide truncate max-w-[100px]',
                  isDark ? 'text-slate-300' : 'text-gray-600')}>
                  {area}
                </span>
              </div>
              <div id={id} style={{ width: '140px', height: '95px' }} />
              <span className={cn('text-lg font-bold tabular-nums', color)}>{idx}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AreaGauges;