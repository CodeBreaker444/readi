"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import axios from "axios";
import {
  CheckCircle2,
  ClipboardList,
  Filter,
  ListChecks,
  MessageSquare,
  Search,
  Send,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaTasks } from "react-icons/fa";
import { toast } from "sonner";

import { getEvaluationTaskColumns } from "@/components/tables/EvaluationTaskColumn";
import { EvaluationTask } from "@/config/types/evaluation";
import { TablePagination } from "../tables/Pagination";
import CommunicationSection from "./CommunicationSection";
import { AssignmentActionModal } from "./evaluation/AssignmentActionModal";
import { ChecklistTaskModal } from "./evaluation/ChecklistTaskModal";
import { EvaluationCommunicationModal } from "./evaluation/EvaluationCommunicationModal";

type FilterMode = "all" | "checklist" | "assignment" | "communication";

type ModalState =
  | { type: "none" }
  | { type: "checklist"; task: EvaluationTask }
  | { type: "assignment"; task: EvaluationTask }
  | { type: "communication"; task?: EvaluationTask };

export function PlanningTaskTableSection(props: {
  isDark: boolean;
  planningId: number;
  clientId: number;
  evaluationId: number;
  ownerId: number;
}) {
  const { isDark, planningId, clientId, evaluationId, ownerId,   } = props;

  const [tasks, setTasks] = useState<EvaluationTask[]>([]);
  const [allCompleted, setAllCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>({ type: "none" });

  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

 

  const fetchTasks = useCallback(async () => {
    if (planningId <= 0) return;
    try {
      setIsLoading(true);
      const res = await axios.get(`/api/evaluation/planning/${planningId}/tasks`);
      setTasks(res.data.tasks ?? []);
      setAllCompleted(res.data.allCompleted ?? false);
    } catch {
      toast.error("Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  }, [planningId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const filteredTasks = useMemo(() => {
    if (filterMode === "all") return tasks;
    return tasks.filter((t) => t.task_type === filterMode);
  }, [tasks, filterMode]);

  const countByType = useMemo(() => {
    const counts = { all: tasks.length, checklist: 0, assignment: 0, communication: 0 };
    for (const t of tasks) {
      if (t.task_type === "checklist") counts.checklist++;
      else if (t.task_type === "assignment") counts.assignment++;
      else if (t.task_type === "communication") counts.communication++;
    }
    return counts;
  }, [tasks]);

  const completedCount = tasks.filter((t) => t.task_status === "completed").length;

  function handleOpenAction(task: EvaluationTask) {
    if (task.task_type === "checklist") setModal({ type: "checklist", task });
    else if (task.task_type === "assignment") setModal({ type: "assignment", task });
    else if (task.task_type === "communication") setModal({ type: "communication", task });
  }

  function closeModal() {
    setModal({ type: "none" });
  }

  async function handleChecklistComplete(task: EvaluationTask, _data: any) {
    try {
      await axios.put(`/api/evaluation/planning/${planningId}/tasks`, {
        task_id: task.task_id,
        task_status: "completed",
      });
      toast.success("Checklist completed");
      fetchTasks();
    } catch {
      toast.error("Failed to update task status");
    }
    closeModal();
  }

  async function handleAssignmentSent(task: EvaluationTask) {
    try {
      await axios.put(`/api/evaluation/planning/${planningId}/tasks`, {
        task_id: task.task_id,
        task_status: "completed",
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
        await axios.put(`/api/evaluation/planning/${planningId}/tasks`, {
          task_id: task.task_id,
          task_status: "completed",
        });
      } catch {
        // Non-fatal
      }
    }
    fetchTasks();
    closeModal();
  }

 

  const columns = useMemo(
    () => getEvaluationTaskColumns(handleOpenAction),
    [evaluationId],
  );

  const table = useReactTable({
    data: filteredTasks,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const FilterBtn = ({
    mode,
    icon,
    label,
    count,
  }: {
    mode: FilterMode;
    icon: React.ReactNode;
    label: string;
    count: number;
  }) => {
    const active = filterMode === mode;
    return (
      <Button
        size="sm"
        variant={active ? "default" : "outline"}
        className={`gap-1.5 text-xs h-8 ${
          active
            ? "bg-violet-600 hover:bg-violet-700 text-white"
            : isDark
              ? "border-slate-800 text-slate-400 hover:bg-slate-800"
              : ""
        }`}
        onClick={() => setFilterMode(mode)}
      >
        {icon}
        {label}
        <Badge
          variant={active ? "secondary" : "outline"}
          className={`ml-0.5 text-[10px] px-1.5 py-0 h-4 min-w-[18px] flex items-center justify-center ${
            !active && isDark ? "border-slate-700 text-slate-500" : ""
          }`}
        >
          {count}
        </Badge>
      </Button>
    );
  };

  return (
    <>
      <Card className={isDark ? "bg-slate-900 border-slate-800" : "bg-white"}>
        <CardHeader className="space-y-0 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ListChecks className={`h-4 w-4 ${isDark ? "text-slate-400" : "text-slate-500"}`} />
                <CardTitle className={`text-base ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                  Task Table
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {completedCount}/{tasks.length}
                </Badge>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Tasks for this planning
              </p>
            </div>

            <div className="flex items-center gap-2">
              {allCompleted && tasks.length > 0 && (
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-xs font-medium">All tasks completed</span>
                </div>
              )}

              <CommunicationSection
                clientId={clientId}
                planningId={planningId}
                evaluationId={evaluationId}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap pt-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <FilterBtn
                mode="all"
                icon={<FaTasks className="h-3.5 w-3.5" />}
                label="All"
                count={countByType.all}
              />
              <FilterBtn
                mode="checklist"
                icon={<ClipboardList className="h-3.5 w-3.5" />}
                label="Checklist"
                count={countByType.checklist}
              />
              <FilterBtn
                mode="assignment"
                icon={<Send className="h-3.5 w-3.5" />}
                label="Assignment"
                count={countByType.assignment}
              />
              <FilterBtn
                mode="communication"
                icon={<MessageSquare className="h-3.5 w-3.5" />}
                label="Communication"
                count={countByType.communication}
              />
            </div>

            <div className="relative w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className={`pl-8 h-8 text-xs ${
                  isDark ? "bg-slate-950 border-slate-800 text-slate-200" : ""
                }`}
                placeholder="Search tasks..."
                value={globalFilter ?? ""}
                onChange={(e) => setGlobalFilter(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className={`rounded-md border ${isDark ? "border-slate-800" : "border-slate-200"} overflow-hidden`}>
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow
                    key={hg.id}
                    className={
                      isDark
                        ? "bg-slate-900/50 border-slate-800 hover:bg-transparent"
                        : "bg-slate-50 hover:bg-slate-50"
                    }
                  >
                    {hg.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={`text-xs h-8 px-3 ${isDark ? "text-slate-400 font-medium" : ""}`}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i} className={isDark ? "border-slate-800" : ""}>
                      {columns.map((_, j) => (
                        <TableCell key={j} className="px-3 py-2">
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className={`text-center text-xs py-8 ${
                        isDark ? "text-slate-400" : "text-slate-400"
                      }`}
                    >
                      {globalFilter
                        ? "No tasks match your search."
                        : filterMode !== "all"
                          ? "No tasks for this filter."
                          : "No tasks defined for this evaluation."}
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={isDark ? "border-slate-800 hover:bg-slate-800/50" : "hover:bg-slate-50/50"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={`px-3 py-2 ${isDark ? "text-slate-300" : ""}`}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <TablePagination table={table} />
        </CardContent>
      </Card>

      {modal.type === "checklist" && (
        <ChecklistTaskModal
          open
          task={modal.task}
          evaluationId={evaluationId}
          onClose={closeModal}
          onComplete={(data) => handleChecklistComplete(modal.task, data)}
        />
      )}

      {modal.type === "assignment" && (
        <AssignmentActionModal
          open
          task={modal.task}
          evaluationId={evaluationId}
          ownerId={ownerId}
          onClose={closeModal}
          onSent={() => handleAssignmentSent(modal.task)}
        />
      )}

      {modal.type === "communication" && (
        <EvaluationCommunicationModal
          open
          evaluationId={evaluationId}
          task={modal.task ?? null}
          onClose={closeModal}
          onSent={() =>
            handleCommunicationSent(
              modal.type === "communication" ? modal.task : undefined,
            )
          }
        />
      )}

    </>
  );
}