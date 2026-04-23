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
import {
    ClientOption,
    DroneOption,
    MissionCategoryOption,
    MissionPlanOption,
    MissionResultOption,
    MissionStatusOption,
    MissionTypeOption,
    OperationFilterParams,
    PilotOption,
} from "@/config/types/logbook";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface OperationFilterPanelProps {
  pilots: PilotOption[];
  clients: ClientOption[];
  drones: DroneOption[];
  missionTypes: MissionTypeOption[];
  missionCategories: MissionCategoryOption[];
  missionResults: MissionResultOption[];
  missionStatuses: MissionStatusOption[];
  missionPlans: MissionPlanOption[];
  loading: boolean;
  isDark: boolean;
  onSearch: (params: Partial<OperationFilterParams>) => void;
}

const NONE = "0";

export function OperationFilterPanel({
  pilots,
  clients,
  drones,
  missionTypes,
  missionCategories,
  missionResults,
  missionStatuses,
  missionPlans,
  loading,
  isDark,
  onSearch,
}: OperationFilterPanelProps) {
  const { t } = useTranslation();
  const [picId, setPicId] = useState(NONE);
  const [clientId, setClientId] = useState(NONE);
  const [droneId, setDroneId] = useState(NONE);
  const [typeId, setTypeId] = useState(NONE);
  const [categoryId, setCategoryId] = useState(NONE);
  const [resultId, setResultId] = useState(NONE);
  const [statusId, setStatusId] = useState(NONE);
  const [planId, setPlanId] = useState(NONE);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  const handleSearch = () => {
    onSearch({
      pic_id: parseInt(picId) || 0,
      client_id: parseInt(clientId) || 0,
      vehicle_id: parseInt(droneId) || 0,
      mission_type_id: parseInt(typeId) || 0,
      mission_category_id: parseInt(categoryId) || 0,
      mission_result_id: parseInt(resultId) || 0,
      mission_status_id: parseInt(statusId) || 0,
      mission_plan_id: parseInt(planId) || 0,
      date_start: dateStart || undefined,
      date_end: dateEnd || undefined,
    });
  };

  const handleReset = () => {
    setPicId(NONE);
    setClientId(NONE);
    setDroneId(NONE);
    setTypeId(NONE);
    setCategoryId(NONE);
    setResultId(NONE);
    setStatusId(NONE);
    setPlanId(NONE);
    setDateStart("");
    setDateEnd("");
    onSearch({});
  };

  return (
    <div
      className={`rounded-xl border p-5 transition-colors ${
        isDark
          ? "border-slate-800 bg-slate-900/60 backdrop-blur-sm"
          : "border-slate-200 bg-white shadow-sm"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <SlidersHorizontal
          className={`h-4 w-4 ${isDark ? "text-slate-400" : "text-slate-500"}`}
        />
        <h2
          className={`text-sm font-semibold tracking-wide uppercase ${
            isDark ? "text-slate-300" : "text-slate-600"
          }`}
        >
          {t('logbooks.operationLogbook.filter.title')}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {/* Date Start */}
        <div className="space-y-1.5">
          <Label
            className={`text-[11px] font-medium uppercase tracking-wider ${
              isDark ? "text-slate-500" : "text-slate-400"
            }`}
          >
            {t('logbooks.operationLogbook.filter.dateStart')}
          </Label>
          <Input
            type="date"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
            className={`h-8 text-xs transition-colors ${
              isDark
                ? "bg-slate-800/60 border-slate-700 text-slate-200 focus:border-violet-500 focus:ring-violet-500/20"
                : "bg-white border-slate-200 text-slate-800 focus:border-violet-400 focus:ring-violet-400/20"
            }`}
          />
        </div>

        {/* Date End */}
        <div className="space-y-1.5">
          <Label
            className={`text-[11px] font-medium uppercase tracking-wider ${
              isDark ? "text-slate-500" : "text-slate-400"
            }`}
          >
            {t('logbooks.operationLogbook.filter.dateEnd')}
          </Label>
          <Input
            type="date"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            className={`h-8 text-xs transition-colors ${
              isDark
                ? "bg-slate-800/60 border-slate-700 text-slate-200 focus:border-violet-500 focus:ring-violet-500/20"
                : "bg-white border-slate-200 text-slate-800 focus:border-violet-400 focus:ring-violet-400/20"
            }`}
          />
        </div>

        <FilterSelect label={t('logbooks.operationLogbook.filter.pic')} allLabel={t('logbooks.operationLogbook.filter.all')} value={picId} onChange={setPicId} isDark={isDark}
          options={pilots.map((p) => ({ value: String(p.user_id), label: `${p.fullname} [${p.pilot_status_desc}]` }))}
        />
        <FilterSelect label={t('logbooks.operationLogbook.filter.client')} allLabel={t('logbooks.operationLogbook.filter.all')} value={clientId} onChange={setClientId} isDark={isDark}
          options={clients.map((c) => ({ value: String(c.client_id), label: c.client_name }))}
        />
        <FilterSelect label={t('logbooks.operationLogbook.filter.droneSystem')} allLabel={t('logbooks.operationLogbook.filter.all')} value={droneId} onChange={setDroneId} isDark={isDark}
          options={drones.map((d) => ({ value: String(d.tool_id), label: `${d.tool_code} — ${d.tool_desc}` }))}
        />
        <FilterSelect label={t('logbooks.operationLogbook.filter.missionType')} allLabel={t('logbooks.operationLogbook.filter.all')} value={typeId} onChange={setTypeId} isDark={isDark}
          options={missionTypes.map((mt) => ({ value: String(mt.mission_type_id), label: mt.mission_type_desc }))}
        />
        <FilterSelect label={t('logbooks.operationLogbook.filter.category')} allLabel={t('logbooks.operationLogbook.filter.all')} value={categoryId} onChange={setCategoryId} isDark={isDark}
          options={missionCategories.map((c) => ({ value: String(c.mission_category_id), label: c.mission_category_desc }))}
        />
        <FilterSelect label={t('logbooks.operationLogbook.filter.status')} allLabel={t('logbooks.operationLogbook.filter.all')} value={statusId} onChange={setStatusId} isDark={isDark}
          options={missionStatuses.map((s) => ({ value: String(s.mission_status_id), label: s.mission_status_desc }))}
        />
        <FilterSelect label={t('logbooks.operationLogbook.filter.result')} allLabel={t('logbooks.operationLogbook.filter.all')} value={resultId} onChange={setResultId} isDark={isDark}
          options={missionResults.map((r) => ({ value: String(r.mission_result_id), label: r.mission_result_desc }))}
        />
        <FilterSelect label={t('logbooks.operationLogbook.filter.missionPlan')} allLabel={t('logbooks.operationLogbook.filter.all')} value={planId} onChange={setPlanId} isDark={isDark}
          options={missionPlans.map((p) => ({ value: String(p.mission_planning_id), label: `${p.mission_planning_code} — ${p.mission_planning_desc}` }))}
        />
      </div>

      {/* Actions */}
      <div
        className={`flex items-center gap-2 mt-5 pt-4 border-t ${
          isDark ? "border-slate-800" : "border-slate-200"
        }`}
      >
        <Button
          onClick={handleSearch}
          disabled={loading}
          size="sm"
          className={`h-8 gap-1.5 text-xs font-medium ${
            isDark
              ? "bg-violet-600 hover:bg-violet-500 text-white"
              : "bg-violet-600 hover:bg-violet-700 text-white"
          }`}
        >
          <Search className="h-3.5 w-3.5" />
          {t('logbooks.operationLogbook.filter.search')}
        </Button>
        <Button
          onClick={handleReset}
          disabled={loading}
          variant="outline"
          size="sm"
          className={`h-8 gap-1.5 text-xs transition-all ${
            isDark
              ? "border-slate-700 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
              : "border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <X className="h-3.5 w-3.5" />
          {t('logbooks.operationLogbook.filter.reset')}
        </Button>
      </div>
    </div>
  );
}

// ─── Reusable Select ──────────────────────────────────────────────────────────

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
          className={`${
            isDark
              ? "bg-slate-900 border-slate-700 text-slate-200"
              : "bg-white border-slate-200 text-slate-800"
          }`}
        >
          <SelectItem
            value="0"
            className={`text-xs ${isDark ? "text-slate-400" : "text-slate-400"}`}
          >
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