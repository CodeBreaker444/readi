'use client';

import { Activity, Briefcase, Calendar, CheckCircle, Drone, FolderTree, Search, Target, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import DateRangePicker from '../common/DateRangePicker';
import FilterDropdown from '../common/FilterDropdown';

interface FlightLogbookFiltersProps {
  ownerId: number;
  filters: {
    dateStart: string;
    dateEnd: string;
    pilotId: number;
    missionPlan: number;
    missionTypeId: number;
    missionCategoryId: number;
    droneSystemId: number;
    missionResultId: number;
    missionStatusId: number;
    clientId: number;
  };
  onFiltersChange: (filters: any) => void;
}

interface Totals {
  pic: number;
  missionType: number;
  missionCategory: number;
  droneSystem: number;
  missionResult: number;
  missionStatus: number;
  client: number;
}

interface Options {
  pilots: any[];
  missionPlans: any[];
  missionTypes: any[];
  missionCategories: any[];
  droneSystems: any[];
  missionResults: any[];
  missionStatuses: any[];
  clients: any[];
  totals: Totals;
}

// Sample data for demonstration
const SAMPLE_DATA = {
  pilots: [
    { id: 1, name: 'John Anderson' },
    { id: 2, name: 'Sarah Mitchell' },
    { id: 3, name: 'Michael Chen' },
    { id: 4, name: 'Emma Rodriguez' },
  ],
  missionPlans: [
    { id: 1, name: 'Urban Mapping 2024' },
    { id: 2, name: 'Infrastructure Inspection' },
    { id: 3, name: 'Agricultural Survey' },
  ],
  missionTypes: [
    { id: 1, name: 'Aerial Photography' },
    { id: 2, name: 'Survey & Mapping' },
    { id: 3, name: 'Inspection' },
    { id: 4, name: 'Surveillance' },
  ],
  missionCategories: [
    { id: 1, name: 'Commercial' },
    { id: 2, name: 'Research' },
    { id: 3, name: 'Emergency Response' },
  ],
  droneSystems: [
    { id: 1, name: 'DJI Phantom 4 Pro' },
    { id: 2, name: 'DJI Mavic 3 Enterprise' },
    { id: 3, name: 'Autel EVO II Pro' },
    { id: 4, name: 'Parrot Anafi USA' },
  ],
  missionResults: [
    { id: 1, name: 'Success' },
    { id: 2, name: 'Partial Success' },
    { id: 3, name: 'Failed' },
    { id: 4, name: 'Aborted' },
  ],
  missionStatuses: [
    { id: 1, name: 'Completed' },
    { id: 2, name: 'In Progress' },
    { id: 3, name: 'Pending' },
    { id: 4, name: 'Cancelled' },
  ],
  clients: [
    { id: 1, name: 'City Planning Department' },
    { id: 2, name: 'Green Energy Corp' },
    { id: 3, name: 'Infrastructure Group' },
    { id: 4, name: 'Agricultural Solutions Inc' },
  ],
};

export default function FlightLogbookFilters({
  ownerId,
  filters,
  onFiltersChange,
}: FlightLogbookFiltersProps) {
  const [options, setOptions] = useState<Options>({
    pilots: [],
    missionPlans: [],
    missionTypes: [],
    missionCategories: [],
    droneSystems: [],
    missionResults: [],
    missionStatuses: [],
    clients: [],
    totals: {
      pic: 0,
      missionType: 0,
      missionCategory: 0,
      droneSystem: 0,
      missionResult: 0,
      missionStatus: 0,
      client: 0,
    },
  });

  useEffect(() => {
    loadFilterOptions();
  }, [ownerId]);

  const loadFilterOptions = async () => {
    try {
      setOptions({
        pilots: SAMPLE_DATA.pilots,
        missionPlans: SAMPLE_DATA.missionPlans,
        missionTypes: SAMPLE_DATA.missionTypes,
        missionCategories: SAMPLE_DATA.missionCategories,
        droneSystems: SAMPLE_DATA.droneSystems,
        missionResults: SAMPLE_DATA.missionResults,
        missionStatuses: SAMPLE_DATA.missionStatuses,
        clients: SAMPLE_DATA.clients,
        totals: {
          pic: SAMPLE_DATA.pilots.length,
          missionType: SAMPLE_DATA.missionTypes.length,
          missionCategory: SAMPLE_DATA.missionCategories.length,
          droneSystem: SAMPLE_DATA.droneSystems.length,
          missionResult: SAMPLE_DATA.missionResults.length,
          missionStatus: SAMPLE_DATA.missionStatuses.length,
          client: SAMPLE_DATA.clients.length,
        },
      });

      /*
      const [pilots, missionPlans, missionTypes, missionCategories, droneSystems, missionResults, missionStatuses, clients] = 
        await Promise.all([
          fetch(`/api/pic/list?ownerId=${ownerId}`).then((r) => r.json()),
          fetch(`/api/planning/templates?ownerId=${ownerId}`).then((r) => r.json()),
          fetch(`/api/mission-types?ownerId=${ownerId}`).then((r) => r.json()),
          fetch(`/api/mission-categories?ownerId=${ownerId}`).then((r) => r.json()),
          fetch(`/api/drone-systems?ownerId=${ownerId}`).then((r) => r.json()),
          fetch(`/api/mission-results?ownerId=${ownerId}`).then((r) => r.json()),
          fetch(`/api/mission-statuses?ownerId=${ownerId}`).then((r) => r.json()),
          fetch(`/api/clients?ownerId=${ownerId}`).then((r) => r.json()),
        ]);
      */
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
      new CustomEvent('logbook-filters-changed', { detail: filters })
    );
  };

  const handleReset = () => {
    onFiltersChange({
      dateStart: '',
      dateEnd: '',
      pilotId: 0,
      missionPlan: 0,
      missionTypeId: 0,
      missionCategoryId: 0,
      droneSystemId: 0,
      missionResultId: 0,
      missionStatusId: 0,
      clientId: 0,
    });
  };

  return (
    <>
      {/* Date Range */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Calendar className="w-4 h-4 text-gray-500" />
          Mission Date Range
        </label>
        <DateRangePicker
          startDate={filters.dateStart}
          endDate={filters.dateEnd}
          onChange={handleDateRangeChange}
        />
      </div>

      {/* PiC */}
      <div className="space-y-2">
        <label className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            Pilot in Command
          </span>
          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-full">
            {options.totals.pic}
          </span>
        </label>
        <FilterDropdown
          id="filter_pilot_id"
          value={filters.pilotId}
          options={options.pilots}
          onChange={(value) => handleFilterChange('pilotId', value)}
          placeholder="Select PiC"
        />
      </div>

      {/* Mission Plan */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <FolderTree className="w-4 h-4 text-gray-500" />
          Mission Plan
        </label>
        <FilterDropdown
          id="filter_mission_plan"
          value={filters.missionPlan}
          options={options.missionPlans}
          onChange={(value) => handleFilterChange('missionPlan', value)}
          placeholder="Select Plan"
        />
      </div>

      {/* Mission Type */}
      <div className="space-y-2">
        <label className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
          <span className="flex items-center gap-2">
            <Target className="w-4 h-4 text-gray-500" />
            Mission Type
          </span>
          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-full">
            {options.totals.missionType}
          </span>
        </label>
        <FilterDropdown
          id="filter_mission_type_id"
          value={filters.missionTypeId}
          options={options.missionTypes}
          onChange={(value) => handleFilterChange('missionTypeId', value)}
          placeholder="Select Type"
        />
      </div>

      {/* Mission Category */}
      <div className="space-y-2">
        <label className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
          <span className="flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-gray-500" />
            Mission Category
          </span>
          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-full">
            {options.totals.missionCategory}
          </span>
        </label>
        <FilterDropdown
          id="filter_mission_category_id"
          value={filters.missionCategoryId}
          options={options.missionCategories}
          onChange={(value) => handleFilterChange('missionCategoryId', value)}
          placeholder="Select Category"
        />
      </div>

      {/* Drone System */}
      <div className="space-y-2">
        <label className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
          <span className="flex items-center gap-2">
            <Drone className="w-4 h-4 text-gray-500" />
            Drone System
          </span>
          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-full">
            {options.totals.droneSystem}
          </span>
        </label>
        <FilterDropdown
          id="filter_droneSystem_id"
          value={filters.droneSystemId}
          options={options.droneSystems}
          onChange={(value) => handleFilterChange('droneSystemId', value)}
          placeholder="Select System"
        />
      </div>

      {/* Mission Result */}
      <div className="space-y-2">
        <label className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
          <span className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-gray-500" />
            Mission Result
          </span>
          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-full">
            {options.totals.missionResult}
          </span>
        </label>
        <FilterDropdown
          id="filter_mission_result_id"
          value={filters.missionResultId}
          options={options.missionResults}
          onChange={(value) => handleFilterChange('missionResultId', value)}
          placeholder="Select Result"
        />
      </div>

      {/* Mission Status */}
      <div className="space-y-2">
        <label className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
          <span className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-500" />
            Mission Status
          </span>
          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-full">
            {options.totals.missionStatus}
          </span>
        </label>
        <FilterDropdown
          id="filter_mission_status_id"
          value={filters.missionStatusId}
          options={options.missionStatuses}
          onChange={(value) => handleFilterChange('missionStatusId', value)}
          placeholder="Select Status"
        />
      </div>

      {/* Client */}
      <div className="space-y-2">
        <label className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
          <span className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-gray-500" />
            Client
          </span>
          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-full">
            {options.totals.client}
          </span>
        </label>
        <FilterDropdown
          id="filter_client_id"
          value={filters.clientId}
          options={options.clients}
          onChange={(value) => handleFilterChange('clientId', value)}
          placeholder="Select Client"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-end gap-3 col-span-full lg:col-span-3">
        <button
          type="button"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm"
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