'use client';

import type { DocType, RepositoryDocument } from '@/config/types/repository';
import { Loader2, Settings2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import axios from 'axios';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '../useTheme';
import { ManageDocTypesModal } from './ManageDocTypesModal';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  docTypes: DocType[];
  onTypesReload: () => void;
  document?: RepositoryDocument | null;
}

const STATUS_OPTIONS = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'OBSOLETE'];
const CONFIDENTIALITY_OPTIONS = ['INTERNAL', 'PUBLIC', 'CONFIDENTIAL', 'RESTRICTED'];
const OWNER_ROLE_OPTIONS = [
  'Pilot in Command',
  'Operation Manager',
  'Safety Manager',
  'Accountable Manager',
  'Compliance Monitoring Manager',
  'Maintenance Manager',
  'Training Manager',
  'Data Controller',
  'SLA Manager',
  'Administrator',
];

interface ComponentOption { tool_component_id: number; component_code: string | null; component_name: string | null; component_type: string; fk_tool_id?: number | null; component_status?: string | null }
interface SystemOption { tool_id: number; tool_code: string; tool_desc?: string | null; tool_status?: string | null }

const STATUS_COLORS: Record<string, string> = {
  OPERATIONAL: 'bg-green-100 text-green-700',
  MAINTENANCE: 'bg-yellow-100 text-yellow-700',
  NOT_OPERATIONAL: 'bg-red-100 text-red-700',
  DECOMMISSIONED: 'bg-gray-100 text-gray-500',
};

