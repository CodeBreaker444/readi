'use client';


import { ComplianceRequirement, getComplianceRequirementsColumns } from '@/components/tables/ComplianceReqColumn';
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
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  MinusCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';


type ComplianceStatus = 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT' | 'NOT_APPLICABLE';

const AREA_OPTIONS = [
  'Documentation',
  'Operations',
  'Safety Performance',
  'Compliance & Training',
  'Maintenance',
  'Regulatory',
];

const STATIC_AUDIT_SCHEDULE = [
  {
    period: 'Jan – Mar (Q1)',
    type: 'Documentary',
    area: 'SMS Manual, LUC, ConOps template, hazard/mitigation registers',
    responsible: 'SM, AM',
    mode: 'On-site (document analysis)',
    output: 'Report Audit_01_Q1.pdf',
  },
  {
    period: 'Apr – Jun (Q2)',
    type: 'Operational',
    area: 'Client request evaluation and mission planning process',
    responsible: 'SM, RO, TM, RM',
    mode: 'On-site + mission simulation',
    output: 'Report Audit_02_Q2.pdf',
  },
  {
    period: 'Jul – Sep (Q3)',
    type: 'Safety Performance',
    area: 'SPI, hazards, internal reports and investigations',
    responsible: 'SM, Safety Committee',
    mode: 'Safety KPI analysis',
    output: 'Report Audit_03_Q3.pdf',
  },
  {
    period: 'Oct – Dec (Q4)',
    type: 'Compliance & Training',
    area: 'Training register, UAS maintenance, external suppliers/SLA',
    responsible: 'TM, RM, SLA',
    mode: 'Mixed (internal/external)',
    output: 'Report Audit_04_Q4.pdf',
  },
];


interface FormState {
  requirement_id?: number;
  requirement_code: string;
  requirement_title: string;
  requirement_type: string;
  regulatory_body: string;
  requirement_status: ComplianceStatus;
  review_frequency: string;
  next_review_date: string;
  requirement_description: string;
}

const EMPTY_FORM: FormState = {
  requirement_code: '',
  requirement_title: '',
  requirement_type: '',
  regulatory_body: '',
  requirement_status: 'COMPLIANT',
  review_frequency: '',
  next_review_date: '',
  requirement_description: '',
};


