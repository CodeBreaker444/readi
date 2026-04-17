'use client';
import { cn } from '@/lib/utils';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface SafetyHealthGaugeProps {
  value: number;
  isDark?: boolean;
}

const SafetyHealthGauge: React.FC<SafetyHealthGaugeProps> = ({ value, isDark = false }) => {
  const { t } = useTranslation();
  const gaugeRef = useRef<HTMLDivElement>(null);

  const color    = value >= 85 ? '#10b981' : value >= 70 ? '#f59e0b' : '#ef4444';
  const label    = value >= 85 ? t('shi.gauge.status.excellent') : value >= 70 ? t('shi.gauge.status.marginal') : t('shi.gauge.status.unsatisfactory');
  const ringCls  = value >= 85 ? 'text-emerald-500' : value >= 70 ? 'text-yellow-500' : 'text-red-500';
  const badgeCls = value >= 85
    ? isDark ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/25' : 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200'
    : value >= 70
    ? isDark ? 'bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/25' : 'bg-yellow-50 text-yellow-600 ring-1 ring-yellow-200'
    : isDark ? 'bg-red-500/10 text-red-400 ring-1 ring-red-500/25' : 'bg-red-50 text-red-600 ring-1 ring-red-200';

  useEffect(() => {
    if (!gaugeRef.current || typeof window === 'undefined') return;
    const raphaelScript = document.createElement('script');
    raphaelScript.src   = 'https://cdnjs.cloudflare.com/ajax/libs/raphael/2.3.0/raphael.min.js';
    raphaelScript.async = true;
    const script        = document.createElement('script');
    script.src          = 'https://cdnjs.cloudflare.com/ajax/libs/justgage/1.4.0/justgage.min.js';
    script.async        = true;
    raphaelScript.onload = () => {
      script.onload = () => {
        if (gaugeRef.current && (window as any).JustGage) {
          gaugeRef.current.innerHTML = '';
          new (window as any).JustGage({
            id: gaugeRef.current.id,
            value, min: 0, max: 100, symbol: ' %',
            pointer: true, gaugeWidthScale: 0.7, counter: true,
            hideInnerShadow: true, donut: false, title: '',
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
    <div className={cn('rounded-xl border h-full flex flex-col', isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-gray-200')}>

      {/* Header */}
      <div className={cn('px-5 py-4 border-b flex items-start justify-between', isDark ? 'border-slate-700/60' : 'border-gray-100')}>
        <div>
          <p className={cn('text-xs font-semibold uppercase tracking-widest mb-0.5', isDark ? 'text-slate-500' : 'text-gray-400')}>{t('shi.gauge.overallScore')}</p>
          <h2 className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-800')}>{t('shi.gauge.title')}</h2>
        </div>
        <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold', badgeCls)}>
          {label}
        </span>
      </div>

      {/* Score display */}
      <div className={cn('grid grid-cols-2 divide-x border-b', isDark ? 'divide-slate-700/60 border-slate-700/60' : 'divide-gray-100 border-gray-100')}>
        <div className="px-5 py-4 flex flex-col gap-0.5">
          <span className={cn('text-[10px] font-semibold uppercase tracking-widest', isDark ? 'text-slate-500' : 'text-gray-400')}>{t('shi.gauge.scoreLabel')}</span>
          <span className={cn('text-3xl font-bold tabular-nums tracking-tight', ringCls)}>
            {value.toFixed(1)}<span className="text-lg font-medium ml-0.5">%</span>
          </span>
        </div>
        <div className="px-5 py-4 flex flex-col gap-0.5">
          <span className={cn('text-[10px] font-semibold uppercase tracking-widest', isDark ? 'text-slate-500' : 'text-gray-400')}>{t('shi.gauge.statusLabel')}</span>
          <span className={cn('text-sm font-semibold mt-1', ringCls)}>{label}</span>
        </div>
      </div>

      {/* Gauge */}
      <div className="flex-1 flex items-center justify-center px-6 py-4">
        <div id="shiGaugeMain" ref={gaugeRef} style={{ width: '100%', height: '160px' }} />
      </div>

      {/* Legend */}
      <div className={cn('px-5 py-4 border-t space-y-2', isDark ? 'border-slate-700/60' : 'border-gray-100')}>
        {[
          { color: 'bg-emerald-500', label: t('shi.gauge.legend.excellentLabel'),      range: t('shi.gauge.legend.excellentRange') },
          { color: 'bg-yellow-500',  label: t('shi.gauge.legend.marginalLabel'),       range: t('shi.gauge.legend.marginalRange') },
          { color: 'bg-red-500',     label: t('shi.gauge.legend.unsatisfactoryLabel'), range: t('shi.gauge.legend.unsatisfactoryRange') },
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
  );
};

export default SafetyHealthGauge;