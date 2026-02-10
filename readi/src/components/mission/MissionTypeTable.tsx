'use client';

import { MissionType } from '@/config/types';
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
        <tr className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border-b`}>
          <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>ID</th>
          <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Description</th>
          <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Code</th>
          <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Label</th>
          <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Actions</th>
        </tr>
      </thead>

      <tbody className={`${isDark ? 'divide-gray-700' : 'divide-gray-200'} divide-y`}>
        {data.map(type => (
          <tr key={type.id} className={`${isDark ? 'hover:bg-gray-800' : 'hover:bg-blue-50'} transition-colors duration-150`}>
            {editingId === type.id && editForm ? (
              <>
                <td className={`px-4 py-3 text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{type.id}</td>
                <td className="px-4 py-3"><input type="text" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className={`w-full px-3 py-2 rounded-lg outline-none text-sm border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-800'}`} /></td>
                <td className="px-4 py-3"><input type="text" value={editForm.code} onChange={e => setEditForm({ ...editForm, code: e.target.value })} className={`w-full px-3 py-2 rounded-lg outline-none text-sm border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-800'}`} /></td>
                <td className="px-4 py-3"><input type="text" value={editForm.label} onChange={e => setEditForm({ ...editForm, label: e.target.value })} className={`w-full px-3 py-2 rounded-lg outline-none text-sm border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-800'}`} /></td>
                <td className="px-4 py-3"><div className="flex gap-2"><button onClick={handleSaveEdit} className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg shadow-sm transition-colors">Save</button><button onClick={handleCancelEdit} className="px-3 py-1.5 bg-gray-400 hover:bg-gray-500 text-white text-xs font-medium rounded-lg shadow-sm transition-colors">Cancel</button></div></td>
              </>
            ) : (
              <>
                <td className={`px-4 py-3 text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{type.id}</td>
                <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{type.description}</td>
                <td className="px-4 py-3"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>{type.code}</span></td>
                <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{type.label}</td>
                <td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => handleEditClick(type)} className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg shadow-sm transition-colors">Edit</button><button onClick={() => confirm('Are you sure you want to delete this mission type?') && onDelete(type.id)} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg shadow-sm transition-colors">Delete</button></div></td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </div>

  {data.length === 0 && (
    <div className="text-center py-12">
      <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} font-medium`}>No mission types available</p>
      <p className={`${isDark ? 'text-gray-500' : 'text-gray-400'} text-sm mt-1`}>Add your first mission type to get started</p>
    </div>
  )}
</div>

  );
}