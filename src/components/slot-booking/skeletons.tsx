'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { card } from './ui';

/**
 * Section-accurate loading placeholders: one per slot-booking tab, mirroring the real layout
 * (toolbar, tiles, banner, table / cards) so nothing jumps when the data arrives.
 */

function useSk(isDark: boolean) {
  const sk = (cls: string) => <Skeleton className={cn(cls, isDark && 'bg-white/[0.06]')} />;
  const box = cn('rounded-xl border', card(isDark));
  const tile = isDark ? 'bg-white/[0.04]' : 'bg-gray-50';
  const line = isDark ? 'border-white/[0.05]' : 'border-gray-100';
  const head = isDark ? 'bg-white/[0.03]' : 'bg-gray-50';
  return { sk, box, tile, line, head };
}

type P = { isDark: boolean };

function Cards({ isDark, count = 6, kind }: P & { count?: number; kind: 'opm' | 'pic' | 'pilot' }) {
  const { sk, box, tile } = useSk(isDark);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn(box, 'p-4 flex flex-col gap-3')}>
          <div>
            <div className="flex items-start justify-between gap-2">
              {sk('h-4 w-36')}
              {kind !== 'pic' && sk('h-4 w-4')}
            </div>
            <div className="mt-2">{sk('h-3 w-3/4')}</div>
          </div>
          {kind === 'pilot' ? (
            <>
              <div className="flex gap-1.5">{sk('h-5 w-20 rounded-full')}{sk('h-5 w-16 rounded-full')}</div>
              <div className="flex -space-x-2">
                {Array.from({ length: 5 }).map((__, j) => <div key={j}>{sk('h-7 w-7 rounded-full')}</div>)}
              </div>
              {sk('h-3 w-1/2')}
              <div className="grid grid-cols-2 gap-2">
                {[0, 1].map((j) => <div key={j} className={cn('rounded-lg py-2 flex flex-col items-center gap-1.5', tile)}>{sk('h-4 w-6')}{sk('h-2.5 w-12')}</div>)}
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">{sk('h-5 w-16 rounded-full')}{sk('h-5 w-20 rounded-full')}{sk('h-5 w-14 rounded-full')}</div>
              {kind === 'opm' && <div className="flex flex-wrap gap-1.5">{sk('h-5 w-24 rounded-full')}</div>}
              <div className="space-y-1.5">{sk('h-3 w-5/6')}{sk('h-3 w-2/3')}</div>
              {kind === 'opm' && (
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((j) => <div key={j} className={cn('rounded-lg py-2 flex flex-col items-center gap-1.5', tile)}>{sk('h-4 w-6')}{sk('h-2.5 w-12')}</div>)}
                </div>
              )}
            </>
          )}
          <div className="mt-auto">{sk('h-8 w-full rounded-lg')}</div>
        </div>
      ))}
    </div>
  );
}

