"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Client } from "@/config/types/evaluation-planning";
import { cn } from "@/lib/utils";
import axios from "axios";
import { Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

interface LUCProcedure {
  luc_procedure_id: number;
  luc_procedure_desc: string;
  luc_procedure_code: string;
}

interface Evaluation {
  evaluation_id: number;
  evaluation_desc: string;
}

export interface AddPlanningFormData {
  fk_luc_procedure_id: number;
  fk_evaluation_id: number;
  planning_folder: string;
  fk_client_id: number;
  planning_status: string;
  planning_request_date: string;
  planning_year: number;
  planning_desc: string;
  planning_type: string;
  planning_ver: string;
  planning_result: string;
}

interface AddPlanningFormProps {
  onSubmit: (data: AddPlanningFormData) => Promise<void>;
  isDark?: boolean;
  submitting: boolean;
}

const STATUS_OPTIONS = [
  { value: "NEW", label: "New planning" },
  { value: "PROCESSING", label: "Under planning" },
  { value: "REQ_FEEDBACK", label: "Under Manager feedback" },
  { value: "POSITIVE_RESULT", label: "Completed Positive" },
  { value: "NEGATIVE_RESULT", label: "Completed Refused" },
];

const AddPlanningForm: React.FC<AddPlanningFormProps> = ({ isDark, onSubmit, submitting }) => {
  const currentYear = new Date().getFullYear();
  const [fetching, setFetching] = useState(true);
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
  const [clients, setClients] = useState<Client[]>([]);

  const [formData, setFormData] = useState<AddPlanningFormData>({
    fk_luc_procedure_id: 0, fk_evaluation_id: 0, fk_client_id: 0,
    planning_folder: "",
    planning_status: "NEW", planning_request_date: new Date().toISOString().split("T")[0],
    planning_year: currentYear, planning_desc: "", planning_type: "",
    planning_ver: "1.0", planning_result: "PROGRESS",
  });

  const [lucProcedures, setLUCProcedures] = useState<LUCProcedure[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      setFetching(true);
      try {
        await Promise.all([loadLUCProcedures(), loadEvaluations(), loadClients()]);
      } finally {
        setFetching(false);
      }
    };
    loadInitialData();
  }, []);

  const loadLUCProcedures = async () => {
    try {
      const res = await axios.get("/api/evaluation/luc-procedures?type=PLANNING");
      setLUCProcedures(res.data.data ?? []);
    } catch (err) { toast.error("Error loading LUC procedures"); }
  };

  const loadClients = async () => {
    try {
      const res = await axios.get("/api/client/list");
      setClients(res.data.data ?? []);
    } catch (err) { toast.error("Error loading clients"); }
  };


  const loadEvaluations = async () => {
    try {
      const res = await axios.get("/api/evaluation");
      setEvaluations(res.data.data?.data ?? []);
    } catch (err) { toast.error("Error loading evaluations"); }
  };
  const updateField = (name: string, value: string | number) =>
    setFormData((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.fk_luc_procedure_id === 0) { toast.error("Please select a LUC procedure"); return; }
    if (formData.fk_evaluation_id === 0) { toast.error("Please select an evaluation"); return; }
    setLoading(true);
    try {
      await onSubmit(formData);
      setFormData({
        fk_luc_procedure_id: 0,
        fk_evaluation_id: 0,
        fk_client_id: 0,
        planning_folder: "",
        planning_status: "NEW", planning_request_date: new Date().toISOString().split("T")[0],
        planning_year: currentYear, planning_desc: "", planning_type: "",
        planning_ver: "1.0", planning_result: "PROGRESS"
      });
    } finally { setLoading(false); }
  };

  const textMuted = isDark ? "text-slate-400" : "text-slate-500";
  const labelCn = cn("text-xs font-medium", isDark ? "text-slate-300" : "text-slate-700");
  const inputCn = cn(isDark
    ? "bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus-visible:ring-violet-500"
    : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-violet-500");
  const selectTriggerCn = cn("h-9", isDark
    ? "bg-slate-700 border-slate-600 text-white focus:ring-violet-500"
    : "bg-white border-slate-300 text-slate-900 focus:ring-violet-500");
  const selectContentCn = cn(isDark
    ? "bg-slate-800 border-slate-700 text-white"
    : "bg-white border-slate-200 text-slate-900");

  return (
    <div className="px-5 py-5">
      <p className={cn("text-xs mb-5", textMuted)}>Fill the form below to create a new planning request.</p>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <p className={cn("text-[11px] font-semibold uppercase tracking-wider mb-3", textMuted)}>Primary References</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className={labelCn}>LUC Procedure <span className="text-red-400">*</span></Label>
              <Select
                disabled={fetching}
                value={formData.fk_luc_procedure_id === 0 ? undefined : String(formData.fk_luc_procedure_id)}
                onValueChange={(val) => updateField("fk_luc_procedure_id", parseInt(val))}
              >
                <SelectTrigger className={selectTriggerCn}>
                  <SelectValue placeholder={fetching ? "Loading procedures..." : "Select LUC Procedure"} />
                </SelectTrigger>
                <SelectContent className={selectContentCn}>
                  {lucProcedures.map((p) => (
                    <SelectItem key={p.luc_procedure_id} value={String(p.luc_procedure_id)}>
                      {p.luc_procedure_code} - {p.luc_procedure_desc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={labelCn}>Evaluation Code <span className="text-red-400">*</span></Label>
              <Select
                disabled={fetching}
                value={formData.fk_evaluation_id === 0 ? undefined : String(formData.fk_evaluation_id)}
                onValueChange={(val) => updateField("fk_evaluation_id", parseInt(val))}
              >
                <SelectTrigger className={selectTriggerCn}>
                  <SelectValue placeholder={fetching ? "Loading evaluations..." : "Select Evaluation"} />
                </SelectTrigger>
                <SelectContent className={selectContentCn}>
                  {evaluations.map((ev) => (
                    <SelectItem key={ev.evaluation_id} value={String(ev.evaluation_id)}>
                      {ev.evaluation_desc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={labelCn}>Client <span className="text-red-400">*</span></Label>
              <Select
                disabled={fetching}
                value={formData.fk_client_id === 0 ? undefined : String(formData.fk_client_id)}
                onValueChange={(val) => updateField("fk_client_id", parseInt(val))}
              >
                <SelectTrigger className={selectTriggerCn}>
                  <SelectValue placeholder={fetching ? "Loading clients..." : "Select Client"} />
                </SelectTrigger>
                <SelectContent className={selectContentCn}>
                  {clients.map((c) => (
                    <SelectItem key={c.client_id} value={String(c.client_id)}>
                      {c.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator className={isDark ? "bg-slate-700" : "bg-slate-200"} />

        <div>
          <p className={cn("text-[11px] font-semibold uppercase tracking-wider mb-3", textMuted)}>Planning Configuration</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className={labelCn}>Folder Docs</Label>
              <Input value={formData.planning_folder} onChange={(e) => updateField("planning_folder", e.target.value)} placeholder="Document folder path" className={cn("h-9", inputCn)} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCn}>Status</Label>
              <Select value={formData.planning_status} onValueChange={(val) => updateField("planning_status", val)}>
                <SelectTrigger className={selectTriggerCn}><SelectValue /></SelectTrigger>
                <SelectContent className={selectContentCn}>
                  {STATUS_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={labelCn}>Request Date <span className="text-red-400">*</span></Label>
              <Input type="date" value={formData.planning_request_date} onChange={(e) => updateField("planning_request_date", e.target.value)} className={cn("h-9", inputCn)} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCn}>Year Reference</Label>
              <Select value={String(formData.planning_year)} onValueChange={(val) => updateField("planning_year", parseInt(val))}>
                <SelectTrigger className={selectTriggerCn}><SelectValue /></SelectTrigger>
                <SelectContent className={selectContentCn}>{yearOptions.map((y) => (<SelectItem key={y} value={String(y)}>{y}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator className={isDark ? "bg-slate-700" : "bg-slate-200"} />

        <div>
          <p className={cn("text-[11px] font-semibold uppercase tracking-wider mb-3", textMuted)}>Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className={labelCn}>Description</Label>
              <Input value={formData.planning_desc} onChange={(e) => updateField("planning_desc", e.target.value)} placeholder="Planning description..." className={cn("h-9", inputCn)} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCn}>Type</Label>
              <Input value={formData.planning_type} onChange={(e) => updateField("planning_type", e.target.value)} placeholder="e.g. STANDARD, CUSTOM" className={cn("h-9", inputCn)} />
            </div>
          </div>
        </div>

        <Separator className={isDark ? "bg-slate-700" : "bg-slate-200"} />

        <div className="flex justify-start">
          <Button type="submit" disabled={loading || submitting} className="bg-violet-600 hover:bg-violet-700 text-white h-9 px-6">
            {loading || submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</>) : "Add New Planning"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddPlanningForm;