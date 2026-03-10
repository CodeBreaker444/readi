'use client';

import axios from 'axios';
import { Loader2, MessageSquarePlus, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

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
import { EvaluationTask } from '@/config/types/evaluation';

interface User {
  user_id: number;
  first_name: string;
  last_name?: string;
  email: string;
}

interface Props {
  evaluationId: number;
  open: boolean;
  task?: EvaluationTask | null;
  onClose: () => void;
  onSent: () => void;
}

export function EvaluationCommunicationModal({
  evaluationId,
  open,
  task,
  onClose,
  onSent,
}: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [toUserId, setToUserId] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (!open) return;
    setToUserId('');
    setMessage('');
    setSubject(
      task
        ? `[${task.task_name}] Evaluation #${evaluationId}`
        : `Evaluation #${evaluationId} — Communication`,
    );
    loadUsers();
  }, [open, task?.task_id ?? 'none']);

  async function loadUsers() {
    setLoadingUsers(true);
    try {
      const res = await axios.post('/api/evaluation/mission/users');
      setUsers(res.data.data ?? []);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  }

  async function handleSend() {
    if (!toUserId) { toast.error('Please select a recipient'); return; }
    if (!message.trim()) { toast.error('Message cannot be empty'); return; }


    try {
      setIsSending(true);
      await axios.post(`/api/evaluation/${evaluationId}/communication`, {
        to_user_id: Number(toUserId),
        subject:    subject.trim(),
        message:    message.trim(),
      });
      toast.success('Communication sent');
      onSent();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to send');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 border border-violet-100">
              <MessageSquarePlus className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-slate-800">
                {task ? 'Send Communication' : 'New Communication'}
              </DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluation #{evaluationId}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {task && (
            <div className="rounded-lg bg-amber-50 border border-amber-100 px-3.5 py-2.5">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-0.5">
                Linked Task
              </p>
              <p className="text-sm font-medium text-slate-800">{task.task_name}</p>
              <p className="font-mono text-xs text-slate-400 mt-0.5">{task.task_code}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">To</Label>
            {loadingUsers ? (
              <div className="flex items-center gap-2 h-8 text-xs text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading users…
              </div>
            ) : (
              <Select value={toUserId} onValueChange={setToUserId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select recipient" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.user_id} value={String(u.user_id)} className="text-xs">
                      {u.first_name} {u.last_name ?? ''} — {u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Subject</Label>
            <Input
              className="h-8 text-xs"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Message</Label>
            <Textarea
              rows={5}
              className="text-xs resize-none"
              placeholder="Write your message…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={isSending || !toUserId}
            className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
          >
            {isSending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {isSending ? 'Sending…' : 'Send'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}