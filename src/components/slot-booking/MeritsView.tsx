'use client';

import type { Merits } from '@/config/types/slot-booking';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { Info, Star } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from './Avatar';
import { apiMsg, card, EmptyBlock, ErrorBlock, heading, LoadingBlock, muted, Pill, SearchBox } from './ui';

const BASE = '/api/operation/slot-booking';

/** Pilot merit table: more availability (weekends most of all) and flight hours mean a higher score. */
export function MeritsView({ isDark }: { isDark: boolean }) {
  const { t } = useTranslation();
  const [data, setData] = useState<Merits | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      setData((await axios.get(`${BASE}/merits`)).data.data);
      setError(null);
    } catch (e) {
      setError(apiMsg(e, t('slotBooking.merits.errors.load')));
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!data) return [];
    return q ? data.rows.filter((r) => [r.name, r.email ?? '', r.role ?? '', ...r.groups.map((g) => g.name)].some((v) => v.toLowerCase().includes(q))) : data.rows;
  }, [data, search]);

  if (error) return <ErrorBlock isDark={isDark} message={error} onRetry={load} />;
  if (!data) return <LoadingBlock isDark={isDark} rows={1} />;

  const th = cn('text-left text-[11px] font-semibold uppercase tracking-wider px-4 py-2.5 whitespace-nowrap', muted(isDark));
  const td = cn('px-4 py-3 text-[13px]', isDark ? 'text-gray-200' : 'text-gray-700');
  const pc = (n: number) => Math.round(n * 100);

  return (
    <div className="space-y-5">
      <div className={cn('rounded-xl border p-4 flex items-start gap-3 text-xs', isDark ? 'border-white/[0.08] text-gray-300' : 'border-gray-200 bg-white text-gray-600')}>
        <Info size={15} className="shrink-0 mt-0.5 text-violet-500" />
        <div className="space-y-1">
          <div className={cn('font-semibold', heading(isDark))}>{t('slotBooking.merits.howTitle')}</div>
          <p>{t('slotBooking.merits.how', { days: data.windowDays, weekend: pc(data.weights.weekend), availability: pc(data.weights.availability), hours: pc(data.weights.hours) })}</p>
        </div>
      </div>

      <SearchBox isDark={isDark} value={search} onChange={setSearch} placeholder={t('slotBooking.merits.search')} className="w-full max-w-sm" />

      {data.rows.length === 0 ? (
        <EmptyBlock isDark={isDark}>{t('slotBooking.merits.empty')}</EmptyBlock>
      ) : rows.length === 0 ? (
        <EmptyBlock isDark={isDark}>{t('slotBooking.merits.noMatch')}</EmptyBlock>
      ) : (
        <div className={cn('rounded-xl border overflow-x-auto', card(isDark))}>
          <table className="w-full min-w-[900px]">
            <thead className={isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}>
              <tr>
                <th className={th}>#</th>
                <th className={th}>{t('slotBooking.merits.pilot')}</th>
                <th className={th}>{t('slotBooking.merits.groups')}</th>
                <th className={th}>{t('slotBooking.merits.hours', { days: data.windowDays })}</th>
                <th className={th}>{t('slotBooking.merits.hoursTotal')}</th>
                <th className={th}>{t('slotBooking.merits.availability')}</th>
                <th className={th}>{t('slotBooking.merits.weekend')}</th>
                <th className={th}>{t('slotBooking.merits.approved')}</th>
                <th className={th}>{t('slotBooking.merits.score')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userId} className={cn('border-t', isDark ? 'border-white/[0.05]' : 'border-gray-100')}>
                  <td className={cn(td, 'font-semibold')}>{r.rank}</td>
                  <td className={td}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar person={r} size={30} />
                      <div className="min-w-0">
                        <div className={cn('text-[13px] font-medium truncate', heading(isDark))}>{r.name}</div>
                        <div className={cn('text-[11px] font-light truncate', muted(isDark))}>{r.email ?? t('slotBooking.pilotGroups.noEmail')}</div>
                      </div>
                    </div>
                  </td>
                  <td className={td}>
                    <div className="flex flex-wrap gap-1">
                      {r.groups.length === 0 ? <span className={muted(isDark)}>—</span> : r.groups.map((g) => (
                        <Pill key={g.id} isDark={isDark} tone={g.expert ? 'green' : 'gray'}>{g.expert && <Star size={9} />} {g.name}</Pill>
                      ))}
                    </div>
                  </td>
                  <td className={td}>{r.hours90} h</td>
                  <td className={td}>{r.hoursTotal} h</td>
                  <td className={td}>{r.requests90}</td>
                  <td className={td}>{r.weekendRequests90}</td>
                  <td className={td}>{r.approved90}</td>
                  <td className={td}>
                    <div className="flex items-center gap-2 min-w-[110px]">
                      <span className={cn('font-semibold w-8', heading(isDark))}>{r.score}</span>
                      <div className={cn('h-1.5 flex-1 rounded-full overflow-hidden', isDark ? 'bg-white/[0.08]' : 'bg-black/[0.08]')}>
                        <div className="h-full rounded-full bg-violet-500" style={{ width: `${r.score}%` }} />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
