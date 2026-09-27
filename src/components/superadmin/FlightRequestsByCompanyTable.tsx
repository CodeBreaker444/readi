'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Building2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { fmtCompact } from './format';
import SimplePagination from './SimplePagination';
import { useStableTableHeight } from './useStableTableHeight';

interface CompanyStatusRow {
  owner_id: number;
  owner_name: string;
  byStatus: Record<string, number>;
  total: number;
}

interface Props {
  rows: CompanyStatusRow[];
  /** Status columns, in the order they should appear — pass the platform-wide status ranking. */
  statuses: string[];
  emptyLabel?: string;
  pageSize?: number;
}

export default function FlightRequestsByCompanyTable({ rows, statuses, emptyLabel = 'No flight requests yet', pageSize = 6 }: Props) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);

  const pageRows = useMemo(
    () => rows.slice(currentPage * pageSize, currentPage * pageSize + pageSize),
    [rows, currentPage, pageSize],
  );
  const { containerRef, minHeight } = useStableTableHeight(rows);

  if (rows.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div>
      <div ref={containerRef} style={{ minHeight }} className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              {statuses.map((s) => (
                <TableHead key={s} className="text-right whitespace-nowrap">{s}</TableHead>
              ))}
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((r) => (
              <TableRow key={r.owner_id}>
                <TableCell className="font-medium text-foreground">
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-muted-foreground shrink-0" />
                    <span className="truncate max-w-[200px]">{r.owner_name}</span>
                  </div>
                </TableCell>
                {statuses.map((s) => (
                  <TableCell key={s} className="text-right tabular-nums text-muted-foreground">
                    {r.byStatus[s] ? fmtCompact(r.byStatus[s]) : '—'}
                  </TableCell>
                ))}
                <TableCell className="text-right tabular-nums font-semibold text-foreground">
                  {fmtCompact(r.total)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <SimplePagination
        page={currentPage}
        pageCount={pageCount}
        onPageChange={setPage}
        totalItems={rows.length}
        pageSize={pageSize}
      />
    </div>
  );
}
