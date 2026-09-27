'use client';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Building2, Radar, Satellite } from 'lucide-react';
import { useMemo, useState } from 'react';
import { fmtBytes, fmtCompact, fmtDate } from './format';
import SimplePagination from './SimplePagination';
import type { SuperAdminCompanyRow } from './types';
import { useStableTableHeight } from './useStableTableHeight';

interface Props {
  companies: SuperAdminCompanyRow[];
}

type SortKey = 'owner_name' | 'user_count' | 'ai_tokens_today' | 'storage_bytes' | 'created_at';

const PAGE_SIZE = 8;

export default function CompaniesTable({ companies }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('ai_tokens_today');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);

  const rows = useMemo(() => {
    const filtered = query.trim()
      ? companies.filter(
          (c) =>
            c.owner_name.toLowerCase().includes(query.toLowerCase()) ||
            (c.owner_code ?? '').toLowerCase().includes(query.toLowerCase()),
        )
      : companies;

    return [...filtered].sort((a, b) => {
      if (sortKey === 'owner_name') return a.owner_name.localeCompare(b.owner_name);
      if (sortKey === 'created_at') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return b[sortKey] - a[sortKey];
    });
  }, [companies, sortKey, query]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = useMemo(
    () => rows.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE),
    [rows, currentPage],
  );
  const { containerRef, minHeight } = useStableTableHeight(rows);

  const sortOptions: Array<{ key: SortKey; label: string }> = [
    { key: 'ai_tokens_today', label: 'AI usage' },
    { key: 'user_count', label: 'Users' },
    { key: 'storage_bytes', label: 'Storage' },
    { key: 'created_at', label: 'Newest' },
    { key: 'owner_name', label: 'Name' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {sortOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => { setSortKey(opt.key); setPage(0); }}
              className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                sortKey === opt.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(0); }}
          placeholder="Search companies…"
          className="text-sm px-3 py-1.5 rounded-md border border-border bg-background w-full sm:w-56 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div ref={containerRef} style={{ minHeight }} className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Users</TableHead>
              <TableHead className="text-right">AI tokens today</TableHead>
              <TableHead className="text-right">Storage</TableHead>
              <TableHead>Integrations</TableHead>
              <TableHead className="text-right">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No companies match your search.
                </TableCell>
              </TableRow>
            )}
            {pageRows.map((c) => (
              <TableRow key={c.owner_id}>
                <TableCell className="font-medium text-foreground">
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="truncate max-w-[220px]">{c.owner_name}</div>
                      {c.owner_code && <div className="text-xs text-muted-foreground">{c.owner_code}</div>}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={c.owner_active === 'Y' ? 'default' : 'outline'} className={c.owner_active === 'Y' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-transparent' : 'text-muted-foreground'}>
                    {c.owner_active === 'Y' ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{c.user_count}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {c.ai_tokens_today > 0 ? fmtCompact(c.ai_tokens_today) : '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {c.storage_bytes > 0 ? fmtBytes(c.storage_bytes) : '—'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {c.d_flight_enabled && (
                      <span title="D-Flight enabled"><Satellite size={14} /></span>
                    )}
                    {c.drone_atc_enabled && (
                      <span title="Drone ATC enabled"><Radar size={14} /></span>
                    )}
                    {!c.d_flight_enabled && !c.drone_atc_enabled && <span className="text-xs">—</span>}
                  </div>
                </TableCell>
                <TableCell className="text-right text-muted-foreground text-xs whitespace-nowrap">
                  {fmtDate(c.created_at)}
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
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
