import { SafetyIndicator } from '@/config/types';
import { Edit2, ToggleLeft, ToggleRight } from 'lucide-react';

interface SafetyTableProps {
  indicators: SafetyIndicator[];
  isDark: boolean;
  onEdit: (indicator: SafetyIndicator) => void;
  onToggle: (id: number, newStatus: 0 | 1) => void;
}

export default function SafetyTable({
  indicators,
  isDark,
  onEdit,
  onToggle,
}: SafetyTableProps) {
  return (
    <div className={`rounded-lg shadow-sm overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
      <div className="overflow-x-auto">
        <table className={`min-w-full divide-y ${isDark ? 'divide-slate-700' : 'divide-gray-200'}`}>
          <thead className={`${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
            <tr>
              {['ID', 'Code', 'Type', 'Area', 'Name', 'Target', 'Unit', 'Active', 'Actions'].map((h, i) => (
                <th
                  key={i}
                  className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'
                    } ${h === 'Actions' ? 'text-right w-52' : ''}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className={`${isDark ? 'bg-slate-800 divide-slate-700' : 'bg-white divide-gray-200'} divide-y`}>
            {indicators.length === 0 ? (
              <tr>
                <td colSpan={9} className={`px-4 py-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  No indicators found
                </td>
              </tr>
            ) : (
              indicators.map((indicator) => (
                <tr
                  key={indicator.id}
                  className={`transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-50'}`}
                >
                  <td className={`px-4 py-3 text-sm text-center font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {indicator.id}
                  </td>

                  <td className={`px-4 py-3 text-sm font-mono ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {indicator.indicator_code}
                  </td>

                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${indicator.indicator_type === 'KPI'
                        ? isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800'
                        : isDark ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-800'
                      }`}>
                      {indicator.indicator_type}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-800'
                      }`}>
                      {indicator.indicator_area}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-sm">
                    <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {indicator.indicator_name}
                    </div>
                    {indicator.indicator_desc && (
                      <div className={`text-xs mt-1 line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {indicator.indicator_desc}
                      </div>
                    )}
                  </td>

                  <td className={`px-4 py-3 text-sm text-right font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {indicator.target_value.toFixed(2)}
                  </td>

                  <td className={`px-4 py-3 text-sm text-center ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                    {indicator.unit}
                  </td>

                  <td className="px-4 py-3 text-sm text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${indicator.is_active === 1
                        ? isDark ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800'
                        : isDark ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-800'
                      }`}>
                      {indicator.is_active === 1 ? 'ON' : 'OFF'}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-sm text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEdit(indicator)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs border rounded transition-colors ${isDark
                            ? 'border-slate-600 text-gray-300 hover:bg-slate-700'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit
                      </button>

                      <button
                        onClick={() => onToggle(indicator.id, indicator.is_active === 1 ? 0 : 1)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs border rounded transition-colors ${indicator.is_active === 1
                            ? isDark ? 'border-yellow-500 text-yellow-400 hover:bg-yellow-900/30' : 'border-yellow-600 text-yellow-600 hover:bg-yellow-50'
                            : isDark ? 'border-green-500 text-green-400 hover:bg-green-900/30' : 'border-green-600 text-green-600 hover:bg-green-50'
                          }`}
                      >
                        {indicator.is_active === 1 ? (
                          <>
                            <ToggleLeft className="w-3 h-3" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <ToggleRight className="w-3 h-3" />
                            Activate
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}