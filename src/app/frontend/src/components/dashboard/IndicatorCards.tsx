'use client';
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
          // Clean up existing gauges first
          gaugeRefs.current.forEach((gauge) => {
            if (gauge && gauge.destroy) {
              gauge.destroy();
            }
          });
          gaugeRefs.current.clear();

          Object.entries(dataByArea).forEach(([area, indicators]) => {
            indicators.forEach((ind, i) => {
              const id = `gauge_${area}_${i}`;
              const gaugeDiv = document.getElementById(id);
              
              if (gaugeDiv) {
                const color =
                  ind.status === 'GREEN' ? '#00b300' :
                  ind.status === 'YELLOW' ? '#ffcc00' : '#ff3300';

                const gauge = new (window as any).JustGage({
                  id: id,
                  value: ind.value ?? 0,
                  min: 0,
                  max: ind.target > 0 ? ind.target * 1.5 : 100,
                  gaugeWidthScale: 0.6,
                  pointer: true,
                  counter: true,
                  hideInnerShadow: true,
                  donut: false,
                  relativeGaugeSize: true,
                  label: ind.unit ?? '',
                  title: '',
                  customSectors: [
                    { color: '#ff3300', lo: 0, hi: ind.target * 0.6 },
                    { color: '#ffcc00', lo: ind.target * 0.6, hi: ind.target * 0.9 },
                    { color: '#00b300', lo: ind.target * 0.9, hi: ind.target * 1.5 }
                  ],
                  valueFontColor: color
                });
                
                // Store the gauge reference
                gaugeRefs.current.set(id, gauge);
              }
            });
          });
        }
      };
      document.body.appendChild(script);
    };

    document.body.appendChild(raphaelScript);

    return () => {
      // Cleanup gauges on unmount
      gaugeRefs.current.forEach((gauge) => {
        if (gauge && gauge.destroy) {
          gauge.destroy();
        }
      });
      gaugeRefs.current.clear();
      
      if (script.parentNode) script.parentNode.removeChild(script);
      if (raphaelScript.parentNode) raphaelScript.parentNode.removeChild(raphaelScript);
    };
  }, [dataByArea]);

  return (
    <div className="space-y-6">
      {Object.entries(dataByArea).map(([area, indicators]) => (
        <div key={area}>
          <h4 className={`text-lg uppercase font-semibold mb-4 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
            {area}
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {indicators.map((ind, i) => {
              const id = `gauge_${area}_${i}`;
              
              return (
                <div 
                  key={i}
                  className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-4 flex flex-col items-center justify-between`}
                >
                  <h6 className={`text-sm font-medium text-center mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {ind.indicator_name}
                  </h6>
                  
                  <div id={id} style={{ width: '120px', height: '80px' }} />
                  
                  <small className={`text-xs text-center mt-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {ind.value}{ind.unit || ''} / Target {ind.target}{ind.unit || ''}
                  </small>
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