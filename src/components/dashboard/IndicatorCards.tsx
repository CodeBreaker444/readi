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

const getStatusConfig = (status: 'GREEN' | 'YELLOW' | 'RED', isDark: boolean) => {
  if (status === 'GREEN') return {
    dot:   'bg-emerald-500',
    bar:   'bg-emerald-500',
    badge: isDark ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/25' : 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200',
    label: 'Good',
  };
  if (status === 'YELLOW') return {
    dot:   'bg-yellow-500',
    bar:   'bg-yellow-500',
    badge: isDark ? 'bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/25' : 'bg-yellow-50 text-yellow-600 ring-1 ring-yellow-200',
    label: 'Marginal',
  };
  return {
    dot:   'bg-red-500',
    bar:   'bg-red-500',
    badge: isDark ? 'bg-red-500/10 text-red-400 ring-1 ring-red-500/25' : 'bg-red-50 text-red-600 ring-1 ring-red-200',
    label: 'Alert',
  };
};

const IndicatorCards: React.FC<IndicatorCardsProps> = ({ dataByArea, isDark = false }) => {
  const gaugeRefs = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raphaelScript = document.createElement('script');
    raphaelScript.src   = 'https://cdnjs.cloudflare.com/ajax/libs/raphael/2.3.0/raphael.min.js';
    raphaelScript.async = true;
    const script        = document.createElement('script');
    script.src          = 'https://cdnjs.cloudflare.com/ajax/libs/justgage/1.4.0/justgage.min.js';
    script.async        = true;
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
                    { color: '#ef4444', lo: 0,              hi: ind.target * 0.6 },
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

          {/* Area divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className={cn('h-px flex-1', isDark ? 'bg-slate-700/60' : 'bg-gray-200')} />
            <span className={cn(
              'text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full',
              isDark ? 'bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/25' : 'bg-violet-50 text-violet-600 ring-1 ring-violet-200'
            )}>
              {area}
            </span>
            <div className={cn('h-px flex-1', isDark ? 'bg-slate-700/60' : 'bg-gray-200')} />
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {indicators.map((ind, i) => {
              const id  = `gauge_${area}_${i}`;
              const cfg = getStatusConfig(ind.status, isDark);
              const pct = ind.target > 0 ? Math.min(100, Math.round((ind.value / ind.target) * 100)) : 0;

              return (
                <div key={i} className={cn(
                  'rounded-xl border flex flex-col overflow-hidden transition-shadow hover:shadow-md',
                  isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-gray-200'
                )}>
                  {/* Top accent */}
                  <div className={cn('h-0.5 w-full', cfg.dot)} />

                  <div className="p-4 flex flex-col gap-3">
                    {/* Name + badge */}
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-xs font-semibold leading-snug flex-1', isDark ? 'text-slate-200' : 'text-gray-700')}>
                        {ind.indicator_name}
                      </p>
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0', cfg.badge)}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
                        {cfg.label}
                      </span>
                    </div>

                    {/* Gauge */}
                    <div className="flex justify-center">
                      <div id={id} style={{ width: '110px', height: '74px' }} />
                    </div>

                    {/* Values row */}
                    <div className={cn('grid grid-cols-2 divide-x rounded-lg overflow-hidden', isDark ? 'divide-slate-700 bg-slate-700/30' : 'divide-gray-100 bg-gray-50')}>
                      <div className="px-3 py-2 flex flex-col gap-0.5">
                        <span className={cn('text-[9px] font-bold uppercase tracking-widest', isDark ? 'text-slate-500' : 'text-gray-400')}>Value</span>
                        <span className={cn('text-sm font-bold tabular-nums', isDark ? 'text-white' : 'text-gray-900')}>
                          {ind.value}{ind.unit || ''}
                        </span>
                      </div>
                      <div className="px-3 py-2 flex flex-col gap-0.5">
                        <span className={cn('text-[9px] font-bold uppercase tracking-widest', isDark ? 'text-slate-500' : 'text-gray-400')}>Target</span>
                        <span className={cn('text-sm font-bold tabular-nums', isDark ? 'text-slate-300' : 'text-gray-600')}>
                          {ind.target}{ind.unit || ''}
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn('text-[10px]', isDark ? 'text-slate-500' : 'text-gray-400')}>Progress</span>
                        <span className={cn('text-[10px] font-semibold tabular-nums', isDark ? 'text-slate-300' : 'text-gray-600')}>{pct}%</span>
                      </div>
                      <div className={cn('h-1.5 w-full rounded-full overflow-hidden', isDark ? 'bg-slate-700' : 'bg-gray-100')}>
                        <div className={cn('h-full rounded-full transition-all duration-500', cfg.bar)} style={{ width: `${pct}%` }} />
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