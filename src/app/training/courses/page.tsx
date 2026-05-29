'use client';

import { FlatTrainingRecord } from '@/backend/services/training/training-service';
import { TablePagination } from '@/components/tables/Pagination';
import { getTrainingCoursesColumns } from '@/components/tables/TrainingCoursesColumn';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTheme } from '@/components/useTheme';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import axios from 'axios';
import { Award, BookOpen, CheckCircle2, Clock, Filter, GraduationCap, Plus, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface UserOption {
  user_id: number;
  full_name: string;
  email: string;
}

interface CurriculumRecord {
  attendance_id: number;
  training_name: string;
  training_type: string | null;
  certificate_type: string | null;
  session_code: string | null;
  completion_date: string | null;
  expiry_date: string | null;
  status: 'VALID' | 'EXPIRED' | null;
}


function fmtCurrDate(val: string | null) {
  if (!val) return '—';
  const [y, m, d] = val.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[Number(m) - 1]} ${y}`;
}

interface FormState {
  attendance_id?: number;
  fk_training_id?: number;
  user_ids: number[];
  training_name: string;
  training_type: string;
  certificate_type: string;
  session_code: string;
  session_date: string;
  completion_date: string;
  expiry_date: string;
}

const EMPTY_FORM: FormState = {
  user_ids: [],
  training_name: '',
  training_type: '',
  certificate_type: '',
  session_code: '',
  session_date: '',
  completion_date: '',
  expiry_date: '',
};


const TRAINING_TYPES = ['INITIAL', 'RECURRENT', 'EMERGENCY', 'SIMULATOR', 'OTHER'] as const;


export default function TrainingCoursesPage() {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  const [records, setRecords] = useState<FlatTrainingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserOption[]>([]);

  const [filterOpen, setFilterOpen] = useState(false);
  const [q, setQ] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FlatTrainingRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [userSearch, setUserSearch] = useState('');

  const [viewTarget, setViewTarget] = useState<FlatTrainingRecord | null>(null);
  const [viewCurriculum, setViewCurriculum] = useState<CurriculumRecord[]>([]);
  const [viewLoading, setViewLoading] = useState(false);


  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/training/list');
      if (res.data.code === 1) setRecords(res.data.data);
    } catch (err) {
      console.error('Failed to fetch training records', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  useEffect(() => {
    axios.get('/api/training/users').then((res) => {
      if (res.data.code === 1) setUsers(res.data.data);
    }).catch(() => { });
  }, []);


  const filtered = useMemo(() => {
    let rows = records;
    if (q) {
      const lq = q.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.user_name?.toLowerCase().includes(lq) ||
          r.training_name.toLowerCase().includes(lq) ||
          r.session_code?.toLowerCase().includes(lq)
      );
    }
    if (filterStatus) rows = rows.filter((r) => r.status === filterStatus);
    return rows;
  }, [records, q, filterStatus]);

  const columns = useMemo(
    () => getTrainingCoursesColumns(isDark, openEdit, (r) => setDeleteTarget(r), openView, t),
    [isDark, t]
  );

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
  });

  const stats = useMemo(() => ({
    total: records.length,
    valid: records.filter((r) => r.status === 'VALID').length,
    expired: records.filter((r) => r.status === 'EXPIRED').length,
  }), [records]);


  async function openView(record: FlatTrainingRecord) {
    setViewTarget(record);
    setViewCurriculum([]);
    setViewLoading(true);
    try {
      const res = await axios.get(`/api/training/curriculum?user_id=${record.fk_user_id}`);
      if (res.data.code === 1) setViewCurriculum(res.data.data);
    } catch (err) {
      console.error('Failed to fetch curriculum', err);
    } finally {
      setViewLoading(false);
    }
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setUserSearch('');
    setModalOpen(true);
  }

  function openEdit(record: FlatTrainingRecord) {
    setForm({
      attendance_id: record.attendance_id,
      fk_training_id: record.fk_training_id,
      user_ids: [record.fk_user_id],
      training_name: record.training_name,
      training_type: record.training_type ?? '',
      certificate_type: record.certificate_type ?? '',
      session_code: record.session_code ?? '',
      session_date: record.session_date ?? '',
      completion_date: record.completion_date ?? '',
      expiry_date: record.expiry_date ?? '',
    });
    setUserSearch('');
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.training_name.trim()) return;
    setSaving(true);
    try {
      if (form.attendance_id) {
        await axios.post('/api/training/add', {
          attendance_id: form.attendance_id,
          fk_training_id: form.fk_training_id,
          training_name: form.training_name.trim(),
          training_type: form.training_type || null,
          certificate_type: form.certificate_type || null,
          session_code: form.session_code.trim() || null,
          session_date: form.session_date || null,
          completion_date: form.completion_date || null,
          expiry_date: form.expiry_date || null,
        });
      } else {
        if (form.user_ids.length === 0) return;
        await axios.post('/api/training/add', {
          user_ids: form.user_ids,
          training_name: form.training_name.trim(),
          training_type: form.training_type || null,
          certificate_type: form.certificate_type || null,
          session_code: form.session_code.trim() || null,
          session_date: form.session_date || null,
          completion_date: form.completion_date || null,
          expiry_date: form.expiry_date || null,
        });
      }
      setModalOpen(false);
      fetchRecords();
    } catch (err) {
      console.error('Failed to save training record', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await axios.post('/api/training/delete', { attendance_id: deleteTarget.attendance_id });
      setDeleteTarget(null);
      fetchRecords();
    } catch (err) {
      console.error('Failed to delete training record', err);
    }
  }

  async function handleRecompute() {
    setRecomputing(true);
    try {
      const d = new Date();
      const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      const res = await axios.post('/api/training/recompute', { period });
      if (res.data.code === 1) {
        const { period_end, total, valid, expired, pending } = res.data;
        const key = period_end ? 'training.courses.recomputeSuccessWithPeriod' : 'training.courses.recomputeSuccess';
        toast.success(t(key, { total, valid, expired, pending, periodEnd: period_end }));
      } else {
        toast.error(res.data.error || t('training.courses.recomputeFailed'));
      }
    } catch (err: any) {
      console.error('Failed to recompute KPI', err);
      toast.error(err?.response?.data?.error || t('training.courses.networkError'));
    } finally {
      setRecomputing(false);
    }
  }

  function toggleUser(uid: number) {
    setForm((f) => ({
      ...f,
      user_ids: f.user_ids.includes(uid)
        ? f.user_ids.filter((id) => id !== uid)
        : [...f.user_ids, uid],
    }));
  }

  const visibleUsers = useMemo(() => {
    if (!userSearch) return users;
    const lq = userSearch.toLowerCase();
    return users.filter(
      (u) => u.full_name.toLowerCase().includes(lq) || u.email.toLowerCase().includes(lq)
    );
  }, [users, userSearch]);


  const bg = isDark ? 'bg-[#0a0e1a]' : 'bg-[#f4f6f9]';
  const cardBg = isDark ? 'bg-[#0f1320] border-white/6' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-500' : 'text-gray-400';
  const inputCls = isDark
    ? 'bg-white/4 border-white/8 text-white placeholder-gray-600 focus:border-violet-500/50'
    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-violet-400';
  const borderMuted = isDark ? 'border-white/6' : 'border-gray-100';
  const btnOutline = isDark
    ? 'border-white/10 hover:bg-white/5 text-white'
    : 'border-gray-200 hover:bg-gray-50 text-gray-700';

  return (
    <div className={`min-h-screen ${bg}`}>

      <div className={`backdrop-blur-xl border-b ${isDark ? 'bg-[#0a0e1a]/90 border-white/6' : 'bg-white/80 border-black/6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'}`}>
        <div className="mx-auto   px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-1 h-6 rounded-full bg-violet-600" />
            <div>
              <h1 className={`text-[15px] font-semibold tracking-[-0.01em] ${textPrimary}`}>{t('training.courses.pageTitle')}</h1>
              <p className={`text-[11px] mt-0.5 ${textMuted}`}>{t('training.courses.pageSubtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterOpen((v) => !v)}
              className={`h-8 gap-1.5 text-xs ${filterOpen ? 'bg-violet-600/10 border-violet-500/30 text-violet-400' : btnOutline}`}
            >
              <Filter size={13} strokeWidth={2.5} />
              {t('training.courses.filter')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRecords}
              disabled={loading}
              className={`h-8 gap-1.5 text-xs ${btnOutline}`}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} strokeWidth={2.5} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecompute}
              disabled={recomputing}
              className={`h-8 gap-1.5 text-xs ${btnOutline}`}
            >
              <ShieldCheck size={13} strokeWidth={2.5} className={recomputing ? 'animate-spin' : ''} />
              {recomputing ? t('training.courses.updating') : t('training.courses.recomputeKpi')}
            </Button>

            <Button size="sm" onClick={openCreate} className="h-8 gap-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white">
              <Plus size={14} strokeWidth={2.5} />
              {t('training.courses.new')}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto  px-6 py-6 space-y-5">

        {filterOpen && (
          <div className={`rounded-xl border p-4 flex flex-wrap gap-3 items-center ${cardBg}`}>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('training.courses.searchPlaceholder')}
              className={`h-8 flex-1 min-w-48 text-xs ${inputCls}`}
            />
            <Select value={filterStatus || 'all'} onValueChange={(v) => setFilterStatus(v === 'all' ? '' : v)}>
              <SelectTrigger className={`h-8 w-36 text-xs ${isDark ? 'bg-white/4 border-white/8 text-white' : 'bg-gray-50 border-gray-200'}`}>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('training.courses.allStatus')}</SelectItem>
                <SelectItem value="VALID">{t('training.courses.valid')}</SelectItem>
                <SelectItem value="EXPIRED">{t('training.courses.expired')}</SelectItem>
              </SelectContent>
            </Select>
            {(q || filterStatus) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setQ(''); setFilterStatus(''); }}
                className="h-8 gap-1 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-400"
              >
                <X size={13} /> {t('training.courses.clear')}
              </Button>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {([
            { label: t('training.courses.totalRecords'), value: stats.total, icon: BookOpen, color: 'text-violet-400' },
            { label: t('training.courses.valid'), value: stats.valid, icon: Award, color: 'text-green-400' },
            { label: t('training.courses.expired'), value: stats.expired, icon: ShieldCheck, color: 'text-red-400' },
          ] as const).map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={`rounded-xl border p-4 ${cardBg}`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-[11px] font-medium uppercase tracking-wider ${textMuted}`}>{label}</p>
                <Icon size={15} className={color} />
              </div>
              <p className={`text-2xl font-bold ${textPrimary}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className={`rounded-xl border overflow-hidden ${cardBg}`}>
          <div className={`px-5 py-4 border-b ${borderMuted}`}>
            <h2 className={`text-sm font-semibold ${textPrimary}`}>{t('training.courses.trainingRecords')}</h2>
            <p className={`text-[11px] mt-0.5 ${textMuted}`}>{t('training.courses.record', { count: filtered.length })}</p>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className={`${borderMuted} ${isDark ? 'bg-white/2' : 'bg-gray-50/50'}`}>
                    {hg.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={`text-[11px] font-bold uppercase tracking-wider ${textMuted}`}
                        style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>

              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i} className={borderMuted}>
                      {columns.map((_, j) => (
                        <TableCell key={j}>
                          <div className={`h-3 rounded animate-pulse ${isDark ? 'bg-white/6' : 'bg-gray-100'}`} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="py-20 text-center">
                      <BookOpen size={32} className={`mx-auto mb-3 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                      <p className={`text-sm ${textMuted}`}>{t('training.courses.noRecords')}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={`border-b transition-colors ${isDark ? `${borderMuted} hover:bg-white/2` : `${borderMuted} hover:bg-gray-50/50`}`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
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

        <TablePagination table={table} />
      </div>


      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl ${isDark ? 'bg-[#0f1320] border-white/8' : 'bg-white border-gray-200'}`}>

            <div className={`flex items-center justify-between px-6 py-4 border-b ${borderMuted}`}>
              <h2 className={`text-sm font-semibold ${textPrimary}`}>
                {form.attendance_id ? t('training.courses.editRecord') : t('training.courses.newRecord')}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setModalOpen(false)} className={`h-7 w-7 ${isDark ? 'text-gray-400 hover:bg-white/8' : 'text-gray-400 hover:bg-gray-100'}`}>
                <X size={15} />
              </Button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

              {form.attendance_id ? (
                <div>
                  <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${textMuted}`}>{t('training.courses.user')}</label>
                  <p className={`text-xs px-3 py-2 rounded-lg border ${isDark ? 'border-white/8 text-gray-300' : 'border-gray-200 text-gray-700'}`}>
                    {users.find((u) => u.user_id === form.user_ids[0])?.full_name ?? `User #${form.user_ids[0]}`}
                  </p>
                </div>
              ) : (
                <div>
                  <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${textMuted}`}>
                    {t('training.courses.users')} <span className={`normal-case font-normal ${textMuted}`}>({t('training.courses.selected', { count: form.user_ids.length })})</span>
                  </label>
                  <Input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder={t('training.courses.searchUsers')}
                    className={`h-8 text-xs mb-2 ${inputCls}`}
                  />
                  <div className={`rounded-lg border overflow-y-auto max-h-36 ${isDark ? 'border-white/8 bg-white/2' : 'border-gray-200 bg-gray-50'}`}>
                    {visibleUsers.length === 0 ? (
                      <p className={`text-[11px] px-3 py-2 ${textMuted}`}>{t('training.courses.noUsersFound')}</p>
                    ) : (
                      visibleUsers.map((u) => {
                        const checked = form.user_ids.includes(u.user_id);
                        return (
                          <label
                            key={u.user_id}
                            className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${isDark ? 'hover:bg-white/4' : 'hover:bg-gray-100'
                              } ${checked ? (isDark ? 'bg-violet-600/10' : 'bg-violet-50') : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleUser(u.user_id)}
                              className="accent-violet-600"
                            />
                            <span className={`text-xs ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                              {u.full_name || u.email}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${textMuted}`}>{t('training.courses.courseName')} *</label>
                <Input
                  value={form.training_name}
                  onChange={(e) => setForm((f) => ({ ...f, training_name: e.target.value }))}
                  placeholder={t('training.courses.courseNamePlaceholder')}
                  className={`h-9 text-xs ${inputCls}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${textMuted}`}>{t('training.courses.type')}</label>
                  <Select value={form.training_type || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, training_type: v === 'none' ? '' : v }))}>
                    <SelectTrigger className={`h-9 text-xs ${isDark ? 'bg-white/4 border-white/8 text-white' : 'bg-gray-50 border-gray-200'}`}>
                      <SelectValue placeholder={t('training.courses.none')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('training.courses.none')}</SelectItem>
                      {TRAINING_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${textMuted}`}>{t('training.courses.session')}</label>
                  <Input
                    value={form.session_code}
                    onChange={(e) => setForm((f) => ({ ...f, session_code: e.target.value }))}
                    placeholder={t('training.courses.sessionPlaceholder')}
                    className={`h-9 text-xs font-mono ${inputCls}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${textMuted}`}>{t('training.courses.certificateType')}</label>
                <Select value={form.certificate_type || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, certificate_type: v === 'none' ? '' : v }))}>
                  <SelectTrigger className={`h-9 text-xs ${isDark ? 'bg-white/4 border-white/8 text-white' : 'bg-gray-50 border-gray-200'}`}>
                    <SelectValue placeholder={t('training.courses.none')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('training.courses.none')}</SelectItem>
                    <SelectItem value="PARTICIPATION">{t('training.courses.certParticipation')}</SelectItem>
                    <SelectItem value="QUALIFICATION">{t('training.courses.certQualification')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${textMuted}`}>{t('training.courses.sessionDate')}</label>
                <Input
                  type="date"
                  value={form.session_date}
                  onChange={(e) => setForm((f) => ({ ...f, session_date: e.target.value }))}
                  className={`h-9 text-xs ${inputCls}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${textMuted}`}>{t('training.courses.completionDate')}</label>
                  <Input
                    type="date"
                    value={form.completion_date}
                    onChange={(e) => setForm((f) => ({ ...f, completion_date: e.target.value }))}
                    className={`h-9 text-xs ${inputCls}`}
                  />
                </div>
                <div>
                  <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${textMuted}`}>{t('training.courses.expiryDate')}</label>
                  <Input
                    type="date"
                    value={form.expiry_date}
                    onChange={(e) => setForm((f) => ({ ...f, expiry_date: e.target.value }))}
                    className={`h-9 text-xs ${inputCls}`}
                  />
                </div>
              </div>
            </div>

            <div className={`flex justify-end gap-2 px-6 py-4 border-t ${borderMuted}`}>
              <Button variant="outline" size="sm" onClick={() => setModalOpen(false)} className={`h-8 text-xs ${isDark ? 'border-white/8 hover:bg-white/5 text-gray-300' : ''}`}>
                {t('training.courses.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !form.training_name.trim() || (!form.attendance_id && form.user_ids.length === 0)}
                className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white"
              >
                {saving ? t('training.courses.saving') : form.attendance_id ? t('training.courses.update') : t('training.courses.create')}
              </Button>
            </div>
          </div>
        </div>
      )}


      {viewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-3xl rounded-2xl border shadow-2xl flex flex-col max-h-[85vh] ${isDark ? 'bg-[#0f1320] border-white/8' : 'bg-white border-gray-200'}`}>

            <div className={`flex items-center justify-between px-6 py-4 border-b ${borderMuted}`}>
              <div className="flex items-center gap-2.5">
                <GraduationCap size={16} className="text-violet-400" />
                <div>
                  <h2 className={`text-sm font-semibold ${textPrimary}`}>{t('training.courses.curriculum')}</h2>
                  <p className={`text-[11px] mt-0.5 ${textMuted}`}>{viewTarget.user_name ?? `User #${viewTarget.fk_user_id}`}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setViewTarget(null)} className={`h-7 w-7 ${isDark ? 'text-gray-400 hover:bg-white/8' : 'text-gray-400 hover:bg-gray-100'}`}>
                <X size={15} />
              </Button>
            </div>

            <div className="px-6 py-5 overflow-y-auto space-y-5">
              {viewLoading ? (
                <div className="space-y-3 py-4">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className={`h-3 rounded animate-pulse ${isDark ? 'bg-white/6' : 'bg-gray-100'}`} />
                  ))}
                </div>
              ) : viewCurriculum.length === 0 ? (
                <div className="text-center py-12">
                  <GraduationCap size={32} className={`mx-auto mb-3 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                  <p className={`text-sm ${textMuted}`}>{t('training.courses.noUserRecords')}</p>
                </div>
              ) : (
                <>
                  {viewCurriculum.filter((r) => r.status === 'VALID' || r.status === null).length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <CheckCircle2 size={13} className="text-emerald-500" />
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">{t('training.courses.active')}</p>
                      </div>
                      <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-white/6' : 'border-gray-200'}`}>
                        <Table>
                          <TableHeader>
                            <TableRow className={`${isDark ? 'bg-white/2 border-white/6' : 'bg-gray-50/50 border-gray-100'}`}>
                              {[t('training.courses.columnCourse'), t('training.courses.columnCertificate'), t('training.courses.columnCompletion'), t('training.courses.columnExpiry'), t('training.courses.columnStatus')].map((h) => (
                                <TableHead key={h} className={`text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>{h}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {viewCurriculum.filter((r) => r.status === 'VALID' || r.status === null).map((r) => (
                              <TableRow key={r.attendance_id} className={`border-b ${borderMuted}`}>
                                <TableCell>
                                  <p className={`text-xs font-medium ${textPrimary}`}>{r.training_name}</p>
                                  {r.training_type && <p className={`text-[10px] mt-0.5 ${textMuted}`}>{r.training_type}</p>}
                                </TableCell>
                                <TableCell>
                                  {r.certificate_type ? (
                                    <Badge variant="outline" className={`text-[10px] font-bold ${r.certificate_type === 'QUALIFICATION' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-teal-500/10 text-teal-500 border-teal-500/20'}`}>
                                      {r.certificate_type === 'PARTICIPATION' ? t('training.courses.participation') : r.certificate_type === 'QUALIFICATION' ? t('training.courses.qualification') : r.certificate_type}
                                    </Badge>
                                  ) : <span className={`text-[11px] ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>—</span>}
                                </TableCell>
                                <TableCell className={`text-xs ${textMuted}`}>{fmtCurrDate(r.completion_date)}</TableCell>
                                <TableCell className={`text-xs ${textMuted}`}>{fmtCurrDate(r.expiry_date)}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-[10px] font-bold bg-green-500/10 text-green-500 border-green-500/20">{t('training.courses.statusValid')}</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {viewCurriculum.filter((r) => r.status === 'EXPIRED').length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Clock size={13} className={textMuted} />
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>{t('training.courses.history')}</p>
                      </div>
                      <div className={`rounded-xl border overflow-hidden opacity-60 ${isDark ? 'border-white/6' : 'border-gray-200'}`}>
                        <Table>
                          <TableHeader>
                            <TableRow className={`${isDark ? 'bg-white/2 border-white/6' : 'bg-gray-50/50 border-gray-100'}`}>
                              {[t('training.courses.columnCourse'), t('training.courses.columnCertificate'), t('training.courses.columnCompletion'), t('training.courses.columnExpiry'), t('training.courses.columnStatus')].map((h) => (
                                <TableHead key={h} className={`text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>{h}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {viewCurriculum.filter((r) => r.status === 'EXPIRED').map((r) => (
                              <TableRow key={r.attendance_id} className={`border-b ${borderMuted}`}>
                                <TableCell>
                                  <p className={`text-xs font-medium ${textPrimary}`}>{r.training_name}</p>
                                  {r.training_type && <p className={`text-[10px] mt-0.5 ${textMuted}`}>{r.training_type}</p>}
                                </TableCell>
                                <TableCell>
                                  {r.certificate_type ? (
                                    <Badge variant="outline" className={`text-[10px] font-bold ${r.certificate_type === 'QUALIFICATION' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-teal-500/10 text-teal-500 border-teal-500/20'}`}>
                                      {r.certificate_type === 'PARTICIPATION' ? t('training.courses.participation') : r.certificate_type === 'QUALIFICATION' ? t('training.courses.qualification') : r.certificate_type}
                                    </Badge>
                                  ) : <span className={`text-[11px] ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>—</span>}
                                </TableCell>
                                <TableCell className={`text-xs ${textMuted}`}>{fmtCurrDate(r.completion_date)}</TableCell>
                                <TableCell className="text-xs text-red-400 font-medium">{fmtCurrDate(r.expiry_date)}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-[10px] font-bold bg-red-500/10 text-red-500 border-red-500/20">{t('training.courses.statusExpired')}</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className={`flex justify-end px-6 py-4 border-t ${borderMuted}`}>
              <Button variant="outline" size="sm" onClick={() => setViewTarget(null)} className={`h-8 text-xs ${isDark ? 'border-white/8 hover:bg-white/5 text-gray-300' : ''}`}>
                {t('training.close')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-2xl border shadow-2xl ${isDark ? 'bg-[#0f1320] border-white/8' : 'bg-white border-gray-200'}`}>
            <div className="px-6 py-5">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <BookOpen size={18} className="text-red-400" />
              </div>
              <h3 className={`text-sm font-semibold mb-1 ${textPrimary}`}>{t('training.courses.deleteRecord')}</h3>
              <p className={`text-xs ${textMuted}`}>
                {t('training.courses.deleteMessage', { userName: deleteTarget.user_name ?? t('training.courses.thisUser'), trainingName: deleteTarget.training_name })}
              </p>
            </div>
            <div className={`flex justify-end gap-2 px-6 py-4 border-t ${borderMuted}`}>
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} className={`h-8 text-xs ${isDark ? 'border-white/8 hover:bg-white/5 text-gray-300' : ''}`}>
                {t('training.courses.cancel')}
              </Button>
              <Button size="sm" onClick={handleDelete} className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white">
                {t('training.courses.deleteRecord')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
