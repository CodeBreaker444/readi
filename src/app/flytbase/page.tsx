'use client';

import { FlytbaseTokenConfig } from '@/components/flytbase/FlytbaseTokenConfig';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/useTheme';
import Link from 'next/link';
import { HiOutlineDocumentText } from 'react-icons/hi';

export default function FlytbaseIntegrationPage() {
  const { isDark } = useTheme();

  const bg = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-300 ${bg} ${
        isDark ? 'text-slate-300' : 'text-slate-700'
      }`}
    >
      <div className="animate-in fade-in duration-700 flex flex-col flex-1">
        <div
          className={`backdrop-blur-md w-full ${
            isDark
              ? 'bg-slate-900/80 border-b border-slate-800'
              : 'bg-white/80 border-b border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
          } px-4 sm:px-6 py-4`}
        >
          <div className="mx-auto max-w-[1800px] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 rounded-full bg-violet-600" />
              <div>
                <h1
                  className={`font-semibold text-base tracking-tight ${textPrimary}`}
                >
                  FlytBase Integration
                </h1>
                <p className={`text-xs ${textSecondary}`}>
                  Connect your FlytBase account to import flight logs and
                  mission data
                </p>
              </div>
            </div>

            <Link href="/flytbase/flights">
              <Button
                variant="outline"
                size="sm"
                className={`h-8 text-xs gap-1.5 ${
                  isDark
                    ? 'border-slate-700 bg-slate-800 text-slate-300'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                <HiOutlineDocumentText className="w-3.5 h-3.5" />
                View Flights
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8">
          <div className="w-full max-w-3xl space-y-4">
            <div className="space-y-6">
              <FlytbaseTokenConfig />
              <div className="text-center space-y-1 pt-2">
                <p className={`text-xs ${textSecondary}`}>
                  Need a FlytBase API token?{' '}
                  <span className="text-violet-500 underline underline-offset-2">
                    View documentation
                  </span>
                </p>
                <p
                  className={`text-[11px] ${
                    isDark ? 'text-slate-600' : 'text-slate-400'
                  }`}
                >
                  Use a long-lived API key (RS256 JWT), not a short-lived
                  session token.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}