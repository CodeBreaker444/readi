'use client';

import { ChecklistRenderer } from '@/components/checklist/ChecklistRenderer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import axios from 'axios';
import { CheckSquare, Loader2, MessageSquare } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type Recipient = { id: number; name: string; role: string; email: string };

type MissionTaskActionsDialogProps = {
  open: boolean;
  missionId: number | null;
  onClose: () => void;
};

type ChecklistRow = {
  task_id: number;
  task_title: string;
  checklist_id: number;
  checklist_code: string;
  checklist_name: string;
  checklist_completed: string;
};

type CommunicationRow = {
  task_id: number;
  task_title: string;
  communication_id: number;
  communication_code: string;
  communication_name: string;
  communication_completed: string;
};

export function MissionTaskActionsDialog({ open, missionId, onClose }: MissionTaskActionsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);

  const [activeChecklist, setActiveChecklist] = useState<ChecklistRow | null>(null);
  const [checklistJson, setChecklistJson] = useState<string | null>(null);
  const [loadingChecklist, setLoadingChecklist] = useState(false);

  const [activeCommunication, setActiveCommunication] = useState<CommunicationRow | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [communicationMessage, setCommunicationMessage] = useState('');
  const [sendingCommunication, setSendingCommunication] = useState(false);

  useEffect(() => {
    if (!open || !missionId) return;
    setLoading(true);
    axios
      .get(`/api/operation/task/mission/${missionId}`)
      .then((res) => setTasks(res.data?.data?.tasks ?? []))
      .catch(() => toast.error('Failed to load mission tasks'))
      .finally(() => setLoading(false));
  }, [open, missionId]);

  useEffect(() => {
    if (!activeCommunication) return;
    axios
      .get('/api/operation/communication/recipients?procedure=mission')
      .then((res) => setRecipients(res.data?.recipients ?? []))
      .catch(() => toast.error('Failed to load recipients'));
  }, [activeCommunication]);

  const checklistRows = useMemo<ChecklistRow[]>(() => {
    const rows: ChecklistRow[] = [];
    for (const task of tasks) {
      const list = Array.isArray(task?.checklist) ? task.checklist : [];
      for (const cl of list) {
        rows.push({
          task_id: Number(task?.task_id ?? 0),
          task_title: String(task?.title ?? ''),
          checklist_id: Number(cl?.checklist_id ?? 0),
          checklist_code: String(cl?.checklist_code ?? ''),
          checklist_name: String(cl?.checklist_name ?? ''),
          checklist_completed: String(cl?.checklist_completed ?? 'N'),
        });
      }
    }
    return rows;
  }, [tasks]);

  const communicationRows = useMemo<CommunicationRow[]>(() => {
    const rows: CommunicationRow[] = [];
    for (const task of tasks) {
      const list = Array.isArray(task?.communication) ? task.communication : [];
      for (const comm of list) {
        rows.push({
          task_id: Number(task?.task_id ?? 0),
          task_title: String(task?.title ?? ''),
          communication_id: Number(comm?.communication_id ?? 0),
          communication_code: String(comm?.communication_code ?? ''),
          communication_name: String(comm?.communication_name ?? ''),
          communication_completed: String(comm?.communication_completed ?? 'N'),
        });
      }
    }
    return rows;
  }, [tasks]);

  async function openChecklist(row: ChecklistRow) {
    if (!row.checklist_code) {
      toast.error('Checklist code missing');
      return;
    }
    setLoadingChecklist(true);
    setActiveChecklist(row);
    try {
      const res = await axios.post('/api/organization/checklist/data', {
        checklist_code: row.checklist_code,
      });
      const raw = res.data?.data?.checklist_json;
      setChecklistJson(typeof raw === 'string' ? raw : JSON.stringify(raw ?? {}));
    } catch {
      setChecklistJson(null);
      toast.error('Failed to load checklist form');
    } finally {
      setLoadingChecklist(false);
    }
  }

  async function submitChecklist(survey: any) {
    if (!missionId || !activeChecklist) return;
    try {
      await axios.post('/api/operation/task/checklist', {
        mission_id: missionId,
        checklist_code: activeChecklist.checklist_code,
        checklist_data: survey?.data ?? {},
      });
      toast.success('Checklist saved');
      setActiveChecklist(null);
      setChecklistJson(null);
      const res = await axios.get(`/api/operation/task/mission/${missionId}`);
      setTasks(res.data?.data?.tasks ?? []);
    } catch {
      toast.error('Failed to save checklist');
    }
  }

  async function submitCommunication() {
    if (!missionId || !activeCommunication) return;
    if (!selectedRecipient) {
      toast.error('Select recipient');
      return;
    }
    if (!communicationMessage.trim()) {
      toast.error('Message is required');
      return;
    }

    setSendingCommunication(true);
    try {
      await axios.post('/api/operation/task/communication', {
        mission_id: missionId,
        task_id: activeCommunication.task_id,
        communication_id: activeCommunication.communication_id,
        communication_message: communicationMessage.trim(),
        communication_to: Number(selectedRecipient),
      });

      toast.success('Communication sent');
      setActiveCommunication(null);
      setSelectedRecipient('');
      setCommunicationMessage('');
      const res = await axios.get(`/api/operation/task/mission/${missionId}`);
      setTasks(res.data?.data?.tasks ?? []);
    } catch {
      toast.error('Failed to send communication');
    } finally {
      setSendingCommunication(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mission Task Actions</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="py-10 flex items-center justify-center text-sm text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading tasks...
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="mb-2 text-sm font-medium flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" /> Checklists
                </div>
                <div className="border rounded-md divide-y">
                  {checklistRows.length === 0 && (
                    <div className="p-3 text-sm text-muted-foreground">No checklist task found</div>
                  )}
                  {checklistRows.map((row) => (
                    <div key={`${row.task_id}-${row.checklist_id}`} className="p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{row.checklist_name || row.checklist_code}</div>
                        <div className="text-xs text-muted-foreground">
                          Task #{row.task_id} - {row.task_title || 'Untitled'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={row.checklist_completed === 'Y' ? 'default' : 'secondary'}>
                          {row.checklist_completed === 'Y' ? 'Completed' : 'Pending'}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => openChecklist(row)}>
                          Fill
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Communications
                </div>
                <div className="border rounded-md divide-y">
                  {communicationRows.length === 0 && (
                    <div className="p-3 text-sm text-muted-foreground">No communication task found</div>
                  )}
                  {communicationRows.map((row) => (
                    <div key={`${row.task_id}-${row.communication_id}`} className="p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{row.communication_name || row.communication_code}</div>
                        <div className="text-xs text-muted-foreground">
                          Task #{row.task_id} - {row.task_title || 'Untitled'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={row.communication_completed === 'Y' ? 'default' : 'secondary'}>
                          {row.communication_completed === 'Y' ? 'Completed' : 'Pending'}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => setActiveCommunication(row)}>
                          Send
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!activeChecklist} onOpenChange={(v) => !v && setActiveChecklist(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Checklist {activeChecklist?.checklist_code ? `- ${activeChecklist.checklist_code}` : ''}
            </DialogTitle>
          </DialogHeader>
          {loadingChecklist ? (
            <div className="py-10 flex items-center justify-center text-sm text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading checklist...
            </div>
          ) : checklistJson ? (
            <ChecklistRenderer checklistJson={checklistJson} onComplete={submitChecklist} />
          ) : (
            <div className="text-sm text-muted-foreground">Checklist definition not found</div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!activeCommunication} onOpenChange={(v) => !v && setActiveCommunication(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Communication {activeCommunication?.communication_code ? `- ${activeCommunication.communication_code}` : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>To</Label>
              <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                <SelectTrigger>
                  <SelectValue placeholder="Select recipient" />
                </SelectTrigger>
                <SelectContent>
                  {recipients.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name}{r.role ? ` - ${r.role}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Message</Label>
              <Textarea
                value={communicationMessage}
                onChange={(e) => setCommunicationMessage(e.target.value)}
                rows={5}
                placeholder="Type your message"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={submitCommunication} disabled={sendingCommunication}>
                {sendingCommunication ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
