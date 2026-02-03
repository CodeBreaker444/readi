'use client';
import React, { useEffect, useRef } from 'react';

interface SafetyHealthGaugeProps {
  value: number;
  isDark?: boolean;
}

const SafetyHealthGauge: React.FC<SafetyHealthGaugeProps> = ({ value, isDark = false }) => {
  const gaugeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gaugeRef.current || typeof window === 'undefined') return;

    // Dynamically load JustGage library
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/justgage/1.4.0/justgage.min.js';
    script.async = true;
    
    const raphaelScript = document.createElement('script');
    raphaelScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/raphael/2.3.0/raphael.min.js';
    raphaelScript.async = true;

    raphaelScript.onload = () => {
      script.onload = () => {
        if (gaugeRef.current && (window as any).JustGage) {
          gaugeRef.current.innerHTML = '';
          
          let color = '#00b300'; // green
          if (value < 85) color = '#ffcc00'; // yellow
          if (value < 70) color = '#ff3300'; // red

          new (window as any).JustGage({
            id: gaugeRef.current.id,
            value: value,
            min: 0,
            max: 100,
            symbol: ' %',
            pointer: true,
            gaugeWidthScale: 0.7,
            counter: true,
            hideInnerShadow: true,
            donut: false,
            title: 'Safety Health Index',
            valueFontColor: color,
            customSectors: [
              { color: '#ff3300', lo: 0, hi: 69 },
              { color: '#ffcc00', lo: 70, hi: 84 },
              { color: '#00b300', lo: 85, hi: 100 }
            ]
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
    <div className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-6`}>
      <h5 className={`text-center mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
        Safety Health Index (SHI)
      </h5>
      <div 
        id="shiGaugeMain" 
        ref={gaugeRef}
        style={{ height: '300px' }}
      />
      <h3 className={`text-center font-bold mt-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {value.toFixed(1)}%
      </h3>
    </div>
  );
};

export default SafetyHealthGauge;