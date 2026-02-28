'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTheme } from '@/components/useTheme';
import { CreateLucProcedurePayload, LucProcedure, LucProcedureStatus } from '@/config/types/lcuProcedures';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const STATUSES: { value: LucProcedureStatus; label: string }[] = [
  { value: 'EVALUATION', label: 'Evaluation' },
  { value: 'PLANNING', label: 'Planning' },
  { value: 'MISSION', label: 'Mission' },
];

interface EditModalProps {
  open: boolean;
  procedure: LucProcedure | null;
  onClose: () => void;
  onSave: (data: Partial<CreateLucProcedurePayload>) => Promise<void>;
  saving: boolean;
}

type FormState = {
  procedure_code: string;
  procedure_name: string;
  procedure_description: string;
  procedure_status: LucProcedureStatus;
  procedure_version: string;
  procedure_active: 'Y' | 'N';
  procedure_sector: string;
  procedure_steps_raw: string;
};

function buildForm(procedure: LucProcedure | null): FormState {
  return {
    procedure_code: procedure?.procedure_code ?? '',
    procedure_name: procedure?.procedure_name ?? '',
    procedure_description: procedure?.procedure_description ?? '',
    procedure_status: procedure?.procedure_status ?? 'EVALUATION',
    procedure_version: procedure?.procedure_version ?? '1.0',
    procedure_active: procedure?.procedure_active ?? 'Y',
    procedure_sector: procedure?.procedure_sector ?? '',
    procedure_steps_raw: procedure?.procedure_steps
      ? JSON.stringify(procedure.procedure_steps, null, 2)
      : '',
  };
}

export function LcuEditModal({ open, procedure, onClose, onSave, saving }: EditModalProps) {
  const { isDark } = useTheme();
  const [form, setForm] = useState<FormState>(() => buildForm(procedure));

  useEffect(() => { setForm(buildForm(procedure)); }, [procedure]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let procedure_steps;
    if (form.procedure_steps_raw.trim()) {
      try {
        procedure_steps = JSON.parse(form.procedure_steps_raw);
      } catch {
        toast.error('Invalid JSON for procedure steps');
        return;
      }
    }
    onSave({
      procedure_code: form.procedure_code,
      procedure_name: form.procedure_name,
      procedure_description: form.procedure_description || undefined,
      procedure_status: form.procedure_status,
      procedure_version: form.procedure_version || '1.0',
      procedure_active: form.procedure_active,
      procedure_sector: form.procedure_sector || undefined,
      ...(procedure_steps ? { procedure_steps } : {}),
    });
  };

  const inputCls = isDark
    ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-500 focus:border-violet-500/60 focus:ring-violet-500/15'
    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-violet-500/60';

  const selectTriggerCls = isDark
    ? 'bg-slate-700 border-slate-600 text-slate-200'
    : 'bg-gray-50 border-gray-200 text-gray-700';

  const selectContentCls = isDark
    ? 'bg-slate-800 border-slate-700 text-slate-200'
    : '';

  const labelCls = `text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className={`max-w-2xl gap-0 p-0 overflow-hidden
        ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>

        <DialogHeader className={`px-6 py-4 border-b space-y-0.5
          ${isDark ? 'bg-slate-800 border-slate-700/60' : 'bg-slate-50 border-slate-100'}`}>
          <DialogTitle className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {procedure ? 'Edit Procedure' : 'New Procedure'}
          </DialogTitle>
          {procedure && (
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              ID #{procedure.procedure_id}
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className={labelCls}>Code <span className="text-red-500">*</span></Label>
                <Input required placeholder="e.g. LUC-001"
                  value={form.procedure_code}
                  onChange={e => set('procedure_code', e.target.value)}
                  className={`h-9 text-sm ${inputCls}`} />
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls}>Status <span className="text-red-500">*</span></Label>
                <Select value={form.procedure_status}
                  onValueChange={val => set('procedure_status', val as LucProcedureStatus)}>
                  <SelectTrigger className={`h-9 text-sm ${selectTriggerCls}`}>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className={labelCls}>Name <span className="text-red-500">*</span></Label>
              <Input required placeholder="Procedure name"
                value={form.procedure_name}
                onChange={e => set('procedure_name', e.target.value)}
                className={`h-9 text-sm ${inputCls}`} />
            </div>

            <div className="space-y-1.5">
              <Label className={labelCls}>Description</Label>
              <Textarea placeholder="Brief description of this procedure" rows={2}
                value={form.procedure_description}
                onChange={e => set('procedure_description', e.target.value)}
                className={`text-sm resize-none ${inputCls}`} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className={labelCls}>Version</Label>
                <Input placeholder="1.0"
                  value={form.procedure_version}
                  onChange={e => set('procedure_version', e.target.value)}
                  className={`h-9 text-sm ${inputCls}`} />
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls}>Active</Label>
                <Select value={form.procedure_active}
                  onValueChange={val => set('procedure_active', val as 'Y' | 'N')}>
                  <SelectTrigger className={`h-9 text-sm ${selectTriggerCls}`}><SelectValue /></SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    <SelectItem value="Y">Yes</SelectItem>
                    <SelectItem value="N">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls}>Sector</Label>
                <Input placeholder="e.g. SOLAR"
                  value={form.procedure_sector}
                  onChange={e => set('procedure_sector', e.target.value.toUpperCase())}
                  className={`h-9 text-sm uppercase ${inputCls}`} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className={labelCls}>Procedure Steps (JSON)</Label>
              <Textarea rows={7}
                placeholder={'{\n  "tasks": {\n    "checklist": [],\n    "assignment": [],\n    "communication": []\n  }\n}'}
                value={form.procedure_steps_raw}
                onChange={e => set('procedure_steps_raw', e.target.value)}
                className={`text-sm font-mono resize-none
                  ${isDark
                    ? 'bg-slate-900/60 border-slate-600 text-slate-300 placeholder:text-slate-600'
                    : 'bg-slate-50 border-gray-200 text-gray-800'
                  }`} />
            </div>
          </div>

          <DialogFooter className={`px-6 py-4 border-t
            ${isDark ? 'bg-slate-800 border-slate-700/60' : 'bg-slate-50 border-slate-100'}`}>
            <Button type="button" variant="outline" onClick={onClose}
              className={`h-9 text-sm cursor-pointer
                ${isDark
                  ? 'border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-slate-100'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}
              className="h-9 text-sm gap-2 bg-violet-600 hover:bg-violet-500 text-white cursor-pointer">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {saving ? 'Saving…' : 'Save Procedure'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


interface DeleteDialogProps {
  open: boolean;
  procedure: LucProcedure | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function LcuDeleteDialog({ open, procedure, onClose, onConfirm }: DeleteDialogProps) {
  const { isDark } = useTheme();

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className={`max-w-sm
        ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
              ${isDark ? 'bg-red-500/15' : 'bg-red-100'}`}>
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <DialogTitle className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Delete Procedure
              </DialogTitle>
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                This action cannot be undone
              </p>
            </div>
          </div>
        </DialogHeader>

        <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Are you sure you want to delete{' '}
          <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
            {procedure?.procedure_code}
          </span>?
        </p>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}
            className={`h-9 text-sm
              ${isDark
                ? 'border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-slate-100'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} className="h-9 text-sm">
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}