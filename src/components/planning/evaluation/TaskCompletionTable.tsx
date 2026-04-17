'use client';

import {
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import axios from 'axios';
import {
    CheckCircle2,
    ListChecks,
    MapPin,
    MessageSquarePlus,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { getEvaluationTaskColumns } from '@/components/tables/EvaluationTaskColumn';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { EvaluationTask } from '@/config/types/evaluation';
import { AddPlanningModal } from './AddPlanningModal';
import { AssignmentActionModal } from './AssignmentActionModal';
import { ChecklistTaskModal } from './ChecklistTaskModal';
import { EvaluationCommunicationModal } from './EvaluationCommunicationModal';

interface Props {
    evaluationId: number;
    clientId: number;
    ownerId: number;
    onAllCompleted?: (completed: boolean) => void;
}

type ModalState =
    | { type: 'none' }
    | { type: 'checklist'; task: EvaluationTask }
    | { type: 'assignment'; task: EvaluationTask }
    | { type: 'communication'; task?: EvaluationTask }
    | { type: 'add_planning' };

export function TaskCompletionTable({
    evaluationId,
    clientId,
    ownerId,
    onAllCompleted,
}: Props) {
    const [tasks, setTasks] = useState<EvaluationTask[]>([]);
    const [allCompleted, setAllCompleted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [modal, setModal] = useState<ModalState>({ type: 'none' });
    const { t } = useTranslation();  

    async function fetchTasks() {
        if (evaluationId <= 0) return;
        try {
            setIsLoading(true);
            const res = await axios.get(`/api/evaluation/${evaluationId}/tasks`);
            setTasks(res.data.tasks ?? []);
            const completed = res.data.allCompleted ?? false;
            setAllCompleted(completed);
            onAllCompleted?.(completed);
        } catch {
            toast.error(t('planning.tasks.loadError'));
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        fetchTasks();
    }, [evaluationId]);

    function handleOpenAction(task: EvaluationTask) {
        if (task.task_type === 'checklist') setModal({ type: 'checklist', task });
        else if (task.task_type === 'assignment') setModal({ type: 'assignment', task });
        else if (task.task_type === 'communication') setModal({ type: 'communication', task });
    }

    function closeModal() {
        setModal({ type: 'none' });
    }

    async function handleChecklistComplete(task: EvaluationTask, _data: any) {
        try {
            await axios.put(`/api/evaluation/${evaluationId}/tasks`, {
                task_id: task.task_id,
                task_status: 'completed',
            });
            toast.success(t('planning.tasks.checklistCompleted'));
            fetchTasks();
        } catch {
            toast.error(t('planning.tasks.updateFailed'));
        }
        closeModal();
    }

    async function handleAssignmentSent(task: EvaluationTask) {
        try {
            await axios.put(`/api/evaluation/${evaluationId}/tasks`, {
                task_id: task.task_id,
                task_status: 'completed',
            });
            fetchTasks();
        } catch {
            // Non-fatal; assignment was still sent
        }
        closeModal();
    }

    async function handleCommunicationSent(task?: EvaluationTask) {
        if (task?.task_id) {
            try {
                await axios.put(`/api/evaluation/${evaluationId}/tasks`, {
                    task_id: task.task_id,
                    task_status: 'completed',
                });
            } catch {
                // Non-fatal
            }
        }
        fetchTasks();
        closeModal();
    }

    const columns = useMemo(
        () => getEvaluationTaskColumns(t, handleOpenAction),
        [evaluationId, t],
    );

    const table = useReactTable({
        data: tasks,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    const completedCount = tasks.filter((t) => t.task_status === 'completed').length;

    return (
        <>
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ListChecks className="h-4 w-4 text-slate-500" />
                        <h3 className="text-sm font-semibold text-slate-700">
                            {t('planning.evaluation.taskCompletion')}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                            {completedCount}/{tasks.length}
                        </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                        {allCompleted && tasks.length > 0 && (
                            <>
                                <div className="flex items-center gap-1.5 text-emerald-600">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span className="text-xs font-medium">
                                        {t('planning.tasks.allCompleted')}
                                    </span>
                                </div>

                                <Button
                                    size="sm"
                                    className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                    onClick={() => setModal({ type: 'add_planning' })}
                                >
                                    <MapPin className="h-3.5 w-3.5" />
                                    {t('planning.tasks.moveToDashboard')}
                                </Button>
                            </>
                        )}

                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1.5 border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100"
                            onClick={() => setModal({ type: 'communication' })}
                        >
                            <MessageSquarePlus className="h-3.5 w-3.5" />
                            {t('planning.tasks.addCommunication')}
                        </Button>
                    </div>
                </div>

                <div className="rounded-md border border-slate-200 overflow-hidden">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((hg) => (
                                <TableRow key={hg.id} className="bg-slate-50 hover:bg-slate-50">
                                    {hg.headers.map((header) => (
                                        <TableHead key={header.id} className="text-xs h-8 px-3">
                                            {flexRender(
                                                header.column.columnDef.header,
                                                header.getContext(),
                                            )}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>
                                        {columns.map((_, j) => (
                                            <TableCell key={j} className="px-3 py-2">
                                                <Skeleton className="h-4 w-full" />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : tasks.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="text-center text-xs text-slate-400 py-8"
                                    >
                                        {t('planning.tasks.noTasks')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        className="hover:bg-slate-50/50"
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell
                                                key={cell.id}
                                                className="px-3 py-2"
                                            >
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext(),
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {modal.type === 'checklist' && (
                <ChecklistTaskModal
                    open
                    task={modal.task}
                    evaluationId={evaluationId}
                    onClose={closeModal}
                    onComplete={(data) => handleChecklistComplete(modal.task, data)}
                />
            )}

            {modal.type === 'assignment' && (
                <AssignmentActionModal
                    open
                    task={modal.task}
                    evaluationId={evaluationId}
                    ownerId={ownerId}
                    onClose={closeModal}
                    onSent={() => handleAssignmentSent(modal.task)}
                />
            )}

            {modal.type === 'communication' && (
                <EvaluationCommunicationModal
                    open
                    evaluationId={evaluationId}
                    task={modal.task ?? null}
                    onClose={closeModal}
                    onSent={() =>
                        handleCommunicationSent(
                            modal.type === 'communication' ? modal.task : undefined,
                        )
                    }
                />
            )}

            {modal.type === 'add_planning' && (
                <AddPlanningModal
                    open
                    evaluationId={evaluationId}
                    clientId={clientId}
                    onClose={closeModal}
                    onCreated={(planningId) => {
                        toast.success(`Planning PLAN_${planningId} created!`);
                        closeModal();
                    }}
                />
            )}
        </>
    );
}