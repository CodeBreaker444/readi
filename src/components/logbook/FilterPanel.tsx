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
import { ClientOption, EvaluationOption, PilotOption, PlanningOption } from "@/config/types/logbook";
import { RotateCcw, Search } from "lucide-react";
import { useState } from "react";
 

interface FilterPanelProps {
  clients: ClientOption[];
  pilots: PilotOption[];
  evaluations: EvaluationOption[];
  plannings: PlanningOption[];
  loading: boolean;
  onSearch: (params: {
    client_id?: number;
    user_id?: number;
    evaluation_id?: number;
    planning_id?: number;
    date_start?: string;
    date_end?: string;
  }) => void;
  isDark: boolean;
}

export function FilterPanel({
  clients,
  pilots,
  evaluations,
  plannings,
  loading,
  onSearch,
  isDark,  
}: FilterPanelProps & { isDark: boolean }) {
  const [clientId, setClientId] = useState("0");
  const [pilotId, setPilotId] = useState("0");
  const [evaluationId, setEvaluationId] = useState("0");
  const [planningId, setPlanningId] = useState("0");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  const handleSearch = () => {
    onSearch({
      client_id: parseInt(clientId) || 0,
      user_id: parseInt(pilotId) || 0,
      evaluation_id: parseInt(evaluationId) || 0,
      planning_id: parseInt(planningId) || 0,
      date_start: dateStart || undefined,
      date_end: dateEnd || undefined,
    });
  };

  const handleReset = () => {
    setClientId("0");
    setPilotId("0");
    setEvaluationId("0");
    setPlanningId("0");
    setDateStart("");
    setDateEnd("");
    onSearch({});
};

const containerClass = isDark ? "bg-slate-800 border-slate-700 shadow-xl" : "bg-white border-slate-200 shadow-sm";
  const labelClass = isDark ? "text-slate-400" : "text-slate-500";
  const inputBgClass = isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-gray-900";
  const badgeClass = isDark ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600";

  return (
    <div className={`rounded-xl border p-5 transition-all ${containerClass}`}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label className={`text-[10px] font-bold uppercase tracking-widest ${labelClass}`}>
            Client
            <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${badgeClass}`}>
              {clients.length}
            </span>
          </Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className={`h-9 text-sm focus:ring-blue-500/20 ${inputBgClass}`}>
              <SelectValue placeholder="All clients" />
            </SelectTrigger>
            <SelectContent className={isDark ? "bg-slate-800 border-slate-700 text-white" : ""}>
              <SelectItem value="0">All clients</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.client_id} value={String(c.client_id)}>
                  {c.client_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className={`text-[10px] font-bold uppercase tracking-widest ${labelClass}`}>
            PiC
            <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${badgeClass}`}>
              {pilots.length}
            </span>
          </Label>
          <Select value={pilotId} onValueChange={setPilotId}>
            <SelectTrigger className={`h-9 text-sm focus:ring-blue-500/20 ${inputBgClass}`}>
              <SelectValue placeholder="All pilots" />
            </SelectTrigger>
            <SelectContent className={isDark ? "bg-slate-800 border-slate-700 text-white" : ""}>
              <SelectItem value="0">All pilots</SelectItem>
              {pilots.map((p) => (
                <SelectItem key={p.user_id} value={String(p.user_id)}>
                  {p.fullname} {p.pilot_status_desc ? `[${p.pilot_status_desc}]` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className={`text-[10px] font-bold uppercase tracking-widest ${labelClass}`}>
            Evaluation
          </Label>
          <Select value={evaluationId} onValueChange={setEvaluationId}>
            <SelectTrigger className={`h-9 text-sm focus:ring-blue-500/20 ${inputBgClass}`}>
              <SelectValue placeholder="All evaluations" />
            </SelectTrigger>
            <SelectContent className={isDark ? "bg-slate-800 border-slate-700 text-white" : ""}>
              <SelectItem value="0">All evaluations</SelectItem>
              {evaluations.map((e) => (
                <SelectItem key={e.evaluation_id} value={String(e.evaluation_id)}>
                  {e.evaluation_desc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className={`text-[10px] font-bold uppercase tracking-widest ${labelClass}`}>
            Planning
          </Label>
          <Select value={planningId} onValueChange={setPlanningId}>
            <SelectTrigger className={`h-9 text-sm focus:ring-blue-500/20 ${inputBgClass}`}>
              <SelectValue placeholder="All plannings" />
            </SelectTrigger>
            <SelectContent className={isDark ? "bg-slate-800 border-slate-700 text-white" : ""}>
              <SelectItem value="0">All plannings</SelectItem>
              {plannings.map((p) => (
                <SelectItem key={p.planning_id} value={String(p.planning_id)}>
                  {p.planning_desc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className={`text-[10px] font-bold uppercase tracking-widest ${labelClass}`}>Update From</Label>
          <Input
            type="date"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
            className={`h-9 text-sm focus-visible:ring-blue-500/20 ${inputBgClass} [color-scheme:${isDark ? 'dark' : 'light'}]`}
          />
        </div>

        <div className="space-y-1.5">
          <Label className={`text-[10px] font-bold uppercase tracking-widest ${labelClass}`}>Update To</Label>
          <Input
            type="date"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            className={`h-9 text-sm focus-visible:ring-blue-500/20 ${inputBgClass} [color-scheme:${isDark ? 'dark' : 'light'}]`}
          />
        </div>

        <div className="flex items-end gap-2 sm:col-span-2">
          <Button
            onClick={handleSearch}
            disabled={loading}
            className="h-9 gap-1.5 bg-blue-600 px-6 text-sm hover:bg-blue-500 shadow-lg shadow-blue-500/20"
          >
            <Search className="h-3.5 w-3.5" /> Search
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={loading}
            className={`h-9 gap-1.5 px-6 text-sm ${isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        </div>
      </div>
    </div>
  );
}