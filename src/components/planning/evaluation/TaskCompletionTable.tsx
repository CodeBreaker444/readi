'use client';

import {
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import axios from 'axios';
import { CheckCircle2, ListChecks } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { getEvaluationTaskColumns } from '@/components/tables/EvaluationTaskColumn';
import { Badge } from '@/components/ui/badge';
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

interface Props {
  evaluationId: number;
  onAllCompleted?: (completed: boolean) => void;
}

export function TaskCompletionTable({ evaluationId, onAllCompleted }: Props) {
  const [tasks, setTasks] = useState<EvaluationTask[]>([]);
  const [allCompleted, setAllCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchTasks() {
    if (evaluationId <= 0) return;
    try {
      setIsLoading(true);
      const res = await axios.get(`/api/evaluation/${evaluationId}/tasks`);
      setTasks(res.data.tasks ?? []);
      setAllCompleted(res.data.allCompleted ?? false);
      onAllCompleted?.(res.data.allCompleted ?? false);
    } catch {
      toast.error('Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchTasks();
  }, [evaluationId]);

  async function handleStatusChange(taskId: number, status: string) {
    try {
      await axios.put(`/api/evaluation/${evaluationId}/tasks`, {
        task_id: taskId,
        task_status: status,
      });
      toast.success('Task updated');
      fetchTasks();
    } catch {
      toast.error('Failed to update task');
    }
  }

  const columns = useMemo(
    () => getEvaluationTaskColumns(handleStatusChange),
    [evaluationId],
  );

  const table = useReactTable({
    data: tasks,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-700">
            Task Completion
          </h3>
          <Badge variant="secondary" className="text-xs">
            {tasks.filter((t) => t.task_status === 'completed').length}/
            {tasks.length}
          </Badge>
        </div>
        {allCompleted && tasks.length > 0 && (
          <div className="flex items-center gap-1.5 text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-medium">All tasks completed</span>
          </div>
        )}
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
                  No tasks defined for this evaluation.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-slate-50/50">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-3 py-2">
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
  );
}