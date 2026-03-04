"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PlanningData } from "@/config/types/evaluation-planning";
import { useEffect, useState } from "react";

interface EditPlanningRequestCardProps {
  planningData: PlanningData | null;
  clinetId: number;
  evaluationId: number;
  planningId: number;
  onUpdate: (form: Record<string, unknown>) => Promise<{ success: boolean }>;
}

interface PlanningForm {
  planning_status: string;
  planning_result: string;
  client_name: string;
  fk_owner_id: number | string;
  fk_client_id: number;
  planning_id: number;
  fk_evaluation_id: number;
  fk_luc_procedure_id: number | string;
  planning_folder: string;
  planning_request_date: string;
  planning_year: string;
  planning_desc: string;
  planning_type: string;
}

export default function EditPlanningRequestCard({
  planningData,
  clinetId,
  evaluationId,
  planningId,
  onUpdate,
}: EditPlanningRequestCardProps) {
  const [form, setForm] = useState<PlanningForm>({
    planning_status: "NEW",
    planning_result: "PROGRESS",
    client_name: "",
    fk_owner_id: "",
    fk_client_id: clinetId,
    planning_id: planningId,
    fk_evaluation_id: evaluationId,
    fk_luc_procedure_id: "",
    planning_folder: "",
    planning_request_date: "",
    planning_year: "",
    planning_desc: "",
    planning_type: "",
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (planningData) {
      setForm({
        planning_status: planningData.planning_status || "NEW",
        planning_result: planningData.planning_result || "PROGRESS",
        client_name: planningData.client_name || "",
        fk_owner_id: planningData.fk_owner_id || "",
        fk_client_id: planningData.fk_client_id || clinetId,
        planning_id: planningData.planning_id || planningId,
        fk_evaluation_id: planningData.fk_evaluation_id || evaluationId,
        fk_luc_procedure_id: planningData.fk_luc_procedure_id || "",
        planning_folder: planningData.planning_folder || "",
        planning_request_date: planningData.planning_request_date || "",
        planning_year: planningData.planning_year || "",
        planning_desc: planningData.planning_desc || "",
        planning_type: planningData.planning_type || "",
      });
    }
  }, [planningData, clinetId, evaluationId, planningId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSubmitting(true);
  try {
    await onUpdate(form as unknown as Record<string, unknown>);
  } finally {
    setSubmitting(false);
  }
};

  return (
    <div className="p-4 space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="planning_status">Status</Label>
            <Select
              value={form.planning_status}
              onValueChange={(val) => handleSelectChange("planning_status", val)}
            >
              <SelectTrigger id="planning_status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NEW">New Task</SelectItem>
                <SelectItem value="PROGRESS">In Progress</SelectItem>
                <SelectItem value="REVIEW">Feedback Request</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="DONE">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="planning_result">Result</Label>
            <Select
              value={form.planning_result}
              onValueChange={(val) => handleSelectChange("planning_result", val)}
            >
              <SelectTrigger id="planning_result">
                <SelectValue placeholder="Select result" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PROGRESS">In Progress</SelectItem>
                <SelectItem value="RESULT_POSITIVE">Completed Positive</SelectItem>
                <SelectItem value="RESULT_NEGATIVE">Completed Refused</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Client</Label>
            <Input value={form.client_name} readOnly className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Request Date</Label>
            <Input
              type="date"
              name="planning_request_date"
              value={form.planning_request_date}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <Label>Year Reference</Label>
            <Input name="planning_year" value={form.planning_year} onChange={handleChange} />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <Label>Description</Label>
            <Input name="planning_desc" value={form.planning_desc} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Input name="planning_type" value={form.planning_type} onChange={handleChange} />
          </div>
          <div />
          <div>
            <Button type="submit" disabled={submitting} className="w-full bg-violet-500 hover:bg-violet-600 cursor-pointer">
              {submitting ? "Updating..." : "Update"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}