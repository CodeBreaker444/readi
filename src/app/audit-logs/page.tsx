'use client';

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
import axios from 'axios';
import { format } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FilterX,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface AuditLog {
  id: number;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  description: string | null;
  user_id: number | null;
  user_name: string | null;
  user_email: string | null;
  user_role: string | null;
  owner_id: number;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

interface Owner {
  owner_id: number;
  owner_name: string;
  owner_code: string;
}

interface UserOption {
  user_id: number;
  fullname: string;
  email: string;
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  UPDATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  LOGIN:  'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
  LOGOUT: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
};

const EVENT_TYPES = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'];

const ENTITY_TYPES = [
  'user', 'mission_type', 'mission_category', 'mission_status', 'mission_result',
  'operation', 'document', 'system', 'maintenance_ticket', 'client',
  'shift', 'organization_procedure', 'checklist', 'assignment', 'communication',
  'spi_kpi', 'company',
];

export default function AuditLogsPage() {
  const { isDark } = useTheme();

  const [logs, setLogs]         = useState<AuditLog[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [owners, setOwners]     = useState<Owner[]>([]);
  const [users, setUsers]       = useState<UserOption[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<string>('');
  const [selectedUser, setSelectedUser]   = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [search, setSearch]     = useState('');

  const [page, setPage]         = useState(1);
  const pageSize                = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, page_size: pageSize };
      if (selectedOwner)  params.owner_id    = selectedOwner;
      if (selectedUser)   params.user_id     = selectedUser;
      if (selectedEvent)  params.event_type  = selectedEvent;
      if (selectedEntity) params.entity_type = selectedEntity;
      if (dateFrom)       params.date_from   = new Date(dateFrom).toISOString();
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
  }, [page, selectedOwner, selectedUser, selectedEvent, selectedEntity, dateFrom, dateTo]);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get('/api/owner');
        if (res.data.code === 1) {
          setIsSuperAdmin(true);
          setOwners(res.data.data);
        }
      } catch {
        // Not superadmin — ignore
      }
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
      } catch {
        // ignore
      }
    })();
  }, [selectedOwner]);

  useEffect(() => {
    setPage(1);
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
    setPage(1);
  };

  const hasFilters =
    selectedOwner || selectedUser || selectedEvent || selectedEntity || dateFrom || dateTo || search;

  const filteredLogs = search
    ? logs.filter(
        (l) =>
          l.description?.toLowerCase().includes(search.toLowerCase()) ||
          l.user_name?.toLowerCase().includes(search.toLowerCase()) ||
          l.user_email?.toLowerCase().includes(search.toLowerCase()) ||
          l.entity_type?.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div
      className={`min-h-screen p-6 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}
          >
            <ClipboardList size={20} className="text-white" />
          </div>
          <div>
            <h1
              className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}
              style={{ fontSize: '1.15rem', fontFamily: "'DM Sans', system-ui, sans-serif" }}
            >
              Audit Logs
            </h1>
            <p
              className={`${isDark ? 'text-slate-500' : 'text-slate-400'}`}
              style={{ fontSize: '0.72rem' }}
            >
              All system events — sorted newest first
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchLogs}
          className="gap-1.5"
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      <div
        className={`mb-5 rounded-xl border p-4 ${
          isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
        }`}
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {isSuperAdmin && (
            <Select value={selectedOwner || 'all'} onValueChange={(v) => setSelectedOwner(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-8 text-xs">
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

          {/* User filter */}
          <Select value={selectedUser || 'all'} onValueChange={(v) => setSelectedUser(v === 'all' ? '' : v)}>
            <SelectTrigger className="h-8 text-xs">
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

          {/* Event type filter */}
          <Select value={selectedEvent || 'all'} onValueChange={(v) => setSelectedEvent(v === 'all' ? '' : v)}>
            <SelectTrigger className="h-8 text-xs">
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

          {/* Entity type filter */}
          <Select value={selectedEntity || 'all'} onValueChange={(v) => setSelectedEntity(v === 'all' ? '' : v)}>
            <SelectTrigger className="h-8 text-xs">
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

          {/* Date from */}
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-8 text-xs"
            placeholder="From date"
          />

          {/* Date to */}
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-8 text-xs"
            placeholder="To date"
          />
        </div>

        {/* Search + clear */}
        <div className="mt-3 flex items-center gap-3">
          <div className="relative flex-1">
            <Search
              size={14}
              className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${
                isDark ? 'text-slate-500' : 'text-slate-400'
              }`}
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search description, user, section…"
              className="h-8 pl-8 text-xs"
            />
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-xs">
              <FilterX size={13} />
              Clear
            </Button>
          )}
          <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {total.toLocaleString()} record{total !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Table */}
      <div
        className={`rounded-xl border overflow-hidden ${
          isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
        }`}
      >
        <Table>
          <TableHeader>
            <TableRow className={isDark ? 'border-slate-800' : 'border-slate-200'}>
              <TableHead className="w-40 text-xs font-semibold">Time</TableHead>
              <TableHead className="w-24 text-xs font-semibold">Event</TableHead>
              <TableHead className="w-32 text-xs font-semibold">Section</TableHead>
              <TableHead className="text-xs font-semibold">Description</TableHead>
              <TableHead className="w-40 text-xs font-semibold">User</TableHead>
              <TableHead className="w-24 text-xs font-semibold">Role</TableHead>
              {isSuperAdmin && (
                <TableHead className="w-28 text-xs font-semibold">Company</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i} className={isDark ? 'border-slate-800' : 'border-slate-200'}>
                  {Array.from({ length: isSuperAdmin ? 7 : 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isSuperAdmin ? 7 : 6}
                  className="py-16 text-center"
                >
                  <ClipboardList
                    size={32}
                    className={`mx-auto mb-3 ${isDark ? 'text-slate-700' : 'text-slate-300'}`}
                  />
                  <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    No audit logs found
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow
                  key={log.id}
                  className={`text-xs ${isDark ? 'border-slate-800 hover:bg-slate-800/50' : 'border-slate-100 hover:bg-slate-50'}`}
                >
                  <TableCell className="text-xs tabular-nums whitespace-nowrap">
                    <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                      {format(new Date(log.created_at), 'dd MMM yyyy')}
                    </span>
                    <br />
                    <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>
                      {format(new Date(log.created_at), 'HH:mm:ss')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        EVENT_TYPE_COLORS[log.event_type] ?? 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {log.event_type}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                    >
                      {log.entity_type.replace(/_/g, ' ')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>
                      {log.description ?? '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {log.user_name ?? '—'}
                      </p>
                      <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {log.user_email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                    >
                      {log.user_role ?? '—'}
                    </span>
                  </TableCell>
                  {isSuperAdmin && (
                    <TableCell>
                      <span
                        className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                      >
                        {owners.find((o) => o.owner_id === log.owner_id)?.owner_name ??
                          log.owner_id}
                      </span>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft size={14} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="h-7 w-7 p-0"
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
