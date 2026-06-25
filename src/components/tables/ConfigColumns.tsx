'use client';

import { Button } from '@/components/ui/button';
import { ColumnDef } from '@tanstack/react-table';
import { Edit, Trash2 } from 'lucide-react';

export interface Organization {
  id: string;  
  name: string;
  org_id: string;
  api_token?: string;
  created_at?: string;
  updated_at?: string;
}

interface OrgColumnsOptions {
  isDark: boolean;
  t: (key: string) => string;
  onDelete: (id: string) => void;  
}

export function getOrgColumns({ isDark, t, onDelete }: OrgColumnsOptions): ColumnDef<Organization>[] {
  return [
    {
      accessorKey: 'name',
      header: t('flytbase.c2Config.organizations.table.name'),
      cell: ({ getValue }) => (
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${isDark ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-50 text-violet-600'}`}>
            {String(getValue()).slice(0, 2).toUpperCase()}
          </div>
          <span className={`font-medium text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {String(getValue())}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'org_id',
      header: t('flytbase.c2Config.organizations.table.orgId'),
      cell: ({ getValue }) => (
        <span className={`font-mono text-xs px-2 py-1 rounded-md ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
          {String(getValue())}
        </span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: t('flytbase.c2Config.organizations.table.createdAt'),
      cell: ({ getValue }) => {
        const value = getValue();
        if (!value) return <span className="text-xs text-slate-500">-</span>;
        const date = new Date(String(value));
        return (
          <div className="flex flex-col">
            <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: () => <span className={`text-xs uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('flytbase.c2Config.organizations.table.actions')}</span>,
      cell: ({ row }) => {
        const org = row.original;
        return (
          <Button
            onClick={() => onDelete(org.id)}
            variant="ghost"
            size="sm"
            className={`h-7 w-7 p-0 rounded-md transition-colors ${isDark
              ? 'text-slate-500 hover:text-red-400 hover:bg-red-500/10'
              : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        );
      },
    },
  ];
}


export interface UserWithAccess {
  id: string;   
  fullname: string;
  email: string;
  organizations: Organization[];
}
 
interface UserColumnsOptions {
  isDark: boolean;
  t: (key: string) => string;
  onEdit: (user: UserWithAccess) => void;
}
 
export function getUserColumns({ isDark, t, onEdit }: UserColumnsOptions): ColumnDef<UserWithAccess>[] {
  return [
    {
      accessorKey: 'fullname',
      header: t('flytbase.c2Config.permissions.table.name'),
      cell: ({ getValue, row }) => {
        const name = String(getValue());
        const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
        const colors = [
          isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-600',
          isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-600',
          isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-50 text-amber-600',
          isDark ? 'bg-rose-500/20 text-rose-300' : 'bg-rose-50 text-rose-600',
          isDark ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-50 text-violet-600',
        ];
        
        const idAsNum = parseInt(row.original.id?.replace(/\D/g, '')) || 0;
        const colorClass = colors[idAsNum % colors.length];
 
        return (
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${colorClass}`}>
              {initials}
            </div>
            <span className={`font-medium text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {name}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'email',
      header: t('flytbase.c2Config.permissions.table.email'),
      cell: ({ getValue }) => (
        <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {String(getValue())}
        </span>
      ),
    },
    {
      accessorKey: 'organizations',
      header: t('flytbase.c2Config.permissions.table.organizations'),
      cell: ({ getValue }) => {
        const orgs = (getValue() as Organization[]) || [];
        if (orgs.length === 0) {
          return (
            <span className={`text-xs italic ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
              {t('flytbase.c2Config.permissions.noAssignedOrgs')}
            </span>
          );
        }
        const visible = orgs.slice(0, 2);
        const remaining = orgs.length - 2;
        return (
          <div className="flex flex-wrap items-center gap-1">
            {visible.map((org) => (
              <span
                key={org.id}
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${isDark
                  ? 'bg-slate-700 text-slate-300 border border-slate-600'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {org.name}
              </span>
            ))}
            {remaining > 0 && (
              <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                +{remaining} more
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: () => <span className={`text-xs uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('flytbase.c2Config.permissions.table.actions')}</span>,
      cell: ({ row }) => {
        const user = row.original;
        return (
          <Button
            onClick={() => onEdit(user)}
            variant="ghost"
            size="sm"
            className={`h-7 w-7 p-0 rounded-md transition-colors ${isDark
              ? 'text-slate-400 hover:text-white hover:bg-slate-700'
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Edit className="w-3.5 h-3.5" />
          </Button>
        );
      },
    },
  ];
}