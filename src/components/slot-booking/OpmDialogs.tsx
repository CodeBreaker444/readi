'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { GroupDetail, RangeMode, SlotDefaults, SlotMode } from '@/config/types/slot-booking';
import { slotLabel, todayIso, weekdayOf } from '@/lib/slot-booking-utils';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { FileText, Paperclip, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { apiMsg, Btn, dialogSurface, heading, inputCls, muted, Pill, statusTone, useSlotI18n } from './ui';

const BASE = '/api/operation/slot-booking';
const PDF_MAX = 10 * 1024 * 1024;
const RANGES: RangeMode[] = ['DAY', 'WEEK', 'TWO_WEEKS'];

// ───────────────────────── Slot review / edit ─────────────────────────

export function SlotDetailDialog({
  detail,
  slotId,
  onClose,
  onChanged,
  isDark,
}: {
  detail: GroupDetail | null;
  slotId: number | null;
  onClose: () => void;
  /** Called after any change so the calendar reloads. */
  onChanged: () => Promise<void>;
  isDark: boolean;
}) {
  const s = useSlotI18n();
  const { t } = s;
  const group = detail?.group;
  const slot = detail?.slots.find((x) => x.id === slotId);
  const bookings = (detail?.bookings ?? []).filter((b) => b.slotId === slotId);

  const [approving, setApproving] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [pdf, setPdf] = useState<File | null>(null);
  const [reason, setReason] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [active, setActive] = useState(true);
  const [editReason, setEditReason] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setApproving(null);
    setRejecting(null);
    setPdf(null);
    setReason('');
    setEditOpen(false);
    setEditReason('');
    if (slot) {
      setStart(slot.start);
      setEnd(slot.end);
      setActive(slot.active);
    }
  }, [slotId]);

  if (!slot || !group) return null;
  const isApprovalDay = group.approvalDays.includes(weekdayOf(todayIso()));
  const alreadyApproved = bookings.some((b) => b.status === 'APPROVED');

  const confirmApprove = async (bookingId: number, pilotName: string) => {
    setBusy(true);
    try {
      let body: { file_key?: string; file_name?: string } = {};
      if (pdf) {
        // PDF goes straight to storage through a presigned URL, the API only stores the reference.
        const presign = await axios.post(`${BASE}/presign`, { file_name: pdf.name, content_type: pdf.type, file_size: pdf.size });
        await axios.put(presign.data.data.upload_url, pdf, { headers: { 'Content-Type': pdf.type } });
        body = { file_key: presign.data.data.file_key, file_name: pdf.name };
      }
      await axios.post(`${BASE}/bookings/${bookingId}/approve`, body);
      toast.success(t('slotBooking.slotDialog.approvedToast', { name: pilotName }), {
        description: pdf ? t('slotBooking.slotDialog.approvedDescPdf', { file: pdf.name }) : t('slotBooking.slotDialog.approvedDesc'),
      });
      setApproving(null);
      setPdf(null);
      await onChanged();
    } catch (e) {
      toast.error(apiMsg(e, t('slotBooking.errors.approve')));
    } finally {
      setBusy(false);
    }
  };

  const confirmReject = async (bookingId: number, pilotName: string) => {
    setBusy(true);
    try {
      await axios.post(`${BASE}/bookings/${bookingId}/reject`, { note: reason.trim() || undefined });
      toast.success(t('slotBooking.slotDialog.rejectedToast', { name: pilotName }), { description: t('slotBooking.slotDialog.rejectedDesc') });
      setRejecting(null);
      setReason('');
      await onChanged();
    } catch (e) {
      toast.error(apiMsg(e, t('slotBooking.errors.reject')));
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    setBusy(true);
    try {
      await axios.patch(`${BASE}/slots/${slot.id}`, { start, end, active, reason: editReason.trim() });
      toast.success(t('slotBooking.slotDialog.updatedToast'), { description: t('slotBooking.slotDialog.updatedDesc') });
      setEditOpen(false);
      setEditReason('');
      await onChanged();
    } catch (e) {
      toast.error(apiMsg(e, t('slotBooking.errors.updateSlot')));
    } finally {
      setBusy(false);
    }
  };

  const downloadDocument = async (bookingId: number) => {
    try {
      const res = await axios.get(`${BASE}/bookings/${bookingId}/document`);
      window.open(res.data.data.url, '_blank', 'noopener');
    } catch (e) {
      toast.error(apiMsg(e, t('slotBooking.errors.document')));
    }
  };

  return (
    <Dialog open={!!slotId} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className={cn('sm:max-w-2xl max-h-[90vh] overflow-y-auto', dialogSurface(isDark))}>
        <DialogHeader>
          <DialogTitle>
            {slotLabel(slot)} · {s.date(slot.date)}
          </DialogTitle>
          <DialogDescription>
            {group.name} — {group.blocked ? t('slotBooking.slotDialog.blockedLong') : t('slotBooking.slotDialog.unblockedLong')}
          </DialogDescription>
        </DialogHeader>

        {!isApprovalDay && (
          <div className={cn('text-[11px] rounded-lg px-3 py-2', isDark ? 'bg-amber-500/10 text-amber-300' : 'bg-amber-50 text-amber-800')}>
            {t('slotBooking.slotDialog.notApprovalDay', { days: s.daysLabel(group.approvalDays) })}
          </div>
        )}

        <div className="space-y-2">
          <h4 className={cn('text-xs font-semibold', heading(isDark))}>{t('slotBooking.slotDialog.requests', { count: bookings.length })}</h4>
          {bookings.length === 0 && <p className={cn('text-xs', muted(isDark))}>{t('slotBooking.slotDialog.noBookings')}</p>}
          {bookings.map((b) => (
            <div key={b.id} className={cn('rounded-lg border p-3', isDark ? 'border-white/[0.08]' : 'border-gray-200')}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className={cn('text-sm font-medium', heading(isDark))}>{b.picName}</div>
                  <div className={cn('text-[11px]', muted(isDark))}>{t('slotBooking.slotDialog.requestedAt', { when: s.dateTime(b.requestedAt) })}</div>
                </div>
                <Pill isDark={isDark} tone={statusTone(b.status)}>{s.status(b.status)}</Pill>
              </div>

              {b.status === 'APPROVED' && (
                <div className="mt-2">
                  {b.pdfName ? (
                    <button
                      type="button"
                      className="cursor-pointer inline-flex items-center gap-1.5 text-[11px] text-violet-500 hover:underline"
                      onClick={() => downloadDocument(b.id)}
                    >
                      <Paperclip size={12} /> {b.pdfName}
                    </button>
                  ) : (
                    <span className={cn('text-[11px]', muted(isDark))}>{t('slotBooking.slotDialog.noDocument')}</span>
                  )}
                </div>
              )}
              {b.status === 'REJECTED' && b.note && (
                <div className={cn('mt-2 text-[11px]', muted(isDark))}>{t('slotBooking.slotDialog.reasonLine', { note: b.note })}</div>
              )}

              {b.status === 'PENDING' && approving !== b.id && rejecting !== b.id && (
                <div className="mt-3 flex gap-2">
                  <Btn isDark={isDark} variant="success" disabled={alreadyApproved} onClick={() => { setApproving(b.id); setRejecting(null); }}>{t('slotBooking.slotDialog.approve')}</Btn>
                  <Btn isDark={isDark} variant="danger" onClick={() => { setRejecting(b.id); setApproving(null); }}>{t('slotBooking.slotDialog.reject')}</Btn>
                </div>
              )}

              {approving === b.id && (
                <div className={cn('mt-3 rounded-lg border border-dashed p-3 space-y-2', isDark ? 'border-white/[0.15]' : 'border-gray-300')}>
                  <div className={cn('text-xs font-medium', heading(isDark))}>{t('slotBooking.slotDialog.attachTitle')}</div>
                  <p className={cn('text-[11px]', muted(isDark))}>{t('slotBooking.slotDialog.attachHint')}</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      e.target.value = '';
                      if (!f) return;
                      if (f.type !== 'application/pdf') return void toast.error(t('slotBooking.slotDialog.pdfOnly'));
                      if (f.size > PDF_MAX) return void toast.error(t('slotBooking.slotDialog.pdfTooBig'));
                      setPdf(f);
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <Btn isDark={isDark} onClick={() => fileRef.current?.click()}>
                      <Upload size={13} /> {pdf ? t('slotBooking.slotDialog.replacePdf') : t('slotBooking.slotDialog.choosePdf')}
                    </Btn>
                    {pdf && <span className="flex items-center gap-1 text-xs"><FileText size={13} /> {pdf.name}</span>}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Btn isDark={isDark} variant="success" loading={busy} onClick={() => confirmApprove(b.id, b.picName)}>{t('slotBooking.slotDialog.confirmApproval')}</Btn>
                    <Btn isDark={isDark} disabled={busy} onClick={() => { setApproving(null); setPdf(null); }}>{t('slotBooking.common.cancel')}</Btn>
                  </div>
                </div>
              )}

              {rejecting === b.id && (
                <div className={cn('mt-3 rounded-lg border border-dashed p-3 space-y-2', isDark ? 'border-white/[0.15]' : 'border-gray-300')}>
                  <input className={inputCls(isDark)} maxLength={500} placeholder={t('slotBooking.slotDialog.reasonOptional')} value={reason} onChange={(e) => setReason(e.target.value)} />
                  <div className="flex gap-2">
                    <Btn isDark={isDark} variant="danger" loading={busy} onClick={() => confirmReject(b.id, b.picName)}>{t('slotBooking.slotDialog.confirmRejection')}</Btn>
                    <Btn isDark={isDark} disabled={busy} onClick={() => setRejecting(null)}>{t('slotBooking.common.cancel')}</Btn>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className={cn('border-t pt-3', isDark ? 'border-white/[0.08]' : 'border-gray-200')}>
          {!editOpen ? (
            <Btn isDark={isDark} onClick={() => setEditOpen(true)}>{t('slotBooking.slotDialog.editSlot')}</Btn>
          ) : (
            <div className="space-y-2">
              <h4 className={cn('text-xs font-semibold', heading(isDark))}>{t('slotBooking.slotDialog.editTitle')}</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={cn('text-[11px] block mb-1', muted(isDark))}>{t('slotBooking.slotDialog.start')}</label>
                  <input type="time" className={inputCls(isDark)} value={start} onChange={(e) => setStart(e.target.value)} />
                </div>
                <div>
                  <label className={cn('text-[11px] block mb-1', muted(isDark))}>{t('slotBooking.slotDialog.end')}</label>
                  <input type="time" className={inputCls(isDark)} value={end} onChange={(e) => setEnd(e.target.value)} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" className="accent-violet-600" checked={active} onChange={(e) => setActive(e.target.checked)} />
                {t('slotBooking.slotDialog.openForBooking')}
              </label>
              <input className={inputCls(isDark)} maxLength={500} placeholder={t('slotBooking.slotDialog.reasonRequired')} value={editReason} onChange={(e) => setEditReason(e.target.value)} />
              <div className="flex gap-2">
                <Btn isDark={isDark} variant="primary" loading={busy} disabled={!editReason.trim() || !start || !end} onClick={saveEdit}>{t('slotBooking.slotDialog.saveChange')}</Btn>
                <Btn isDark={isDark} disabled={busy} onClick={() => setEditOpen(false)}>{t('slotBooking.common.cancel')}</Btn>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Btn isDark={isDark} disabled={busy} onClick={onClose}>{t('slotBooking.common.close')}</Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────── Slot Settings (company defaults) ─────────────────────────

export function SlotSettingsDialog({
  open,
  onOpenChange,
  isDark,
  defaults,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  isDark: boolean;
  defaults: SlotDefaults;
  onSaved: () => Promise<void>;
}) {
  const s = useSlotI18n();
  const { t } = s;
  const [d, setD] = useState<SlotDefaults>(defaults);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setD(defaults);
  }, [open]);

  const label = cn('text-xs font-medium mb-1 block', heading(isDark));
  const invalid = (d.mode === 'HOURLY' && d.hourEnd <= d.hourStart) || d.approvalDays.length === 0;

  const save = async () => {
    setBusy(true);
    try {
      await axios.put(`${BASE}/settings`, d);
      toast.success(t('slotBooking.settings.saved'));
      onOpenChange(false);
      await onSaved();
    } catch (e) {
      toast.error(apiMsg(e, t('slotBooking.errors.saveSettings')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className={cn('sm:max-w-xl', dialogSurface(isDark))}>
        <DialogHeader>
          <DialogTitle>{t('slotBooking.settings.title')}</DialogTitle>
          <DialogDescription>{t('slotBooking.settings.desc')}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>{t('slotBooking.create.slotHours')}</label>
            <select className={inputCls(isDark)} value={d.mode} onChange={(e) => setD({ ...d, mode: e.target.value as SlotMode })}>
              <option value="SHIFT">{s.mode('SHIFT')}</option>
              <option value="HOURLY">{s.mode('HOURLY')}</option>
            </select>
          </div>
          <div>
            <label className={label}>{t('slotBooking.create.dateRange')}</label>
            <select className={inputCls(isDark)} value={d.rangeMode} onChange={(e) => setD({ ...d, rangeMode: e.target.value as RangeMode })}>
              {RANGES.map((r) => <option key={r} value={r}>{s.range(r)}</option>)}
            </select>
          </div>
          {d.mode === 'HOURLY' && (
            <>
              <div>
                <label className={label}>{t('slotBooking.settings.hourStart')}</label>
                <select className={inputCls(isDark)} value={d.hourStart} onChange={(e) => setD({ ...d, hourStart: +e.target.value })}>
                  {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
                </select>
              </div>
              <div>
                <label className={label}>{t('slotBooking.settings.hourEnd')}</label>
                <select className={inputCls(isDark)} value={d.hourEnd} onChange={(e) => setD({ ...d, hourEnd: +e.target.value })}>
                  {Array.from({ length: 24 }, (_, h) => h + 1).map((h) => <option key={h} value={h}>{String(h % 24).padStart(2, '0')}:00</option>)}
                </select>
              </div>
            </>
          )}
          <label className="col-span-2 flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" className="accent-violet-600" checked={d.blocked} onChange={(e) => setD({ ...d, blocked: e.target.checked })} />
            {t('slotBooking.settings.blockDefault')}
          </label>
          <div className="col-span-2">
            <label className={label}>{t('slotBooking.settings.defaultApprovalDays')}</label>
            <div className="flex gap-1.5 flex-wrap">
              {Array.from({ length: 7 }, (_, i) => i).map((i) => {
                const on = d.approvalDays.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setD({ ...d, approvalDays: on ? d.approvalDays.filter((x) => x !== i) : [...d.approvalDays, i] })}
                    className={cn(
                      'cursor-pointer h-8 w-11 rounded-lg border text-xs font-medium',
                      on ? 'bg-violet-600 border-violet-600 text-white' : isDark ? 'border-white/[0.1] text-gray-300' : 'border-gray-200 text-gray-600',
                    )}
                  >
                    {s.weekdayShort(i)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Btn isDark={isDark} disabled={busy} onClick={() => onOpenChange(false)}>{t('slotBooking.common.cancel')}</Btn>
          <Btn isDark={isDark} variant="primary" loading={busy} disabled={invalid} onClick={save}>{t('slotBooking.settings.save')}</Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
