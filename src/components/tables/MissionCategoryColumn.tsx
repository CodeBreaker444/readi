'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MissionCategory } from '@/config/types/types';
import { ColumnDef } from '@tanstack/react-table';
import { Check, Pencil, Trash2, X } from 'lucide-react';

interface GetColumnsOptions {
  isDark: boolean;
  editingId: number | null;
  editForm: MissionCategory | null;
  onEditChange: (form: MissionCategory) => void;
  onEditClick: (category: MissionCategory) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: (id: number) => void;
}

export function getMissionCategoryColumns({
  isDark,
  editingId,
  editForm,
  onEditChange,
  onEditClick,
  onSave,
  onCancel,
  onDelete,
}: GetColumnsOptions): ColumnDef<MissionCategory>[] {
  return [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => (
        <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {row.original.id}
        </span>
      ),
    },
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => {
        const category = row.original;
        if (editingId === category.id && editForm) {
          return (
            <Input
              required
              maxLength={50}
              value={editForm.code}
              onChange={(e) => onEditChange({ ...editForm, code: e.target.value.toUpperCase() })}
              className={isDark ? 'bg-slate-900 border-slate-600 text-white' : ''}
            />
          );
        }
        return (
          <span className={`text-sm font-mono ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
            {category.code}
          </span>
        );
      },
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => {
        const category = row.original;
        if (editingId === category.id && editForm) {
          return (
            <Input
              required
              maxLength={100}
              value={editForm.name}
              onChange={(e) => onEditChange({ ...editForm, name: e.target.value })}
              className={isDark ? 'bg-slate-900 border-slate-600 text-white' : ''}
            />
          );
        }
        return (
          <span className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
            {category.name}
          </span>
        );
      },
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => {
        const category = row.original;
        if (editingId === category.id && editForm) {
          return (
            <Input
              value={editForm.description || ''}
              onChange={(e) => onEditChange({ ...editForm, description: e.target.value })}
              className={isDark ? 'bg-slate-900 border-slate-600 text-white' : ''}
            />
          );
        }
        return (
          <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
            {category.description || '-'}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const category = row.original;
        const isEditing = editingId === category.id && editForm;

        return (
          <div className="flex justify-end gap-2">
            {isEditing ? (
              <>
                <Button
                  size="sm"
                  onClick={onSave}
                  className="bg-green-500 hover:bg-green-600 text-white gap-1.5"
                >
                  <Check size={14} /> Save
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onCancel}
                  className="gap-1.5"
                >
                  <X size={14} /> Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEditClick(category)}
                  className={`gap-1.5 ${isDark ? 'border-slate-600 bg-slate-700 hover:bg-slate-600 text-white' : ''}`}
                >
                  <Pencil size={14} /> Edit
                </Button>
                <Button
                  size="sm"
                  onClick={() => onDelete(category.id)}
                  className="bg-rose-500 hover:bg-rose-600 text-white gap-1.5"
                >
                  <Trash2 size={14} /> Delete
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ];
}