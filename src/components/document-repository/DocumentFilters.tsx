import { Search } from 'lucide-react';
import { FilterState } from '../../config/types/types';

interface DocumentFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onReset: () => void;
  isDark: boolean
}

export default function DocumentFilters({
  filters,
  onFilterChange,
  onReset,
  isDark
}: DocumentFiltersProps) {
  const handleChange = (field: keyof FilterState, value: string) => {
    onFilterChange({ ...filters, [field]: value });
  };

  return (
 <div
  className={`rounded-lg shadow-sm mb-4 p-4 border ${
    isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
  }`}
>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
    <div className="lg:col-span-2 relative">
      <Search
        className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
          isDark ? 'text-gray-500' : 'text-gray-400'
        }`}
      />
      <input
        type="text"
        placeholder="Search (title, code, description)"
        value={filters.search}
        onChange={(e) => handleChange('search', e.target.value)}
        className={`w-full pl-10 pr-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          isDark
            ? 'bg-slate-900 text-white border-slate-600 placeholder:text-gray-500'
            : 'bg-white text-gray-900 border-gray-300 placeholder:text-gray-400'
        }`}
      />
    </div>

    <div>
      <select
        value={filters.area}
        onChange={(e) => handleChange('area', e.target.value)}
        className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          isDark
            ? 'bg-slate-900 text-white border-slate-600'
            : 'bg-white text-gray-900 border-gray-300'
        }`}
      >
        <option value="">Select Area</option>
        <option value="BOARD">Board</option>
        <option value="COMPLIANCE">Compliance</option>
        <option value="DATACONTROLLER">Data Controller</option>
        <option value="MAINTENANCE">Maintenance</option>
        <option value="OPERATION">Operation</option>
        <option value="SAFETY">Safety</option>
        <option value="SECURITY">Security</option>
        <option value="TRAINING">Training</option>
        <option value="VENDOR">Vendor</option>
      </select>
    </div>

    <div>
      <select
        value={filters.category}
        onChange={(e) => handleChange('category', e.target.value)}
        className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          isDark
            ? 'bg-slate-900 text-white border-slate-600'
            : 'bg-white text-gray-900 border-gray-300'
        }`}
      >
        <option value="">Category</option>
        <option value="Manual">Manual</option>
        <option value="Curriculum">Curriculum</option>
        <option value="Procedure">Procedure</option>
        <option value="Checklist">Checklist</option>
        <option value="Policy">Policy</option>
      </select>
    </div>

    <div>
      <select
        value={filters.status}
        onChange={(e) => handleChange('status', e.target.value)}
        className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          isDark
            ? 'bg-slate-900 text-white border-slate-600'
            : 'bg-white text-gray-900 border-gray-300'
        }`}
      >
        <option value="">Status</option>
        <option value="DRAFT">Draft</option>
        <option value="IN_REVIEW">In Review</option>
        <option value="APPROVED">Approved</option>
        <option value="OBSOLETE">Obsolete</option>
      </select>
    </div>

    <div>
      <button
        onClick={onReset}
        className={`w-full px-4 py-2 rounded-lg border transition-colors ${
          isDark
            ? 'bg-slate-900 border-slate-600 text-gray-300 hover:bg-slate-700'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        Reset
      </button>
    </div>
  </div>
</div>
  );
}