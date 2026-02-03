'use client';

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

  return (
    <>
      <div className="col-md-3 col-lg-3">
        <label className="mb-2 mt-2">
          Client{' '}
          <span className="badge rounded-pill text-dark bg-light">
            {options.totals.client}
          </span>
        </label>
        <FilterDropdown
          id="client_id"
          value={filters.clientId}
          options={options.clients}
          onChange={(value) => handleFilterChange('clientId', value)}
          placeholder="Select"
        />

        <label className="mb-2 mt-2">
          PiC{' '}
          <span className="badge rounded-pill text-dark bg-light">
            {options.totals.pic}
          </span>
        </label>
        <FilterDropdown
          id="pilot_id"
          value={filters.pilotId}
          options={options.pilots}
          onChange={(value) => handleFilterChange('pilotId', value)}
          placeholder="Select"
        />
      </div>

      <div className="col-md-3 col-lg-3">
        <label className="mb-2 mt-2">
          Evaluation List{' '}
          <span className="badge rounded-pill text-dark bg-light">
            {options.totals.evaluation}
          </span>
        </label>
        <FilterDropdown
          id="evaluation_id"
          value={filters.evaluationId}
          options={options.evaluations}
          onChange={(value) => handleFilterChange('evaluationId', value)}
          placeholder="Select"
        />

        <label className="mb-2 mt-2">Last Update</label>
        <DateRangePicker
          startDate={filters.dateStart}
          endDate={filters.dateEnd}
          onChange={handleDateRangeChange}
        />
      </div>

      <div className="col-md-3 col-lg-3">
        <label className="mb-2 mt-2">
          Planning List{' '}
          <span className="badge rounded-pill text-dark bg-light">
            {options.totals.planning}
          </span>
        </label>
        <FilterDropdown
          id="planning_id"
          value={filters.planningId}
          options={options.plannings}
          onChange={(value) => handleFilterChange('planningId', value)}
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

      <div className="col-md-3 col-lg-3"></div>
    </>
  );
}