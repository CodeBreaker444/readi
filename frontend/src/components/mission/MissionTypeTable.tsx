'use client';

import { MissionType } from '@/src/config/types';
import { useState } from 'react';

interface MissionTypeTableProps {
  data: MissionType[];
  onDelete: (id: number) => void;
  onEdit: (type: MissionType) => void;
}

export default function MissionTypeTable({ data, onDelete, onEdit }: MissionTypeTableProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<MissionType | null>(null);

  const handleEditClick = (type: MissionType) => {
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
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Code</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Label</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((type) => (
              <tr key={type.id} className="hover:bg-blue-50 transition-colors duration-150">
                {editingId === type.id && editForm ? (
                  <>
                    <td className="px-4 py-3 text-sm text-gray-700 font-medium">{type.id}</td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                        value={editForm.code}
                        onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                        value={editForm.label}
                        onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors duration-150 shadow-sm"
                          onClick={handleSaveEdit}
                        >
                          Save
                        </button>
                        <button
                          className="px-3 py-1.5 bg-gray-400 hover:bg-gray-500 text-white text-xs font-medium rounded-lg transition-colors duration-150 shadow-sm"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 text-sm text-gray-700 font-medium">{type.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{type.description}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {type.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">{type.label}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition-colors duration-150 shadow-sm"
                          onClick={() => handleEditClick(type)}
                        >
                          Edit
                        </button>
                        <button
                          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors duration-150 shadow-sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this mission type?')) {
                              onDelete(type.id);
                            }
                          }}
                        >
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
      </div>
      {data.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="mt-4 text-gray-500 font-medium">No mission types available</p>
          <p className="text-sm text-gray-400 mt-1">Add your first mission type to get started</p>
        </div>
      )}
    </div>
  );
}