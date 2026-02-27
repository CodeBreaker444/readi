'use client';

import type { DocType, RepositoryDocument } from '@/config/types/repository';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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
import { toast } from 'sonner';
import { useTheme } from '../useTheme';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  docTypes: DocType[];
  document?: RepositoryDocument | null;
}

const STATUS_OPTIONS = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'OBSOLETE'];
const CONFIDENTIALITY_OPTIONS = ['INTERNAL', 'PUBLIC', 'CONFIDENTIAL', 'RESTRICTED'];

export default function DocumentFormModal({ open, onClose, onSaved, docTypes, document }: Props) {
  const { isDark } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

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

  const isEdit = !!document;

  useEffect(() => {
    if (document) {
      setDocTypeId(String(document.doc_type_id));
      setDocCode(document.doc_code ?? '');
      setStatus(document.status);
      setTitle(document.title);
      setConfidentiality(document.confidentiality);
      setOwnerRole(document.owner_role ?? '');
      setEffectiveDate(document.effective_date?.slice(0, 10) ?? '');
      setExpiryDate(document.expiry_date?.slice(0, 10) ?? '');
      setDescription(document.description ?? '');
      setKeywords(document.keywords ?? '');
      setTags(document.tags ?? '');
      setVersionLabel('');
      setChangeLog('');
    } else {
      setDocTypeId(''); setDocCode(''); setStatus('DRAFT'); setTitle('');
      setConfidentiality('INTERNAL'); setOwnerRole(''); setEffectiveDate('');
      setExpiryDate(''); setDescription(''); setKeywords(''); setTags('');
      setVersionLabel(''); setChangeLog('');
    }
    if (fileRef.current) fileRef.current.value = '';
  }, [document, open]);

  async function handleSave() {
    setSaving(true);
    try {
      if (!isEdit) {
        const fd = new FormData();
        fd.append('doc_type_id', docTypeId);
        if (docCode)       fd.append('doc_code', docCode);
        fd.append('status', status);
        fd.append('title', title);
        fd.append('confidentiality', confidentiality);
        if (ownerRole)     fd.append('owner_role', ownerRole);
        if (effectiveDate) fd.append('effective_date', effectiveDate);
        if (expiryDate)    fd.append('expiry_date', expiryDate);
        if (description)   fd.append('description', description);
        if (keywords)      fd.append('keywords', keywords);
        if (tags)          fd.append('tags', tags);
        if (versionLabel)  fd.append('version_label', versionLabel);
        if (changeLog)     fd.append('change_log', changeLog);

        const file = fileRef.current?.files?.[0];
        if (!file) { toast.error('Please select a file'); setSaving(false); return; }
        fd.append('file', file);
        await axios.post(`/api/document/create`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        const file = fileRef.current?.files?.[0];
        if (file) {
          const fd = new FormData();
          fd.append('document_id', String(document!.document_id));
          fd.append('file', file);
          if (versionLabel) fd.append('version_label', versionLabel);
          if (changeLog)    fd.append('change_log', changeLog);
          await axios.post(`/api/document/upload_revision`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        }
        await axios.post(`/api/document/update`, {
          document_id:     document!.document_id,
          doc_type_id:     Number(docTypeId),
          doc_code:        docCode || null,
          status:          status as never,
          title,
          confidentiality: confidentiality as never,
          owner_role:      ownerRole || null,
          effective_date:  effectiveDate || null,
          expiry_date:     expiryDate || null,
          description:     description || null,
          keywords:        keywords || null,
          tags:            tags || null,
        });
      }
      onSaved();
      toast.success('Document saved successfully');
      onClose();
    } catch {
      toast.error('Error while saving');
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
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className={`w-[95vw] sm:max-w-2xl max-h-[95vh] flex flex-col p-0 overflow-hidden rounded-xl
        ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>

        <DialogHeader className={`px-6 py-4 border-b ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
          <DialogTitle className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {isEdit ? 'Edit Document' : 'New Document'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            <div className="space-y-1.5">
              <Label className={labelCls}>Type <span className="text-red-500">*</span></Label>
              <Select value={docTypeId} onValueChange={setDocTypeId}>
                <SelectTrigger className={`text-sm ${selectTriggerCls}`}>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent className={selectContentCls}>
                  {docTypes.map((t) => (
                    <SelectItem key={t.doc_type_id} value={String(t.doc_type_id)}>
                      {t.doc_area ? `[${t.doc_area}] ` : ''}{t.doc_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className={labelCls}>Code</Label>
              <Input value={docCode} onChange={(e) => setDocCode(e.target.value)}
                placeholder="e.g. DOC-001" className={`text-sm ${inputCls}`} />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label className={labelCls}>Title <span className="text-red-500">*</span></Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)}
                required className={`text-sm ${inputCls}`} />
            </div>

            <div className="space-y-1.5">
              <Label className={labelCls}>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className={`text-sm ${selectTriggerCls}`}><SelectValue /></SelectTrigger>
                <SelectContent className={selectContentCls}>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className={labelCls}>Confidentiality</Label>
              <Select value={confidentiality} onValueChange={setConfidentiality}>
                <SelectTrigger className={`text-sm ${selectTriggerCls}`}><SelectValue /></SelectTrigger>
                <SelectContent className={selectContentCls}>
                  {CONFIDENTIALITY_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className={labelCls}>Owner (Role)</Label>
              <Input value={ownerRole} onChange={(e) => setOwnerRole(e.target.value)}
                placeholder="e.g. Compliance Manager" className={`text-sm ${inputCls}`} />
            </div>

            <div className="space-y-1.5">
              <Label className={labelCls}>Effective Date</Label>
              <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)}
                className={`text-sm ${inputCls}`} />
            </div>

            <div className="space-y-1.5">
              <Label className={labelCls}>Expiry Date</Label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)}
                className={`text-sm ${inputCls}`} />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label className={labelCls}>Description</Label>
              <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
                className={`text-sm resize-none ${inputCls}`} />
            </div>

            <div className="space-y-1.5">
              <Label className={labelCls}>Keywords</Label>
              <Input value={keywords} onChange={(e) => setKeywords(e.target.value)}
                placeholder="safety, sms, training" className={`text-sm ${inputCls}`} />
            </div>

            <div className="space-y-1.5">
              <Label className={labelCls}>Tags (JSON)</Label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)}
                placeholder='["sms","training"]' className={`font-mono text-xs ${inputCls}`} />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label className={labelCls}>
                {isEdit ? 'New Revision (Optional — uploaded to S3)' : 'File'}{' '}
                {!isEdit && <span className="text-red-500">*</span>}
              </Label>
              <Input ref={fileRef} type="file" required={!isEdit}
                className={`cursor-pointer text-sm ${inputCls}`} />
              <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                Max size: 20 MB · Formats: PDF, DOCX, XLSX, JPG, PNG, TXT
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className={labelCls}>Version</Label>
              <Input value={versionLabel} onChange={(e) => setVersionLabel(e.target.value)}
                placeholder="v1.0" className={`text-sm ${inputCls}`} />
            </div>

            <div className="space-y-1.5">
              <Label className={labelCls}>Change Log</Label>
              <Input value={changeLog} onChange={(e) => setChangeLog(e.target.value)}
                placeholder="What's new in this version" className={`text-sm ${inputCls}`} />
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
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-violet-600 hover:bg-violet-500 text-white"
          >
            {saving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
            ) : 'Save'}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}