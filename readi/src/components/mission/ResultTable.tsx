'use client';

import { MissionResult } from '@/config/types';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';

interface ResultTableProps {
  data: MissionResult[];
  onDelete: (id: number) => void;
  onEdit: (result: MissionResult) => void;
  isDark: boolean
}

export default function ResultTable({ data, onDelete, onEdit, isDark }: ResultTableProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<MissionResult | null>(null);

  const handleEditClick = (result: MissionResult) => {
    setEditingId(result.id);
    setEditForm({ ...result });
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
  <div className={`overflow-hidden rounded-xl border shadow-sm ${
    isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  }`}>
    <table className="w-full">
      <thead className={`${
        isDark ? 'bg-gray-700' : 'bg-linear-to-r from-blue-50 to-indigo-50'
      }`}>
        <tr>
          <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
            isDark ? 'text-gray-200' : 'text-gray-700'
          }`}>ID</th>
          <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
            isDark ? 'text-gray-200' : 'text-gray-700'
          }`}>Code</th>
          <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
            isDark ? 'text-gray-200' : 'text-gray-700'
          }`}>Description</th>
          <th className={`px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider ${
            isDark ? 'text-gray-200' : 'text-gray-700'
          }`}>Actions</th>
        </tr>
      </thead>
      <tbody className={`divide-y transition-colors ${
        isDark ? 'divide-gray-700' : 'divide-gray-100'
      }`}>
        {data.map((result) => (
          <tr key={result.id} className={`transition-colors ${
            isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
          }`}>
            {editingId === result.id && editForm ? (
              <>
                <td className={`px-6 py-4 text-sm font-medium ${
                  isDark ? 'text-gray-100' : 'text-gray-900'
                }`}>{result.id}</td>
                <td className="px-6 py-4">
                  <input
                    type="text"
                    className={`w-full px-3 py-2 border rounded-lg transition-all ${
                      isDark
                        ? 'border-gray-600 bg-gray-700 text-gray-100 focus:ring-blue-400'
                        : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500'
                    }`}
                    value={editForm.code}
                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                  />
                </td>
                <td className="px-6 py-4">
                  <input
                    type="text"
                    className={`w-full px-3 py-2 border rounded-lg transition-all ${
                      isDark
                        ? 'border-gray-600 bg-gray-700 text-gray-100 focus:ring-blue-400'
                        : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500'
                    }`}
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  />
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                      onClick={handleSaveEdit}
                    >
                      <Check size={16} /> Save
                    </button>
                    <button
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
                      onClick={handleCancelEdit}
                    >
                      <X size={16} /> Cancel
                    </button>
                  </div>
                </td>
              </>
            ) : (
              <>
                <td className={`px-6 py-4 text-sm font-medium ${
                  isDark ? 'text-gray-100' : 'text-gray-900'
                }`}>{result.id}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    isDark ? 'bg-purple-700 text-purple-100' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {result.code}
                  </span>
                </td>
                <td className={`px-6 py-4 text-sm ${
                  isDark ? 'text-gray-100' : 'text-gray-700'
                }`}>{result.description}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                      onClick={() => handleEditClick(result)}
                    >
                      <Pencil size={16} /> Edit
                    </button>
                    <button
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this mission result?')) {
                          onDelete(result.id);
                        }
                      }}
                    >
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
      <div className={`text-center py-12 ${
        isDark ? 'text-gray-400' : 'text-gray-500'
      }`}>
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
          isDark ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke={isDark ? 'currentColor' : 'currentColor'}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-lg font-medium">No mission results available</p>
        <p className="text-sm mt-1">Add your first result to get started</p>
      </div>
    )}
  </div>
</div>
  );
}