import { SafetyIndicator } from '@/src/config/types';
import { Edit2, ToggleLeft, ToggleRight } from 'lucide-react';

interface SafetyTableProps {
  indicators: SafetyIndicator[];
  onEdit: (indicator: SafetyIndicator) => void;
  onToggle: (id: number, newStatus: 0 | 1) => void;
}

export default function SafetyTable({
  indicators,
  onEdit,
  onToggle,
}: SafetyTableProps) {
  return (
   <div className="bg-white rounded-lg shadow-sm overflow-hidden">
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
            ID
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
            Code
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
            Type
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
            Area
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Name
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
            Target
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
            Unit
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
            Active
          </th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-52">
            Actions
          </th>
        </tr>
      </thead>

      <tbody className="bg-white divide-y divide-gray-200">
        {indicators.length === 0 ? (
          <tr>
            <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
              No indicators found
            </td>
          </tr>
        ) : (
          indicators.map((indicator) => (
            <tr
              key={indicator.id}
              className="hover:bg-gray-50 transition-colors"
            >
              <td className="px-4 py-3 text-sm text-center font-medium text-gray-900">
                {indicator.id}
              </td>

              <td className="px-4 py-3 text-sm font-mono text-gray-900">
                {indicator.indicator_code}
              </td>

              <td className="px-4 py-3 text-sm">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    indicator.indicator_type === 'KPI'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}
                >
                  {indicator.indicator_type}
                </span>
              </td>

              <td className="px-4 py-3 text-sm text-gray-500">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {indicator.indicator_area}
                </span>
              </td>

              <td className="px-4 py-3 text-sm">
                <div className="font-medium text-gray-900">
                  {indicator.indicator_name}
                </div>
                {indicator.indicator_desc && (
                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {indicator.indicator_desc}
                  </div>
                )}
              </td>

              <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                {indicator.target_value.toFixed(2)}
              </td>

              <td className="px-4 py-3 text-sm text-gray-500 text-center">
                {indicator.unit}
              </td>

              <td className="px-4 py-3 text-sm text-center">
                {indicator.is_active === 1 ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ON
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    OFF
                  </span>
                )}
              </td>

              <td className="px-4 py-3 text-sm text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onEdit(indicator)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit
                  </button>

                  <button
                    onClick={() =>
                      onToggle(
                        indicator.id,
                        indicator.is_active === 1 ? 0 : 1
                      )
                    }
                    className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs border rounded transition-colors ${
                      indicator.is_active === 1
                        ? 'border-yellow-600 text-yellow-600 hover:bg-yellow-50'
                        : 'border-green-600 text-green-600 hover:bg-green-50'
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