export default function GeneralAuditPlanPage() {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  const [records, setRecords] = useState<ComplianceRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    compliant: 0,
    partial: 0,
    non_compliant: 0,
    not_applicable: 0,
  });

  const [filterOpen, setFilterOpen] = useState(false);
  const [q, setQ] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterArea, setFilterArea] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ComplianceRequirement | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const statusOptions = [
    { value: 'COMPLIANT' as ComplianceStatus, label: t('compliance.shared.status.COMPLIANT') },
    { value: 'PARTIAL' as ComplianceStatus, label: t('compliance.shared.status.PARTIAL') },
    { value: 'NON_COMPLIANT' as ComplianceStatus, label: t('compliance.shared.status.NON_COMPLIANT') },
    { value: 'NOT_APPLICABLE' as ComplianceStatus, label: t('compliance.shared.status.NOT_APPLICABLE') },
  ];

  const auditScheduleColumns = [
    t('compliance.generalAuditPlan.auditSchedule.columns.period'),
    t('compliance.generalAuditPlan.auditSchedule.columns.type'),
    t('compliance.generalAuditPlan.auditSchedule.columns.area'),
    t('compliance.generalAuditPlan.auditSchedule.columns.responsible'),
    t('compliance.generalAuditPlan.auditSchedule.columns.mode'),
    t('compliance.generalAuditPlan.auditSchedule.columns.output'),
  ];

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        axios.get('/api/compliance/audit-plan/list'),
        axios.get('/api/compliance/audit-plan/stats'),
      ]);
      if (listRes.data.code === 1) setRecords(listRes.data.data ?? []);
      if (statsRes.data.code === 1) setStats(statsRes.data.data);
    } catch (err) {
      console.error('Failed to fetch compliance data', err);
      toast.error(t('compliance.generalAuditPlan.messages.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const filtered = useMemo(() => {
    let rows = records;
    if (q) {
      const lq = q.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.requirement_code.toLowerCase().includes(lq) ||
          r.requirement_title.toLowerCase().includes(lq) ||
          (r.requirement_type ?? '').toLowerCase().includes(lq) ||
          (r.regulatory_body ?? '').toLowerCase().includes(lq)
      );
    }
    if (filterStatus) rows = rows.filter((r) => r.requirement_status === filterStatus);
    if (filterArea) rows = rows.filter((r) => r.requirement_type === filterArea);
    return rows;
  }, [records, q, filterStatus, filterArea]);

  const columns = useMemo(
    () => getComplianceRequirementsColumns(isDark, openEdit, (r) => setDeleteTarget(r), t),
    [isDark, t]
  );

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  });

  function openCreate() {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(record: ComplianceRequirement) {
    setForm({
      requirement_id: record.requirement_id,
      requirement_code: record.requirement_code,
      requirement_title: record.requirement_title,
      requirement_type: record.requirement_type ?? '',
      regulatory_body: record.regulatory_body ?? '',
      requirement_status: record.requirement_status as ComplianceStatus,
      review_frequency: record.review_frequency != null ? String(record.review_frequency) : '',
      next_review_date: record.next_review_date ?? '',
      requirement_description: record.requirement_description ?? '',
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.requirement_code.trim() || !form.requirement_title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        requirement_id: form.requirement_id,
        requirement_code: form.requirement_code.trim(),
        requirement_title: form.requirement_title.trim(),
        requirement_type: form.requirement_type.trim() || null,
        regulatory_body: form.regulatory_body.trim() || null,
        requirement_status: form.requirement_status,
        review_frequency: form.review_frequency ? Number(form.review_frequency) : null,
        next_review_date: form.next_review_date || null,
        requirement_description: form.requirement_description.trim() || null,
      };

      const endpoint = form.requirement_id
        ? '/api/compliance/audit-plan/update'
        : '/api/compliance/audit-plan/add';

      await axios.post(endpoint, payload);
      setModalOpen(false);
      toast.success(form.requirement_id
        ? t('compliance.generalAuditPlan.messages.saveSuccess')
        : t('compliance.generalAuditPlan.messages.createSuccess'));
      fetchRecords();
    } catch (err) {
      console.error('Failed to save requirement', err);
      toast.error(t('compliance.generalAuditPlan.messages.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.requirement_id;
    setDeleteTarget(null);
    try {
      await axios.post('/api/compliance/audit-plan/delete', { requirement_id: id });
      fetchRecords();
      toast.success(t('compliance.generalAuditPlan.messages.deleteSuccess'));
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.error;
        toast.error(msg || t('compliance.generalAuditPlan.messages.deleteFailed'));
      } else {
        toast.error(t('compliance.generalAuditPlan.messages.deleteFailed'));
      }
    }
  }

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
  const tableHeadBg = isDark ? 'bg-white/2' : 'bg-gray-50/50';


  return (
    <div className={`min-h-screen ${bg}`}>
      <div
        className={`backdrop-blur-xl border-b ${
          isDark
            ? 'bg-[#0a0e1a]/90 border-white/6'
            : 'bg-white/80 border-black/6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
        }`}
      >
        <div className="mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-1 h-6 rounded-full bg-violet-600" />
            <div>
              <h1 className={`text-[15px] font-semibold tracking-[-0.01em] ${textPrimary}`}>
                {t('compliance.generalAuditPlan.title')}
              </h1>
              <p className={`text-[11px] mt-0.5 ${textMuted}`}>
                {t('compliance.generalAuditPlan.subtitle')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterOpen((v) => !v)}
              className={`h-8 gap-1.5 text-xs ${
                filterOpen
                  ? 'bg-violet-600/10 border-violet-500/30 text-violet-400'
                  : btnOutline
              }`}
            >
              <Filter size={13} strokeWidth={2.5} />
              {t('compliance.requirementsEvidences.actions.filter')}
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
              size="sm"
              onClick={openCreate}
              className="h-8 gap-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Plus size={14} strokeWidth={2.5} />
              {t('compliance.generalAuditPlan.table.addButton')}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto px-6 py-6 space-y-6">

        {filterOpen && (
          <div className={`rounded-xl border p-4 flex flex-wrap gap-3 items-center ${cardBg}`}>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('compliance.generalAuditPlan.filters.searchPlaceholder')}
              className={`h-8 flex-1 min-w-48 text-xs ${inputCls}`}
            />
            <Select
              value={filterStatus || 'all'}
              onValueChange={(v) => setFilterStatus(v === 'all' ? '' : v)}
            >
              <SelectTrigger
                className={`h-8 w-44 text-xs ${
                  isDark ? 'bg-white/4 border-white/8 text-white' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <SelectValue placeholder={t('compliance.generalAuditPlan.filters.statusAll')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('compliance.generalAuditPlan.filters.statusAll')}</SelectItem>
                {statusOptions.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterArea || 'all'}
              onValueChange={(v) => setFilterArea(v === 'all' ? '' : v)}
            >
              <SelectTrigger
                className={`h-8 w-48 text-xs ${
                  isDark ? 'bg-white/4 border-white/8 text-white' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <SelectValue placeholder={t('compliance.generalAuditPlan.filters.areaAll')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('compliance.generalAuditPlan.filters.areaAll')}</SelectItem>
                {AREA_OPTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(q || filterStatus || filterArea) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQ('');
                  setFilterStatus('');
                  setFilterArea('');
                }}
                className="h-8 gap-1 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-400"
              >
                <X size={13} /> {t('compliance.generalAuditPlan.filters.clear')}
              </Button>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(
            [
              {
                labelKey: 'compliance.generalAuditPlan.stats.totalRequirements',
                value: stats.total,
                icon: ShieldCheck,
                color: 'text-violet-400',
                iconBg: isDark ? 'bg-violet-500/10' : 'bg-violet-50',
              },
              {
                labelKey: 'compliance.generalAuditPlan.stats.compliant',
                value: stats.compliant,
                icon: CheckCircle2,
                color: 'text-emerald-400',
                iconBg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50',
              },
              {
                labelKey: 'compliance.generalAuditPlan.stats.partialNonCompliant',
                value: stats.partial + stats.non_compliant,
                icon: AlertTriangle,
                color: 'text-amber-400',
                iconBg: isDark ? 'bg-amber-500/10' : 'bg-amber-50',
              },
              {
                labelKey: 'compliance.generalAuditPlan.stats.notApplicable',
                value: stats.not_applicable,
                icon: MinusCircle,
                color: 'text-slate-400',
                iconBg: isDark ? 'bg-slate-500/10' : 'bg-slate-100',
              },
            ] as const
          ).map(({ labelKey, value, icon: Icon, color, iconBg }) => (
            <div key={labelKey} className={`rounded-xl border p-4 ${cardBg}`}>
              <div className="flex items-center justify-between mb-3">
                <p className={`text-[11px] font-medium uppercase tracking-wider ${textMuted}`}>
                  {t(labelKey)}
                </p>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBg}`}>
                  <Icon size={14} className={color} />
                </div>
              </div>
              <p className={`text-2xl font-bold ${textPrimary}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className={`rounded-xl border overflow-hidden ${cardBg}`}>
          <div className={`px-5 py-4 border-b ${borderMuted}`}>
            <h2 className={`text-sm font-semibold ${textPrimary}`}>
              {t('compliance.generalAuditPlan.auditSchedule.sectionTitle')}
            </h2>
            <p className={`text-[11px] mt-0.5 ${textMuted}`}>
              {t('compliance.generalAuditPlan.auditSchedule.subtitle')}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className={`${tableHeadBg} border-b ${borderMuted}`}>
                  {auditScheduleColumns.map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider ${textMuted}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {STATIC_AUDIT_SCHEDULE.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`border-b last:border-0 ${borderMuted} ${
                      isDark ? 'hover:bg-white/2' : 'hover:bg-gray-50/50'
                    }`}
                  >
                    <td className={`px-4 py-3 font-medium whitespace-nowrap ${textPrimary}`}>
                      {row.period}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isDark
                            ? 'bg-violet-500/10 text-violet-300'
                            : 'bg-violet-50 text-violet-700'
                        }`}
                      >
                        {row.type}
                      </span>
                    </td>
                    <td className={`px-4 py-3 max-w-[240px] leading-snug ${textPrimary}`}>
                      {row.area}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap font-mono text-[11px] ${textMuted}`}>
                      {row.responsible}
                    </td>
                    <td className={`px-4 py-3 ${textMuted}`}>{row.mode}</td>
                    <td className={`px-4 py-3 font-mono text-[11px] ${textMuted}`}>
                      {row.output}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={`px-5 py-3 border-t ${borderMuted}`}>
            <p className={`text-[11px] ${textMuted}`}>
              {t('compliance.generalAuditPlan.auditSchedule.footer')}
            </p>
          </div>
        </div>

        <div className={`rounded-xl border overflow-hidden ${cardBg}`}>
          <div className={`px-5 py-4 border-b ${borderMuted}`}>
            <h2 className={`text-sm font-semibold ${textPrimary}`}>
              {t('compliance.generalAuditPlan.table.sectionTitle')}
            </h2>
            <p className={`text-[11px] mt-0.5 ${textMuted}`}>
              {t('compliance.generalAuditPlan.table.requirementCount', { count: filtered.length })}
            </p>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className={`${borderMuted} ${tableHeadBg}`}>
                    {hg.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={`text-[11px] font-bold uppercase tracking-wider ${textMuted}`}
                        style={{
                          width: header.getSize() !== 150 ? header.getSize() : undefined,
                        }}
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
                          <div
                            className={`h-3 rounded animate-pulse ${
                              isDark ? 'bg-white/6' : 'bg-gray-100'
                            }`}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="py-20 text-center">
                      <ShieldCheck
                        size={32}
                        className={`mx-auto mb-3 ${
                          isDark ? 'text-gray-700' : 'text-gray-300'
                        }`}
                      />
                      <p className={`text-sm ${textMuted}`}>
                        {t('compliance.generalAuditPlan.table.empty')}
                      </p>
                      <p className={`text-xs mt-1 ${textMuted}`}>
                        {t('compliance.generalAuditPlan.table.emptyHint')}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={`border-b transition-colors ${
                        isDark
                          ? `${borderMuted} hover:bg-white/2`
                          : `${borderMuted} hover:bg-gray-50/50`
                      }`}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div
            className={`w-full max-w-lg rounded-md border shadow-2xl ${
              isDark ? 'bg-[#0f1320] border-white/8' : 'bg-white border-gray-200'
            }`}
          >
            <div className={`flex items-center justify-between px-6 py-4 border-b ${borderMuted}`}>
              <h2 className={`text-sm font-semibold ${textPrimary}`}>
                {form.requirement_id
                  ? t('compliance.generalAuditPlan.modal.editTitle')
                  : t('compliance.generalAuditPlan.modal.createTitle')}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setModalOpen(false)}
                className={`h-7 w-7 cursor-pointer ${
                  isDark
                    ? 'text-gray-400 hover:bg-white/8'
                    : 'text-gray-400 hover:bg-gray-100'
                }`}
              >
                <X size={15} />
              </Button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${textMuted}`}>
                    {t('compliance.generalAuditPlan.modal.fields.code')} *
                  </label>
                  <Input
                    value={form.requirement_code}
                    onChange={(e) => setForm((f) => ({ ...f, requirement_code: e.target.value }))}
                    placeholder={t('compliance.generalAuditPlan.modal.fields.codePlaceholder')}
                    className={`h-9 text-xs font-mono ${inputCls}`}
                  />
                </div>
                <div className="col-span-2">
                  <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${textMuted}`}>
                    {t('compliance.generalAuditPlan.modal.fields.title')} *
                  </label>
                  <Input
                    value={form.requirement_title}
                    onChange={(e) => setForm((f) => ({ ...f, requirement_title: e.target.value }))}
                    placeholder={t('compliance.generalAuditPlan.modal.fields.titlePlaceholder')}
                    className={`h-9 text-xs ${inputCls}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${textMuted}`}>
                    {t('compliance.generalAuditPlan.modal.fields.type')}
                  </label>
                  <Select
                    value={form.requirement_type || 'none'}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, requirement_type: v === 'none' ? '' : v }))
                    }
                  >
                    <SelectTrigger
                      className={`h-9 text-xs ${
                        isDark
                          ? 'bg-white/4 border-white/8 text-white'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <SelectValue placeholder={t('compliance.generalAuditPlan.modal.fields.typePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {AREA_OPTIONS.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${textMuted}`}>
                    {t('compliance.generalAuditPlan.modal.fields.regulatoryBody')}
                  </label>
                  <Input
                    value={form.regulatory_body}
                    onChange={(e) => setForm((f) => ({ ...f, regulatory_body: e.target.value }))}
                    placeholder={t('compliance.generalAuditPlan.modal.fields.regulatoryBodyPlaceholder')}
                    className={`h-9 text-xs ${inputCls}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${textMuted}`}>
                    {t('compliance.generalAuditPlan.modal.fields.status')}
                  </label>
                  <Select
                    value={form.requirement_status}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, requirement_status: v as ComplianceStatus }))
                    }
                  >
                    <SelectTrigger
                      className={`h-9 text-xs ${
                        isDark
                          ? 'bg-white/4 border-white/8 text-white'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${textMuted}`}>
                    {t('compliance.generalAuditPlan.modal.fields.criticality')}
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={form.review_frequency}
                    onChange={(e) => setForm((f) => ({ ...f, review_frequency: e.target.value }))}
                    placeholder="e.g. 3"
                    className={`h-9 text-xs ${inputCls}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${textMuted}`}>
                  {t('compliance.generalAuditPlan.modal.fields.nextReviewDate')}
                </label>
                <Input
                  type="date"
                  value={form.next_review_date}
                  onChange={(e) => setForm((f) => ({ ...f, next_review_date: e.target.value }))}
                  className={`h-9 text-xs ${inputCls}`}
                />
              </div>

              <div>
                <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${textMuted}`}>
                  {t('compliance.generalAuditPlan.modal.fields.notes')}
                </label>
                <textarea
                  rows={3}
                  value={form.requirement_description}
                  onChange={(e) => setForm((f) => ({ ...f, requirement_description: e.target.value }))}
                  placeholder={t('compliance.generalAuditPlan.modal.fields.notesPlaceholder')}
                  className={`w-full rounded-md border px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-violet-500/40 ${inputCls}`}
                />
              </div>
            </div>

            <div className={`flex justify-end gap-2 px-6 py-4 border-t ${borderMuted}`}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                className={`h-8 text-xs ${
                  isDark ? 'border-white/8 hover:bg-white/5 text-gray-300' : ''
                }`}
              >
                {t('compliance.generalAuditPlan.modal.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !form.requirement_code.trim() || !form.requirement_title.trim()}
                className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white"
              >
                {saving
                  ? t('compliance.generalAuditPlan.modal.saving')
                  : form.requirement_id
                    ? t('compliance.generalAuditPlan.modal.update')
                    : t('compliance.generalAuditPlan.modal.create')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div
            className={`w-full max-w-sm rounded-md border  ${
              isDark ? 'bg-[#0f1320] border-white/8' : 'bg-white border-gray-200'
            }`}
          >
            <div className="px-6 py-5">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <AlertTriangle size={18} className="text-red-400" />
              </div>
              <h3 className={`text-sm font-semibold mb-1 ${textPrimary}`}>
                {t('compliance.generalAuditPlan.deleteModal.title')}
              </h3>
              <p className={`text-xs ${textMuted}`}>
                {t('compliance.generalAuditPlan.deleteModal.message')}
              </p>
            </div>
            <div className={`flex justify-end gap-2 px-6 py-4 border-t ${borderMuted}`}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteTarget(null)}
                className={`h-8 cursor-pointer text-xs ${
                  isDark ? 'border-white/8 hover:bg-white/5 text-gray-300' : ''
                }`}
              >
                {t('compliance.generalAuditPlan.deleteModal.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleDelete}
                className="h-8 cursor-pointer text-xs bg-red-600 hover:bg-red-700 text-white"
              >
                {t('compliance.generalAuditPlan.deleteModal.confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
