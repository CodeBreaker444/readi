'use client';

import type { PilotProfile } from '@/config/types/slot-booking';
import { cn } from '@/lib/utils';
import { Plane, Star, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { heading, muted, Pill } from './ui';

function Stat({ isDark, label, children }: { isDark: boolean; label: string; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-lg border px-2.5 py-1.5 min-w-0 flex flex-col justify-between gap-0.5', isDark ? 'border-white/[0.08] bg-white/[0.02]' : 'border-gray-200 bg-gray-50/60')}>
      <div className={cn('text-[10px] font-semibold uppercase tracking-wider leading-tight', muted(isDark))}>{label}</div>
      <div className={cn('text-[13px] font-semibold mt-0.5 tabular-nums', heading(isDark))}>{children}</div>
    </div>
  );
}

/**
 * What the OPM needs when deciding on a request: missions flown, recent flying (with weekends), merit score and rank,
 * pilot groups, and how many slots of this slot group the pilot asked for, including weekend slots.
 */
export function PilotProfileCard({ profile, isDark }: { profile: PilotProfile; isDark: boolean }) {
  const { t } = useTranslation();
  const weekend = profile.appliedWeekendInGroup > 0;

  return (
    <div className="mt-2 space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat isDark={isDark} label={t('slotBooking.profile.totalFlights')}>
          <span className="inline-flex items-center gap-1"><Plane size={12} className="text-violet-500" /> {profile.totalFlights}</span>
        </Stat>
        <Stat isDark={isDark} label={t('slotBooking.profile.last7')}>
          {t('slotBooking.profile.weekendOfTotal', { weekend: profile.weekWeekendFlights, total: profile.weekFlights })}
        </Stat>
        <Stat isDark={isDark} label={t('slotBooking.profile.merit')}>
          {profile.score === null ? (
            <span className={cn('font-normal text-xs', muted(isDark))}>{t('slotBooking.profile.notRanked')}</span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Trophy size={12} className="text-amber-500" /> {profile.score}
              <span className={cn('font-normal text-[11px]', muted(isDark))}>{t('slotBooking.profile.rankOf', { rank: profile.rank, total: profile.rankedPilots })}</span>
            </span>
          )}
        </Stat>
        <Stat isDark={isDark} label={t('slotBooking.profile.appliedHere')}>
          {t('slotBooking.profile.slotsCount', { count: profile.appliedInGroup })}
        </Stat>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Pill isDark={isDark} tone={weekend ? 'green' : 'gray'}>
          {weekend ? t('slotBooking.profile.weekendYes', { count: profile.appliedWeekendInGroup }) : t('slotBooking.profile.weekendNo')}
        </Pill>
        {profile.groups.length === 0 ? (
          <span className={cn('text-[11px]', muted(isDark))}>{t('slotBooking.profile.noGroups')}</span>
        ) : (
          profile.groups.map((g) => (
            <Pill key={g.id} isDark={isDark} tone={g.expert ? 'violet' : 'gray'}>
              {g.expert && <Star size={9} />} {g.name}
            </Pill>
          ))
        )}
      </div>
    </div>
  );
}
