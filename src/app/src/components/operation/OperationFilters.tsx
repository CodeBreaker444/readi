'use client';
import React from 'react';

interface FilterOption {
  id: number;
  name: string;
}

interface OperationFiltersProps {
  pilots: FilterOption[];
  missionPlans: FilterOption[];
  missionTypes: FilterOption[];
  missionCategories: FilterOption[];
  droneSystems: FilterOption[];
  missionResults: FilterOption[];
  missionStatuses: FilterOption[];
  clients: FilterOption[];
  onFilterChange: (filterType: string, value: number) => void;
  onDateRangeChange: (start: string, end: string) => void;
  onSearch: () => void;
  isDark?: boolean;
}

const OperationFilters: React.FC<OperationFiltersProps> = ({
  pilots,
  missionPlans,
  missionTypes,
  missionCategories,
  droneSystems,
  missionResults,
  missionStatuses,
  clients,
  onFilterChange,
  onDateRangeChange,
  onSearch,
  isDark = false
}) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 ${isDark ? 'text-gray-100' : ''}`}>
      {/* Column 1 */}
      <div className="space-y-4">
        <div>
          <label className={`block mb-2 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Mission Date Range
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              onChange={(e) => onDateRangeChange(e.target.value, '')}
              className={`flex-1 px-3 py-2 border rounded-md ${isDark ? 'bg-slate-700 border-slate-600 text-gray-100' : 'bg-white border-gray-300'}`}
            />
            <span className="self-center">to</span>
            <input
              type="date"
              onChange={(e) => onDateRangeChange('', e.target.value)}
              className={`flex-1 px-3 py-2 border rounded-md ${isDark ? 'bg-slate-700 border-slate-600 text-gray-100' : 'bg-white border-gray-300'}`}
            />
          </div>
        </div>

        <div>
          <label className={`block mb-2 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            PiC <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-800">{pilots.length}</span>
          </label>
          <select
            onChange={(e) => onFilterChange('pilot', Number(e.target.value))}
            className={`w-full px-3 py-2 border rounded-md ${isDark ? 'bg-slate-700 border-slate-600 text-gray-100' : 'bg-white border-gray-300'}`}
          >
            <option value="0">Select</option>
            {pilots.map((pilot) => (
              <option key={pilot.id} value={pilot.id}>
                {pilot.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={`block mb-2 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Mission Plan <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-800">{missionPlans.length}</span>
          </label>
          <select
            onChange={(e) => onFilterChange('missionPlan', Number(e.target.value))}
            className={`w-full px-3 py-2 border rounded-md ${isDark ? 'bg-slate-700 border-slate-600 text-gray-100' : 'bg-white border-gray-300'}`}
          >
            <option value="0">Select</option>
            {missionPlans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Column 2 */}
      <div className="space-y-4">
        <div>
          <label className={`block mb-2 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Mission Type <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-800">{missionTypes.length}</span>
          </label>
          <select
            onChange={(e) => onFilterChange('missionType', Number(e.target.value))}
            className={`w-full px-3 py-2 border rounded-md ${isDark ? 'bg-slate-700 border-slate-600 text-gray-100' : 'bg-white border-gray-300'}`}
          >
            <option value="0">Select</option>
            {missionTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={`block mb-2 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Mission Category <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-800">{missionCategories.length}</span>
          </label>
          <select
            onChange={(e) => onFilterChange('missionCategory', Number(e.target.value))}
            className={`w-full px-3 py-2 border rounded-md ${isDark ? 'bg-slate-700 border-slate-600 text-gray-100' : 'bg-white border-gray-300'}`}
          >
            <option value="0">Select</option>
            {missionCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Column 3 */}
      <div className="space-y-4">
        <div>
          <label className={`block mb-2 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Drone System <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-800">{droneSystems.length}</span>
          </label>
          <select
            onChange={(e) => onFilterChange('droneSystem', Number(e.target.value))}
            className={`w-full px-3 py-2 border rounded-md ${isDark ? 'bg-slate-700 border-slate-600 text-gray-100' : 'bg-white border-gray-300'}`}
          >
            <option value="0">Select</option>
            {droneSystems.map((system) => (
              <option key={system.id} value={system.id}>
                {system.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={`block mb-2 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Mission Result <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-800">{missionResults.length}</span>
          </label>
          <select
            onChange={(e) => onFilterChange('missionResult', Number(e.target.value))}
            className={`w-full px-3 py-2 border rounded-md ${isDark ? 'bg-slate-700 border-slate-600 text-gray-100' : 'bg-white border-gray-300'}`}
          >
            <option value="0">Select</option>
            {missionResults.map((result) => (
              <option key={result.id} value={result.id}>
                {result.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Column 4 */}
      <div className="space-y-4">
        <div>
          <label className={`block mb-2 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Mission Status <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-800">{missionStatuses.length}</span>
          </label>
          <select
            onChange={(e) => onFilterChange('missionStatus', Number(e.target.value))}
            className={`w-full px-3 py-2 border rounded-md ${isDark ? 'bg-slate-700 border-slate-600 text-gray-100' : 'bg-white border-gray-300'}`}
          >
            <option value="0">Select</option>
            {missionStatuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={`block mb-2 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Client <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-800">{clients.length}</span>
          </label>
          <select
            onChange={(e) => onFilterChange('client', Number(e.target.value))}
            className={`w-full px-3 py-2 border rounded-md ${isDark ? 'bg-slate-700 border-slate-600 text-gray-100' : 'bg-white border-gray-300'}`}
          >
            <option value="0">Select</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={`block mb-2 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Filter Logbook
          </label>
          <button
            onClick={onSearch}
            className={`w-full px-4 py-2 rounded-md font-medium ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-100' : 'bg-gray-800 hover:bg-gray-900 text-white'}`}
          >
            Search
          </button>
        </div>
      </div>
    </div>
  );
};

export default OperationFilters;