'use client';
import { cn } from '@/lib/utils';
import React, { useEffect, useRef } from 'react';

interface Indicator {
  indicator_name: string;
  value: number;
  target: number;
  unit?: string;
  status: 'GREEN' | 'YELLOW' | 'RED';
}

interface IndicatorCardsProps {
  dataByArea: Record<string, Indicator[]>;
  isDark?: boolean;
}

const STATUS_CONFIG = {
  GREEN: { dot: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/25', label: 'Good' },
  YELLOW: { dot: 'bg-yellow-500', badge: 'bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/25', label: 'Marginal' },
  RED: { dot: 'bg-red-500', badge: 'bg-red-500/10 text-red-400 ring-1 ring-red-500/25', label: 'Alert' },
};

const IndicatorCards: React.FC<IndicatorCardsProps> = ({ dataByArea, isDark = false }) => {
  const gaugeRefs = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raphaelScript = document.createElement('script');
    raphaelScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/raphael/2.3.0/raphael.min.js';
    raphaelScript.async = true;
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/justgage/1.4.0/justgage.min.js';
    script.async = true;
    raphaelScript.onload = () => {
      script.onload = () => {
        if ((window as any).JustGage) {
          gaugeRefs.current.forEach(g => g?.destroy?.());
          gaugeRefs.current.clear();
          Object.entries(dataByArea).forEach(([area, indicators]) => {
            indicators.forEach((ind, i) => {
              const id = `gauge_${area}_${i}`;
              const el = document.getElementById(id);
              if (el) {
                const color = ind.status === 'GREEN' ? '#10b981' : ind.status === 'YELLOW' ? '#f59e0b' : '#ef4444';
                const g = new (window as any).JustGage({
                  id, value: ind.value ?? 0, min: 0,
                  max: ind.target > 0 ? ind.target * 1.5 : 100,
                  gaugeWidthScale: 0.6, pointer: true, counter: true,
                  hideInnerShadow: true, donut: false,
                  relativeGaugeSize: true, label: ind.unit ?? '', title: '',
                  customSectors: [
                    { color: '#ef4444', lo: 0, hi: ind.target * 0.6 },
                    { color: '#f59e0b', lo: ind.target * 0.6, hi: ind.target * 0.9 },
                    { color: '#10b981', lo: ind.target * 0.9, hi: ind.target * 1.5 },
                  ],
                  valueFontColor: color,
                });
                gaugeRefs.current.set(id, g);
              }
            });
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
    <div className="space-y-6">
      {Object.entries(dataByArea).map(([area, indicators]) => (
        <div key={area}>
          <div className="flex items-center gap-3 mb-4">
            <div className={cn('h-px flex-1', isDark ? 'bg-slate-700' : 'bg-gray-200')} />
            <span className={cn(
              'text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full',
              isDark ? 'bg-yellow-500/10 text-yellow-400' : 'bg-yellow-50 text-yellow-600'
            )}>
              {area}
            </span>
            <div className={cn('h-px flex-1', isDark ? 'bg-slate-700' : 'bg-gray-200')} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {indicators.map((ind, i) => {
              const id = `gauge_${area}_${i}`;
              const cfg = STATUS_CONFIG[ind.status] ?? STATUS_CONFIG.RED;
              const pct = ind.target > 0 ? Math.min(100, Math.round((ind.value / ind.target) * 100)) : 0;

              return (
                <div key={i} className={cn(
                  'rounded-xl border flex flex-col overflow-hidden',
                  isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-gray-200'
                )}>
                  <div className={cn('h-0.5 w-full', cfg.dot)} />

                  <div className="p-4 flex flex-col items-center gap-3">
                    <div className="text-center space-y-1.5">
                      <p className={cn('text-xs font-medium leading-tight', isDark ? 'text-slate-300' : 'text-gray-700')}>
                        {ind.indicator_name}
                      </p>
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold', cfg.badge)}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
                        {cfg.label}
                      </span>
                    </div>

                    <div id={id} style={{ width: '110px', height: '74px' }} />

                    <div className="w-full space-y-1">
                      <div className={cn('h-1.5 w-full rounded-full overflow-hidden', isDark ? 'bg-slate-700' : 'bg-gray-100')}>
                        <div
                          className={cn('h-full rounded-full transition-all', cfg.dot)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between">
                        <span className={cn('text-[10px]', isDark ? 'text-slate-500' : 'text-gray-400')}>
                          {ind.value}{ind.unit || ''}
                        </span>
                        <span className={cn('text-[10px]', isDark ? 'text-slate-500' : 'text-gray-400')}>
                          Target {ind.target}{ind.unit || ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default IndicatorCards;