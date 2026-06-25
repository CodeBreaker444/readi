'use client';

import { FlytbaseFlights } from '@/components/control-center/FlytbaseFlights';
import { FlytrelayFlights } from '@/components/control-center/FlytrelayFlights';
import { useTheme } from '@/components/useTheme';
import { useState } from 'react';

type Tab = 'flytbase' | 'flytrelay';

export function FlightsTabs({ flytrelayAccess }: { flytrelayAccess: boolean }) {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('flytbase');

  const bg = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const card = isDark ? 'bg-[#0c0f1a] border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`h-screen flex flex-col transition-colors duration-300 ${bg}`}>
      <div className="pb-4">
        <div className="mx-auto max-w-[1800px]">
          <div className={`border border-b p-4 ${card}`}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className={`font-semibold text-base tracking-tight ${textPrimary}`}>
                  Flights
                </h1>
                <p className={`text-xs ${textSecondary}`}>
                  Recent flight logs
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveTab('flytbase')}
                  className={`px-3 py-1.5 cursor-pointer rounded-md text-xs font-medium transition-colors ${
                    activeTab === 'flytbase'
                      ? 'bg-violet-600 text-white'
                      : isDark
                      ? 'text-slate-400 hover:bg-slate-800'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  FlytBase
                </button>
                {flytrelayAccess && (
                  <button
                    onClick={() => setActiveTab('flytrelay')}
                    className={`px-3 py-1.5 cursor-pointer rounded-md text-xs font-medium transition-colors ${
                      activeTab === 'flytrelay'
                        ? 'bg-violet-600 text-white'
                        : isDark
                        ? 'text-slate-400 hover:bg-slate-800'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    FlytRelay
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-6 pb-6">
        <div className="mx-auto max-w-[1800px] h-full">
          {activeTab === 'flytbase' && <FlytbaseFlights isActive={true} />}
          {flytrelayAccess && activeTab === 'flytrelay' && <FlytrelayFlights token={null} isActive={true} />}
        </div>
      </div>
    </div>
  );
}
