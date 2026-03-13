'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Mail, Pencil, Trash2 } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '../ui/tooltip';

export interface UserData {
  user_id: number;
  username: string;
  fullname: string;
  email: string;
  active: number;
  user_role: string;
  user_unique_code: string;
  is_viewer: string;
  is_manager: string;
}

interface GetUserColumnsOptions {
  isDark: boolean;
  onEdit: (user: UserData) => void;
  onDelete: (userId: number) => void;
}

export function getUserColumns({
  isDark,
  onEdit,
  onDelete,
}: GetUserColumnsOptions): ColumnDef<UserData>[] {
  const headerClass = `text-[11px] font-semibold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-400'}`;

  return [
    {
      accessorKey: 'fullname',
      header: () => <span className={headerClass}>Name</span>,
      cell: ({ row }) => {
        const initial = row.original.fullname?.charAt(0)?.toUpperCase() ?? '?';
        return (
          <div className="flex items-center gap-3">
            <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
              isDark ? 'bg-violet-900/50 text-violet-300' : 'bg-violet-100 text-violet-600'
            }`}>
              {initial}
            </div>
            <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {row.original.fullname}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'username',
      header: () => <span className={headerClass}>Username</span>,
      cell: ({ row }) => (
        <span className={`text-xs font-mono px-2 py-0.5 rounded-md ${
          isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'
        }`}>
          {row.original.username}
        </span>
      ),
    },
    {
      accessorKey: 'email',
      header: () => <span className={headerClass}>Email</span>,
      cell: ({ row }) => (
        <div className={`flex items-center gap-1.5 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          <Mail size={13} className="shrink-0 opacity-40" />
          {row.original.email}
        </div>
      ),
    },
    {
      accessorKey: 'user_role',
      header: () => <span className={headerClass}>Role</span>,
      cell: ({ row }) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide border ${
          isDark
            ? 'bg-blue-950/60 text-blue-300 border-blue-700/50'
            : 'bg-blue-50 text-blue-600 border-blue-200'
        }`}>
          {row.original.user_role}
        </span>
      ),
    },
    {
      accessorKey: 'user_unique_code',
      header: () => <span className={headerClass}>Code</span>,
      cell: ({ row }) => (
        <span className={`text-xs font-mono ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {row.original.user_unique_code || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'active',
      header: () => <span className={headerClass}>Status</span>,
      cell: ({ row }) => {
        const isActive = row.original.active === 1;
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide border ${
            isActive
              ? isDark
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50'
                : 'bg-emerald-50 text-emerald-600 border-emerald-200'
              : isDark
                ? 'bg-rose-950/60 text-rose-300 border-rose-700/50'
                : 'bg-rose-50 text-rose-600 border-rose-200'
          }`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        );
      },
    },
    {
      id: 'permissions',
      header: () => <span className={headerClass}>Permissions</span>,
      cell: ({ row }) => (
        <div className="flex gap-1.5 flex-wrap">
          {row.original.is_manager === 'Y' && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide border ${
              isDark
                ? 'bg-violet-950/60 text-violet-300 border-violet-700/50'
                : 'bg-violet-50 text-violet-600 border-violet-200'
            }`}>
              Manager
            </span>
          )}
          {row.original.is_viewer === 'Y' && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide border ${
              isDark
                ? 'bg-gray-800 text-gray-400 border-gray-700'
                : 'bg-gray-100 text-gray-500 border-gray-200'
            }`}>
              Viewer
            </span>
          )}
          {row.original.is_manager !== 'Y' && row.original.is_viewer !== 'Y' && (
            <span className={`text-xs opacity-30 italic`}>—</span>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      header: () => <div className={`${headerClass} flex justify-end`}>Actions</div>,
      cell: ({ row }) => {
        const user = row.original;
        return (
          <TooltipProvider delayDuration={100}>
            <div className="flex items-center justify-end gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onEdit(user)}
                    className={`p-1.5 rounded-lg transition-all duration-150 ${
                      isDark
                        ? 'bg-indigo-500/10 hover:bg-indigo-500/25 text-indigo-400 hover:text-indigo-300 border border-indigo-700/40 hover:border-indigo-500/60'
                        : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-500 hover:text-indigo-700 border border-indigo-200 hover:border-indigo-300'
                    }`}
                  >
                    <Pencil size={14} strokeWidth={2} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">Edit user</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onDelete(user.user_id)}
                    className={`p-1.5 rounded-lg transition-all duration-150 ${
                      isDark
                        ? 'bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 border border-rose-700/40 hover:border-rose-500/60'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-500 hover:text-rose-600 border border-rose-200 hover:border-rose-300'
                    }`}
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">Delete user</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        );
      },
    },
  ];
}