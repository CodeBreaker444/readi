"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TaskData } from "@/config/types/evaluation-planning";
import { CheckCircle2, Clock } from "lucide-react";

interface TaskCompletionSectionProps {
  taskData: TaskData | null;
  planningId: number;
}

export default function TaskCompletionSection({
  taskData,
  planningId,
}: TaskCompletionSectionProps) {
  if (!taskData || !taskData.tasks) return <div />;

  const allCompleted = taskData.tasks.every((t) => t.completed);

  const handleMoveToTesting = async () => {
    if (!window.confirm("Move this planning to Testing Missions?")) return;
    try {
      await fetch("/api/evaluation/planning/move-to-testing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({  planning_id: planningId }),
      });
      window.location.reload();
    } catch (err) {
      console.error("Move to testing failed:", err);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {taskData.tasks.map((task, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-medium">
                  {task.name || `Task ${idx + 1}`}
                </TableCell>
                <TableCell>{task.description || ""}</TableCell>
                <TableCell className="text-center">
                  {task.completed ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Completed
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="h-3 w-3" />
                      Pending
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {allCompleted && (
        <Button variant="default" size="sm" onClick={handleMoveToTesting}>
          Move to Testing Missions
        </Button>
      )}
    </div>
  );
}