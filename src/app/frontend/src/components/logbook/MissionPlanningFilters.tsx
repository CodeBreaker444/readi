'use client';

import { Briefcase, Calendar, FileCheck, Search, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import DateRangePicker from '../common/DateRangePicker';
import FilterDropdown from '../common/FilterDropdown';

interface MissionPlanningFiltersProps {
  ownerId: number;
  filters: {
    clientId: number;
    pilotId: number;
    evaluationId: number;
    planningId: number;
    dateStart: string;
    dateEnd: string;
  };
  onFiltersChange: (filters: any) => void;
}

interface Totals {
  client: number;
  pic: number;
  evaluation: number;
  planning: number;
}

interface Options {
  clients: any[];
  pilots: any[];
  evaluations: any[];
  plannings: any[];
  totals: Totals;
}

export default function MissionPlanningFilters({
  ownerId,
  filters,
  onFiltersChange,
}: MissionPlanningFiltersProps) {
  const [options, setOptions] = useState<Options>({
    clients: [],
    pilots: [],
    evaluations: [],
    plannings: [],
    totals: {
      client: 0,
      pic: 0,
      evaluation: 0,
      planning: 0,
    },
  });

  useEffect(() => {
    loadFilterOptions();
  }, [ownerId]);

  const loadFilterOptions = async () => {
    try {
      const [clients, pilots, evaluations, plannings] = await Promise.all([
        fetch(`/api/clients?ownerId=${ownerId}`).then((r) => r.json()),
        fetch(`/api/pic/list?ownerId=${ownerId}`).then((r) => r.json()),
        fetch(`/api/evaluations?ownerId=${ownerId}`).then((r) => r.json()),
        fetch(`/api/plannings?ownerId=${ownerId}`).then((r) => r.json()),
      ]);

      setOptions({
        clients,
        pilots,
        evaluations,
        plannings,
        totals: {
          client: clients.length,
          pic: pilots.length,
          evaluation: evaluations.length,
          planning: plannings.length,
        },
      });
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const handleDateRangeChange = (start: string, end: string) => {
    onFiltersChange({ ...filters, dateStart: start, dateEnd: end });
  };

  const handleFilterChange = (key: string, value: number) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleSearch = () => {
    window.dispatchEvent(
      new CustomEvent('mission-planning-filters-changed', { detail: filters })
    );
  };

  const handleReset = () => {
    onFiltersChange({
      clientId: 0,
      pilotId: 0,
      evaluationId: 0,
      planningId: 0,
      dateStart: '',
      dateEnd: '',
    });
  };

  return (
    <>
      <div className="space-y-2">
        <label className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
          <span className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Client
          </span>
          <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
            {options.totals.client}
          </span>
        </label>
        <FilterDropdown
          id="client_id"
          value={filters.clientId}
          options={options.clients}
          onChange={(value) => handleFilterChange('clientId', value)}
          placeholder="Select Client"
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Pilot in Command
          </span>
          <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full">
            {options.totals.pic}
          </span>
        </label>
        <FilterDropdown
          id="pilot_id"
          value={filters.pilotId}
          options={options.pilots}
          onChange={(value) => handleFilterChange('pilotId', value)}
          placeholder="Select PiC"
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
          <span className="flex items-center gap-2">
            <FileCheck className="w-4 h-4" />
            Evaluation
          </span>
          <span className="px-2 py-0.5 text-xs font-semibold bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full">
            {options.totals.evaluation}
          </span>
        </label>
        <FilterDropdown
          id="evaluation_id"
          value={filters.evaluationId}
          options={options.evaluations}
          onChange={(value) => handleFilterChange('evaluationId', value)}
          placeholder="Select Evaluation"
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Planning
          </span>
          <span className="px-2 py-0.5 text-xs font-semibold bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded-full">
            {options.totals.planning}
          </span>
        </label>
        <FilterDropdown
          id="planning_id"
          value={filters.planningId}
          options={options.plannings}
          onChange={(value) => handleFilterChange('planningId', value)}
          placeholder="Select Planning"
        />
      </div>

      <div className="space-y-2 col-span-full md:col-span-2">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Calendar className="w-4 h-4" />
          Last Update Date Range
        </label>
        <DateRangePicker
          startDate={filters.dateStart}
          endDate={filters.dateEnd}
          onChange={handleDateRangeChange}
        />
      </div>

      <div className="flex items-end gap-3 col-span-full md:col-span-2">
        <button
          type="button"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm"
          onClick={handleSearch}
        >
          <Search className="w-4 h-4" />
          Search
        </button>
        <button
          type="button"
          className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors duration-200"
          onClick={handleReset}
        >
          Reset
        </button>
      </div>
    </>
  );
}