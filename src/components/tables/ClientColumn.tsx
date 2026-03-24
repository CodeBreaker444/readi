'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Building2, Globe, Mail, MoreHorizontal, Pencil, Phone, Trash2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';
export interface ClientData {
  client_id: number;
  fk_owner_id: number;
  client_code?: string;
  client_name: string;
  client_legal_name?: string;
  client_address?: string;
  client_city?: string;
  client_state?: string;
  client_postal_code?: string;
  client_phone?: string;
  client_email?: string;
  client_website?: string;
  client_active: string;
  contract_start_date?: string;
  contract_end_date?: string;
  payment_terms?: string;
  credit_limit?: number;
  created_at?: string;
  updated_at?: string;
  owner_code?: string;
  owner_name?: string;
}
interface GetClientColumnsOptions {
  isDark: boolean;
  onEdit: (client: ClientData) => void;
  onDelete: (clientId: number) => void;
}

export function getClientColumns({ isDark, onEdit, onDelete }: GetClientColumnsOptions): ColumnDef<ClientData>[] {
  return [
    {
      accessorKey: 'client_name',
      header: 'Client',
      cell: ({ row }) => {
        const client = row.original;
        return (
          <div className="flex items-center gap-3 min-w-[180px]">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${isDark ? 'bg-violet-900/50 text-violet-300' : 'bg-violet-100 text-violet-700'}`}>
              {client.client_name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{client.client_name}</p>
              {client.client_legal_name && (
                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{client.client_legal_name}</p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'client_code',
      header: 'Code',
      cell: ({ row }) => (
        <span className={`text-xs font-mono px-2 py-1 rounded-md ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
          {row.original.client_code || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'client_email',
      header: 'Contact',
      cell: ({ row }) => {
        const client = row.original;
        return (
          <div className="space-y-1 min-w-[160px]">
            {client.client_email && (
              <div className={`flex items-center gap-1.5 text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                <Mail size={11} className="flex-shrink-0" />
                <span className="truncate max-w-[160px]">{client.client_email}</span>
              </div>
            )}
            {client.client_phone && (
              <div className={`flex items-center gap-1.5 text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                <Phone size={11} className="flex-shrink-0" />
                <span>{client.client_phone}</span>
              </div>
            )}
            {!client.client_email && !client.client_phone && (
              <span className={`text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>—</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'client_city',
      header: 'Location',
      cell: ({ row }) => {
        const { client_city, client_state } = row.original;
        const location = [client_city, client_state].filter(Boolean).join(', ');
        return (
          <div className={`flex items-center gap-1.5 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {location ? (
              <>
                <Building2 size={13} className="flex-shrink-0" />
                <span>{location}</span>
              </>
            ) : (
              <span className={isDark ? 'text-slate-600' : 'text-slate-400'}>—</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'client_website',
      header: 'Website',
      cell: ({ row }) => {
        const url = row.original.client_website;
        if (!url) return <span className={isDark ? 'text-slate-600 text-xs' : 'text-slate-400 text-xs'}>—</span>;
        return (
          <a href={url} target="_blank" rel="noopener noreferrer"
            className={`flex items-center gap-1 text-xs hover:underline ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
            <Globe size={11} />
            <span className="truncate max-w-[120px]">{url.replace(/^https?:\/\//, '')}</span>
          </a>
        );
      },
    },
    {
      accessorKey: 'payment_terms',
      header: 'Payment Terms',
      cell: ({ row }) => (
        <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          {row.original.payment_terms || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'contract_end_date',
      header: 'Contract End',
      cell: ({ row }) => {
        const date = row.original.contract_end_date;
        if (!date) return <span className={isDark ? 'text-slate-600 text-xs' : 'text-slate-400 text-xs'}>—</span>;
        const d = new Date(date);
        const isExpired = d < new Date();
        return (
          <span className={`text-xs font-medium ${isExpired ? (isDark ? 'text-rose-400' : 'text-rose-600') : (isDark ? 'text-slate-300' : 'text-slate-700')}`}>
            {d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        );
      },
    },
    {
      accessorKey: 'client_active',
      header: 'Status',
      cell: ({ row }) => {
        const active = row.original.client_active === 'Y';
        return (
          <Badge className={`text-xs font-semibold border-0 ${active
            ? (isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
            : (isDark ? 'bg-rose-900/40 text-rose-400' : 'bg-rose-100 text-rose-700')
          }`}>
            {active ? 'Active' : 'Inactive'}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const client = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreHorizontal size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={isDark ? 'bg-slate-800 border-slate-700' : ''}>
              <DropdownMenuItem onClick={() => onEdit(client)} className="gap-2 text-xs cursor-pointer">
                <Pencil size={12} /> Edit Client
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(client.client_id)}
                className="gap-2 text-xs text-rose-500 cursor-pointer focus:text-rose-500"
              >
                <Trash2 size={12} /> Delete Client
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
