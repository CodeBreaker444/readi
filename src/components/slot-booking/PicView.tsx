'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import type { GroupDetail, MyBookingRow, MyStats, SlotGroup, SlotMe } from '@/config/types/slot-booking';
import { groupDates, slotLabel } from '@/lib/slot-booking-utils';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { ArrowLeft, CheckCircle2, Info, Trophy } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { MyRequestsTable } from './MyRequestsTable';
import { apiMsg, Btn, card, dialogSurface, EmptyBlock, GroupCalendar, heading, Legend, LoadingBlock, muted, Pill, SearchBox, useSlotI18n } from './ui';

const BASE = '/api/operation/slot-booking';

export function PicView({ isDark, me, groups }: { isDark: boolean; me: SlotMe; groups: SlotGroup[] }) {
  const s = useSlotI18n();
  const { t } = s;
  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [myBookings, setMyBookings] = useState<MyBookingRow[] | null>(null);
  const [slotId, setSlotId] = useState<number | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [opening, setOpening] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<MyBookingRow | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [stats, setStats] = useState<MyStats | null>(null);
  // The pending request being moved to another slot of its group.
  const [moveFrom, setMoveFrom] = useState<MyBookingRow | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setStats((await axios.get(`${BASE}/my-stats`)).data.data);
    } catch {
      setStats(null); // the numbers are a nicety; the booking screens work without them
    }
  }, []);

  useEffect(() => {
    if (me.canBook) loadStats();
  }, [me.canBook, loadStats]);

  const loadMyBookings = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE}/my-bookings`);
      setMyBookings(res.data.data);
    } catch (e) {
      toast.error(apiMsg(e, t('slotBooking.errors.loadRequests')));
      setMyBookings([]);
    }
  }, [t]);

  useEffect(() => {
    if (me.canBook) loadMyBookings();
  }, [me.canBook, loadMyBookings]);

  const [search, setSearch] = useState('');
  const [listTab, setListTab] = useState<'groups' | 'requests'>('groups');
  const query = search.trim().toLowerCase();
  const visibleGroups = query ? groups.filter((g) => [g.name, g.description].some((v) => v?.toLowerCase().includes(query))) : groups;

  const slot = detail?.slots.find((x) => x.id === slotId);

  const openGroup = async (id: number) => {
    setOpening(id);
    setDetailLoading(true);
    try {
      const res = await axios.get(`${BASE}/groups/${id}`);
      setDetail(res.data.data);
    } catch (e) {
      toast.error(apiMsg(e, t('slotBooking.errors.openGroup')));
    } finally {
      setOpening(null);
      setDetailLoading(false);
    }
  };

  const reloadDetail = async () => {
    if (!detail) return;
    try {
      const res = await axios.get(`${BASE}/groups/${detail.group.id}`);
      setDetail(res.data.data);
    } catch (e) {
      toast.error(apiMsg(e, t('slotBooking.errors.refresh')));
    }
  };

  const requestSlot = async () => {
    if (!slot || !detail) return;
    setBusy(true);
    try {
      if (moveFrom) {
        await axios.post(`${BASE}/bookings/${moveFrom.bookingId}/move`, { slotId: slot.id });
        toast.success(t('slotBooking.pic.moved'));
        setMoveFrom(null);
      } else {
        await axios.post(`${BASE}/slots/${slot.id}/book`);
        const msg = t('slotBooking.pic.requestedBanner', { day: s.reviewDay(detail.group.approvalDays) });
        setBanner(msg);
        toast.success(t('slotBooking.pic.requestedToast'), { description: msg });
      }
      setSlotId(null);
      await Promise.all([reloadDetail(), loadMyBookings(), loadStats()]);
    } catch (e) {
      toast.error(apiMsg(e, t('slotBooking.errors.requestSlot')));
      setSlotId(null);
      await reloadDetail();
    } finally {
      setBusy(false);
    }
  };

  const startMove = async (bookingId: number) => {
    const row = myBookings?.find((b) => b.bookingId === bookingId) ?? null;
    if (!row) return;
    setMoveFrom(row);
    await openGroup(row.groupId);
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await axios.delete(`${BASE}/bookings/${cancelTarget.bookingId}`);
      toast.success(t('slotBooking.pic.cancelled'));
      setCancelTarget(null);
      await Promise.all([reloadDetail(), loadMyBookings(), loadStats()]);
    } catch (e) {
      toast.error(apiMsg(e, t('slotBooking.errors.cancelRequest')));
      await loadMyBookings(); // it may have just become locked
      setCancelTarget(null);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-5">
      {!me.canBook && (
        <div className={cn('rounded-xl border p-3 text-xs flex items-center gap-2', isDark ? 'border-white/[0.08] text-gray-300' : 'border-gray-200 text-gray-600 bg-white')}>
          <Info size={14} /> {t('slotBooking.pic.onlyPilots')}
        </div>
      )}

      {me.canBook && stats && !detail && <StatsCard isDark={isDark} stats={stats} />}

      {banner && (
        <div className={cn('rounded-xl border p-4 flex items-start gap-3 text-xs', isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900')}>
          <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
          <span className="flex-1">{banner}</span>
          <button type="button" className="cursor-pointer opacity-70 hover:opacity-100" onClick={() => setBanner(null)}>{t('slotBooking.pic.dismiss')}</button>
        </div>
      )}

      {detail ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Btn isDark={isDark} onClick={() => { setDetail(null); setMoveFrom(null); }}><ArrowLeft size={13} /> {t('slotBooking.common.allGroups')}</Btn>
            <div>
              <h2 className={cn('text-sm font-semibold', heading(isDark))}>{detail.group.name}</h2>
              <p className={cn('text-[11px]', muted(isDark))}>{t('slotBooking.pic.reviewDay', { days: s.daysLabel(detail.group.approvalDays) })}</p>
            </div>
          </div>
          {moveFrom && (
            <div className={cn('rounded-xl border p-3 text-xs flex items-center gap-2', isDark ? 'bg-violet-500/10 border-violet-500/30 text-violet-200' : 'bg-violet-50 border-violet-200 text-violet-900')}>
              <Info size={14} className="shrink-0" />
              <span className="flex-1">{t('slotBooking.pic.moveBanner', { slot: slotLabel(moveFrom), date: s.date(moveFrom.date) })}</span>
              <button type="button" className="cursor-pointer underline" onClick={() => setMoveFrom(null)}>{t('slotBooking.common.cancel')}</button>
            </div>
          )}
          <div className={cn('rounded-xl border p-4 space-y-3', card(isDark))}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Legend isDark={isDark} mode="pic" />
              {me.canBook && <span className={cn('text-[11px] flex items-center gap-1', muted(isDark))}><Info size={12} /> {t('slotBooking.pic.clickToRequest')}</span>}
            </div>
            <GroupCalendar
              isDark={isDark}
              mode="pic"
              dates={groupDates(detail.group.startDate, detail.group.rangeMode)}
              slots={detail.slots}
              blocked={detail.group.blocked}
              bookings={detail.bookings}
              meId={me.userId}
              onSlotClick={(sl) => me.canBook && setSlotId(sl.id)}
            />
          </div>
        </div>
      ) : detailLoading ? (
        <LoadingBlock isDark={isDark} rows={1} />
      ) : (
        <>
          <div className={cn('flex items-center gap-1 border-b', isDark ? 'border-white/[0.08]' : 'border-gray-200')}>
            {(me.canBook ? (['groups', 'requests'] as const) : (['groups'] as const)).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setListTab(k)}
                className={cn(
                  'cursor-pointer px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                  listTab === k ? 'border-violet-600 text-violet-600' : cn('border-transparent', muted(isDark)),
                )}
              >
                {k === 'groups'
                  ? t('slotBooking.pic.availableGroups')
                  : `${t('slotBooking.pic.myRequests')}${myBookings && myBookings.length > 0 ? ` (${myBookings.length})` : ''}`}
              </button>
            ))}
          </div>
          {listTab === 'groups' && (
            <div className="flex items-center justify-end">
              <SearchBox isDark={isDark} value={search} onChange={setSearch} placeholder={t('slotBooking.search.groups')} className="w-full max-w-sm" />
            </div>
          )}
          {listTab === 'groups' &&
          (groups.length === 0 ? (
            <EmptyBlock isDark={isDark}>{t('slotBooking.pic.noGroups')}</EmptyBlock>
          ) : visibleGroups.length === 0 ? (
            <EmptyBlock isDark={isDark}>{t('slotBooking.search.noMatch')}</EmptyBlock>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {visibleGroups.map((g) => {
                const dates = groupDates(g.startDate, g.rangeMode);
                return (
                  <div
                    key={g.id}
                    className={cn('rounded-xl border p-4 flex flex-col gap-3 transition-shadow hover:shadow-md', card(isDark))}
                  >
                    <div>
                      <h3 className={cn('text-sm font-semibold', heading(isDark))}>{g.name}</h3>
                      {g.description && <p className={cn('text-xs mt-0.5', muted(isDark))}>{g.description}</p>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Pill isDark={isDark} tone="violet">{s.mode(g.mode)}</Pill>
                      <Pill isDark={isDark} tone={g.blocked ? 'red' : 'blue'}>{g.blocked ? t('slotBooking.pic.singlePilot') : t('slotBooking.pic.multiPilot')}</Pill>
                      <Pill isDark={isDark}>{s.range(g.rangeMode)}</Pill>
                      {g.clientName && <Pill isDark={isDark} tone="green">{t('slotBooking.opm.client', { name: g.clientName })}</Pill>}
                    </div>
                    <div className={cn('text-[11px]', muted(isDark))}>
                      {t('slotBooking.pic.datesRange', { from: s.date(dates[0]), to: s.date(dates[dates.length - 1]), count: g.stats?.openSlots ?? 0 })}
                    </div>
                    <div className={cn('text-[11px]', muted(isDark))}>{t('slotBooking.pic.reviewDay', { days: s.daysLabel(g.approvalDays) })}</div>
                    <Btn isDark={isDark} variant="primary" className="mt-auto" loading={opening === g.id} onClick={() => openGroup(g.id)}>
                      {t('slotBooking.opm.openCalendar')}
                    </Btn>
                  </div>
                );
              })}
            </div>
          ))}

          {listTab === 'requests' && me.canBook && (
            <div className="space-y-3">
              {myBookings === null ? (
                <Skeleton className={cn('h-40 rounded-xl', isDark && 'bg-white/[0.06]')} />
              ) : myBookings.length === 0 ? (
                <EmptyBlock isDark={isDark}>{t('slotBooking.pic.noRequests')}</EmptyBlock>
              ) : (
                <MyRequestsTable rows={myBookings} groups={groups} isDark={isDark} onCancel={(id) => setCancelTarget(myBookings.find((b) => b.bookingId === id) ?? null)} onMove={startMove} />
              )}
            </div>
          )}
        </>
      )}

      <AlertDialog open={!!cancelTarget} onOpenChange={(o) => { if (!o && !cancelling) setCancelTarget(null); }}>
        <AlertDialogContent className={isDark ? 'bg-[#0f1320] border-white/[0.08] text-white' : ''}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('slotBooking.pic.cancelTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget &&
                t('slotBooking.pic.cancelBody', { slot: slotLabel(cancelTarget), date: s.date(cancelTarget.date), group: cancelTarget.groupName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>{t('slotBooking.pic.cancelKeep')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={cancelling}
              onClick={(e) => {
                e.preventDefault(); // stay open until the request finishes
                confirmCancel();
              }}
            >
              {cancelling ? t('slotBooking.pic.cancelling') : t('slotBooking.pic.cancelConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!slot} onOpenChange={(o) => !o && !busy && setSlotId(null)}>
        <DialogContent className={cn('sm:max-w-md', dialogSurface(isDark))}>
          <DialogHeader>
            <DialogTitle>{moveFrom ? t('slotBooking.pic.moveTitle') : t('slotBooking.pic.confirmTitle')}</DialogTitle>
            <DialogDescription>
              {slot && `${s.date(slot.date)} · ${slotLabel(slot)}`}
              {detail && ` — ${detail.group.name}`}
            </DialogDescription>
          </DialogHeader>
          <p className={cn('text-xs', muted(isDark))}>
            {moveFrom
              ? t('slotBooking.pic.moveBody', { slot: slotLabel(moveFrom), date: s.date(moveFrom.date) })
              : t('slotBooking.pic.confirmBody', { days: detail ? s.daysLabel(detail.group.approvalDays) : '—' })}
          </p>
          <DialogFooter>
            <Btn isDark={isDark} disabled={busy} onClick={() => setSlotId(null)}>{t('slotBooking.common.cancel')}</Btn>
            <Btn isDark={isDark} variant="primary" loading={busy} onClick={requestSlot}>{moveFrom ? t('slotBooking.pic.moveSlot') : t('slotBooking.pic.requestSlot')}</Btn>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** The pilot's own flight hours, availability and rank, so they can see what the OPM sees. */
function StatsCard({ isDark, stats }: { isDark: boolean; stats: MyStats }) {
  const { t } = useTranslation();
  const tiles: Array<[string, string, string?]> = [
    [t('slotBooking.stats.hours', { days: stats.windowDays }), `${stats.hours90} h`, t('slotBooking.stats.hoursTotal', { hours: stats.hoursTotal })],
    [t('slotBooking.stats.weekend'), String(stats.weekendRequests90)],
    [t('slotBooking.stats.availability'), String(stats.requests90)],
    [t('slotBooking.stats.approved'), String(stats.approved90)],
    [t('slotBooking.stats.score'), stats.rank ? `${stats.score}` : '—', stats.rank ? t('slotBooking.stats.rank', { rank: stats.rank, total: stats.pilots }) : undefined],
  ];
  return (
    <div className={cn('rounded-xl border p-4 space-y-3', card(isDark))}>
      <div className="flex items-center gap-2">
        <Trophy size={14} className="text-violet-500" />
        <h2 className={cn('text-sm font-semibold', heading(isDark))}>{t('slotBooking.stats.title')}</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center">
        {tiles.map(([label, value, sub]) => (
          <div key={label} className={cn('rounded-lg py-2 px-1', isDark ? 'bg-white/[0.04]' : 'bg-gray-50')}>
            <div className={cn('text-base font-semibold', heading(isDark))}>{value}</div>
            <div className={cn('text-[10px]', muted(isDark))}>{label}</div>
            {sub && <div className={cn('text-[10px]', muted(isDark))}>{sub}</div>}
          </div>
        ))}
      </div>
      <p className={cn('text-[11px]', muted(isDark))}>{t('slotBooking.stats.how')}</p>
    </div>
  );
}
