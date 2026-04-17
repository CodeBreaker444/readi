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
import { useTranslation } from "react-i18next";

interface EditPlanningRequestCardProps {
  isDark: boolean;
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
  isDark,
  planningData,
  clinetId,
  evaluationId,
  planningId,
  onUpdate,
}: EditPlanningRequestCardProps) {
  const { t } = useTranslation();
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

  const labelColor = isDark ? "text-slate-400" : "text-slate-700";
  const inputBg = isDark ? "bg-slate-950 border-slate-800 text-slate-200" : "bg-white";

  return (
    <div className={`p-4 space-y-4 ${isDark ? "bg-slate-900/50" : "bg-transparent"}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="planning_status" className={labelColor}>{t("planning.form.status")}</Label>
            <Select
              value={form.planning_status}
              onValueChange={(val) => handleSelectChange("planning_status", val)}
            >
              <SelectTrigger id="planning_status" className={inputBg}>
                <SelectValue placeholder={t("planning.editPlanning.selectStatus")} />
              </SelectTrigger>
              <SelectContent className={isDark ? "bg-slate-900 border-slate-800 text-slate-200" : ""}>
                <SelectItem value="NEW">{t("planning.status.newTask")}</SelectItem>
                <SelectItem value="PROGRESS">{t("planning.status.inProgress")}</SelectItem>
                <SelectItem value="REVIEW">{t("planning.status.feedbackRequest")}</SelectItem>
                <SelectItem value="SUSPENDED">{t("planning.status.suspended")}</SelectItem>
                <SelectItem value="DONE">{t("planning.status.done")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="planning_result" className={labelColor}>{t("planning.form.result")}</Label>
            <Select
              value={form.planning_result}
              onValueChange={(val) => handleSelectChange("planning_result", val)}
            >
              <SelectTrigger id="planning_result" className={inputBg}>
                <SelectValue placeholder={t("planning.editPlanning.selectResult")} />
              </SelectTrigger>
              <SelectContent className={isDark ? "bg-slate-900 border-slate-800 text-slate-200" : ""}>
                <SelectItem value="PROGRESS">{t("planning.status.inProgress")}</SelectItem>
                <SelectItem value="RESULT_POSITIVE">{t("planning.status.completedPositive")}</SelectItem>
                <SelectItem value="RESULT_NEGATIVE">{t("planning.status.completedRefused")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className={labelColor}>{t("planning.form.client")}</Label>
            <Input
              value={form.client_name}
              readOnly
              className={isDark ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-muted"}
            />
          </div>
          <div className="space-y-2">
            <Label className={labelColor}>{t("planning.form.requestDate")}</Label>
            <Input
              type="date"
              name="planning_request_date"
              value={form.planning_request_date}
              onChange={handleChange}
              className={inputBg}
            />
          </div>
          <div className="space-y-2">
            <Label className={labelColor}>{t("planning.form.yearReference")}</Label>
            <Input
              name="planning_year"
              value={form.planning_year}
              onChange={handleChange}
              className={inputBg}
            />
          </div>
          <div className="space-y-2">
            <Label className={labelColor}>{t("planning.form.description")}</Label>
            <Input
              name="planning_desc"
              value={form.planning_desc}
              onChange={handleChange}
              className={inputBg}
              placeholder={t("planning.form.descriptionPlaceholder")}
            />
          </div>
        </div>

        <div className="flex justify-between items-end gap-4">
          <div className="space-y-2 flex-1">
            <Label className={labelColor}>{t("planning.form.type")}</Label>
            <Input
              name="planning_type"
              value={form.planning_type}
              onChange={handleChange}
              className={inputBg}
              placeholder={t("planning.form.typePlaceholder")}
            />
          </div>
          <div className="w-full md:w-1/4">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white transition-colors"
            >
              {submitting ? t("planning.actions.updating") : t("planning.actions.update")}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}