import { Operation } from "@/app/operations/table/page";
import { PilotOption, ToolOption } from "@/config/types/operation";
import { cn } from "@/lib/utils";
import axios from "axios";
import { FileText, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";

interface OperationFormProps {
  open: boolean;
  onClose: () => void;
  initial?: Operation | null;
  onSaved: (op: Operation) => void;
}

type StatusName = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ABORTED';

interface MissionTypeOption {
  mission_type_id: number;
  type_name: string;
}

interface MissionCategoryOption {
  category_id: number;
  category_name: string;
}

interface OperationForm {
  mission_name: string;
  mission_code?: string;
  mission_description: string;
  location: string;
  notes: string;
  scheduled_start: string;
  status_name: StatusName;
  fk_pilot_user_id: string;
  fk_tool_id: string;
  fk_mission_type_id: string;
  fk_mission_category_id: string;
}

const STEPS = ['Mission Details', 'Schedule', 'Mission Data', 'Pilot', 'Confirm'] as const;
type Step = 0 | 1 | 2 | 3 | 4;

export function OperationDialog({ open, onClose, initial, onSaved }: OperationFormProps) {
  const isEdit = !!initial;
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>(0);

  const [pilots, setPilots] = useState<PilotOption[]>([]);
  const [tools, setTools] = useState<ToolOption[]>([]);
  const [missionTypes, setMissionTypes] = useState<MissionTypeOption[]>([]);
  const [missionCategories, setMissionCategories] = useState<MissionCategoryOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const emptyForm: OperationForm = {
    mission_name: '',
    mission_code: '',
    mission_description: '',
    location: '',
    notes: '',
    scheduled_start: '',
    status_name: 'PLANNED',
    fk_pilot_user_id: '',
    fk_tool_id: '',
    fk_mission_type_id: '',
    fk_mission_category_id: '',
  };

  const [form, setForm] = useState<OperationForm>(emptyForm);

  useEffect(() => {
    if (!open) {
      setStep(0);
      return;
    }
    setLoadingOptions(true);
    axios.get('/api/operation/options')
      .then((res) => {
        setPilots(res.data.pilots ?? []);
        setTools(res.data.tools ?? []);
        setMissionTypes(res.data.types ?? []);
        setMissionCategories(res.data.categories ?? []);
      })
      .catch(() => toast.error('Failed to load form options'))
      .finally(() => setLoadingOptions(false));
  }, [open]);

  useEffect(() => {
    if (initial) {
      setForm({
        mission_name: initial.mission_name ?? '',
        mission_code: initial.mission_code ?? '',
        mission_description: initial.mission_description ?? '',
        location: initial.location ?? '',
        notes: initial.notes ?? '',
        scheduled_start: initial.scheduled_start ?? '',
        status_name: (initial.status_name as StatusName) ?? 'PLANNED',
        fk_pilot_user_id: initial.fk_pilot_user_id?.toString() ?? '',
        fk_tool_id: initial.fk_tool_id?.toString() ?? '',
        fk_mission_type_id: (initial as any).fk_mission_type_id?.toString() ?? '',
        fk_mission_category_id: (initial as any).fk_mission_category_id?.toString() ?? '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [initial, open]);

  function toIsoString(val: string): string | undefined {
    if (!val) return undefined;
    const normalized = val.length === 16 ? `${val}:00.000Z` : val;
    return isNaN(Date.parse(normalized)) ? undefined : normalized;
  }

  function handleSubmit() {
    startTransition(async () => {
      try {
        const payload = {
          mission_name: form.mission_name.trim(),
          mission_code: form.mission_code?.trim() || undefined,
          mission_description: form.mission_description || undefined,
          location: form.location || undefined,
          notes: form.notes || undefined,
          scheduled_start: toIsoString(form.scheduled_start),
          fk_pilot_user_id: form.fk_pilot_user_id ? parseInt(form.fk_pilot_user_id) : undefined,
          fk_tool_id: form.fk_tool_id ? parseInt(form.fk_tool_id) : undefined,
          fk_mission_type_id: form.fk_mission_type_id ? parseInt(form.fk_mission_type_id) : undefined,
          fk_mission_category_id: form.fk_mission_category_id ? parseInt(form.fk_mission_category_id) : undefined,
          status_name: form.status_name,
        };

        let saved: { data: Operation };
        if (isEdit && initial) {
          saved = await axios.put(`/api/operation/${initial.pilot_mission_id}`, payload);
        } else {
          saved = await axios.post('/api/operation', payload);
        }
        onSaved(saved.data);
        toast.success(`Operation ${isEdit ? 'updated' : 'created'} successfully`);
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Something went wrong');
      }
    });
  }

  const selectedPilot = pilots.find((p) => p.user_id.toString() === form.fk_pilot_user_id);
  const selectedTool = tools.find((t) => t.tool_id.toString() === form.fk_tool_id);
  const selectedType = missionTypes.find((t) => t.mission_type_id.toString() === form.fk_mission_type_id);
  const selectedCategory = missionCategories.find((c) => c.category_id.toString() === form.fk_mission_category_id);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-140 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Operation' : 'New Operation'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the operation details below.' : 'Fill in each step to create a new flight operation.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-1 pb-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-1 flex-1">
              <button
                type="button"
                onClick={() => setStep(i as Step)}
                className={cn(
                  'flex-1 rounded-md py-1.5 text-xs font-medium transition-colors',
                  step === i
                    ? 'bg-violet-600 text-white'
                    : i < step
                      ? 'bg-violet-100 text-violet-700'
                      : 'bg-muted text-muted-foreground'
                )}
              >
                {i + 1}. {label}
              </button>
              {i < STEPS.length - 1 && <div className="w-2 h-px bg-border shrink-0" />}
            </div>
          ))}
        </div>

        <div className="py-2 min-h-[260px]">

          {step === 0 && (
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="mission_name">Mission Name <span className="text-red-500">*</span></Label>
                <Input
                  id="mission_name"
                  placeholder="e.g. Survey Flight Alpha"
                  value={form.mission_name}
                  onChange={(e) => setForm((f) => ({ ...f, mission_name: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="mission_code">Mission Code <span className="text-red-500">*</span></Label>
                <Input
                  id="mission_code"
                  placeholder="e.g. SURVEY-001"
                  value={form.mission_code}
                  onChange={(e) => setForm((f) => ({ ...f, mission_code: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="desc">Description</Label>
                <Textarea
                  id="desc"
                  rows={3}
                  placeholder="Describe the mission..."
                  value={form.mission_description}
                  onChange={(e) => setForm((f) => ({ ...f, mission_description: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g. Grid A-7"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  rows={2}
                  placeholder="Additional notes..."
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="scheduled_start">Scheduled Start</Label>
                <Input
                  id="scheduled_start"
                  type="datetime-local"
                  value={form.scheduled_start}
                  onChange={(e) => setForm((f) => ({ ...f, scheduled_start: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status_name}
                  onValueChange={(v) => setForm((f) => ({ ...f, status_name: v as StatusName }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLANNED">Planned</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="ABORTED">Aborted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label>Tool (Drone System)</Label>
                <Select
                  value={form.fk_tool_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, fk_tool_id: v }))}
                  disabled={loadingOptions}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingOptions ? 'Loading…' : 'Select tool'} />
                  </SelectTrigger>
                  <SelectContent>
                    {tools.map((t) => (
                      <SelectItem key={t.tool_id} value={t.tool_id.toString()}>
                        {t.tool_name} ({t.tool_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Mission Category</Label>
                <Select
                  value={form.fk_mission_category_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, fk_mission_category_id: v }))}
                  disabled={loadingOptions}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingOptions ? 'Loading…' : 'Select category'} />
                  </SelectTrigger>
                  <SelectContent>
                    {missionCategories.map((c) => (
                      <SelectItem key={c.category_id} value={c.category_id.toString()}>
                        {c.category_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Mission Type</Label>
                <Select
                  value={form.fk_mission_type_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, fk_mission_type_id: v }))}
                  disabled={loadingOptions}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingOptions ? 'Loading…' : 'Select type'} />
                  </SelectTrigger>
                  <SelectContent>
                    {missionTypes.map((t) => (
                      <SelectItem key={t.mission_type_id} value={t.mission_type_id.toString()}>
                        {t.type_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label>Pilot in Command <span className="text-red-500">*</span></Label>
                <Select
                  value={form.fk_pilot_user_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, fk_pilot_user_id: v }))}
                  disabled={loadingOptions}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingOptions ? 'Loading…' : 'Select pilot'} />
                  </SelectTrigger>
                  <SelectContent>
                    {pilots.map((p) => (
                      <SelectItem key={p.user_id} value={p.user_id.toString()}>
                        {p.first_name} {p.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedPilot && (
                <div className="rounded-md border bg-muted/30 px-4 py-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Selected Pilot</p>
                  <p className="font-medium">{selectedPilot.first_name} {selectedPilot.last_name}</p>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-3">
              <div className="rounded-lg border bg-muted/20 p-4 space-y-2 text-sm">
                <p className="font-semibold text-base mb-3">Mission Summary</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Mission Name</p>
                    <p className="font-medium">{form.mission_name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="font-medium">{form.location || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Scheduled Start</p>
                    <p className="font-medium">{form.scheduled_start ? new Date(form.scheduled_start).toLocaleString() : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pilot in Command</p>
                    <p className="font-medium">
                      {selectedPilot ? `${selectedPilot.first_name} ${selectedPilot.last_name}` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tool (Drone)</p>
                    <p className="font-medium">{selectedTool ? `${selectedTool.tool_name} (${selectedTool.tool_code})` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Mission Type</p>
                    <p className="font-medium">{selectedType?.type_name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Mission Category</p>
                    <p className="font-medium">{selectedCategory?.category_name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="font-medium">{form.status_name}</p>
                  </div>
                </div>
                {form.mission_description && (
                  <div className="pt-1">
                    <p className="text-xs text-muted-foreground">Description</p>
                    <p>{form.mission_description}</p>
                  </div>
                )}
                {form.notes && (
                  <div>
                    <p className="text-xs text-muted-foreground">Notes</p>
                    <p>{form.notes}</p>
                  </div>
                )}
              </div>
              {!form.mission_name.trim() && (
                <p className="text-xs text-destructive">Mission name is required.</p>
              )}
              {!form.fk_pilot_user_id && (
                <p className="text-xs text-destructive">Pilot in Command is required.</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between gap-2 sm:justify-between">
          <Button
            variant="outline"
            onClick={() => step === 0 ? onClose() : setStep((s) => (s - 1) as Step)}
            disabled={isPending}
          >
            {step === 0 ? 'Cancel' : 'Previous'}
          </Button>

          {step < 4 ? (
            <Button
              onClick={() => setStep((s) => (s + 1) as Step)}
              disabled={step === 0 && !form.mission_name.trim()}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isPending || !form.mission_name.trim() || !form.fk_pilot_user_id}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Operation'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function formatBytes(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

interface Attachment {
  attachment_id: number;
  file_name: string;
  file_type?: string;
  file_size?: number;
  s3_url: string;
  uploaded_at?: string;
}

export function AttachmentsDialog({ open, onClose, operationId, operationName }: {
  open: boolean;
  onClose: () => void;
  operationId: number;
  operationName: string;
}) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadAttachments = useCallback(async () => {
    if (!operationId) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/operation/${operationId}/attachment`);
      setAttachments(data);
    } catch (error) {
      console.error("Failed to fetch attachments:", error);
    } finally {
      setLoading(false);
    }
  }, [operationId]);

  useEffect(() => {
    if (open) loadAttachments();
  }, [open, loadAttachments]);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: Attachment[] = [];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(`/api/operation/${operationId}/attachment`, {
          method: 'POST',
          body: fd,
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error ?? 'Upload failed');
        }
        const json = await res.json();
        uploaded.push(json.attachment);
      }
      setAttachments((prev) => [...uploaded, ...prev]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteAttachment(attachmentId: number) {
    try {
      await axios.delete(`/api/operation/${operationId}/attachment/${attachmentId}`);
      setAttachments((prev) => prev.filter((a) => a.attachment_id !== attachmentId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-150">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            Attachments
          </DialogTitle>
          <DialogDescription className="truncate">{operationName}</DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            'relative rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors cursor-pointer',
            dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/40',
          )}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Uploading…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Upload className="h-8 w-8" />
              <p className="text-sm font-medium">Drop files here or click to browse</p>
              <p className="text-xs">Max 20 MB · PDF, images, CSV, DOCX, XLSX</p>
            </div>
          )}
        </div>

        <div className="max-h-60 overflow-y-auto space-y-1.5">
          {loading && (
            <div className="py-4 text-center text-sm text-muted-foreground">
              <Loader2 className="mx-auto mb-1 h-5 w-5 animate-spin" /> Loading…
            </div>
          )}
          {!loading && attachments.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">No attachments yet.</p>
          )}
          {attachments.map((a) => (
            <div key={a.attachment_id} className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2">
              <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <a href={a.s3_url} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-medium text-primary hover:underline">
                  {a.file_name}
                </a>
                <p className="text-xs text-muted-foreground">{formatBytes(a.file_size)} · {formatDate(a.uploaded_at)}</p>
              </div>
              <button onClick={() => handleDeleteAttachment(a.attachment_id)} className="ml-auto shrink-0 text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteDialog({ open, onClose, operation, onDeleted }: {
  open: boolean;
  onClose: () => void;
  operation: Operation | null;
  onDeleted: (id: number) => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!operation) return;
    startTransition(async () => {
      try {
        await axios.delete(`/api/operation/${operation.pilot_mission_id}`);
        onDeleted(operation.pilot_mission_id);
        toast.success('Operation deleted successfully');
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Delete failed');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-105">
        <DialogHeader>
          <DialogTitle>Delete Operation</DialogTitle>
          <DialogDescription>
            This will permanently delete{' '}
            <span className="font-medium text-foreground">{operation?.mission_name}</span>. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}