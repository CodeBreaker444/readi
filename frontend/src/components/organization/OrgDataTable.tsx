'use client';

import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

interface Column<T> {
  key: string;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  title: string;
  onSelect?: (selectedIds: string[]) => void;
  actions?: React.ReactNode;
  isDark: boolean;
}

export default function OrgDataTable<T extends { id: string }>({
  columns,
  data,
  title,
  onSelect,
  actions,
  isDark
}: DataTableProps<T>) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    
    return data.filter(item =>
      Object.values(item).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [data, searchTerm]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = paginatedData.map(item => item.id);
      setSelectedIds(allIds);
      onSelect?.(allIds);
    } else {
      setSelectedIds([]);
      onSelect?.([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelectedIds = checked
      ? [...selectedIds, id]
      : selectedIds.filter(selectedId => selectedId !== id);
    
    setSelectedIds(newSelectedIds);
    onSelect?.(newSelectedIds);
  };

  return (
    <div
      className={`rounded-xl shadow-lg border overflow-hidden
        ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
    >
      <div
        className={`px-6 py-4 bg-linear-to-r
          ${isDark
            ? 'from-slate-800 to-slate-900'
            : 'from-slate-700 to-slate-800'}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h4 className="text-xl font-bold text-white tracking-tight">{title}</h4>
            {selectedIds.length > 0 && (
              <span className="px-3 py-1 rounded-full bg-blue-500 text-white text-sm font-semibold shadow-lg">
                {selectedIds.length} selected
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">{actions}</div>
        </div>
      </div>

      <div
        className={`p-4 border-b
          ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-200'}`}
      >
        <div className="relative">
          <Search
            className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5
              ${isDark ? 'text-slate-400' : 'text-gray-400'}`}
          />
          <input
            type="text"
            className={`w-full pl-10 pr-4 py-2.5 rounded-lg border outline-none transition-all focus:ring-2
              ${isDark
                ? 'bg-slate-800 border-slate-600 text-slate-200 placeholder-slate-400 focus:ring-blue-500 focus:border-blue-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'}`}
            placeholder="Search across all fields..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr
              className={`border-b bg-linear-to-r
                ${isDark
                  ? 'from-slate-800 to-slate-700 border-slate-700'
                  : 'from-gray-100 to-gray-50 border-gray-200'}`}
            >
              <th className="px-6 py-4 text-left w-12">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all"
                  checked={selectedIds.length === paginatedData.length && paginatedData.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider
                    ${isDark ? 'text-slate-300' : 'text-gray-700'}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody
            className={`${isDark ? 'divide-slate-700' : 'divide-gray-200'} divide-y`}
          >
            {paginatedData.length > 0 ? (
              paginatedData.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`transition-colors
                    ${isDark
                      ? idx % 2 === 0
                        ? 'bg-slate-800 hover:bg-slate-700'
                        : 'bg-slate-900 hover:bg-slate-700'
                      : idx % 2 === 0
                      ? 'bg-white hover:bg-blue-50'
                      : 'bg-gray-50 hover:bg-blue-50'}`}
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all"
                      checked={selectedIds.includes(row.id)}
                      onChange={(e) => handleSelectRow(row.id, e.target.checked)}
                    />
                  </td>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-6 py-4 text-sm
                        ${isDark ? 'text-slate-200' : 'text-gray-900'}`}
                    >
                      {column.render
                        ? column.render(row[column.key as keyof T], row)
                        : String(row[column.key as keyof T] || '')}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className={`px-6 py-12 text-center
                    ${isDark ? 'text-slate-400' : 'text-gray-500'}`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Search className="w-12 h-12 opacity-40" />
                    <p className="text-lg font-medium">No data found</p>
                    <p className="text-sm">Try adjusting your search criteria</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div
          className={`px-6 py-4 border-t
            ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-200'}`}
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              Showing <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="font-semibold">
                {Math.min(currentPage * itemsPerPage, filteredData.length)}
              </span>{' '}
              of <span className="font-semibold">{filteredData.length}</span> entries
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all
                  ${currentPage === 1 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:shadow-md'}
                  ${isDark
                    ? 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 rounded-lg border transition-all font-medium
                        ${currentPage === pageNum
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                          : isDark
                          ? 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all
                  ${currentPage === totalPages 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:shadow-md'}
                  ${isDark
                    ? 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}