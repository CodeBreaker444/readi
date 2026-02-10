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
    if (area < 10000) {
      return `${area.toFixed(2)} m²`;
    } else {
      return `${(area / 1000000).toFixed(2)} km²`;
    }
  };

  const formatCoordinates = (center: { lat: number; lng: number }): string => {
    return `${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}`;
  };

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className={isDark ? 'bg-slate-700' : 'bg-blue-600'}>
            <th className={`border ${isDark ? 'border-slate-600' : 'border-gray-300'} px-4 py-2 text-white text-sm font-medium text-center`}>
              Flight Area
            </th>
            <th className={`border ${isDark ? 'border-slate-600' : 'border-gray-300'} px-4 py-2 text-white text-sm font-medium text-center`}>
              Measure
            </th>
            <th className={`border ${isDark ? 'border-slate-600' : 'border-gray-300'} px-4 py-2 text-white text-sm font-medium text-center`}>
              Center Lat/Lon
            </th>
            <th className={`border ${isDark ? 'border-slate-600' : 'border-gray-300'} px-4 py-2 text-white text-sm font-medium text-center`}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {areas.length === 0 ? (
            <tr>
              <td 
                colSpan={4} 
                className={`border ${isDark ? 'border-slate-600 bg-slate-800 text-gray-400' : 'border-gray-300 bg-white text-gray-500'} px-4 py-3 text-center text-sm`}
              >
                No Areas Drawn
              </td>
            </tr>
          ) : (
            areas.map((area, index) => (
              <tr 
                key={area.id}
                className={isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-gray-50'}
              >
                <td className={`border ${isDark ? 'border-slate-600 text-gray-300' : 'border-gray-300 text-gray-900'} px-4 py-2 text-sm text-center`}>
                  {area.type.charAt(0).toUpperCase() + area.type.slice(1)} {index + 1}
                </td>
                <td className={`border ${isDark ? 'border-slate-600 text-gray-300' : 'border-gray-300 text-gray-900'} px-4 py-2 text-sm text-center`}>
                  {formatArea(area.area)}
                </td>
                <td className={`border ${isDark ? 'border-slate-600 text-gray-300' : 'border-gray-300 text-gray-900'} px-4 py-2 text-sm text-center font-mono`}>
                  {formatCoordinates(area.center)}
                </td>
                <td className={`border ${isDark ? 'border-slate-600' : 'border-gray-300'} px-4 py-2 text-center`}>
                  <div className="flex items-center justify-center space-x-2">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(area.id)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-xs flex items-center space-x-1"
                        title="Edit"
                      >
                        <Pencil size={12} />
                        <span>Edit</span>
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(area.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs flex items-center space-x-1"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
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