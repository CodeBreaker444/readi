'use client';

import { MissionCategory } from '@/src/config/types';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';

interface MissionCategoryTableProps {
  data: MissionCategory[];
  onDelete: (id: number) => void;
  onEdit: (category: MissionCategory) => void;
}

export default function MissionCategoryTable({ data, onDelete, onEdit }: MissionCategoryTableProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<MissionCategory | null>(null);

  const handleEditClick = (category: MissionCategory) => {
    setEditingId(category.id);
    setEditForm({ ...category });
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
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-linear-to-r from-blue-50 to-indigo-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((category) => (
              <tr key={category.id} className="hover:bg-gray-50 transition-colors">
                {editingId === category.id && editForm ? (
                  <>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {category.id}
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                          <Check size={16} />
                          Save
                        </button>
                        <button
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
                          onClick={handleCancelEdit}
                        >
                          <X size={16} />
                          Cancel
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {category.id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {category.description}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                          onClick={() => handleEditClick(category)}
                        >
                          <Pencil size={16} />
                          Edit
                        </button>
                        <button
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this mission category?')) {
                              onDelete(category.id);
                            }
                          }}
                        >
                          <Trash2 size={16} />
                          Delete
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
          <div className="text-center py-12 text-gray-500">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-lg font-medium">No mission categories available</p>
            <p className="text-sm mt-1">Add your first category to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}