function TableBox({ isDark, cols, rows = 6, avatar, children }: P & { cols: number; rows?: number; avatar?: boolean; children?: ReactNode }) {
  const { sk, box, line, head } = useSk(isDark);
  return (
    <div className={cn(box, 'overflow-hidden')}>
      {children}
      <div className={cn('px-4 py-2.5 flex gap-6', head)}>
        {Array.from({ length: cols }).map((_, i) => <div key={i} className="flex-1">{sk('h-3 w-16')}</div>)}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={cn('px-4 py-3.5 flex items-center gap-6 border-t', line)}>
          {Array.from({ length: cols }).map((__, j) => (
            <div key={j} className="flex-1">
              {avatar && j === 1 ? (
                <div className="flex items-center gap-2.5">{sk('h-[30px] w-[30px] rounded-full shrink-0')}<div className="space-y-1.5">{sk('h-3.5 w-24')}{sk('h-2.5 w-32')}</div></div>
              ) : (
                sk(j === 0 ? 'h-4 w-20' : 'h-4 w-full max-w-[130px]')
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Slot Booking tab, manager view: [search | settings + new group] + group cards. */
export function OpmSkeleton({ isDark }: P) {
  const { sk } = useSk(isDark);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {sk('h-9 w-full max-w-sm rounded-lg')}
        <div className="flex gap-2">{sk('h-8 w-28 rounded-lg')}{sk('h-8 w-28 rounded-lg')}</div>
      </div>
      <Cards isDark={isDark} kind="opm" />
    </div>
  );
}

/** Slot Booking tab, pilot view: stats card, groups / my requests tabs, search, group cards. */
export function PicSkeleton({ isDark, stats = true }: P & { stats?: boolean }) {
  const { sk, box, tile, line } = useSk(isDark);
  return (
    <div className="space-y-5">
      {stats && (
        <div className={cn(box, 'p-4 space-y-3')}>
          <div className="flex items-center gap-2">{sk('h-4 w-4')}{sk('h-4 w-32')}</div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className={cn('rounded-lg py-2.5 flex flex-col items-center gap-1.5', tile)}>{sk('h-4 w-10')}{sk('h-2.5 w-16')}</div>)}
          </div>
          {sk('h-3 w-2/3')}
        </div>
      )}
      <div className={cn('flex items-center gap-1 border-b pb-2.5', line)}>{sk('h-4 w-32')}<span className="w-4" />{sk('h-4 w-24')}</div>
      <div className="flex justify-end">{sk('h-9 w-full max-w-sm rounded-lg')}</div>
      <Cards isDark={isDark} kind="pic" />
    </div>
  );
}

/** Opened group (back button, legend + calendar grid). */
export function GroupDetailSkeleton({ isDark, audit }: P & { audit?: boolean }) {
  const { sk, box, tile } = useSk(isDark);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {sk('h-8 w-28 rounded-lg')}
        <div className="space-y-1.5">{sk('h-4 w-40')}{sk('h-3 w-56')}</div>
      </div>
      <div className={cn(box, 'p-4 space-y-3')}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-3">{[0, 1, 2, 3].map((i) => <div key={i}>{sk('h-4 w-20')}</div>)}</div>
          {sk('h-3 w-48')}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="space-y-2">
              {sk('h-4 w-16')}
              {sk('h-14 rounded-lg')}
              <div className={cn('rounded-lg h-14', tile)} />
              {sk('h-14 rounded-lg')}
            </div>
          ))}
        </div>
      </div>
      {audit && <AuditSkeleton isDark={isDark} compact />}
    </div>
  );
}

