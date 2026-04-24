'use client';

import { useTimezone } from '@/components/TimezoneProvider';
import { useTheme } from '@/components/useTheme';
import { Session } from '@/lib/auth/server-session';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import axios from 'axios';
import { Building2, Filter, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ClientData, getClientColumns } from '../tables/ClientColumn';
import { TablePagination } from '../tables/Pagination';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { ClientFormModal } from './ClientFormModal';
import { ClientSkeletonRow, ClientStatSkeleton } from './ClientStatSkeleton';

interface ClientManagementProps {
  session: Session;
}

const STAT_CONFIG = [
  {
    key: 'total' as const,
    label: 'Total Clients',
    accent: { dark: 'from-slate-800 to-slate-900 border-slate-700', light: 'from-white to-slate-50 border-slate-200' },
    valueColor: { dark: 'text-white', light: 'text-slate-800' },
  },
  {
    key: 'active' as const,
    label: 'Active',
    accent: { dark: 'from-emerald-900/40 to-emerald-900/10 border-emerald-900/30', light: 'from-emerald-50 to-white border-emerald-100' },
    valueColor: { dark: 'text-emerald-400', light: 'text-emerald-600' },
  },
  {
    key: 'inactive' as const,
    label: 'Inactive',
    accent: { dark: 'from-rose-900/40 to-rose-900/10 border-rose-900/30', light: 'from-rose-50 to-white border-rose-100' },
    valueColor: { dark: 'text-rose-400', light: 'text-rose-600' },
  },
  {
    key: 'expiringSoon' as const,
    label: 'Expiring Soon',
    accent: { dark: 'from-amber-900/40 to-amber-900/10 border-amber-900/30', light: 'from-amber-50 to-white border-amber-100' },
    valueColor: { dark: 'text-amber-400', light: 'text-amber-600' },
  },
] as const;

