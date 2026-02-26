'use client';
import { Pencil, Trash2 } from 'lucide-react';
import React from 'react';

interface DrawnArea {
  id: string;
  type: 'polygon' | 'circle' | 'rectangle';
  area: number;
  center: { lat: number; lng: number };
  geoJSON: any;
}

interface AreaTableProps {
  areas: DrawnArea[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  isDark?: boolean;
}

const AreaTable: React.FC<AreaTableProps> = ({ areas, onEdit, onDelete, isDark = false }) => {
  const formatArea = (area: number): string => {
    if (area < 10000) return `${area.toFixed(2)} m²`;
    return `${(area / 1_000_000).toFixed(2)} km²`;
  };

  const formatCoordinates = (center: { lat: number; lng: number }): string =>
    `${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}`;

  const thClass = `px-4 py-3 text-xs font-semibold uppercase tracking-wider text-center ${
    isDark ? 'text-gray-300 bg-gray-800 border-gray-700' : 'text-gray-600 bg-gray-50 border-gray-200'
  } border-b`;

  const tdClass = `px-4 py-3 text-sm text-center border-b ${
    isDark ? 'text-gray-300 border-gray-700/60' : 'text-gray-700 border-gray-100'
  }`;

  return (
    <div className={`mt-4 rounded-xl overflow-hidden border ${isDark ? 'border-gray-700/60' : 'border-gray-200'}`}>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={thClass}>Flight Area</th>
            <th className={thClass}>Measure</th>
            <th className={thClass}>Center Lat / Lon</th>
            <th className={thClass}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {areas.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className={`px-4 py-6 text-center text-sm ${
                  isDark ? 'text-gray-500 bg-gray-900' : 'text-gray-400 bg-white'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A2 2 0 013 15.382V5.618a2 2 0 012.553-1.894L9 5m0 15l6-3m-6 3V5m6 15l4.447 2.224A2 2 0 0021 18.382V8.618a2 2 0 00-2.553-1.894L15 8m0 12V8m0 0L9 5" />
                  </svg>
                  <span>No areas drawn yet</span>
                </div>
              </td>
            </tr>
          ) : (
            areas.map((area, index) => (
              <tr
                key={area.id}
                className={`transition-colors ${
                  isDark ? 'bg-gray-900 hover:bg-gray-800/70' : 'bg-white hover:bg-gray-50'
                }`}
              >
                <td className={tdClass}>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-700'
                  }`}>
                    {area.type.charAt(0).toUpperCase() + area.type.slice(1)} {index + 1}
                  </span>
                </td>
                <td className={tdClass}>{formatArea(area.area)}</td>
                <td className={`${tdClass} font-mono text-xs`}>{formatCoordinates(area.center)}</td>
                <td className={tdClass}>
                  <div className="flex items-center justify-center gap-2">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(area.id)}
                        className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          isDark
                            ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25'
                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                        }`}
                        title="Edit"
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(area.id)}
                        className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          isDark
                            ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                            : 'bg-red-50 text-red-700 hover:bg-red-100'
                        }`}
                        title="Delete"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AreaTable;