'use client';

import { useTheme } from '@/components/useTheme';
import { AlertTriangle } from 'lucide-react';

export default function EasaGate() {
  const { isDark } = useTheme();

  return (
    <div className={`flex flex-col items-center justify-center h-full min-h-screen px-4 ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>
      <div className={`max-w-md w-full border rounded-2xl p-8 shadow-2xl text-center space-y-5 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex justify-center">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ring-1 ${isDark ? 'bg-amber-500/10 ring-amber-500/30' : 'bg-amber-50 ring-amber-200'}`}>
            <AlertTriangle className={`w-7 h-7 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            EASA Operator Code Not Configured
          </h2>
          <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Your company does not have an EASA Operator Code saved in the system. Drone ATC access requires this code to be set at the company level.
          </p>
        </div>
        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          Please contact ReADI Team to add the EASA Operator Code to your company profile.
        </p>
      </div>
    </div>
  );
}
