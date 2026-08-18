"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Planning } from "@/config/types/evaluation-planning";
import PlanningStatusBadge from "./StatusBadge";

interface PlanningDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planning: Planning | null;
  isDark: boolean;
}

export default function PlanningDetailsModal({
  open,
  onOpenChange,
  planning,
  isDark,
}: PlanningDetailsModalProps) {
  if (!planning) return null;

  const fields = [
    { label: "Planning ID", value: `PLAN_${planning.planning_id}` },
    { label: "Year", value: String(planning.planning_year) },
    { label: "Evaluation ID", value: `EVAL_${planning.fk_evaluation_id}` },
    { label: "Client", value: planning.client_name },
    { label: "Description", value: planning.planning_desc },
    { label: "Requested By", value: `${planning.user_fullname} [${planning.user_profile_code}]` },
    { label: "Assigned To", value: planning.pic_data ? `${planning.pic_data.fullname} [${planning.pic_data.user_profile_code}]` : "—" },
    { label: "Request Date", value: planning.planning_request_date },
    { label: "Last Update", value: planning.last_update },
    { label: "Status", value: planning.planning_status, badge: true },
    { label: "Result", value: planning.planning_result, badge: true },
    { label: "Procedure Name", value: planning.luc_procedure_desc || planning.luc_procedure_code },
    { label: "Procedure Version", value: planning.luc_procedure_ver },
  ];

  const renderField = (field: any) => (
    <div key={field.label} className="grid grid-cols-3 items-center gap-2">
      <Label className="text-right text-sm font-medium text-muted-foreground">
        {field.label}
      </Label>
      <div className="col-span-2">
        {field.badge ? (
          <PlanningStatusBadge status={field.value} isDark={isDark} />
        ) : (
          <p className="text-sm">{field.value}</p>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Planning Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Basic Information</p>
          <div className="grid grid-cols-2 gap-3">
            {fields.slice(0, 5).map(renderField)}
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">People & Dates</p>
          <div className="grid grid-cols-2 gap-3">
            {fields.slice(5, 9).map(renderField)}
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Status & Procedure Information</p>
          <div className="grid grid-cols-2 gap-3">
            {fields.slice(9).map(renderField)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
