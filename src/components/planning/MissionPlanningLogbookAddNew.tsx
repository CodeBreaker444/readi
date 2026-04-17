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
import { Textarea } from "@/components/ui/textarea";
import { DroneTool } from "@/config/types/evaluation-planning";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface MissionPlanningLogbookAddNewProps {
  isDark: boolean;
  planningId: number;
  evaluationId: number;
  clientId: number;
  droneTools: DroneTool[];
  onSubmit: (formData: FormData) => Promise<{ success: boolean }>;
  defaultLimitJson?: string;
}

export default function MissionPlanningLogbookAddNew({
  isDark,
  planningId,
  evaluationId,
  clientId,
  droneTools = [],
  onSubmit,
  defaultLimitJson = "",
}: MissionPlanningLogbookAddNewProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    mission_planning_code: "",
    mission_planning_desc: "",
    mission_planning_limit_json: defaultLimitJson,
    mission_planning_active: "N",
    mission_planning_ver: "",
    mission_planning_tool: "0",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
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
      const formData = new FormData();
      formData.append("fk_planning_id", String(planningId));
      formData.append("fk_evaluation_id", String(evaluationId));
      formData.append("fk_client_id", String(clientId));
      Object.entries(form).forEach(([key, val]) => formData.append(key, val));
      if (fileInputRef.current?.files?.[0]) {
        formData.append("mission_planning_file", fileInputRef.current.files[0]);
      }
      const result = await onSubmit(formData);
      if (result?.success) {
        setForm({
          mission_planning_code: "",
          mission_planning_desc: "",
          mission_planning_limit_json: defaultLimitJson,
          mission_planning_active: "N",
          mission_planning_ver: "",
          mission_planning_tool: "0",
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } finally {
      setSubmitting(false);
    }
  };

  const labelStyle = isDark ? "text-slate-400" : "text-slate-700";
  const inputStyle = isDark
    ? "bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-600 focus:ring-violet-500"
    : "bg-white";

  return (
    <div className={`p-4 space-y-4 ${isDark ? "bg-slate-900/50" : "bg-transparent"}`}>
      <p className={`text-sm ${isDark ? "text-slate-500" : "text-muted-foreground"}`}>
        {t("planning.missionPlanning.fillForm")}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-1 space-y-2">
            <Label className={labelStyle}>{t("planning.form.missionCode")}</Label>
            <Input
              name="mission_planning_code"
              value={form.mission_planning_code}
              onChange={handleChange}
              className={inputStyle}
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label className={labelStyle}>{t("planning.form.description")}</Label>
            <Input
              name="mission_planning_desc"
              value={form.mission_planning_desc}
              onChange={handleChange}
              className={inputStyle}
            />
          </div>
          <div className="md:col-span-3 space-y-2">
            <Label className={labelStyle}>{t("planning.form.missionOperationLimits")}</Label>
            <Textarea
              name="mission_planning_limit_json"
              rows={4}
              value={form.mission_planning_limit_json}
              onChange={handleChange}
              className={`${inputStyle} font-mono text-xs`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-1 space-y-2">
            <Label className={labelStyle}>{t("planning.form.active")}</Label>
            <Select
              value={form.mission_planning_active}
              onValueChange={(val) => handleSelectChange("mission_planning_active", val)}
            >
              <SelectTrigger className={inputStyle}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={isDark ? "bg-slate-900 border-slate-800 text-slate-200" : ""}>
                <SelectItem value="N">{t("planning.form.no")}</SelectItem>
                <SelectItem value="Y">{t("planning.form.yes")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label className={labelStyle}>{t("planning.form.version")}</Label>
            <Input
              name="mission_planning_ver"
              value={form.mission_planning_ver}
              onChange={handleChange}
              className={inputStyle}
            />
          </div>
          <div className="md:col-span-3 space-y-2">
            <Label className={labelStyle}>{t("planning.form.drone")}</Label>
            <Select
              value={form.mission_planning_tool}
              onValueChange={(val) => handleSelectChange("mission_planning_tool", val)}
            >
              <SelectTrigger className={inputStyle}>
                <SelectValue placeholder={t("planning.form.selectDrone")} />
              </SelectTrigger>

              <SelectContent className={isDark ? "bg-slate-900 border-slate-800 text-slate-200" : ""}>
                <SelectItem value="0" className="text-muted-foreground opacity-70">
                  {t("planning.form.selectDrone")}
                </SelectItem>

                {droneTools.map((tool) => (
                  <SelectItem key={tool.tool_id} value={String(tool.tool_id)}>
                    <div className="flex flex-col">
                      <span className="font-medium">{tool.tool_code}</span>
                      <span className="text-[10px] opacity-60">{tool.tool_desc}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div className="space-y-2">
            <Label className={labelStyle}>{t("planning.form.uploadFile")}</Label>
            <Input
              type="file"
              ref={fileInputRef}
              name="mission_planning_file"
              className={`${inputStyle} file:text-black file:font-medium cursor-pointer file:border-0 file:bg-transparent`}
            />
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full md:w-auto bg-violet-600 hover:bg-violet-700 text-white transition-all px-8"
            >
              {submitting ? t("planning.actions.adding") : t("planning.missionPlanning.addNewEntry")}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}