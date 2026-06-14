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
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface FilterPanelProps {
  clients: ClientOption[];
  pilots: PilotOption[];
  evaluations: EvaluationOption[];
  plannings: PlanningOption[];
  loading: boolean;
  isDark: boolean;
  onSearch: (params: {
    client_id?: number;
    user_id?: number;
    evaluation_id?: number;
    planning_id?: number;
    date_start?: string;
    date_end?: string;
  }) => void;
}

const NONE = "0";

export function FilterPanel({
  clients,
  pilots,
  evaluations,
  plannings,
  loading,
  isDark,
  onSearch,
}: FilterPanelProps) {
  const { t } = useTranslation();
  const [clientId, setClientId] = useState(NONE);
  const [pilotId, setPilotId] = useState(NONE);
  const [evaluationId, setEvaluationId] = useState(NONE);
  const [planningId, setPlanningId] = useState(NONE);
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
    setClientId(NONE);
    setPilotId(NONE);
    setEvaluationId(NONE);
    setPlanningId(NONE);
    setDateStart("");
    setDateEnd("");
    onSearch({});
  };

  const inputCls = `h-8 text-xs transition-colors ${
    isDark
      ? "bg-slate-800/60 border-slate-700 text-slate-200 focus:border-violet-500 focus:ring-violet-500/20"
      : "bg-white border-slate-200 text-slate-800 focus:border-violet-400 focus:ring-violet-400/20"
  }`;

  const allLabel = t('logbooks.missionPlanning.filter.all');

  return (
    <div
      className={`rounded-xl border p-5 transition-colors ${
        isDark
          ? "border-slate-800 bg-slate-900/60 backdrop-blur-sm"
          : "border-slate-200 bg-white shadow-sm"
      }`}
    >
      <div className="flex items-center gap-2 mb-4">
        <SlidersHorizontal className={`h-4 w-4 ${isDark ? "text-slate-400" : "text-slate-500"}`} />
        <h2 className={`text-sm font-semibold tracking-wide uppercase ${isDark ? "text-slate-300" : "text-slate-600"}`}>
          {t('logbooks.missionPlanning.filter.title')}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {/* Date Start */}
        <div className="space-y-1.5">
          <Label className={`text-[11px] font-medium uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            {t('logbooks.missionPlanning.filter.updateFrom')}
          </Label>
          <Input
            type="date"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Date End */}
        <div className="space-y-1.5">
          <Label className={`text-[11px] font-medium uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            {t('logbooks.missionPlanning.filter.updateTo')}
          </Label>
          <Input
            type="date"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            className={inputCls}
          />
        </div>

        <FilterSelect
          label={t('logbooks.missionPlanning.filter.client')}
          allLabel={allLabel}
          value={clientId}
          onChange={setClientId}
          isDark={isDark}
          options={clients.map((c) => ({ value: String(c.client_id), label: c.client_name }))}
        />

        <FilterSelect
          label={t('logbooks.missionPlanning.filter.pic')}
          allLabel={allLabel}
          value={pilotId}
          onChange={setPilotId}
          isDark={isDark}
          options={pilots.map((p) => ({ value: String(p.user_id), label: p.fullname }))}
        />

        <FilterSelect
          label={t('logbooks.missionPlanning.filter.evaluation')}
          allLabel={allLabel}
          value={evaluationId}
          onChange={setEvaluationId}
          isDark={isDark}
          options={evaluations.map((e) => ({ value: String(e.evaluation_id), label: e.evaluation_desc }))}
        />

        <FilterSelect
          label={t('logbooks.missionPlanning.filter.planning')}
          allLabel={allLabel}
          value={planningId}
          onChange={setPlanningId}
          isDark={isDark}
          options={plannings.map((p) => ({ value: String(p.planning_id), label: p.planning_desc }))}
        />
      </div>

      <div
        className={`flex items-center gap-2 mt-5 pt-4 border-t ${
          isDark ? "border-slate-800" : "border-slate-200"
        }`}
      >
        <Button
          onClick={handleSearch}
          disabled={loading}
          size="sm"
          className={`h-8 cursor-pointer gap-1.5 text-xs font-medium ${
            isDark
              ? "bg-violet-600 hover:bg-violet-500 text-white"
              : "bg-violet-600 hover:bg-violet-700 text-white"
          }`}
        >
          <Search className="h-3.5 w-3.5" />
          {t('logbooks.missionPlanning.filter.search')}
        </Button>
        <Button
          onClick={handleReset}
          disabled={loading}
          variant="outline"
          size="sm"
          className={`h-8 cursor-pointer gap-1.5 text-xs transition-all ${
            isDark
              ? "border-slate-700 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
              : "border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <X className="h-3.5 w-3.5" />
          {t('logbooks.missionPlanning.filter.reset')}
        </Button>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  allLabel,
  value,
  onChange,
  options,
  isDark,
}: {
  label: string;
  allLabel: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  isDark: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        className={`text-[11px] font-medium uppercase tracking-wider ${
          isDark ? "text-slate-500" : "text-slate-400"
        }`}
      >
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          className={`h-8 text-xs transition-colors ${
            isDark
              ? "bg-slate-800/60 border-slate-700 text-slate-300 focus:ring-violet-500/20 focus:border-violet-500"
              : "bg-white border-slate-200 text-slate-700 focus:ring-violet-400/20 focus:border-violet-400"
          }`}
        >
          <SelectValue placeholder={allLabel} />
        </SelectTrigger>
        <SelectContent
          className={
            isDark
              ? "bg-slate-900 border-slate-700 text-slate-200"
              : "bg-white border-slate-200 text-slate-800"
          }
        >
          <SelectItem value="0" className={`text-xs ${isDark ? "text-slate-400" : "text-slate-400"}`}>
            {allLabel}
          </SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
