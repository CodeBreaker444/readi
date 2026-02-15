'use client';

import { MissionType } from '@/config/types';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface MissionTypeTableProps {
  data: MissionType[];
  onDelete: (id: number) => void;
  onEdit: (type: MissionType) => void;
  isDark: boolean;
}

export default function MissionTypeTable({ data, onDelete, onEdit, isDark }: MissionTypeTableProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<MissionType | null>(null);

  const handleStartEdit = (type: MissionType) => {
    setEditingId(type.id);
    setEditForm({ ...type });
  };

  const handleSaveEdit = () => {
    if (editForm) {
      onEdit(editForm);
      setEditingId(null);
      setEditForm(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  return (
    <div className="overflow-hidden rounded-lg">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className={`${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'} border-b`}>
              <th className={`px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>ID</th>
              <th className={`px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Name</th>
              <th className={`px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Code</th>
              <th className={`px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Description</th>
              <th className={`px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Actions</th>
            </tr>
          </thead>

          <tbody className={`${isDark ? 'divide-gray-700' : 'divide-gray-100'} divide-y`}>
            {data.map(type => (
              <tr key={type.id} className={`${isDark ? 'hover:bg-gray-800/50' : 'hover:bg-indigo-50/30'} transition-all duration-200`}>
                <td className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 text-[10px] sm:text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {type.id}
                </td>

                <td className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 text-[10px] sm:text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {editingId === type.id && editForm ? (
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      className={`w-full min-w-[80px] sm:min-w-[120px] px-1.5 sm:px-3 py-1 sm:py-2 rounded-lg outline-none text-[10px] sm:text-sm border-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-800'}`}
                    />
                  ) : (
                    <div className="min-w-[80px] sm:min-w-[120px] font-medium">{type.name}</div>
                  )}
                </td>

                <td className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 text-[10px] sm:text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {editingId === type.id && editForm ? (
                    <input
                      type="text"
                      value={editForm.code}
                      onChange={e => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                      className={`w-full min-w-[60px] sm:min-w-[80px] px-1.5 sm:px-3 py-1 sm:py-2 rounded-lg outline-none text-[10px] sm:text-sm border-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-800'}`}
                    />
                  ) : (
                    <span className={`inline-flex items-center px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-xs font-bold uppercase tracking-wide whitespace-nowrap ${isDark ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-700' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'}`}>
                      {type.code}
                    </span>
                  )}
                </td>

                <td className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 text-[10px] sm:text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {editingId === type.id && editForm ? (
                    <input
                      type="text"
                      value={editForm.label}
                      onChange={e => setEditForm({ ...editForm, label: e.target.value })}
                      className={`w-full min-w-[100px] sm:min-w-[150px] px-1.5 sm:px-3 py-1 sm:py-2 rounded-lg outline-none text-[10px] sm:text-sm border-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-800'}`}
                    />
                  ) : (
                    <div className="min-w-[100px] sm:min-w-[150px] max-w-[150px] sm:max-w-[200px] truncate" title={type.label}>
                      {type.label}
                    </div>
                  )}
                </td>

                <td className={`px-2 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 text-[10px] sm:text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {editingId === type.id ? (
                    <div className="flex justify-center gap-1 sm:gap-2 whitespace-nowrap">
                      <button
                        onClick={handleSaveEdit}
                        className="px-2 sm:px-4 py-1 sm:py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-[10px] sm:text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className={`px-2 sm:px-4 py-1 sm:py-2 text-white text-[10px] sm:text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-500 hover:bg-gray-600'}`}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-center gap-1 sm:gap-2 whitespace-nowrap">
                      <button
                        onClick={() => handleStartEdit(type)}
                        className="inline-flex items-center gap-1 px-2 sm:px-4 py-1 sm:py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-[10px] sm:text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                      >
                        <Pencil size={14} className="hidden sm:block" />
                        Edit
                      </button>
                      <button
                        onClick={() => confirm('Are you sure you want to delete this mission type?') && onDelete(type.id)}
                        className="inline-flex items-center gap-1 px-2 sm:px-4 py-1 sm:py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-[10px] sm:text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                      >
                        <Trash2 size={14} className="hidden sm:block" />
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="text-center py-12 sm:py-16 px-4">
          <div className={`inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full mb-4 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <svg className={`w-8 h-8 sm:w-10 sm:h-10 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className={`text-base sm:text-lg font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>No mission types available</p>
          <p className={`${isDark ? 'text-gray-500' : 'text-gray-500'} text-xs sm:text-sm mt-2`}>Add your first mission type to get started</p>
        </div>
      )}
    </div>
  );
}