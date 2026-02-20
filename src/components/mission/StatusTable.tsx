'use client';

import { MissionStatus } from '@/config/types/types';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';

interface StatusTableProps {
  data: MissionStatus[];
  onDelete: (id: number) => void;
  onEdit: (status: MissionStatus) => void;
  isDark: boolean
}

export default function StatusTable({ data, onDelete, onEdit, isDark}: StatusTableProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<MissionStatus | null>(null);

  const handleEditClick = (status: MissionStatus) => {
    setEditingId(status.id);
    setEditForm({ ...status });
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
   <div className="w-full">
  <div className={`overflow-hidden rounded-xl border shadow-sm ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
    <table className="w-full">
      <thead className={isDark ? 'bg-gray-700' : 'bg-linear-to-r from-blue-50 to-indigo-50'}>
        <tr>
          <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>ID</th>
          <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Code</th>
          <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Description</th>
          <th className={`px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Actions</th>
        </tr>
      </thead>

      <tbody className={isDark ? 'divide-y divide-gray-700' : 'divide-y divide-gray-100'}>
        {data.map((status) => (
          <tr key={status.id} className={isDark ? 'hover:bg-gray-700 transition-colors' : 'hover:bg-gray-50 transition-colors'}>
            {editingId === status.id && editForm ? (
              <>
                <td className={`px-6 py-4 text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{status.id}</td>

                <td className="px-6 py-4">
                  <input
                    type="text"
                    className={`w-full px-3 py-2 rounded-lg border transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isDark ? 'bg-gray-900 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    value={editForm.code}
                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                  />
                </td>

                <td className="px-6 py-4">
                  <input
                    type="text"
                    className={`w-full px-3 py-2 rounded-lg border transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isDark ? 'bg-gray-900 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  />
                </td>

                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium" onClick={handleSaveEdit}>
                      <Check size={16} /> Save
                    </button>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium" onClick={handleCancelEdit}>
                      <X size={16} /> Cancel
                    </button>
                  </div>
                </td>
              </>
            ) : (
              <>
                <td className={`px-6 py-4 text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{status.id}</td>

                <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    isDark ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {status.code}
                  </span>
                </td>

                <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {status.description}
                </td>

                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium" onClick={() => handleEditClick(status)}>
                      <Pencil size={16} /> Edit
                    </button>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium" onClick={() => confirm('Are you sure you want to delete this mission status?') && onDelete(status.id)}>
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>

    {data.length === 0 && (
      <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
          </svg>
        </div>
        <p className="text-lg font-medium">No mission statuses available</p>
        <p className="text-sm mt-1">Add your first status to get started</p>
      </div>
    )}
  </div>
</div>
  );
}