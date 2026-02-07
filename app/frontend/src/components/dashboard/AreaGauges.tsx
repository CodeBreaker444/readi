'use client';
import React, { useEffect, useRef } from 'react';

interface AreaGaugesProps {
  dataByArea: Record<string, any[]>;
  isDark?: boolean;
}

const AreaGauges: React.FC<AreaGaugesProps> = ({ dataByArea, isDark = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gaugeRefs = useRef<Map<string, any>>(new Map());

  const computeAreaIndex = (indicators: any[]) => {
    if (!indicators || !indicators.length) return 0;
    const score = indicators.reduce((acc, ind) => {
      return acc + (ind.status === 'GREEN' ? 1 : ind.status === 'YELLOW' ? 0.5 : 0);
    }, 0);
    return Math.round((score / indicators.length) * 1000) / 10;
  };

  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return;

    const raphaelScript = document.createElement('script');
    raphaelScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/raphael/2.3.0/raphael.min.js';
    raphaelScript.async = true;

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/justgage/1.4.0/justgage.min.js';
    script.async = true;

    raphaelScript.onload = () => {
      script.onload = () => {
        if (containerRef.current && (window as any).JustGage) {
          // Clean up existing gauges first
          gaugeRefs.current.forEach((gauge) => {
            if (gauge && gauge.destroy) {
              gauge.destroy();
            }
          });
          gaugeRefs.current.clear();

          Object.entries(dataByArea).forEach(([area, indicators]) => {
            const idx = computeAreaIndex(indicators);
            const id = `gauge_area_${area.replace(/\W+/g, '_')}`;
            const gaugeDiv = document.getElementById(id);

            if (gaugeDiv) {
              const gauge = new (window as any).JustGage({
                id,
                value: idx,
                min: 0,
                max: 100,
                symbol: ' %',
                pointer: true,
                gaugeWidthScale: 0.7,
                counter: true,
                hideInnerShadow: true,
                donut: false,
                title: '',
                valueFontColor: idx >= 85 ? '#00b300' : idx >= 70 ? '#ffcc00' : '#ff3300',
                customSectors: [
                  { color: '#ff3300', lo: 0, hi: 69 },
                  { color: '#ffcc00', lo: 70, hi: 84 },
                  { color: '#00b300', lo: 85, hi: 100 }
                ]
              });
              
              // Store the gauge reference
              gaugeRefs.current.set(id, gauge);
            }
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
    <div className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-6`}>
      <h6 className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
        Gauges per Area
      </h6>
      <div ref={containerRef} className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {Object.entries(dataByArea).map(([area, indicators]) => {
          const idx = computeAreaIndex(indicators);
          const id = `gauge_area_${area.replace(/\W+/g, '_')}`;
          
          return (
            <div 
              key={area} 
              className={`${isDark ? 'bg-slate-700' : 'bg-gray-50'} rounded-lg p-4 shadow-sm flex flex-col items-center justify-center`}
            >
              <div className={`text-xs uppercase tracking-wide mb-2 font-semibold ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                {area }
              </div>
              <div id={id} style={{ width: '160px', height: '110px' }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AreaGauges;