function SystemOptionLabel({ tool, isDark }: { tool: SystemOption; isDark: boolean }) {
  const statusClass = STATUS_COLORS[tool.tool_status ?? ''] || (isDark ? 'bg-slate-600 text-slate-300' : 'bg-gray-100 text-gray-600');
  const mutedCls = isDark ? 'text-slate-400' : 'text-muted-foreground';
  const textCls = isDark ? 'text-slate-200' : '';
  return (
    <div className="flex flex-col gap-0.5 leading-tight">
      <div className="flex gap-2">
        <span className={`w-20 shrink-0 text-[10px] font-semibold uppercase ${mutedCls}`}>Code</span>
        <span className={`truncate text-[11px] font-medium ${textCls}`}>{tool.tool_code}</span>
      </div>
      <div className="flex gap-2">
        <span className={`w-20 shrink-0 text-[10px] font-semibold uppercase ${mutedCls}`}>Description</span>
        <span className={`truncate text-[11px] ${textCls}`}>{tool.tool_desc || '—'}</span>
      </div>
      <div className="flex gap-2 items-center">
        <span className={`w-20 shrink-0 text-[10px] font-semibold uppercase ${mutedCls}`}>Status</span>
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusClass}`}>{tool.tool_status || '—'}</span>
      </div>
    </div>
  );
}

export default function DocumentFormModal({ open, onClose, onSaved, docTypes, onTypesReload, document }: Props) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [manageTypesOpen, setManageTypesOpen] = useState(false);

  const [docTypeId, setDocTypeId] = useState('');
  const [docCode, setDocCode] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [title, setTitle] = useState('');
  const [confidentiality, setConfidentiality] = useState('INTERNAL');
  const [ownerRole, setOwnerRole] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [description, setDescription] = useState('');
  const [keywords, setKeywords] = useState('');
  const [tags, setTags] = useState('');
  const [versionLabel, setVersionLabel] = useState('');
  const [changeLog, setChangeLog] = useState('');
  const [fkComponentId, setFkComponentId] = useState('__none__');
  const [components, setComponents] = useState<ComponentOption[]>([]);
  const [systems, setSystems] = useState<SystemOption[]>([]);
  const [filterSystem, setFilterSystem] = useState('__all__');
  const [systemSearch, setSystemSearch] = useState('');
  const [componentsLoading, setComponentsLoading] = useState(false);

  const isEdit = !!document;

  useEffect(() => {
    if (!open) return;
    setComponentsLoading(true);
    setFilterSystem('__all__');
    Promise.all([
      fetch('/api/system/component/list', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
        .then(r => r.json()),
      fetch('/api/system/list', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: 'ALL', status: 'ALL' }) })
        .then(r => r.json()),
    ])
      .then(([compData, sysData]) => {
        if (compData.code === 1) setComponents(compData.data ?? []);
        if (sysData.code === 1) setSystems((sysData.data ?? []).map((s: any) => ({ tool_id: s.tool_id, tool_code: s.tool_code, tool_desc: s.tool_desc ?? null, tool_status: s.tool_status ?? null })));
      })
      .catch(() => {})
      .finally(() => setComponentsLoading(false));
  }, [open]);

  const filteredComponents = filterSystem === '__all__'
    ? components
    : components.filter(c => c.fk_tool_id != null && String(c.fk_tool_id) === filterSystem);

  useEffect(() => {
    if (document) {
      setDocTypeId(String(document.doc_type_id));
      setDocCode(document.doc_code ?? '');
      setStatus(document.status);
      setTitle(document.title);
      setConfidentiality(document.confidentiality);
      setOwnerRole(document.owner_role || '__none__');
      setEffectiveDate(document.effective_date?.slice(0, 10) ?? '');
      setExpiryDate(document.expiry_date?.slice(0, 10) ?? '');
      setDescription(document.description ?? '');
      setKeywords(document.keywords ?? '');
      setTags(document.tags ?? '');
      setVersionLabel(document.version_label ?? '');
      setChangeLog(document.change_log ?? '');
      setFkComponentId(document.fk_component_id ? String(document.fk_component_id) : '__none__');
    } else {
      setDocTypeId(''); setDocCode(''); setStatus('DRAFT'); setTitle('');
      setConfidentiality('INTERNAL'); setOwnerRole('__none__'); setEffectiveDate('');
      setExpiryDate(''); setDescription(''); setKeywords(''); setTags('');
      setVersionLabel(''); setChangeLog(''); setFkComponentId('__none__');
    }
    if (fileRef.current) fileRef.current.value = '';
  }, [document, open]);

  const MAX_FILE_SIZE = 25 * 1024 * 1024;

  async function uploadToS3(file: File): Promise<{ s3_key: string }> {
    const { data: presign } = await axios.post('/api/document/presign-upload', {
      file_name:     file.name,
      content_type: file.type,
      file_size:     file.size,
    });
    if (!presign?.upload_url) throw new Error('Failed to get upload URL');
    await axios.put(presign.upload_url, file, {
      headers: { 'Content-Type': file.type },
    });
    return { s3_key: presign.s3_key };
  }

  async function handleSave() {
    if (!docTypeId) { toast.error(t('repository.form.errorType')); return; }
    if (!title.trim()) { toast.error(t('repository.form.errorTitle')); return; }
    if (effectiveDate && expiryDate && expiryDate < effectiveDate) {
      toast.error(t('repository.form.errorDates')); return;
    }
    setSaving(true);
    try {
      if (!isEdit) {
        const file = fileRef.current?.files?.[0];
        if (!file) { toast.error(t('repository.form.errorFile')); setSaving(false); return; }
        if (file.size > MAX_FILE_SIZE) {
          toast.error(t('repository.form.errorFileSize'), { duration: 6000 });
          setSaving(false);
          return;
        }

        const { s3_key } = await uploadToS3(file);

        await axios.post('/api/document/create', {
          doc_type_id:     Number(docTypeId),
          s3_key,
          file_name:       file.name,
          file_size:       file.size,
          doc_code:         docCode || undefined,
          status,
          title,
          confidentiality,
          owner_role:       ownerRole === '__none__' ? undefined : ownerRole || undefined,
          effective_date:   effectiveDate || undefined,
          expiry_date:     expiryDate || undefined,
          description:     description || undefined,
          keywords:         keywords || undefined,
          tags:             tags || undefined,
          version_label:   versionLabel || undefined,
          change_log:       changeLog || undefined,
          fk_component_id:  fkComponentId !== '__none__' ? Number(fkComponentId) : undefined,
        });
      } else {
        const file = fileRef.current?.files?.[0];
        if (file) {
          if (file.size > MAX_FILE_SIZE) {
            toast.error(t('repository.form.errorFileSize'), { duration: 6000 });
            setSaving(false);
            return;
          }
          const { s3_key } = await uploadToS3(file);
          await axios.post('/api/document/upload-revision', {
            document_id:   document!.document_id,
            s3_key,
            file_name:     file.name,
            file_size:     file.size,
            version_label: versionLabel || undefined,
            change_log:     changeLog || undefined,
          });
        }
        await axios.post('/api/document/update', {
          document_id:     document!.document_id,
          doc_type_id:     Number(docTypeId),
          doc_code:         docCode || null,
          status:           status as never,
          title,
          confidentiality: confidentiality as never,
          owner_role:       ownerRole === '__none__' ? null : ownerRole || null,
          effective_date:   effectiveDate || null,
          expiry_date:     expiryDate || null,
          description:     description || null,
          keywords:         keywords || null,
          tags:             tags || null,
          fk_component_id:  fkComponentId !== '__none__' ? Number(fkComponentId) : null,
        });
      }
      onSaved();
      toast.success(t('repository.form.saveSuccess'));
      onClose();
    } catch (err: any) {
      const serverMsg: string | undefined = err?.response?.data?.error;
      toast.error(serverMsg || t('repository.form.saveError'));
    } finally {
      setSaving(false);
    }
  }

  const inputCls = isDark
    ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-500 focus:border-violet-500/60 focus:ring-violet-500/15'
    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-violet-500/60 focus:ring-violet-500/15'

  const selectTriggerCls = isDark
    ? 'bg-slate-700 border-slate-600 text-slate-200'
    : 'bg-gray-50 border-gray-200 text-gray-700'

  const selectContentCls = isDark
    ? 'bg-slate-800 border-slate-700 text-slate-200'
    : ''

  const labelCls = `text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`

  return (
    <>
      <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
        <DialogContent className={`w-[95vw] sm:max-w-2xl max-h-[95vh] flex flex-col p-0 overflow-hidden rounded-xl
          ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>

          <DialogHeader className={`px-6 py-4 border-b ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
            <DialogTitle className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {isEdit ? t('repository.form.editTitle') : t('repository.form.newTitle')}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label className={labelCls}>{t('repository.columns.type')} <span className="text-red-500">*</span></Label>
                  <button
                    type="button"
                    onClick={() => setManageTypesOpen(true)}
                    title={t('repository.form.manageTypes')}
                    className={`flex items-center gap-1 text-[10px] font-medium transition-colors ${isDark ? 'text-slate-500 hover:text-violet-400' : 'text-slate-400 hover:text-violet-600'}`}
                  >
                    <Settings2 className="h-3 w-3" /> {t('repository.form.manage')}
                  </button>
                </div>
                <Select value={docTypeId} onValueChange={setDocTypeId}>
                  <SelectTrigger className={`text-sm ${selectTriggerCls}`}>
                    <SelectValue placeholder={t('repository.form.selectType')} />
                  </SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    {docTypes.map((t) => (
                      <SelectItem key={t.doc_type_id} value={String(t.doc_type_id)}>
                        {t.doc_area ? `[${t.doc_area}] ` : ''}{t.doc_type_name ?? t.doc_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className={labelCls}>{t('repository.columns.code')}</Label>
                <Input value={docCode} onChange={(e) => setDocCode(e.target.value)}
                  placeholder="e.g. DOC-001" className={`text-sm ${inputCls}`} />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label className={labelCls}>{t('repository.columns.title')} <span className="text-red-500">*</span></Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)}
                  required className={`text-sm ${inputCls}`} />
              </div>

              <div className="space-y-1.5">
                <Label className={labelCls}>{t('repository.columns.status')}</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className={`text-sm ${selectTriggerCls}`}><SelectValue /></SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className={labelCls}>{t('repository.form.confidentiality')}</Label>
                <Select value={confidentiality} onValueChange={setConfidentiality}>
                  <SelectTrigger className={`text-sm ${selectTriggerCls}`}><SelectValue /></SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    {CONFIDENTIALITY_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className={labelCls}>{t('repository.form.ownerRole')}</Label>
                <Select value={ownerRole} onValueChange={setOwnerRole}>
                  <SelectTrigger className={`text-sm ${selectTriggerCls}`}>
                    <SelectValue placeholder={t('repository.form.selectRole')} />
                  </SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    <SelectItem value="__none__">— {t('repository.form.none')} —</SelectItem>
                    {OWNER_ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label className={labelCls}>{t('repository.form.component')} <span className={`font-normal ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{t('repository.form.componentOptional')}</span></Label>
                <div className="flex gap-2">
                  <Select
                    value={filterSystem}
                    onValueChange={(v) => { setFilterSystem(v); setFkComponentId('__none__'); setSystemSearch(''); }}
                    disabled={componentsLoading}
                  >
                    <SelectTrigger className={`text-sm w-52 shrink-0 ${selectTriggerCls}`}>
                      <SelectValue placeholder={t('repository.form.filterBySystem')}>
                        {filterSystem === '__all__'
                          ? <span>{t('repository.form.allSystems')}</span>
                          : (() => { const s = systems.find(x => String(x.tool_id) === filterSystem); return s ? <span className="block truncate text-left">{s.tool_code}</span> : null; })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className={`${selectContentCls} z-50 max-h-80 overflow-hidden p-0`}>
                      <div className={`p-2 pb-1 border-b ${isDark ? 'border-slate-700' : ''}`}>
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <input
                            className={`w-full h-7 rounded-sm border pl-7 pr-2 text-xs outline-none focus:ring-1 focus:ring-violet-500/30 ${isDark ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-500' : 'bg-background'}`}
                            placeholder="Search system..."
                            value={systemSearch}
                            onChange={e => setSystemSearch(e.target.value)}
                            onKeyDown={e => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <div className="overflow-y-auto max-h-60">
                        <SelectItem value="__all__">{t('repository.form.allSystems')}</SelectItem>
                        {systems
                          .filter(s => {
                            if (!systemSearch) return true;
                            const q = systemSearch.toLowerCase();
                            return s.tool_code?.toLowerCase().includes(q) || s.tool_desc?.toLowerCase().includes(q);
                          })
                          .map(s => (
                            <SelectItem key={s.tool_id} value={String(s.tool_id)}>
                              <SystemOptionLabel tool={s} isDark={isDark} />
                            </SelectItem>
                          ))}
                      </div>
                    </SelectContent>
                  </Select>
                  <Select value={fkComponentId} onValueChange={setFkComponentId} disabled={componentsLoading}>
                    <SelectTrigger className={`text-sm flex-1 ${selectTriggerCls}`}>
                      <SelectValue placeholder={componentsLoading ? t('systems.components.common.loading') : t('repository.form.componentNone')}>
                        {fkComponentId !== '__none__' && (() => {
                          const c = filteredComponents.find(x => String(x.tool_component_id) === fkComponentId);
                          if (!c) return null;
                          const statusClass = STATUS_COLORS[c.component_status ?? ''] || (isDark ? 'bg-slate-600 text-slate-300' : 'bg-gray-100 text-gray-600');
                          return (
                            <span className="flex items-center gap-1.5 truncate">
                              <span className="truncate">{c.component_code || c.component_name || `#${c.tool_component_id}`}</span>
                              <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${statusClass}`}>{c.component_status}</span>
                            </span>
                          );
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className={selectContentCls}>
                      <SelectItem value="__none__"><span className={`italic ${isDark ? 'text-slate-400' : 'text-muted-foreground'}`}>{t('repository.form.none')}</span></SelectItem>
                      {filteredComponents.map(c => {
                        const statusClass = STATUS_COLORS[c.component_status ?? ''] || (isDark ? 'bg-slate-600 text-slate-300' : 'bg-gray-100 text-gray-600');
                        const mutedCls = isDark ? 'text-slate-400' : 'text-muted-foreground';
                        return (
                          <SelectItem key={c.tool_component_id} value={String(c.tool_component_id)}>
                            <div className="flex flex-col gap-0.5 leading-tight">
                              <div className="flex gap-2">
                                <span className={`w-16 shrink-0 text-[10px] font-semibold uppercase ${mutedCls}`}>Name</span>
                                <span className={`truncate text-[11px] font-medium ${isDark ? 'text-slate-200' : ''}`}>{c.component_code || c.component_name || `#${c.tool_component_id}`}</span>
                              </div>
                              <div className="flex gap-2">
                                <span className={`w-16 shrink-0 text-[10px] font-semibold uppercase ${mutedCls}`}>Type</span>
                                <span className={`truncate text-[11px] ${isDark ? 'text-slate-300' : ''}`}>{c.component_type}</span>
                              </div>
                              <div className="flex gap-2 items-center">
                                <span className={`w-16 shrink-0 text-[10px] font-semibold uppercase ${mutedCls}`}>Status</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusClass}`}>{c.component_status || '—'}</span>
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className={labelCls}>{t('repository.columns.effectiveDate')}</Label>
                <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)}
                  className={`text-sm ${inputCls}`} />
              </div>

              <div className="space-y-1.5">
                <Label className={labelCls}>{t('repository.columns.expiryDate')}</Label>
                <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)}
                  className={`text-sm ${inputCls}`} />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label className={labelCls}>{t('repository.form.description')}</Label>
                <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
                  className={`text-sm resize-none ${inputCls}`} />
              </div>

              <div className="space-y-1.5">
                <Label className={labelCls}>{t('repository.form.keywords')}</Label>
                <Input value={keywords} onChange={(e) => setKeywords(e.target.value)}
                  placeholder="safety, sms, training" className={`text-sm ${inputCls}`} />
              </div>

              <div className="space-y-1.5">
                <Label className={labelCls}>{t('repository.form.tags')}</Label>
                <Input value={tags} onChange={(e) => setTags(e.target.value)}
                  placeholder='["sms","training"]' className={`font-mono text-xs ${inputCls}`} />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label className={labelCls}>
                  {isEdit ? t('repository.form.newRevision') : t('repository.columns.fileName')}{' '}
                  {!isEdit && <span className="text-red-500">*</span>}
                </Label>
                <Input ref={fileRef} type="file" required={!isEdit}
                  className={`cursor-pointer text-sm ${inputCls}`} />
                <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  {t('repository.form.maxSize')}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className={labelCls}>{t('repository.columns.version')}</Label>
                <Input value={versionLabel} onChange={(e) => setVersionLabel(e.target.value)}
                  placeholder="v1.0" className={`text-sm ${inputCls}`} />
              </div>

              <div className="space-y-1.5">
                <Label className={labelCls}>{t('repository.form.changeLog')}</Label>
                <Input value={changeLog} onChange={(e) => setChangeLog(e.target.value)}
                  placeholder={t('repository.form.changeLogPlaceholder')} className={`text-sm ${inputCls}`} />
              </div>

            </div>
          </div>

          <DialogFooter className={`px-6 py-4 border-t gap-3 ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className={isDark
                ? 'border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-slate-100'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }
            >
              {t('repository.form.cancel')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-violet-600 hover:bg-violet-500 text-white"
            >
              {saving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('repository.form.saving')}</>
              ) : t('repository.form.save')}
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>

      <ManageDocTypesModal
        open={manageTypesOpen}
        onClose={() => setManageTypesOpen(false)}
        types={docTypes}
        onReload={onTypesReload}
        isDark={isDark}
      />
    </>
  );
}