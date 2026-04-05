'use client';

import ExportButtons from '@/components/system/ExportButtons';
import { AuditLog, ENTITY_TYPES, EVENT_TYPE_COLORS, EVENT_TYPES, getAuditLogsColumns, Owner, UserOption } from '@/components/tables/AuditLogsTable';
import { TablePagination } from '@/components/tables/Pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useTheme } from '@/components/useTheme';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import axios from 'axios';
import { FilterX, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

export default function AuditLogsPage() {
  const { isDark } = useTheme();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);

  const [selectedOwner, setSelectedOwner] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 });

  const filteredLogs = search
    ? logs.filter(
        (l) =>
          l.description?.toLowerCase().includes(search.toLowerCase()) ||
          l.user_name?.toLowerCase().includes(search.toLowerCase()) ||
          l.entity_type?.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

 const columns = useMemo(() => getAuditLogsColumns(isSuperAdmin, owners), [isSuperAdmin, owners]);
 
   const table = useReactTable({
     data: filteredLogs,
     columns,
     state: { pagination },
     onPaginationChange: setPagination,
     getCoreRowModel: getCoreRowModel(),
     manualPagination: true,
     pageCount: Math.ceil(total / pagination.pageSize),
     rowCount: total,
   });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page: pagination.pageIndex + 1,
        page_size: pagination.pageSize,
      };
      if (selectedOwner) params.owner_id = selectedOwner;
      if (selectedUser) params.user_id = selectedUser;
      if (selectedEvent) params.event_type = selectedEvent;
      if (selectedEntity) params.entity_type = selectedEntity;
      if (dateFrom) params.date_from = new Date(dateFrom).toISOString();
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        params.date_to = end.toISOString();
      }

      const res = await axios.get('/api/audit-logs', { params });
      if (res.data.code === 1) {
        setLogs(res.data.data);
        setTotal(res.data.total);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, selectedOwner, selectedUser, selectedEvent, selectedEntity, dateFrom, dateTo]);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get('/api/owner');
        if (res.data.code === 1) {
          setIsSuperAdmin(true);
          setOwners(res.data.data);
        }
      } catch { /* Not superadmin */ }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const params: Record<string, string> = {};
        if (selectedOwner) params.owner_id = selectedOwner;
        const res = await axios.post('/api/team/user/list', { params });
        if (res.data.data) {
          setUsers(
            res.data.data.map((u: any) => ({
              user_id: u.user_id ?? u.id,
              fullname: u.fullname ?? u.full_name ?? u.username ?? u.email,
              email: u.email,
            }))
          );
        }
      } catch { /* ignore */ }
    })();
  }, [selectedOwner]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [selectedOwner, selectedUser, selectedEvent, selectedEntity, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const clearFilters = () => {
    setSelectedOwner('');
    setSelectedUser('');
    setSelectedEvent('');
    setSelectedEntity('');
    setDateFrom('');
    setDateTo('');
    setSearch('');
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const hasFilters = selectedOwner || selectedUser || selectedEvent || selectedEntity || dateFrom || dateTo || search;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0a0e1a]' : 'bg-[#f4f6f9]'}`}>
      <div
        className={`top-0 z-20 backdrop-blur-xl border-b transition-colors ${
          isDark
            ? 'bg-[#0a0e1a]/90 border-white/[0.06]'
            : 'bg-white/80 border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
        }`}
      >
        <div className="mx-auto max-w-[1600px] px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-1 h-6 rounded-full bg-violet-600" />
            <div>
              <h1
                className={`text-[15px] font-semibold tracking-[-0.01em] ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}
              >
                Audit Logs
              </h1>
              <p
                className={`text-[11px] mt-0.5 tracking-wide ${
                  isDark ? 'text-gray-500' : 'text-gray-400'
                }`}
              >
                Track and monitor system-wide activity
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={loading}
            className={`h-8 gap-1.5 px-3.5 text-xs font-medium rounded-lg transition-all ${
              isDark
                ? 'border-white/[0.1] hover:bg-white/[0.05] text-white'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} strokeWidth={2.5} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-6 py-6">
        <div
          className={`mb-5 rounded-xl border p-4 ${
            isDark
              ? 'bg-[#0f1320] border-white/[0.06] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]'
              : 'bg-white border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
          }`}
        >
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {isSuperAdmin && (
              <Select value={selectedOwner || 'all'} onValueChange={(v) => setSelectedOwner(v === 'all' ? '' : v)}>
                <SelectTrigger className="h-8 text-xs bg-transparent border-white/[0.08]">
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {owners.map((o) => (
                    <SelectItem key={o.owner_id} value={String(o.owner_id)}>
                      {o.owner_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={selectedUser || 'all'} onValueChange={(v) => setSelectedUser(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-8 text-xs bg-transparent border-white/[0.08]">
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.user_id} value={String(u.user_id)}>
                    {u.fullname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedEvent || 'all'} onValueChange={(v) => setSelectedEvent(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-8 text-xs bg-transparent border-white/[0.08]">
                <SelectValue placeholder="All Events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                {EVENT_TYPES.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedEntity || 'all'} onValueChange={(v) => setSelectedEntity(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-8 text-xs bg-transparent border-white/[0.08]">
                <SelectValue placeholder="All Sections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {ENTITY_TYPES.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 text-xs bg-transparent border-white/[0.08]" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 text-xs bg-transparent border-white/[0.08]" />
          </div>

          <div className="mt-3 flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={14} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search description, user, section…"
                className="h-8 pl-8 text-xs bg-transparent border-white/[0.08]"
              />
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1.5 text-xs hover:bg-red-500/10 hover:text-red-500">
                <FilterX size={13} /> Clear
              </Button>
            )}
          </div>
        </div>

        <div
          className={`rounded-xl border overflow-hidden ${
            isDark
              ? 'bg-[#0f1320] border-white/[0.06] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]'
              : 'bg-white border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
          }`}
        >
          <div className={`px-5 py-4 border-b ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
            <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Event Records</h2>
            <p className={`text-[11px] mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Detailed chronological log of platform interactions
            </p>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className={`${isDark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-gray-100 bg-gray-50/50'}`}
                  >
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="text-[11px] font-bold uppercase tracking-wider"
                        style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i} className={isDark ? 'border-white/[0.06]' : 'border-gray-100'}>
                      {Array.from({ length: table.getAllColumns().length }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full opacity-20" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={table.getAllColumns().length} className="py-20 text-center">
                      <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        No activity logs found matching your criteria.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => {
                    const log = row.original;
                    return (
                      <TableRow
                        key={row.id}
                        className={`group ${
                          isDark
                            ? 'border-white/[0.06] hover:bg-white/[0.02]'
                            : 'border-gray-50 hover:bg-gray-50/50'
                        }`}
                      >
                        <TableCell className="text-[11px] tabular-nums whitespace-nowrap">
                          <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                            {new Date(log.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <br />
                          <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>
                            {new Date(log.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-tight ${
                              EVENT_TYPE_COLORS[log.event_type] ?? ''
                            }`}
                          >
                            {log.event_type}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`text-[11px] font-medium capitalize ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {log.entity_type.replace(/_/g, ' ')}
                          </span>
                        </TableCell>
                        <TableCell className={`text-[11px] leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          {log.description ?? '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className={`text-[11px] font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                              {log.user_name ?? 'System'}
                            </span>
                            <span className="text-[10px] text-gray-500 opacity-80">{log.user_email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-tighter">
                            {log.user_role ?? '—'}
                          </span>
                        </TableCell>
                        {isSuperAdmin && (
                          <TableCell className="text-[11px] text-gray-500">
                            {owners.find((o) => o.owner_id === log.owner_id)?.owner_name ?? log.owner_id}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex items-center justify-between px-2 mt-2">
          <ExportButtons
            filename="Audit Logs"
            headers={['Date', 'Event', 'Section', 'Description', 'User', 'Email', 'Role']}
            rows={table.getFilteredRowModel().rows.map(r => { const l = r.original as any; return [l.created_at, l.event_type, l.entity_type, l.description ?? '', l.user_name ?? '', l.user_email ?? '', l.user_role ?? '']; })}
          />
          <TablePagination table={table} />
        </div>
      </div>
    </div>
  );
}