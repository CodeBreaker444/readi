'use client';

import axios from 'axios';
import { Filter, Loader2, Send } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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

interface OrgUser {
    user_id: number;
    first_name: string;
    last_name: string;
    email: string;
    user_role?: string;
}

interface Props {
    open: boolean;
    task: EvaluationTask;
    evaluationId: number;
    ownerId: number;
    onClose: () => void;
    onSent: () => void;
}

export function AssignmentActionModal({
    open,
    task,
    evaluationId,
    ownerId,
    onClose,
    onSent,
}: Props) {
    const { t } = useTranslation();
    const [users, setUsers] = useState<OrgUser[]>([]);
    const [toUserId, setToUserId] = useState('');
    const [message, setMessage] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');

    const [isSending, setIsSending] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);

    useEffect(() => {
        if (!open) return;
        setToUserId('');
        setRoleFilter('all');
        setMessage(defaultMessage(task));
        loadUsers();
    }, [open, task.task_id]);

    function defaultMessage(t: EvaluationTask) {
        return `Assignment: ${t.task_name}\nEvaluation #${evaluationId}\n\nPlease review and complete this assignment.`;
    }

    async function loadUsers() {
        setLoadingUsers(true);
        try {
            const res = await axios.post('/api/evaluation/mission/users', { owner_id: ownerId });
            setUsers(res.data.data ?? []);
        } catch {
            toast.error(t('planning.assignment.loadError'));
        } finally {
            setLoadingUsers(false);
        }
    }

    const uniqueRoles = useMemo(() => {
        const roles = new Set<string>();
        users.forEach(u => {
            if (u.user_role) roles.add(u.user_role);
        });
        return Array.from(roles).sort();
    }, [users]);

    const filteredUsers = useMemo(() => {
        if (roleFilter === 'all') return users;
        return users.filter(u => u.user_role === roleFilter);
    }, [users, roleFilter]);



    async function handleAssign() {
        if (!toUserId) {
            toast.error('Please select a recipient');
            return;
        }
        if (!message.trim()) {
            toast.error('Message cannot be empty');
            return;
        }

        try {
            setIsSending(true);
            await axios.post(`/api/evaluation/${evaluationId}/assignment`, {
                task_id: task.task_id,
                task_code: task.task_code,
                task_name: task.task_name,
                to_user_id: Number(toUserId),
                message: message.trim(),
            });
            toast.success('Assignment sent successfully');
            onSent();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? 'Failed to send assignment');
        } finally {
            setIsSending(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div>
                            <DialogTitle className="text-sm font-semibold text-slate-800">
                                Assignment Action
                            </DialogTitle>
                            <p className="text-xs text-slate-400 mt-0.5 font-mono">{task.task_code}</p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-1">
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2">
                        <p className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                            Title :
                        </p>
                        <p className="text-sm font-medium text-slate-800 truncate">
                            {task.task_name}
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-600">
                            To
                            {users.length > 0 && (
                                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-slate-100 px-1.5 py-px text-[10px] font-semibold text-slate-500">
                                    {users.length}
                                </span>
                            )}
                        </Label>
                        {loadingUsers ? (
                            <div className="flex items-center gap-2 h-8 text-xs text-slate-400">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Loading users…
                            </div>
                        ) : (
                            <>
                                {uniqueRoles.length > 0 && (
                                    <div className="flex items-center gap-2 mb-2">
                                        <Filter className="h-3.5 w-3.5 text-slate-400" />
                                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                                            <SelectTrigger className="h-7 text-xs w-40">
                                                <SelectValue placeholder="Filter by role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all" className="text-xs">All Roles</SelectItem>
                                                {uniqueRoles.map(role => (
                                                    <SelectItem key={role} value={role} className="text-xs">
                                                        {role}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                <Select value={toUserId} onValueChange={setToUserId}>
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="Select recipient" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredUsers.map((u) => (
                                            <SelectItem
                                                key={u.user_id}
                                                value={String(u.user_id)}
                                                className="text-xs"
                                            >
                                                {u.first_name} {u.last_name}
                                                {u.user_role ? ` — ${u.user_role}` : ''}
                                                <span className="text-slate-400 ml-1">({u.email})</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-600">Message</Label>
                        <Textarea
                            rows={6}
                            className="text-xs resize-none"
                            placeholder="Write your assignment message…"
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
                        onClick={handleAssign}
                        disabled={isSending || !toUserId}
                        className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
                    >
                        {isSending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Send className="h-3.5 w-3.5" />
                        )}
                        {isSending ? 'Sending…' : 'Assign'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}