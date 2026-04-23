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
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import axios from 'axios';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileText,
  Filter,
  MinusCircle,
  Paperclip,
  Plus,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';


type ComplianceStatus = 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT' | 'NOT_APPLICABLE';
type EvidenceType = 'DOC' | 'RECORD' | 'AUDIT' | 'LINK';

interface Evidence {
  evidence_id: number;
  fk_requirement_id: number;
  evidence_type: EvidenceType;
  evidence_description: string | null;
  file_path: string | null;
  notes: string | null;
  submitted_at: string;
}

const AREA_OPTIONS = ['OPERATIONS', 'MAINTENANCE', 'TRAINING', 'SMS', 'COMPLIANCE', 'ICT'];
const EVIDENCE_TYPE_OPTIONS: EvidenceType[] = ['DOC', 'RECORD', 'AUDIT', 'LINK'];


interface ReqForm {
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

const EMPTY_REQ: ReqForm = {
  requirement_code: '',
  requirement_title: '',
  requirement_type: 'COMPLIANCE',
  regulatory_body: 'INTERNAL',
  requirement_status: 'PARTIAL',
  review_frequency: '2',
  next_review_date: '',
  requirement_description: '',
};


interface EvidenceForm {
  evidence_type: EvidenceType;
  evidence_description: string;
  file_path: string;
  notes: string;
}

const EMPTY_EVI: EvidenceForm = {
  evidence_type: 'DOC',
  evidence_description: '',
  file_path: '',
  notes: '',
};


export default function RequirementsEvidencesPage() {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  const [records, setRecords] = useState<ComplianceRequirement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [filterOpen, setFilterOpen] = useState(false);
  const [q, setQ] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [reqModalOpen, setReqModalOpen] = useState(false);
  const [reqForm, setReqForm] = useState<ReqForm>(EMPTY_REQ);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ComplianceRequirement | null>(null);

  const [statusTarget, setStatusTarget] = useState<ComplianceRequirement | null>(null);
  const [newStatus, setNewStatus] = useState<ComplianceStatus>('COMPLIANT');
  const [statusComment, setStatusComment] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);

  const [eviTarget, setEviTarget] = useState<ComplianceRequirement | null>(null);
  const [evidences, setEvidences] = useState<Evidence[]>([]);
  const [eviLoading, setEviLoading] = useState(false);
  const [eviForm, setEviForm] = useState<EvidenceForm>(EMPTY_EVI);
  const [eviSaving, setEviSaving] = useState(false);

  const [kpiRunning, setKpiRunning] = useState(false);

  const statusOptions = [
    { value: 'COMPLIANT' as ComplianceStatus, label: t('compliance.shared.status.COMPLIANT') },
    { value: 'PARTIAL' as ComplianceStatus, label: t('compliance.shared.status.PARTIAL') },
    { value: 'NON_COMPLIANT' as ComplianceStatus, label: t('compliance.shared.status.NON_COMPLIANT') },
    { value: 'NOT_APPLICABLE' as ComplianceStatus, label: t('compliance.shared.status.NOT_APPLICABLE') },
  ];

