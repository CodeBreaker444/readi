"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import axios from "axios";
import { CheckCircle2, Circle, Eye } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

type TaskRow = {
  task_id?: number | string;
  task_completed?: boolean;
  task_title?: string;
  component: "Checklist" | "Assignment" | "Communication" | "Unknown";
  item_id?: number | string;
  name?: string;
  code?: string;
  status?: "Completed" | "Pending";
  raw: any;
};

export function PlanningTaskTableSection(props: {
  isDark: boolean;
  planningId: number;
  rawJson: string | null;
  parsed: any;
  onMoveToTesting?: () => void;
}) {
  const { isDark, planningId, rawJson, parsed, onMoveToTesting } = props;

  const [rawOpen, setRawOpen] = useState(false);
  const [rowOpen, setRowOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<TaskRow | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [moving, setMoving] = useState(false);

  const toCompleted = (v: any) => v === true || v === "Y" || v === "y" || v === 1 || v === "1";

  const rows: TaskRow[] = (() => {
    const tasks = Array.isArray(parsed?.tasks) ? parsed.tasks : [];
    const out: TaskRow[] = [];

    for (const t of tasks) {
      const taskId = t?.task_id ?? t?.id ?? "";
      const taskTitle = t?.title ?? t?.task_title ?? t?.name ?? "";
      const taskCompleted = toCompleted(t?.task_completed ?? t?.completed);

      const pushItems = (key: string, label: TaskRow["component"]) => {
        const items = Array.isArray(t?.[key]) ? t[key] : [];
        for (const it of items) {
          const code =
            it?.[`${key}_code`] ??
            it?.code ??
            it?.checklist_code ??
            it?.assignment_code ??
            it?.communication_code ??
            "";
          const name =
            it?.[`${key}_name`] ??
            it?.name ??
            it?.checklist_name ??
            it?.assignment_name ??
            it?.communication_name ??
            "";
          const itemId =
            it?.[`${key}_id`] ??
            it?.checklist_id ??
            it?.assignment_id ??
            it?.communication_id ??
            "";

          const completedValue =
            it?.[`${key}_completed`] ??
            it?.completed ??
            false;

          out.push({
            task_id: taskId,
            task_completed: taskCompleted,
            task_title: taskTitle,
            component: label,
            item_id: itemId,
            name,
            code,
            status: toCompleted(completedValue) ? "Completed" : "Pending",
            raw: { task: t, item: it },
          });
        }
      };

      pushItems("checklist", "Checklist");
      pushItems("assignment", "Assignment");
      pushItems("communication", "Communication");

      const hasAny =
        Array.isArray(t?.checklist) || Array.isArray(t?.assignment) || Array.isArray(t?.communication);
      if (!hasAny) {
        out.push({
          task_id: taskId,
          task_completed: taskCompleted,
          task_title: taskTitle,
          component: "Unknown",
          status: taskCompleted ? "Completed" : "Pending",
          raw: { task: t },
        });
      }
    }
    return out;
  })();

  const tasks = Array.isArray(parsed?.tasks) ? parsed.tasks : [];
  const allTasksCompleted =
    tasks.length > 0 &&
    tasks.every((t: any) => toCompleted(t?.task_completed ?? t?.completed));

  const handleMoveToTesting = async () => {
    setMoving(true);
    try {
      await axios.post("/api/evaluation/planning/testing", {
        planning_id: planningId,
      });
      toast.success("Planning moved to testing");
      setConfirmOpen(false);
      onMoveToTesting?.();
    } catch {
      toast.error("Failed to move to testing");
    } finally {
      setMoving(false);
    }
  };

  const statusBadge = (status?: TaskRow["status"]) => {
    if (status === "Completed") {
      return <Badge className="bg-emerald-600 hover:bg-emerald-600">Completed</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  const taskStatusIcon = (completed?: boolean) =>
    completed ? (
      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    ) : (
      <Circle className="h-4 w-4 text-amber-500" />
    );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base">Task Table</CardTitle>
          <div className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Generated from <span className="font-mono">planning_json</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {allTasksCompleted && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              onClick={() => setConfirmOpen(true)}
            >
              <CheckCircle2 className="h-4 w-4" />
              Move to Testing Missions
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRawOpen(true)}
            disabled={!rawJson}
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            JSON Preview
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {!rawJson ? (
          <div className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            No <span className="font-mono">planning_json</span> found for this planning.
          </div>
        ) : rows.length === 0 ? (
          <div className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            No tasks found in JSON.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Task ID</TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Task Title</TableHead>
                  <TableHead className="w-[140px]">Component</TableHead>
                  <TableHead className="w-[60px]">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[160px]">Code</TableHead>
                  <TableHead className="w-[120px] text-center">Status</TableHead>
                  <TableHead className="w-[60px] text-right">Show</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{String(r.task_id ?? "")}</TableCell>
                    <TableCell>{taskStatusIcon(r.task_completed)}</TableCell>
                    <TableCell className="max-w-[300px] truncate">{r.task_title ?? ""}</TableCell>
                    <TableCell>{r.component}</TableCell>
                    <TableCell className="font-mono text-xs">{String(r.item_id ?? "")}</TableCell>
                    <TableCell className="max-w-[300px] truncate">{r.name ?? ""}</TableCell>
                    <TableCell className="font-mono text-xs">{r.code ?? ""}</TableCell>
                    <TableCell className="text-center">{statusBadge(r.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedRow(r);
                          setRowOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={rawOpen} onOpenChange={setRawOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>planning_json Preview</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[65vh] rounded-md border">
            <pre className={`p-4 text-xs font-mono whitespace-pre-wrap ${isDark ? "bg-slate-950 text-slate-200" : "bg-white text-slate-800"}`}>
              {rawJson ? safePrettyJson(rawJson) : "// empty"}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={rowOpen} onOpenChange={setRowOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Row Detail</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] rounded-md border">
            <pre className={`p-4 text-xs font-mono whitespace-pre-wrap ${isDark ? "bg-slate-950 text-slate-200" : "bg-white text-slate-800"}`}>
              {selectedRow ? JSON.stringify(selectedRow.raw, null, 2) : "// nothing selected"}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to Testing Missions?</AlertDialogTitle>
            <AlertDialogDescription>
              All tasks are completed. This will move the planning status to TESTING and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={moving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMoveToTesting}
              disabled={moving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {moving ? "Moving..." : "Move to Testing"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function safePrettyJson(raw: string) {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}