/** Today tab: day header, 5 summary tiles, status banner, timeline. */
export function TodaySkeleton({ isDark }: P) {
  const { sk, box } = useSk(isDark);
  return (
    <div className="space-y-5">
      <div className={cn(box, 'px-4 py-3 flex flex-wrap items-center justify-between gap-3')}>
        <div className="flex items-center gap-3">
          {sk('h-11 w-11 rounded-lg shrink-0')}
          <div className="space-y-2">{sk('h-4 w-64')}{sk('h-3 w-40')}</div>
        </div>
        <div className="flex gap-2">{sk('h-8 w-24 rounded-lg')}{sk('h-8 w-32 rounded-lg')}</div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={cn(box, 'p-3 space-y-2.5')}>
            <div className="flex items-center gap-2">{sk('h-4 w-4')}{sk('h-3 w-16')}</div>
            {sk('h-6 w-14')}
          </div>
        ))}
      </div>
      {sk('h-14 rounded-xl')}
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="flex flex-col items-center gap-1 pt-1">{sk('h-3 w-3 rounded-full')}{sk('h-full min-h-24 w-0.5')}</div>
            <div className={cn(box, 'flex-1 p-4 space-y-3')}>
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-2">{sk('h-4 w-40')}{sk('h-3 w-56')}</div>
                {sk('h-5 w-20 rounded-full')}
              </div>
              {sk('h-12 rounded-lg')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Approved tab: bordered table, same height as the real one. */
export function ApprovedSkeleton({ isDark }: P) {
  return (
    <div className="space-y-3">
      <div className="min-h-[calc(100vh-300px)]">
        <TableBox isDark={isDark} cols={5} rows={6} />
      </div>
    </div>
  );
}

/** Calendar tab: week toolbar, filters, 6 KPI tiles, 7 day columns. */
export function CalendarSkeleton({ isDark, toolbar = true }: P & { toolbar?: boolean }) {
  const { sk, box } = useSk(isDark);
  return (
    <div className="space-y-4">
      {toolbar && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {sk('h-8 w-28 rounded-lg')}{sk('h-8 w-40 rounded-lg')}{sk('h-4 w-48')}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {sk('h-8 w-52 rounded-lg')}{sk('h-8 w-52 rounded-lg')}
            </div>
          </div>
        </>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={cn(box, 'p-3 flex items-center gap-3')}>
            {sk('h-9 w-9 rounded-lg shrink-0')}
            <div className="space-y-1.5">{sk('h-5 w-8')}{sk('h-3 w-16')}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7 gap-3 items-start">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className={cn(box, 'p-3 space-y-2.5')}>
            <div className="flex items-center justify-between">{sk('h-4 w-20')}{sk('h-4 w-8 rounded-full')}</div>
            {sk('h-14 rounded-lg')}
            {sk('h-14 rounded-lg')}
            {i % 2 === 0 && sk('h-14 rounded-lg')}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Day Preview tab: date controls, assigned-progress banner, slots table. */
export function DayPreviewSkeleton({ isDark, controls = true }: P & { controls?: boolean }) {
  const { sk, box } = useSk(isDark);
  return (
    <div className="space-y-5">
      {controls && (
        <div className="flex flex-wrap items-center gap-2">
          {sk('h-8 w-9 rounded-lg')}{sk('h-8 w-44 rounded-lg')}{sk('h-8 w-9 rounded-lg')}{sk('h-8 w-16 rounded-lg')}{sk('h-4 w-28 ml-2')}
        </div>
      )}
      <div className={cn(box, 'p-4 flex items-center gap-4')}>
        {sk('h-6 w-6 rounded-full shrink-0')}
        <div className="flex-1 space-y-2">{sk('h-4 w-56')}{sk('h-3 w-40')}{sk('h-1.5 w-full rounded-full')}</div>
      </div>
      <TableBox isDark={isDark} cols={6} rows={6} />
    </div>
  );
}

/** Pilot Groups tab: search + new button, group cards. */
export function PilotGroupsSkeleton({ isDark }: P) {
  const { sk } = useSk(isDark);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {sk('h-9 w-full max-w-sm rounded-lg')}
        {sk('h-8 w-32 rounded-lg')}
      </div>
      <Cards isDark={isDark} kind="pilot" />
    </div>
  );
}

/** Merits tab: how-it-works note, search, ranking table with pilot avatars. */
export function MeritsSkeleton({ isDark }: P) {
  const { sk, box } = useSk(isDark);
  return (
    <div className="space-y-5">
      <div className={cn(box, 'p-4 flex items-start gap-3')}>
        {sk('h-4 w-4 shrink-0')}
        <div className="flex-1 space-y-2">{sk('h-3.5 w-48')}{sk('h-3 w-full max-w-2xl')}</div>
      </div>
      {sk('h-9 w-full max-w-sm rounded-lg')}
      <TableBox isDark={isDark} cols={9} rows={7} avatar />
    </div>
  );
}

/** Audit tab (and the compact one under a group): title + filter bar, then the log table. */
export function AuditSkeleton({ isDark, compact }: P & { compact?: boolean }) {
  const { sk, line } = useSk(isDark);
  return (
    <TableBox isDark={isDark} cols={6} rows={compact ? 4 : 8}>
      <div className={cn('flex flex-wrap items-end gap-2 p-3 border-b', line)}>
        <div className="mr-auto">{sk('h-4 w-28')}</div>
        {sk('h-8 w-40 rounded-md')}{sk('h-8 w-44 rounded-md')}{sk('h-8 w-36 rounded-md')}{sk('h-8 w-36 rounded-md')}{sk('h-8 w-24 rounded-lg')}
      </div>
    </TableBox>
  );
}

/** Pilot's "My requests" list. */
export function RequestsSkeleton({ isDark }: P) {
  return <TableBox isDark={isDark} cols={6} rows={4} />;
}
