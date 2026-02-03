import { Plus } from 'lucide-react';

interface SafetyFiltersProps {
  filters: {
    search: string;
    area: string;
    type: string;
    active: string;
  };
  onFilterChange: (filters: any) => void;
  onReset: () => void;
  onNew: () => void;
}

export default function SafetyFilters({
  filters,
  onFilterChange,
  onReset,
  onNew,
}: SafetyFiltersProps) {
  const handleChange = (field: string, value: string) => {
    onFilterChange({ ...filters, [field]: value });
  };

  return (
  <div className="bg-white rounded-lg shadow-sm mb-4 p-4">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
    <div className="lg:col-span-2">
      <label className="block text-xs font-medium text-gray-700 mb-1">
        Search
      </label>
      <input
        type="text"
        placeholder="code/name/description"
        value={filters.search}
        onChange={(e) => handleChange('search', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>

    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        Area
      </label>
      <select
        value={filters.area}
        onChange={(e) => handleChange('area', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">All</option>
        <option value="COMPLIANCE">COMPLIANCE</option>
        <option value="TRAINING">TRAINING</option>
        <option value="OPERATIONS">OPERATIONS</option>
        <option value="MAINTENANCE">MAINTENANCE</option>
      </select>
    </div>

    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        Type
      </label>
      <select
        value={filters.type}
        onChange={(e) => handleChange('type', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">All</option>
        <option value="KPI">KPI</option>
        <option value="SPI">SPI</option>
      </select>
    </div>

    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        Active
      </label>
      <select
        value={filters.active}
        onChange={(e) => handleChange('active', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">All</option>
        <option value="1">Active only</option>
        <option value="0">Inactive only</option>
      </select>
    </div>

    <div className="flex items-end gap-2">
      <button
        onClick={onReset}
        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
      >
        Filter
      </button>
      <button
        onClick={onNew}
        className="flex-1 flex items-center justify-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        <Plus className="w-4 h-4" />
        New
      </button>
    </div>
  </div>
</div>
  );
}