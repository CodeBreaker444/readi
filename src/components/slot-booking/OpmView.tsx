'use client';

import type { GroupDetail, SlotDefaults, SlotGroup } from '@/config/types/slot-booking';
import { groupDates, nextApprovalDay, todayIso, weekdayOf } from '@/lib/slot-booking-utils';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { ArrowLeft, BellRing, Plus, Settings2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
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
import { CreateGroupDialog } from './CreateGroupDialog';
import { SlotDetailDialog, SlotSettingsDialog } from './OpmDialogs';
import { SlotAuditTable } from './SlotAuditTable';
import { apiMsg, Btn, card, EmptyBlock, GroupCalendar, heading, Legend, LoadingBlock, muted, Pill, SearchBox, useSlotI18n } from './ui';

const BASE = '/api/operation/slot-booking';

export function OpmView({
  isDark,
  defaults,
  groups,
  reload,
}: {
  isDark: boolean;
  defaults: SlotDefaults;
  groups: SlotGroup[];
  reload: () => Promise<void>;
}) {
  const s = useSlotI18n();
  const { t } = s;
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [slotId, setSlotId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SlotGroup | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [opening, setOpening] = useState<number | null>(null);

  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const visibleGroups = query
    ? groups.filter((g) => [g.name, g.description, g.createdByName].some((v) => v?.toLowerCase().includes(query)))
    : groups;

  const todayDow = weekdayOf(todayIso());
  const approvalToday = groups.filter((g) => g.approvalDays.includes(todayDow) && (g.stats?.pending ?? 0) > 0);
  const pendingToday = approvalToday.reduce((n, g) => n + (g.stats?.pending ?? 0), 0);

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

  const closeGroup = () => {
    setDetail(null);
    reload();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axios.delete(`${BASE}/groups/${deleteTarget.id}`);
      toast.success(t('slotBooking.opm.groupDeleted'));
      setDeleteTarget(null);
      await reload();
    } catch (e) {
      toast.error(apiMsg(e, t('slotBooking.errors.deleteGroup')));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {!detail ? (
          <SearchBox isDark={isDark} value={search} onChange={setSearch} placeholder={t('slotBooking.search.groups')} className="w-full max-w-sm" />
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
        <Btn isDark={isDark} onClick={() => setSettingsOpen(true)}>
          <Settings2 size={13} /> {t('slotBooking.opm.slotSettings')}
        </Btn>
        <Btn isDark={isDark} variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus size={13} /> {t('slotBooking.opm.newGroup')}
        </Btn>
        </div>
      </div>

      {approvalToday.length > 0 && !detail && (
        <div className={cn('rounded-xl border p-4 flex items-center gap-3', isDark ? 'bg-violet-500/10 border-violet-500/30' : 'bg-violet-50 border-violet-200')}>
          <BellRing size={18} className="text-violet-500 shrink-0" />
          <div className="text-xs">
            <div className={cn('font-semibold', heading(isDark))}>{t('slotBooking.opm.approvalDayTitle')}</div>
            <div className={muted(isDark)}>
              {t('slotBooking.opm.approvalDayBody', { groups: approvalToday.map((g) => g.name).join(', '), count: pendingToday })}
            </div>
          </div>
        </div>
      )}

      {detail ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Btn isDark={isDark} onClick={closeGroup}><ArrowLeft size={13} /> {t('slotBooking.common.allGroups')}</Btn>
            <div>
              <h2 className={cn('text-sm font-semibold', heading(isDark))}>{detail.group.name}</h2>
              <p className={cn('text-[11px]', muted(isDark))}>
                {detail.group.blocked ? t('slotBooking.opm.blocked') : t('slotBooking.opm.unblocked')} · {t('slotBooking.opm.approvalDays')}: {s.daysLabel(detail.group.approvalDays)}
              </p>
            </div>
          </div>

          <div className={cn('rounded-xl border p-4 space-y-3', card(isDark))}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Legend isDark={isDark} mode="opm" />
              <span className={cn('text-[11px]', muted(isDark))}>{t('slotBooking.opm.clickSlotHint')}</span>
            </div>
            <GroupCalendar
              isDark={isDark}
              mode="opm"
              dates={groupDates(detail.group.startDate, detail.group.rangeMode)}
              slots={detail.slots}
              blocked={detail.group.blocked}
              bookings={detail.bookings}
              onSlotClick={(sl) => setSlotId(sl.id)}
            />
          </div>

          <SlotAuditTable isDark={isDark} groupId={detail.group.id} compact />
        </div>
      ) : detailLoading ? (
        <LoadingBlock isDark={isDark} rows={1} />
      ) : groups.length === 0 ? (
        <EmptyBlock isDark={isDark}>{t('slotBooking.opm.noGroups')}</EmptyBlock>
      ) : visibleGroups.length === 0 ? (
        <EmptyBlock isDark={isDark}>{t('slotBooking.search.noMatch')}</EmptyBlock>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleGroups.map((g) => {
            const next = nextApprovalDay(g.approvalDays);
            const st = g.stats ?? { openSlots: 0, pending: 0, approved: 0 };
            return (
              <div key={g.id} className={cn('rounded-xl border p-4 flex flex-col gap-3', card(isDark))}>
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={cn('text-sm font-semibold', heading(isDark))}>{g.name}</h3>
                    <button
                      type="button"
                      title={t('slotBooking.opm.deleteGroup')}
                      className="cursor-pointer text-gray-400 hover:text-red-500 disabled:opacity-50"
                      onClick={() => setDeleteTarget(g)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {g.description && <p className={cn('text-xs mt-0.5', muted(isDark))}>{g.description}</p>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Pill isDark={isDark} tone="violet">{s.mode(g.mode)}</Pill>
                  <Pill isDark={isDark} tone={g.blocked ? 'red' : 'blue'}>{g.blocked ? t('slotBooking.opm.blocked') : t('slotBooking.opm.unblocked')}</Pill>
                  <Pill isDark={isDark}>{s.range(g.rangeMode)}</Pill>
                </div>
                <div className={cn('text-[11px] space-y-0.5', muted(isDark))}>
                  <div>
                    {t('slotBooking.opm.starts', { date: s.dateLong(g.startDate) })}
                    {g.createdByName ? ` · ${t('slotBooking.opm.by', { name: g.createdByName })}` : ''}
                  </div>
                  <div>
                    {t('slotBooking.opm.approvalDays')}: {s.daysLabel(g.approvalDays)}
                    {next ? ` · ${t('slotBooking.opm.next')}: ${s.reviewDay(g.approvalDays)}` : ''}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    [t('slotBooking.opm.openSlots'), st.openSlots],
                    [t('slotBooking.opm.pending'), st.pending],
                    [t('slotBooking.opm.approved'), st.approved],
                  ].map(([l, v]) => (
                    <div key={l} className={cn('rounded-lg py-2', isDark ? 'bg-white/[0.04]' : 'bg-gray-50')}>
                      <div className={cn('text-base font-semibold', heading(isDark))}>{v}</div>
                      <div className={cn('text-[10px]', muted(isDark))}>{l}</div>
                    </div>
                  ))}
                </div>
                <Btn isDark={isDark} variant="primary" className="mt-auto" loading={opening === g.id} onClick={() => openGroup(g.id)}>
                  {t('slotBooking.opm.openCalendar')}
                </Btn>
              </div>
            );
          })}
        </div>
      )}

      <CreateGroupDialog open={createOpen} onOpenChange={setCreateOpen} isDark={isDark} defaults={defaults} existingNames={groups.map((g) => g.name)} onCreated={reload} />
      <SlotSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} isDark={isDark} defaults={defaults} onSaved={reload} />
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o && !deleting) setDeleteTarget(null); }}>
        <AlertDialogContent className={isDark ? 'bg-[#0f1320] border-white/[0.08] text-white' : ''}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('slotBooking.opm.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>{t('slotBooking.opm.deleteBody', { name: deleteTarget?.name })}</p>
                {(() => {
                  const live = (deleteTarget?.stats?.pending ?? 0) + (deleteTarget?.stats?.approved ?? 0);
                  return live > 0 ? (
                    <p className="font-medium text-amber-600">{t('slotBooking.opm.deleteWithRequests', { count: live })}</p>
                  ) : null;
                })()}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('slotBooking.common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault(); // stay open until the request finishes
                confirmDelete();
              }}
            >
              {deleting ? t('slotBooking.opm.deleting') : t('slotBooking.opm.deleteAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <SlotDetailDialog detail={detail} slotId={slotId} onClose={() => setSlotId(null)} onChanged={reloadDetail} isDark={isDark} />
    </div>
  );
}