  const fetchRecords = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (filterArea) params.set('area', filterArea);
      if (filterStatus) params.set('requirement_status', filterStatus);
      if (q) params.set('q', q);
      const res = await axios.get(`/api/compliance/requirements-evidences/list?${params}`);
      if (res.data.code === 1) {
        setRecords(res.data.data ?? []);
        setTotal(res.data.total ?? 0);
      }
    } catch {
      toast.error(t('compliance.requirementsEvidences.messages.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [filterArea, filterStatus, q]);

  useEffect(() => { fetchRecords(1); setPage(1); }, [fetchRecords]);

  const fetchEvidences = useCallback(async (requirementId: number) => {
    setEviLoading(true);
    try {
      const res = await axios.get(`/api/compliance/requirements-evidences/evidence/list?requirement_id=${requirementId}`);
      if (res.data.code === 1) setEvidences(res.data.data ?? []);
    } catch {
      toast.error(t('compliance.requirementsEvidences.messages.evidenceLoadFailed'));
    } finally {
      setEviLoading(false);
    }
  }, []);


  const columns = useMemo(
    () => getComplianceRequirementsColumns(
      isDark,
      (r) => openEditReq(r),
      (r) => setDeleteTarget(r),
      t
    ),
    [isDark, t]
  );

  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
  });


  function openNewReq() {
    setReqForm(EMPTY_REQ);
    setReqModalOpen(true);
  }

  function openEditReq(r: ComplianceRequirement) {
    setReqForm({
      requirement_id: r.requirement_id,
      requirement_code: r.requirement_code,
      requirement_title: r.requirement_title,
      requirement_type: r.requirement_type ?? 'COMPLIANCE',
      regulatory_body: r.regulatory_body ?? 'INTERNAL',
      requirement_status: r.requirement_status as ComplianceStatus,
      review_frequency: r.review_frequency != null ? String(r.review_frequency) : '2',
      next_review_date: r.next_review_date ?? '',
      requirement_description: r.requirement_description ?? '',
    });
    setReqModalOpen(true);
  }

  const handleSaveReq = async () => {
    if (!reqForm.requirement_code.trim() || !reqForm.requirement_title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        requirement_id: reqForm.requirement_id,
        requirement_code: reqForm.requirement_code.trim(),
        requirement_title: reqForm.requirement_title.trim(),
        requirement_type: reqForm.requirement_type || null,
        regulatory_body: reqForm.regulatory_body.trim() || null,
        requirement_status: reqForm.requirement_status,
        review_frequency: reqForm.review_frequency ? Number(reqForm.review_frequency) : null,
        next_review_date: reqForm.next_review_date || null,
        requirement_description: reqForm.requirement_description.trim() || null,
      };
      const endpoint = reqForm.requirement_id
        ? '/api/compliance/requirements-evidences/update'
        : '/api/compliance/requirements-evidences/add';
      await axios.post(endpoint, payload);
      setReqModalOpen(false);
      toast.success(reqForm.requirement_id
        ? t('compliance.requirementsEvidences.messages.updateSuccess')
        : t('compliance.requirementsEvidences.messages.createSuccess'));
      fetchRecords(page);
    } catch {
      toast.error(t('compliance.requirementsEvidences.messages.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  const handleDeleteReq = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.requirement_id;
    setDeleteTarget(null);
    try {
      await axios.post('/api/compliance/requirements-evidences/delete', { requirement_id: id });
      toast.success(t('compliance.requirementsEvidences.messages.deleteSuccess'));
      fetchRecords(page);
    } catch (err) {
      if (axios.isAxiosError(err)) toast.error(err.response?.data?.error || t('compliance.requirementsEvidences.messages.deleteFailed'));
      else toast.error(t('compliance.requirementsEvidences.messages.deleteFailed'));
    }
  }


  const openStatusModal = (r: ComplianceRequirement) => {
    setStatusTarget(r);
    setNewStatus(r.requirement_status as ComplianceStatus);
    setStatusComment('');
  }

  const handleStatusChange = async () => {
    if (!statusTarget) return;
    setStatusSaving(true);
    try {
      await axios.post('/api/compliance/requirements-evidences/status', {
        requirement_id: statusTarget.requirement_id,
        new_status: newStatus,
        comment: statusComment || null,
      });
      setStatusTarget(null);
      toast.success(t('compliance.requirementsEvidences.messages.statusUpdateSuccess'));
      fetchRecords(page);
    } catch {
      toast.error(t('compliance.requirementsEvidences.messages.statusUpdateFailed'));
    } finally {
      setStatusSaving(false);
    }
  }


  const openEviPanel = (r: ComplianceRequirement) => {
    setEviTarget(r);
    setEviForm(EMPTY_EVI);
    fetchEvidences(r.requirement_id);
  }

  const handleAddEvidence = async () => {
    if (!eviTarget || !eviForm.evidence_description.trim()) return;
    setEviSaving(true);
    try {
      await axios.post('/api/compliance/requirements-evidences/evidence/add', {
        requirement_id: eviTarget.requirement_id,
        evidence_type: eviForm.evidence_type,
        evidence_description: eviForm.evidence_description.trim(),
        file_path: eviForm.file_path.trim() || null,
        notes: eviForm.notes.trim() || null,
      });
      setEviForm(EMPTY_EVI);
      toast.success(t('compliance.requirementsEvidences.messages.evidenceAddSuccess'));
      fetchEvidences(eviTarget.requirement_id);
    } catch {
      toast.error(t('compliance.requirementsEvidences.messages.evidenceAddFailed'));
    } finally {
      setEviSaving(false);
    }
  }

  const handleDeleteEvidence = async (evidenceId: number) => {
    try {
      await axios.post('/api/compliance/requirements-evidences/evidence/delete', { evidence_id: evidenceId });
      toast.success(t('compliance.requirementsEvidences.messages.evidenceDeleteSuccess'));
      if (eviTarget) fetchEvidences(eviTarget.requirement_id);
    } catch {
      toast.error(t('compliance.requirementsEvidences.messages.evidenceDeleteFailed'));
    }
  }


  const runComplianceMonthly = async () => {
    setKpiRunning(true);
    try {
      const d = new Date();
      d.setMonth(d.getMonth() + 1, 0);
      const period = d.toISOString().slice(0, 10);

      const res = await axios.get(`/api/compliance/audit-plan/stats?period=${period}`);

      if (res.data.code === 1) {
        const { compliant, non_compliant, partial, total } = res.data.data;

        toast.success(t('compliance.requirementsEvidences.messages.kpiUpdateSuccess', { compliant, total, non_compliant, partial }));
      } else {
        toast.error(res.data.error || t('compliance.requirementsEvidences.messages.kpiUpdateFailed'));
      }
    } catch (err) {
      toast.error(t('compliance.requirementsEvidences.messages.kpiRunFailed'));
    } finally {
      setKpiRunning(false);
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
  const selectTrigger = isDark ? 'bg-white/4 border-white/8 text-white' : 'bg-gray-50 border-gray-200';


  return (
    <div className={`min-h-screen ${bg}`}>
      <div className={`backdrop-blur-xl border-b ${isDark ? 'bg-[#0a0e1a]/90 border-white/6' : 'bg-white/80 border-black/6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'}`}>
        <div className="mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-1 h-6 rounded-full bg-violet-600" />
            <div>
              <h1 className={`text-[15px] font-semibold tracking-[-0.01em] ${textPrimary}`}>
                {t('compliance.requirementsEvidences.title')}
              </h1>
              <p className={`text-[11px] mt-0.5 ${textMuted}`}>
                {t('compliance.requirementsEvidences.subtitle')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={runComplianceMonthly}
              disabled={kpiRunning}
              className={`h-8 gap-1.5 text-xs ${btnOutline}`}
            >
              <RefreshCw size={13} className={kpiRunning ? 'animate-spin' : ''} strokeWidth={2.5} />
              {t('compliance.requirementsEvidences.actions.updateKpi')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterOpen((v) => !v)}
              className={`h-8 gap-1.5 text-xs ${filterOpen ? 'bg-violet-600/10 border-violet-500/30 text-violet-400' : btnOutline}`}
            >
              <Filter size={13} strokeWidth={2.5} />
              {t('compliance.requirementsEvidences.actions.filter')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchRecords(page)}
              disabled={loading}
              className={`h-8 gap-1.5 text-xs ${btnOutline}`}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} strokeWidth={2.5} />
            </Button>
            <Button
              size="sm"
              onClick={openNewReq}
              className="h-8 gap-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Plus size={14} strokeWidth={2.5} />
              {t('compliance.requirementsEvidences.actions.newRequirement')}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto px-6 py-6 space-y-5">

        {filterOpen && (
          <div className={`rounded-xl border p-4 flex flex-wrap gap-3 items-center ${cardBg}`}>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('compliance.requirementsEvidences.filters.searchPlaceholder')}
              className={`h-8 flex-1 min-w-48 text-xs ${inputCls}`}
            />
            <Select value={filterArea || 'all'} onValueChange={(v) => setFilterArea(v === 'all' ? '' : v)}>
              <SelectTrigger className={`h-8 w-44 text-xs ${selectTrigger}`}>
                <SelectValue placeholder={t('compliance.requirementsEvidences.filters.areaAll')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('compliance.requirementsEvidences.filters.areaAll')}</SelectItem>
                {AREA_OPTIONS.map((a) => <SelectItem key={a} value={a}>{t(`compliance.shared.area.${a}`, { defaultValue: a })}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus || 'all'} onValueChange={(v) => setFilterStatus(v === 'all' ? '' : v)}>
              <SelectTrigger className={`h-8 w-44 text-xs ${selectTrigger}`}>
                <SelectValue placeholder={t('compliance.requirementsEvidences.filters.statusAll')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('compliance.requirementsEvidences.filters.statusAll')}</SelectItem>
                {statusOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {(q || filterArea || filterStatus) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setQ(''); setFilterArea(''); setFilterStatus(''); }}
                className="h-8 gap-1 text-xs text-red-400 hover:bg-red-500/10"
              >
                <X size={13} /> {t('compliance.requirementsEvidences.filters.clear')}
              </Button>
            )}
            <span className={`ml-auto text-xs ${textMuted}`}>Total: {total}</span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {([
            { labelKey: 'compliance.requirementsEvidences.stats.total', value: total, icon: ShieldCheck, color: 'text-violet-400', iconBg: isDark ? 'bg-violet-500/10' : 'bg-violet-50' },
            { labelKey: 'compliance.requirementsEvidences.stats.compliant', value: records.filter(r => r.requirement_status === 'COMPLIANT').length, icon: CheckCircle2, color: 'text-emerald-400', iconBg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50' },
            { labelKey: 'compliance.requirementsEvidences.stats.nonCompliant', value: records.filter(r => r.requirement_status === 'NON_COMPLIANT').length, icon: AlertTriangle, color: 'text-red-400', iconBg: isDark ? 'bg-red-500/10' : 'bg-red-50' },
            { labelKey: 'compliance.requirementsEvidences.stats.partial', value: records.filter(r => r.requirement_status === 'PARTIAL').length, icon: MinusCircle, color: 'text-amber-400', iconBg: isDark ? 'bg-amber-500/10' : 'bg-amber-50' },
          ] as const).map(({ labelKey, value, icon: Icon, color, iconBg }) => (
            <div key={labelKey} className={`rounded-xl border p-4 ${cardBg}`}>
              <div className="flex items-center justify-between mb-3">
                <p className={`text-[11px] font-medium uppercase tracking-wider ${textMuted}`}>{t(labelKey)}</p>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBg}`}>
                  <Icon size={14} className={color} />
                </div>
              </div>
              <p className={`text-2xl font-bold ${textPrimary}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className={`rounded-xl border overflow-hidden ${cardBg}`}>
          <div className={`px-5 py-4 border-b flex items-center justify-between ${borderMuted}`}>
            <div>
              <h2 className={`text-sm font-semibold ${textPrimary}`}>
                {t('compliance.generalAuditPlan.table.sectionTitle')}
              </h2>
              <p className={`text-[11px] mt-0.5 ${textMuted}`}>{t('compliance.requirementsEvidences.table.requirementCount', { count: total })}</p>
            </div>
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
                        style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                    <TableHead className={`text-[11px] font-bold uppercase tracking-wider ${textMuted} w-24`}>
                      {t('compliance.requirementsEvidences.table.columns.actions')}
                    </TableHead>
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
                      <TableCell><div className={`h-3 rounded animate-pulse ${isDark ? 'bg-white/6' : 'bg-gray-100'}`} /></TableCell>
                    </TableRow>
                  ))
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} className="py-20 text-center">
                      <ShieldCheck size={32} className={`mx-auto mb-3 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                      <p className={`text-sm ${textMuted}`}>{t('compliance.requirementsEvidences.table.empty')}</p>
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
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openStatusModal(row.original)}
                            className={`p-1.5 rounded-md transition-colors text-xs ${isDark ? 'text-slate-500 hover:text-blue-400 hover:bg-blue-500/8' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                            title={t('compliance.requirementsEvidences.table.tooltips.changeStatus')}
                          >
                            <RefreshCw size={13} strokeWidth={2} />
                          </button>
                          <button
                            onClick={() => openEviPanel(row.original)}
                            className={`p-1.5 rounded-md transition-colors ${isDark ? 'text-slate-500 hover:text-amber-400 hover:bg-amber-500/8' : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'}`}
                            title={t('compliance.requirementsEvidences.table.tooltips.manageEvidence')}
                          >
                            <Paperclip size={13} strokeWidth={2} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <TablePagination table={table} />
      </div>

      {reqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={`w-full max-w-lg rounded-xl border shadow-2xl ${isDark ? 'bg-[#0f1320] border-white/8' : 'bg-white border-gray-200'}`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${borderMuted}`}>
              <h2 className={`text-sm font-semibold ${textPrimary}`}>
                {reqForm.requirement_id
                  ? t('compliance.requirementsEvidences.requirementModal.editTitle')
                  : t('compliance.requirementsEvidences.requirementModal.createTitle')}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setReqModalOpen(false)} className={`h-7 w-7 ${isDark ? 'text-gray-400 hover:bg-white/8' : 'text-gray-400 hover:bg-gray-100'}`}>
                <X size={15} />
              </Button>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${textMuted}`}>
                    {t('compliance.requirementsEvidences.requirementModal.fields.code')} *
                  </label>
                  <Input value={reqForm.requirement_code} onChange={(e) => setReqForm(f => ({ ...f, requirement_code: e.target.value }))} placeholder={t('compliance.requirementsEvidences.requirementModal.fields.codePlaceholder')} className={`h-9 text-xs font-mono ${inputCls}`} />
                </div>
                <div className="col-span-2">
                  <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${textMuted}`}>
                    {t('compliance.requirementsEvidences.requirementModal.fields.title')} *
                  </label>
                  <Input value={reqForm.requirement_title} onChange={(e) => setReqForm(f => ({ ...f, requirement_title: e.target.value }))} placeholder={t('compliance.requirementsEvidences.requirementModal.fields.titlePlaceholder')} className={`h-9 text-xs ${inputCls}`} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${textMuted}`}>
                    {t('compliance.requirementsEvidences.requirementModal.fields.area')}
                  </label>
                  <Select value={reqForm.requirement_type} onValueChange={(v) => setReqForm(f => ({ ...f, requirement_type: v }))}>
                    <SelectTrigger className={`h-9 text-xs ${selectTrigger}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AREA_OPTIONS.map((a) => <SelectItem key={a} value={a}>{t(`compliance.shared.area.${a}`, { defaultValue: a })}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${textMuted}`}>
                    {t('compliance.requirementsEvidences.requirementModal.fields.source')}
                  </label>
                  <Input value={reqForm.regulatory_body} onChange={(e) => setReqForm(f => ({ ...f, regulatory_body: e.target.value }))} placeholder={t('compliance.requirementsEvidences.requirementModal.fields.sourcePlaceholder')} className={`h-9 text-xs ${inputCls}`} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${textMuted}`}>
                    {t('compliance.requirementsEvidences.requirementModal.fields.status')}
                  </label>
                  <Select value={reqForm.requirement_status} onValueChange={(v) => setReqForm(f => ({ ...f, requirement_status: v as ComplianceStatus }))}>
                    <SelectTrigger className={`h-9 text-xs ${selectTrigger}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${textMuted}`}>
                    {t('compliance.requirementsEvidences.requirementModal.fields.criticality')}
                  </label>
                  <Input type="number" min={1} max={5} value={reqForm.review_frequency} onChange={(e) => setReqForm(f => ({ ...f, review_frequency: e.target.value }))} className={`h-9 text-xs ${inputCls}`} />
                </div>
                <div>
                  <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${textMuted}`}>
                    {t('compliance.requirementsEvidences.requirementModal.fields.nextDue')}
                  </label>
                  <Input type="date" value={reqForm.next_review_date} onChange={(e) => setReqForm(f => ({ ...f, next_review_date: e.target.value }))} className={`h-9 text-xs ${inputCls}`} />
                </div>
              </div>
              <div>
                <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${textMuted}`}>
                  {t('compliance.requirementsEvidences.requirementModal.fields.notes')}
                </label>
                <textarea rows={3} value={reqForm.requirement_description} onChange={(e) => setReqForm(f => ({ ...f, requirement_description: e.target.value }))} placeholder={t('compliance.requirementsEvidences.requirementModal.fields.notesPlaceholder')} className={`w-full rounded-md border px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-violet-500/40 ${inputCls}`} />
              </div>
            </div>
            <div className={`flex justify-end gap-2 px-6 py-4 border-t ${borderMuted}`}>
              <Button variant="outline" size="sm" onClick={() => setReqModalOpen(false)} className={`h-8 text-xs ${isDark ? 'border-white/8 hover:bg-white/5 text-gray-300' : ''}`}>
                {t('compliance.requirementsEvidences.requirementModal.cancel')}
              </Button>
              <Button size="sm" onClick={handleSaveReq} disabled={saving || !reqForm.requirement_code.trim() || !reqForm.requirement_title.trim()} className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white">
                {saving
                  ? t('compliance.requirementsEvidences.requirementModal.saving')
                  : reqForm.requirement_id
                    ? t('compliance.requirementsEvidences.requirementModal.update')
                    : t('compliance.requirementsEvidences.requirementModal.create')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={`w-full max-w-sm rounded-xl border ${isDark ? 'bg-[#0f1320] border-white/8' : 'bg-white border-gray-200'}`}>
            <div className="px-6 py-5">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <AlertTriangle size={18} className="text-red-400" />
              </div>
              <h3 className={`text-sm font-semibold mb-1 ${textPrimary}`}>
                {t('compliance.requirementsEvidences.deleteModal.title')}
              </h3>
              <p className={`text-xs ${textMuted}`}>
                {t('compliance.requirementsEvidences.deleteModal.message')}
              </p>
            </div>
            <div className={`flex justify-end gap-2 px-6 py-4 border-t ${borderMuted}`}>
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} className={`h-8 text-xs ${isDark ? 'border-white/8 hover:bg-white/5 text-gray-300' : ''}`}>
                {t('compliance.requirementsEvidences.deleteModal.cancel')}
              </Button>
              <Button size="sm" onClick={handleDeleteReq} className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white">
                {t('compliance.requirementsEvidences.deleteModal.confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {statusTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={`w-full max-w-sm rounded-xl border ${isDark ? 'bg-[#0f1320] border-white/8' : 'bg-white border-gray-200'}`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${borderMuted}`}>
              <h2 className={`text-sm font-semibold ${textPrimary}`}>
                {t('compliance.requirementsEvidences.statusModal.title')}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setStatusTarget(null)} className={`h-7 w-7 ${isDark ? 'text-gray-400 hover:bg-white/8' : ''}`}><X size={15} /></Button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className={`text-xs ${textMuted}`}>
                {t('compliance.requirementsEvidences.statusModal.fields.requirement')}:{' '}
                <span className={`font-semibold ${textPrimary}`}>{statusTarget.requirement_code}</span>
              </p>
              <div>
                <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${textMuted}`}>
                  {t('compliance.requirementsEvidences.statusModal.fields.newStatus')}
                </label>
                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as ComplianceStatus)}>
                  <SelectTrigger className={`h-9 text-xs ${selectTrigger}`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${textMuted}`}>
                  {t('compliance.requirementsEvidences.statusModal.fields.comment')}
                </label>
                <textarea rows={3} value={statusComment} onChange={(e) => setStatusComment(e.target.value)} placeholder={t('compliance.requirementsEvidences.statusModal.fields.commentPlaceholder')} className={`w-full rounded-md border px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-violet-500/40 ${inputCls}`} />
              </div>
            </div>
            <div className={`flex justify-end gap-2 px-6 py-4 border-t ${borderMuted}`}>
              <Button variant="outline" size="sm" onClick={() => setStatusTarget(null)} className={`h-8 text-xs ${isDark ? 'border-white/8 hover:bg-white/5 text-gray-300' : ''}`}>
                {t('compliance.requirementsEvidences.statusModal.cancel')}
              </Button>
              <Button size="sm" onClick={handleStatusChange} disabled={statusSaving} className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white">
                {statusSaving
                  ? t('compliance.requirementsEvidences.statusModal.applying')
                  : t('compliance.requirementsEvidences.statusModal.apply')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {eviTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={`w-full max-w-xl rounded-xl border shadow-2xl ${isDark ? 'bg-[#0f1320] border-white/8' : 'bg-white border-gray-200'}`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${borderMuted}`}>
              <div>
                <h2 className={`text-sm font-semibold ${textPrimary}`}>
                  {t('compliance.requirementsEvidences.evidencePanel.title')}
                </h2>
                <p className={`text-[11px] mt-0.5 ${textMuted}`}>{eviTarget.requirement_code} — {eviTarget.requirement_title}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEviTarget(null)} className={`h-7 w-7 ${isDark ? 'text-gray-400 hover:bg-white/8' : ''}`}><X size={15} /></Button>
            </div>

            <div className="px-6 py-4 max-h-72 overflow-y-auto space-y-2">
              {eviLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={`h-14 rounded-lg animate-pulse ${isDark ? 'bg-white/4' : 'bg-gray-100'}`} />
                ))
              ) : evidences.length === 0 ? (
                <div className={`text-xs text-center py-8 ${textMuted}`}>
                  <FileText size={28} className="mx-auto mb-2 opacity-40" />
                  {t('compliance.requirementsEvidences.evidencePanel.empty')}
                </div>
              ) : (
                evidences.map((ev) => (
                  <div key={ev.evidence_id} className={`flex items-start justify-between gap-3 p-3 rounded-lg border ${isDark ? 'bg-white/3 border-white/6' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isDark ? 'bg-violet-500/10 text-violet-300' : 'bg-violet-50 text-violet-700'}`}>
                          {t(`compliance.requirementsEvidences.evidencePanel.types.${ev.evidence_type}`, { defaultValue: ev.evidence_type })}
                        </span>
                        <span className={`text-xs font-medium truncate ${textPrimary}`}>{ev.evidence_description}</span>
                      </div>
                      {ev.file_path && (
                        <a href={ev.file_path} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-violet-400 hover:underline">
                          <ExternalLink size={11} /> {t('compliance.requirementsEvidences.evidencePanel.viewFile')}
                        </a>
                      )}
                      {ev.notes && <p className={`text-[11px] mt-0.5 ${textMuted}`}>{ev.notes}</p>}
                    </div>
                    <button
                      onClick={() => handleDeleteEvidence(ev.evidence_id)}
                      className={`p-1.5 rounded-md flex-shrink-0 transition-colors ${isDark ? 'text-slate-600 hover:text-red-400 hover:bg-red-500/8' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className={`px-6 py-4 border-t ${borderMuted} space-y-3`}>
              <p className={`text-[11px] font-semibold uppercase tracking-wider ${textMuted}`}>
                {t('compliance.requirementsEvidences.evidencePanel.addTitle')}
              </p>
              <div className="grid grid-cols-4 gap-2">
                <Select value={eviForm.evidence_type} onValueChange={(v) => setEviForm(f => ({ ...f, evidence_type: v as EvidenceType }))}>
                  <SelectTrigger className={`h-8 text-xs ${selectTrigger}`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVIDENCE_TYPE_OPTIONS.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`compliance.requirementsEvidences.evidencePanel.types.${type}`, { defaultValue: type })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={eviForm.evidence_description}
                  onChange={(e) => setEviForm(f => ({ ...f, evidence_description: e.target.value }))}
                  placeholder={`${t('compliance.requirementsEvidences.evidencePanel.fields.description')} *`}
                  className={`col-span-2 h-8 text-xs ${inputCls}`}
                />
                <Input
                  value={eviForm.file_path}
                  onChange={(e) => setEviForm(f => ({ ...f, file_path: e.target.value }))}
                  placeholder={t('compliance.requirementsEvidences.evidencePanel.fields.fileUrlPlaceholder')}
                  className={`h-8 text-xs ${inputCls}`}
                />
              </div>
              <div className="flex gap-2">
                <Input
                  value={eviForm.notes}
                  onChange={(e) => setEviForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder={t('compliance.requirementsEvidences.evidencePanel.fields.notesPlaceholder')}
                  className={`flex-1 h-8 text-xs ${inputCls}`}
                />
                <Button
                  size="sm"
                  onClick={handleAddEvidence}
                  disabled={eviSaving || !eviForm.evidence_description.trim()}
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {eviSaving
                    ? t('compliance.requirementsEvidences.evidencePanel.adding')
                    : t('compliance.requirementsEvidences.evidencePanel.add')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
