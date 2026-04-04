'use client';

import { AlertTriangle, Globe, Sparkles, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AdminUsage {
  scope: 'company';
  today: {
    companyUsed: number;
    platformUsed: number;
    platformLimit: number;
    platformRemaining: number;
    platformPercent: number;
  };
  allTime: number;
  byUser: Record<string, number>;
  perUserLimit: number;
}

interface SuperAdminUsage {
  scope: 'platform';
  today: {
    used: number;
    limit: number;
    remaining: number;
    percent: number;
  };
  allTime: number;
  byCompany: Record<string, number>;
}

type UsageData = AdminUsage | SuperAdminUsage;

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function ProgressBar({ percent, isDark, warn }: { percent: number; isDark: boolean; warn?: boolean }) {
  const color = warn
    ? 'bg-amber-500'
    : percent >= 90
    ? 'bg-red-500'
    : percent >= 70
    ? 'bg-amber-500'
    : 'bg-violet-500';

  return (
    <div className={`w-full h-1.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
      <div
        className={`h-1.5 rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(100, percent)}%` }}
      />
    </div>
  );
}

interface Props {
  isDark: boolean;
}

export default function AiUsageWidget({ isDark }: Props) {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/agent/usage')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const card = `rounded-xl border p-4 ${isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-gray-100'}`;
  const label = `text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`;
  const value = `text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`;

  if (loading) {
    return (
      <div className={`${card} animate-pulse h-32`} />
    );
  }

  if (!data || ('error' in data)) return null;

  if (data.scope === 'platform') {
    const { today, allTime, byCompany } = data;
    const companiesCount = Object.keys(byCompany).length;

    return (
      <div className={`${card} space-y-3`}>
        <div className="flex items-center gap-2">
          <div className={`flex items-center justify-center w-7 h-7 rounded-lg ${isDark ? 'bg-violet-500/15' : 'bg-violet-50'}`}>
            <Globe size={14} className="text-violet-500" />
          </div>
          <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            AI Platform Usage
          </p>
          <span className={`ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-md ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
            Groq Free Tier
          </span>
        </div>

        <div>
          <div className="flex items-end justify-between mb-1.5">
            <span className={label}>Today's usage</span>
            <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
              {fmt(today.used)} / {fmt(today.limit)} tokens
            </span>
          </div>
          <ProgressBar percent={today.percent} isDark={isDark} />
          {today.percent >= 80 && (
            <div className="flex items-center gap-1 mt-1.5">
              <AlertTriangle size={11} className="text-amber-500" />
              <span className="text-[11px] text-amber-500 font-medium">
                {today.remaining === 0 ? 'Limit reached' : `${fmt(today.remaining)} tokens remaining`}
              </span>
            </div>
          )}
        </div>

        <div className={`grid grid-cols-3 gap-2 pt-1 border-t ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
          <div>
            <p className={label}>All-time</p>
            <p className={value}>{fmt(allTime)}</p>
          </div>
          <div>
            <p className={label}>Companies</p>
            <p className={value}>{companiesCount}</p>
          </div>
          <div>
            <p className={label}>Remaining</p>
            <p className={`text-lg font-bold ${today.remaining === 0 ? 'text-red-500' : isDark ? 'text-white' : 'text-gray-900'}`}>
              {fmt(today.remaining)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { today, allTime, byUser, perUserLimit } = data;
  const userCount = Object.keys(byUser).length;
  const topUsers = Object.entries(byUser)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <div className={`${card} space-y-3`}>
      <div className="flex items-center gap-2">
        <div className={`flex items-center justify-center w-7 h-7 rounded-lg ${isDark ? 'bg-violet-500/15' : 'bg-violet-50'}`}>
          <Sparkles size={14} className="text-violet-500" />
        </div>
        <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          AI Usage — Company
        </p>
        <span className={`ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-md ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
          Today
        </span>
      </div>

      {/* Platform bar so admin knows the shared ceiling */}
      <div>
        <div className="flex items-end justify-between mb-1.5">
          <span className={label}>Platform usage</span>
          <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
            {fmt(today.platformUsed)} / {fmt(today.platformLimit)}
          </span>
        </div>
        <ProgressBar percent={today.platformPercent} isDark={isDark} />
        {today.platformPercent >= 80 && (
          <div className="flex items-center gap-1 mt-1">
            <AlertTriangle size={11} className="text-amber-500" />
            <span className="text-[11px] text-amber-500 font-medium">
              Platform nearing Groq free-tier limit
            </span>
          </div>
        )}
      </div>

      <div className={`grid grid-cols-3 gap-2 pt-1 border-t ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
        <div>
          <p className={label}>Company today</p>
          <p className={value}>{fmt(today.companyUsed)}</p>
        </div>
        <div>
          <p className={label}>All-time</p>
          <p className={value}>{fmt(allTime)}</p>
        </div>
        <div>
          <p className={label}>Active users</p>
          <p className={value}>{userCount}</p>
        </div>
      </div>

      {topUsers.length > 0 && (
        <div className={`pt-2 border-t space-y-1.5 ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
          <div className="flex items-center gap-1.5 mb-2">
            <Users size={11} className={isDark ? 'text-slate-500' : 'text-gray-400'} />
            <span className={`text-[11px] font-medium ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Top users today — limit {fmt(perUserLimit)}/user
            </span>
          </div>
          {topUsers.map(([userId, tokens]) => {
            const pct = Math.min(100, Math.round((tokens / perUserLimit) * 100));
            return (
              <div key={userId}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    User #{userId}
                  </span>
                  <span className={`text-[11px] font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {fmt(tokens)}
                  </span>
                </div>
                <ProgressBar percent={pct} isDark={isDark} warn={pct >= 80} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
