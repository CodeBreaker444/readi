interface NotificationFiltersProps {
  filters: {
    status: string;
    procedure: string;
    search: string;
    dateFrom: string;
    dateTo: string;
  };
  onFilterChange: (filters: any) => void;
}

export default function NotificationFilters({
  filters,
  onFilterChange,
}: NotificationFiltersProps) {
  const handleChange = (field: string, value: string) => {
    onFilterChange({ ...filters, [field]: value });
  };

  return (
   <div className="bg-white rounded-lg shadow-sm mb-4 p-4">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
    <div>
      <select
        value={filters.status}
        onChange={(e) => handleChange('status', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">Status (all)</option>
        <option value="UNREAD">Unread</option>
        <option value="READ">Read</option>
      </select>
    </div>

    <div>
      <input
        type="text"
        placeholder="Procedure (e.g. planning)"
        value={filters.procedure}
        onChange={(e) => handleChange('procedure', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>

    <div>
      <input
        type="date"
        placeholder="From"
        value={filters.dateFrom}
        onChange={(e) => handleChange('dateFrom', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>

    <div>
      <input
        type="date"
        placeholder="To"
        value={filters.dateTo}
        onChange={(e) => handleChange('dateTo', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>

    <div className="lg:col-span-2">
      <input
        type="text"
        placeholder="Search in message"
        value={filters.search}
        onChange={(e) => handleChange('search', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  </div>
</div>

  );
}