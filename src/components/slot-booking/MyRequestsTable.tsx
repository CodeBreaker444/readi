'use client';

import { TablePagination } from '@/components/tables/Pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { BookingStatus, MyBookingRow } from '@/config/types/slot-booking';
import { slotLabel } from '@/lib/slot-booking-utils';
import { cn } from '@/lib/utils';
import { ColumnDef, flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import axios from 'axios';
import { FileText, FilterX, Lock, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { apiMsg, muted, Pill, statusTone, useSlotI18n } from './ui';

const PAGE_SIZE = 8;
const STATUSES: BookingStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

export function MyRequestsTable({
  rows,
  groups = [],
  isDark,
  onCancel,
  onMove,
}: {
  rows: MyBookingRow[];
  groups?: { id: number; name: string }[];
  isDark: boolean;
  onCancel: (bookingId: number) => void;
  /** Start moving a pending request to another slot of its group. */
  onMove: (bookingId: number) => void;
}) {
  const s = useSlotI18n();
  const { t, locale } = s;
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const groupOptions = useMemo(() => {
    // Include every group the PIC can see, not only those that already have a booking.
    const seen = new Map<number, string>();
    groups.forEach((g) => seen.set(g.id, g.name));
    rows.forEach((r) => seen.set(r.groupId, r.groupName));
    return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows, groups]);

  // Filters apply to the slot's date, group and the request status; the search box looks at the visible text.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (groupFilter && String(r.groupId) !== groupFilter) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo && r.date > dateTo) return false;
      if (!q) return true;
      return [r.groupName, slotLabel(r), r.date, r.pdfName, r.note, t(`slotBooking.status.${r.status}`)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
     
  }, [rows, search, groupFilter, statusFilter, dateFrom, dateTo, locale]);

  const hasFilters = !!(search || groupFilter || statusFilter || dateFrom || dateTo);
  const clearFilters = () => {
    setSearch('');
    setGroupFilter('');
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const downloadDocument = async (bookingId: number) => {
    try {
      const res = await axios.get(`/api/operation/slot-booking/bookings/${bookingId}/document`);
      window.open(res.data.data.url, '_blank', 'noopener');
    } catch (e) {
      toast.error(apiMsg(e, t('slotBooking.errors.document')));
    }
  };

  // Rebuilt when the language changes so headers and cells follow the switch.
  const columns = useMemo<ColumnDef<MyBookingRow>[]>(
    () => [
      {
        id: 'date',
        header: t('slotBooking.requestsTable.date'),
        cell: ({ row }) => (
          <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{s.date(row.original.date)}</span>
        ),
      },
      {
        id: 'slot',
        header: t('slotBooking.requestsTable.slot'),
        cell: ({ row }) => <span className="font-semibold">{slotLabel(row.original)}</span>,
      },
      {
        accessorKey: 'groupName',
        header: t('slotBooking.requestsTable.group'),
        cell: ({ row }) => <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{row.original.groupName}</span>,
      },
      {
        id: 'requested',
        header: t('slotBooking.requestsTable.requested'),
        cell: ({ row }) => (
          <span className="text-gray-500">
            {s.dateTime(row.original.requestedAt)}
            {row.original.assignedByOpm && <span className="block text-[11px] text-violet-500">{t('slotBooking.slotDialog.assignedByOpm')}</span>}
          </span>
        ),
      },
      {
        id: 'status',
        header: t('slotBooking.requestsTable.status'),
        cell: ({ row }) => (
          <Pill isDark={isDark} tone={statusTone(row.original.status)}>
            {s.status(row.original.status)}
          </Pill>
        ),
      },
      {
        id: 'details',
        header: t('slotBooking.requestsTable.details'),
        cell: ({ row }) => {
          const b = row.original;
          if (b.status === 'APPROVED' && b.pdfName) {
            return (
              <button
                type="button"
                className="cursor-pointer inline-flex items-center gap-1 text-violet-500 hover:underline"
                onClick={() => downloadDocument(b.bookingId)}
              >
                <FileText size={12} /> {b.pdfName}
              </button>
            );
          }
          if (b.status === 'REJECTED' && b.note) return <span className="text-gray-500">{b.note}</span>;
          return <span className="text-gray-500">—</span>;
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const b = row.original;
          if (b.status !== 'PENDING') return null;
          // Inside the 24/48 h window before the approval day nothing can be changed any more.
          if (b.locked) {
            return (
              <span
                className="inline-flex items-center gap-1 text-[10px] text-gray-500 whitespace-nowrap"
                title={b.approvalAt ? t('slotBooking.requestsTable.lockedHint', { when: s.dateTime(b.approvalAt) }) : undefined}
              >
                <Lock size={11} /> {t('slotBooking.requestsTable.locked')}
              </span>
            );
          }
          return (
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => onMove(b.bookingId)}
                className={`text-[10px] font-medium px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                  isDark ? 'border-violet-500/30 text-violet-300 hover:bg-violet-500/10' : 'border-violet-200 text-violet-600 hover:bg-violet-50'
                }`}
              >
                {t('slotBooking.requestsTable.change')}
              </button>
              <button
                type="button"
                onClick={() => onCancel(b.bookingId)}
                className={`text-[10px] font-medium px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                  isDark ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-red-200 text-red-500 hover:bg-red-50'
                }`}
              >
                {t('slotBooking.common.cancel')}
              </button>
            </div>
          );
        },
      },
    ],
     
    [isDark, onCancel, onMove, locale],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: PAGE_SIZE } },
  });

  const fieldCls = 'h-8 text-xs bg-transparent border-white/[0.08]';

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div
        className={`rounded-xl border p-4 ${
          isDark
            ? 'bg-[#0f1320] border-white/[0.06] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]'
            : 'bg-white border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
        }`}
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label={t('slotBooking.requestsTable.fromDate')}
            className={fieldCls}
          />
          <Input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label={t('slotBooking.requestsTable.toDate')}
            className={fieldCls}
          />
          <Select value={groupFilter || 'all'} onValueChange={(v) => setGroupFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className={fieldCls}>
              <SelectValue placeholder={t('slotBooking.requestsTable.allGroups')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('slotBooking.requestsTable.allGroups')}</SelectItem>
              {groupOptions.map((g) => (
                <SelectItem key={g.id} value={String(g.id)}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className={fieldCls}>
              <SelectValue placeholder={t('slotBooking.requestsTable.allStatuses')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('slotBooking.requestsTable.allStatuses')}</SelectItem>
              {STATUSES.map((st) => (
                <SelectItem key={st} value={st}>
                  {s.status(st)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={14} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('slotBooking.requestsTable.searchPlaceholder')}
              className={cn(fieldCls, 'pl-8')}
            />
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1.5 text-xs hover:bg-red-500/10 hover:text-red-500">
              <FilterX size={13} /> {t('slotBooking.requestsTable.clear')}
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div
        className={`rounded-xl border overflow-hidden min-h-[calc(100vh-380px)] ${
          isDark
            ? 'bg-[#0f1320] border-white/[0.06] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]'
            : 'bg-white border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
        }`}
      >
        <div className={`px-5 py-4 border-b ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
          <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('slotBooking.requestsTable.title')}</h2>
          <p className={`text-[11px] mt-0.5 ${muted(isDark)}`}>{t('slotBooking.requestsTable.subtitle')}</p>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className={isDark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-gray-100 bg-gray-50/50'}
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="text-[11px] font-bold uppercase tracking-wider">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="py-16 text-center">
                    <p className={`text-sm ${muted(isDark)}`}>{t('slotBooking.requestsTable.noMatch')}</p>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={`group ${isDark ? 'border-white/[0.06] hover:bg-white/[0.02]' : 'border-gray-50 hover:bg-gray-50/50'}`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-5 text-xs whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-end px-2">
          <TablePagination table={table} />
        </div>
      )}
    </div>
  );
}
