'use client';

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
      const [
        pilots,
        missionPlans,
        missionTypes,
        missionCategories,
        droneSystems,
        missionResults,
        missionStatuses,
        clients,
      ] = await Promise.all([
        fetch(`/api/pic/list?ownerId=${ownerId}`).then((r) => r.json()),
        fetch(`/api/planning/templates?ownerId=${ownerId}`).then((r) => r.json()),
        fetch(`/api/mission-types?ownerId=${ownerId}`).then((r) => r.json()),
        fetch(`/api/mission-categories?ownerId=${ownerId}`).then((r) => r.json()),
        fetch(`/api/drone-systems?ownerId=${ownerId}`).then((r) => r.json()),
        fetch(`/api/mission-results?ownerId=${ownerId}`).then((r) => r.json()),
        fetch(`/api/mission-statuses?ownerId=${ownerId}`).then((r) => r.json()),
        fetch(`/api/clients?ownerId=${ownerId}`).then((r) => r.json()),
      ]);

     setOptions({
    pilots,
    missionPlans,
    missionTypes,
    missionCategories,
    droneSystems,
    missionResults,
    missionStatuses,
    clients,
    totals: {
      pic: pilots.length,
      missionType: missionTypes.length,
      missionCategory: missionCategories.length,
      droneSystem: droneSystems.length,
      missionResult: missionResults.length,
      missionStatus: missionStatuses.length,
      client: clients.length,
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
    // Trigger table refresh with new filters
    window.dispatchEvent(new CustomEvent('logbook-filters-changed', { detail: filters }));
  };

  return (
    <>
      <div className="col-md-3 col-lg-3">
        <label className="mb-2 mt-2">Mission Date Range</label>
        <DateRangePicker
          startDate={filters.dateStart}
          endDate={filters.dateEnd}
          onChange={handleDateRangeChange}
        />

        <label className="mb-2 mt-2">
          PiC <span className="badge rounded-pill text-dark bg-light">
            {options.totals.pic}
          </span>
        </label>
        <FilterDropdown
          id="filter_pilot_id"
          value={filters.pilotId}
          options={options.pilots}
          onChange={(value) => handleFilterChange('pilotId', value)}
          placeholder="Select"
        />

        <label htmlFor="filter_mission_plan" className="form-label">
          Mission Plan
        </label>
        <FilterDropdown
          id="filter_mission_plan"
          value={filters.missionPlan}
          options={options.missionPlans}
          onChange={(value) => handleFilterChange('missionPlan', value)}
          placeholder="Select"
        />
      </div>

      <div className="col-md-3 col-lg-3">
        <label className="mb-2 mt-2">
          Mission Type{' '}
          <span className="badge rounded-pill text-dark bg-light">
            {options.totals.missionType}
          </span>
        </label>
        <FilterDropdown
          id="filter_mission_type_id"
          value={filters.missionTypeId}
          options={options.missionTypes}
          onChange={(value) => handleFilterChange('missionTypeId', value)}
          placeholder="Select"
        />

        <label className="mb-2 mt-2">
          Mission Category{' '}
          <span className="badge rounded-pill text-dark bg-light">
            {options.totals.missionCategory}
          </span>
        </label>
        <FilterDropdown
          id="filter_mission_category_id"
          value={filters.missionCategoryId}
          options={options.missionCategories}
          onChange={(value) => handleFilterChange('missionCategoryId', value)}
          placeholder="Select"
        />
      </div>

      <div className="col-md-3 col-lg-3">
        <label className="mb-2 mt-2">
          Drone System{' '}
          <span className="badge rounded-pill text-dark bg-light">
            {options.totals.droneSystem}
          </span>
        </label>
        <FilterDropdown
          id="filter_droneSystem_id"
          value={filters.droneSystemId}
          options={options.droneSystems}
          onChange={(value) => handleFilterChange('droneSystemId', value)}
          placeholder="Select"
        />

        <label className="mb-2 mt-2">
          Mission Result{' '}
          <span className="badge rounded-pill text-dark bg-light">
            {options.totals.missionResult}
          </span>
        </label>
        <FilterDropdown
          id="filter_mission_result_id"
          value={filters.missionResultId}
          options={options.missionResults}
          onChange={(value) => handleFilterChange('missionResultId', value)}
          placeholder="Select"
        />
      </div>

      <div className="col-md-3 col-lg-3">
        <label className="mb-2 mt-2">
          Mission Status{' '}
          <span className="badge rounded-pill text-dark bg-light">
            {options.totals.missionStatus}
          </span>
        </label>
        <FilterDropdown
          id="filter_mission_status_id"
          value={filters.missionStatusId}
          options={options.missionStatuses}
          onChange={(value) => handleFilterChange('missionStatusId', value)}
          placeholder="Select"
        />

        <label className="mb-2 mt-2">
          Client{' '}
          <span className="badge rounded-pill text-dark bg-light">
            {options.totals.client}
          </span>
        </label>
        <FilterDropdown
          id="filter_client_id"
          value={filters.clientId}
          options={options.clients}
          onChange={(value) => handleFilterChange('clientId', value)}
          placeholder="Select"
        />

        <label className="mb-2 mt-2">Filter Logbook</label>
        <div className="input-group">
          <button
            type="button"
            className="btn btn-dark"
            onClick={handleSearch}
          >
            Search
          </button>
        </div>
      </div>
    </>
  );
}