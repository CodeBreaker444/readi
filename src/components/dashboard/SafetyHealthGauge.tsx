'use client';
import { cn } from '@/lib/utils';
import React, { useEffect, useRef } from 'react';

interface SafetyHealthGaugeProps {
  value: number;
  isDark?: boolean;
}

const SafetyHealthGauge: React.FC<SafetyHealthGaugeProps> = ({ value, isDark = false }) => {
  const gaugeRef = useRef<HTMLDivElement>(null);

  const color   = value >= 85 ? '#10b981' : value >= 70 ? '#f59e0b' : '#ef4444';
  const label   = value >= 85 ? 'Excellent' : value >= 70 ? 'Marginal' : 'Unsatisfactory';
  const ringCls = value >= 85 ? 'text-emerald-500' : value >= 70 ? 'text-yellow-500' : 'text-red-500';
  const badgeCls = value >= 85
    ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/25'
    : value >= 70
    ? 'bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/25'
    : 'bg-red-500/10 text-red-400 ring-1 ring-red-500/25';

  useEffect(() => {
    if (!gaugeRef.current || typeof window === 'undefined') return;
    const raphaelScript = document.createElement('script');
    raphaelScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/raphael/2.3.0/raphael.min.js';
    raphaelScript.async = true;
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/justgage/1.4.0/justgage.min.js';
    script.async = true;
    raphaelScript.onload = () => {
      script.onload = () => {
        if (gaugeRef.current && (window as any).JustGage) {
          gaugeRef.current.innerHTML = '';
          new (window as any).JustGage({
            id: gaugeRef.current.id,
            value,
            min: 0, max: 100,
            symbol: ' %',
            pointer: true,
            gaugeWidthScale: 0.7,
            counter: true,
            hideInnerShadow: true,
            donut: false,
            title: '',
            valueFontColor: color,
            customSectors: [
              { color: '#ef4444', lo: 0,  hi: 69  },
              { color: '#f59e0b', lo: 70, hi: 84  },
              { color: '#10b981', lo: 85, hi: 100 },
            ],
          });
        }
      };
      document.body.appendChild(script);
    };
    document.body.appendChild(raphaelScript);
    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
      if (raphaelScript.parentNode) raphaelScript.parentNode.removeChild(raphaelScript);
    };
  }, [value]);

  return (
    <div className={cn(
      'rounded-xl border h-full flex flex-col',
      isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-gray-200'
    )}>
      <div className={cn('px-5 py-4 border-b', isDark ? 'border-slate-700/60' : 'border-gray-100')}>
        <p className={cn('text-xs font-semibold uppercase tracking-widest', isDark ? 'text-slate-500' : 'text-gray-400')}>
          Overall Score
        </p>
        <h2 className={cn('text-sm font-semibold mt-0.5', isDark ? 'text-white' : 'text-gray-800')}>
          Safety Health Index
        </h2>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
        <div className="text-center">
          <div className={cn('text-5xl font-bold tabular-nums tracking-tight', ringCls)}>
            {value.toFixed(1)}
            <span className="text-2xl font-medium ml-1">%</span>
          </div>
          <span className={cn('inline-flex mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold', badgeCls)}>
            {label}
          </span>
        </div>

        <div id="shiGaugeMain" ref={gaugeRef} style={{ width: '100%', height: '180px' }} />

        <div className="w-full space-y-1.5 pt-2 border-t border-dashed border-slate-700/30">
          {[
            { color: 'bg-emerald-500', label: 'Excellent',      range: '≥ 85%' },
            { color: 'bg-yellow-500',  label: 'Marginal',       range: '70 – 84%' },
            { color: 'bg-red-500',     label: 'Unsatisfactory', range: '< 70%' },
          ].map(t => (
            <div key={t.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn('h-2 w-2 rounded-sm shrink-0', t.color)} />
                <span className={cn('text-xs', isDark ? 'text-slate-400' : 'text-gray-500')}>{t.label}</span>
              </div>
              <span className={cn('text-xs font-medium tabular-nums', isDark ? 'text-slate-300' : 'text-gray-600')}>{t.range}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SafetyHealthGauge;