export default function ClientManagement({ session }: ClientManagementProps) {
  const { isDark } = useTheme();
  const { timezone } = useTimezone();
  const isSuperAdmin = session.user.role === 'SUPERADMIN';
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [companyFilter, setCompanyFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/client/list')
   
      const data = await res.data
      if (data.code === 1 && data.data) setClients(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (client: ClientData) => { setSelectedClient(client); setShowEditModal(true); };

  const handleDelete = async (clientId: number) => {
    try {
      await fetch('/api/client/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId }),
      });
      toast.success('Client deleted');
      fetchClients();
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete client');
    }
  };

  const handleAddClient = async (formData: any) => {
    try {
      const res = await axios.post('/api/client/add', {
        ...formData,
      });
      const data = res.data;
      if (data.code === 1) {
        toast.success('Client added successfully');
        setShowAddModal(false);
        fetchClients();
      } else {
        toast.error(data.error || 'Failed to add client');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Error adding client';
      toast.error(msg);
    }
  };

  const handleUpdateClient = async (formData: any) => {
    try {
      const res = await axios.post('/api/client/update', {
        ...formData,
        client_id: selectedClient?.client_id,
      });
      const data = res.data;
      if (data.code === 1) {
        toast.success('Client updated successfully');
        setShowEditModal(false);
        setSelectedClient(null);
        fetchClients();
      } else {
        toast.error(data.error || 'Failed to update client');
      }
    } catch {
      toast.error('Error updating client');
    }
  };

  const stats = useMemo(() => {
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    return {
      total: clients.length,
      active: clients.filter((c) => c.client_active === 'Y').length,
      inactive: clients.filter((c) => c.client_active === 'N').length,
      expiringSoon: clients.filter((c) => {
        if (!c.contract_end_date) return false;
        const end = new Date(c.contract_end_date);
        return end > new Date() && end <= thirtyDays;
      }).length,
    };
  }, [clients]);

  const uniqueCompanies = useMemo(() =>
    [...new Set(clients.map((c) => c.owner_name).filter(Boolean))].sort(),
    [clients]
  );

  const filteredData = useMemo(() =>
    clients.filter((client) => {
      const s = searchTerm.toLowerCase();
      const matchesSearch =
        client.client_name?.toLowerCase().includes(s) ||
        client.client_email?.toLowerCase().includes(s) ||
        client.client_code?.toLowerCase().includes(s) ||
        client.client_city?.toLowerCase().includes(s);
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && client.client_active === 'Y') ||
        (statusFilter === 'INACTIVE' && client.client_active === 'N');
      const matchesCompany =
        !isSuperAdmin || companyFilter === 'ALL' || client.owner_name === companyFilter;
      return matchesSearch && matchesStatus && matchesCompany;
    }),
    [clients, searchTerm, statusFilter, companyFilter, isSuperAdmin]
  );

  const columns = useMemo(
    () => getClientColumns({ isDark, onEdit: handleEdit, onDelete: handleDelete, timezone }),
    [isDark, timezone]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 8
      }
    },
  });

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'}`}>

      <div className={`top-0 z-10 backdrop-blur-md transition-colors ${isDark
        ? 'bg-slate-900/80 border-b border-slate-800'
        : 'bg-white/80 border-b border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
      } px-6 py-4`}>
        <div className="mx-auto max-w-[1800px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full bg-violet-600" />
            <div>
              <h1 className={`font-semibold text-base tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Client Management</h1>
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Manage clients and their contracts</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
            className={`h-8 gap-1.5 text-xs font-semibold shadow-sm ${isDark
              ? 'bg-white hover:bg-white/90 text-black'
              : 'bg-violet-600 hover:bg-violet-700 text-white'
            }`}
          >
            <Plus size={14} />
            <span>Add New Client</span>
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-[1800px] mx-auto">

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {loading
            ? [...Array(4)].map((_, i) => <ClientStatSkeleton key={i} isDark={isDark} />)
            : STAT_CONFIG.map((cfg) => (
              <div
                key={cfg.key}
                className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-sm ${isDark ? cfg.accent.dark : cfg.accent.light}`}
              >
                <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full opacity-10 bg-current" />
                <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>{cfg.label}</p>
                <p className={`text-4xl font-black mt-2 tabular-nums leading-none ${isDark ? cfg.valueColor.dark : cfg.valueColor.light}`}>
                  {stats[cfg.key]}
                </p>
              </div>
            ))
          }
        </div>

        <div className={`rounded-xl border p-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <div className={`grid grid-cols-1 gap-3 ${isSuperAdmin ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
            <div className="space-y-1.5">
              <Label className={`flex items-center gap-1.5 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <Search size={13} /> Search
              </Label>
              <Input
                placeholder="Search by name, email, code, city…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`h-8 text-sm ${isDark ? 'bg-gray-900 border-gray-700 text-gray-200 placeholder:text-gray-600' : ''}`}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={`flex items-center gap-1.5 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <Filter size={13} /> Status
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className={`h-8 text-sm ${isDark ? 'bg-gray-900 border-gray-700 text-gray-200' : ''}`}>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isSuperAdmin && (
              <div className="space-y-1.5">
                <Label className={`flex items-center gap-1.5 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Building2 size={13} /> Company
                </Label>
                <Select value={companyFilter} onValueChange={setCompanyFilter}>
                  <SelectTrigger className={`h-8 text-sm ${isDark ? 'bg-gray-900 border-gray-700 text-gray-200' : ''}`}>
                    <SelectValue placeholder="All Companies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Companies</SelectItem>
                    {uniqueCompanies.map((name) => (
                      <SelectItem key={name} value={name!}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <div className={`rounded-xl border overflow-hidden shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <Table>
            <TableHeader className={isDark ? 'bg-slate-700' : 'bg-gradient-to-r from-blue-50 to-indigo-50'}>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id} className={isDark ? 'border-slate-600 hover:bg-transparent' : 'hover:bg-transparent'}>
                  {hg.headers.map((header) => (
                    <TableHead key={header.id} className={isDark ? 'text-slate-300' : 'text-gray-700'}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => <ClientSkeletonRow key={i} isDark={isDark} />)
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length}>
                    <div className={`text-center py-14 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      <Building2 size={40} className="mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">No clients found</p>
                      <p className="text-xs mt-1 opacity-60">Try adjusting your filters or add a new client</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={`transition-colors ${isDark ? 'border-slate-700 hover:bg-slate-700/50' : 'hover:bg-gray-50'}`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <TablePagination table={table} />
      </div>

      {showAddModal && (
        <ClientFormModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          mode="add"
          onSubmit={handleAddClient}
          isDark={isDark}
        />
      )}

      {showEditModal && selectedClient && (
        <ClientFormModal
          isOpen={showEditModal}
          onClose={() => { setShowEditModal(false); setSelectedClient(null); }}
          mode="edit"
          clientData={selectedClient}
          onSubmit={handleUpdateClient}
          isDark={isDark}
        />
      )}
    </div>
  );
}