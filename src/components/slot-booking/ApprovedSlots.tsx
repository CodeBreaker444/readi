'use client';

import { TablePagination } from '@/components/tables/Pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import type { ApprovedSlotRow, SlotMe } from '@/config/types/slot-booking';
import { slotLabel } from '@/lib/slot-booking-utils';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { FileText } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiMsg, card, ErrorBlock, heading, muted, Pill, useSlotI18n } from './ui';

const BASE = '/api/operation/slot-booking';
const PAGE_SIZE = 8;

export function ApprovedSlots({ isDark, me }: { isDark: boolean; me: SlotMe }) {
  const s = useSlotI18n();
  const { t } = s;
  const [rows, setRows] = useState<ApprovedSlotRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE}/approved`);
      setRows(res.data.data);
      setError(null);
    } catch (e) {
      setError(apiMsg(e, t('slotBooking.errors.loadApproved')));
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const downloadDocument = async (bookingId: number) => {
    try {
      const res = await axios.get(`${BASE}/bookings/${bookingId}/document`);
      window.open(res.data.data.url, '_blank', 'noopener');
    } catch (e) {
      toast.error(apiMsg(e, t('slotBooking.errors.document')));
    }
  };

  const table = useReactTable({
    data: rows ?? [],
    columns: [],
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: PAGE_SIZE } },
  });

  if (error) return <ErrorBlock isDark={isDark} message={error} onRetry={load} />;

  const pageRows = rows ? table.getRowModel().rows.map((r) => r.original) : [];
  const th = cn('text-left text-[11px] font-semibold uppercase tracking-wider px-4 py-2.5', muted(isDark));
  const td = cn('px-4 py-5 text-[13px]', isDark ? 'text-gray-200' : 'text-gray-700');
  const cols = me.canManage ? 6 : 5;

  return (
    <div className="space-y-3">
    <div className={cn('rounded-xl border overflow-x-auto min-h-[calc(100vh-300px)]', card(isDark))}>
      <table className="w-full min-w-[640px]">
        <thead className={isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}>
          <tr>
            <th className={th}>{t('slotBooking.approvedTable.date')}</th>
            <th className={th}>{t('slotBooking.approvedTable.slot')}</th>
            <th className={th}>{t('slotBooking.approvedTable.group')}</th>
            {me.canManage && <th className={th}>{t('slotBooking.approvedTable.pilot')}</th>}
            <th className={th}>{t('slotBooking.approvedTable.approved')}</th>
            <th className={th}>{t('slotBooking.approvedTable.document')}</th>
          </tr>
        </thead>
        <tbody>
          {rows === null &&
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={i} className={cn('border-t', isDark ? 'border-white/[0.05]' : 'border-gray-100')}>
                <td colSpan={cols} className="px-4 py-3"><Skeleton className={cn('h-5 w-full', isDark && 'bg-white/[0.06]')} /></td>
              </tr>
            ))}
          {rows?.length === 0 && (
            <tr>
              <td colSpan={cols} className={cn(td, 'text-center py-10', muted(isDark))}>
                {me.canManage ? t('slotBooking.approvedTable.emptyOpm') : t('slotBooking.approvedTable.emptyPic')}
              </td>
            </tr>
          )}
          {pageRows.map((r) => (
            <tr key={r.bookingId} className={cn('border-t', isDark ? 'border-white/[0.05]' : 'border-gray-100')}>
              <td className={cn(td, 'font-medium', heading(isDark))}>{s.date(r.date)}</td>
              <td className={td}>{slotLabel(r)}</td>
              <td className={td}>{r.groupName}</td>
              {me.canManage && <td className={td}>{r.picName}</td>}
              <td className={td}>{r.decidedAt ? s.dateTime(r.decidedAt) : '—'}</td>
              <td className={td}>
                {r.pdfName ? (
                  <button
                    type="button"
                    className="cursor-pointer inline-flex items-center gap-1 text-violet-500 hover:underline"
                    onClick={() => downloadDocument(r.bookingId)}
                  >
                    <FileText size={12} /> {r.pdfName}
                  </button>
                ) : (
                  <Pill isDark={isDark}>{t('slotBooking.approvedTable.noneAttached')}</Pill>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {(rows?.length ?? 0) > PAGE_SIZE && (
      <div className="flex items-center justify-end px-2">
        <TablePagination table={table} />
      </div>
    )}
    </div>
  );
}
