'use client';

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
import { Filter, Plus, Search, User } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { TablePagination } from '../tables/Pagination';
import { getUserColumns, UserData } from '../tables/userColumns';
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
import { UserFormModal } from './UserFormModal';
import { SkeletonRow, StatSkeleton } from './UserSkeleton';

interface UserManagementProps {
  session: Session;
}

const STAT_CONFIG = [
  { key: 'total', label: 'Total Users', accent: { dark: 'from-slate-800 to-slate-900 border-slate-700', light: 'from-white to-slate-50 border-slate-200' }, valueColor: { dark: 'text-white', light: 'text-slate-800' } },
  { key: 'active', label: 'Active', accent: { dark: 'from-emerald-900/40 to-emerald-900/10 border-emerald-900/30', light: 'from-emerald-50 to-white border-emerald-100' }, valueColor: { dark: 'text-emerald-400', light: 'text-emerald-600' } },
  { key: 'inactive', label: 'Inactive', accent: { dark: 'from-rose-900/40 to-rose-900/10 border-rose-900/30', light: 'from-rose-50 to-white border-rose-100' }, valueColor: { dark: 'text-rose-400', light: 'text-rose-600' } },
  { key: 'managers', label: 'Managers', accent: { dark: 'from-violet-900/40 to-violet-900/10 border-violet-900/30', light: 'from-violet-50 to-white border-violet-100' }, valueColor: { dark: 'text-violet-400', light: 'text-violet-600' } },
] as const;

export default function UserManagement({ session }: UserManagementProps) {
  const { isDark } = useTheme();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/team/user/list',
        {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
      const data = await res.json();
      if (data.code === 1 && data.data) setUsers(data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleEdit = (user: UserData) => { setSelectedUser(user); setShowEditModal(true); };
  const handleDelete = async (userId: number) => {
    try {
      await fetch('/api/team/user/delete',
        {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId })
        });
      fetchUsers();
    } catch (e) { console.error(e); }
  };

  const handleAddUser = async (formData: any) => {
    try {
      const res = await axios.post('/api/team/user/add',
        {
          username: formData.username,
          fullname: formData.fullname,
          email: formData.email,
          phone: formData.phone || '',
          fk_client_id: 0,
          profile: formData.fk_user_profile_id,
          ownerTerritorialUnit: 0,
          user_type: formData.user_type,
          user_viewer: formData.is_viewer,
          user_manager: formData.is_manager,
          timezone: 'IST'
        });
      const data = res.data;
      if (data.code === 1) { toast.success('User created successfully'); setShowAddModal(false); fetchUsers(); }
      else toast.error(data.error || 'Failed to create user');
    } catch { toast.error('Error creating user'); }
  };

  const handleUpdateUser = async (formData: any) => {
    try {
      const res = await axios.post('/api/team/user/update',
        {
          data: JSON.stringify({
            ...formData,
            owner_id: session?.user.ownerId,
            profile_id: formData.fk_user_profile_id,
            user_viewer: formData.is_viewer,
            user_manager: formData.is_manager
          })
        });
      const data = res.data;
      if (data.code === 1) { toast.success('User updated successfully'); setShowEditModal(false); setSelectedUser(null); fetchUsers(); }
      else toast.error(data.error || 'Failed to update user');
    } catch { toast.error('Error updating user'); }
  };

  const uniqueRoles = useMemo(() => [...new Set(users.map((u) => u.user_role))].filter(Boolean), [users]);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((u) => u.active === 1).length,
    inactive: users.filter((u) => u.active === 0).length,
    managers: users.filter((u) => u.is_manager === 'Y').length,
  }), [users]);

  const filteredData = useMemo(() => users.filter((user) => {
    const s = searchTerm.toLowerCase();
    const matchesSearch = user.fullname?.toLowerCase().includes(s) || user.email?.toLowerCase().includes(s) || user.username?.toLowerCase().includes(s);
    const matchesRole = roleFilter === 'ALL' || user.user_role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' && user.active === 1) || (statusFilter === 'INACTIVE' && user.active === 0);
    return matchesSearch && matchesRole && matchesStatus;
  }), [users, searchTerm, roleFilter, statusFilter]);

    const columns = useMemo(() => getUserColumns({ isDark, onEdit: handleEdit, onDelete: handleDelete }), [isDark]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'}`}>

      <div className={`top-0 z-10 backdrop-blur-md transition-colors ${isDark ? 'bg-slate-900/80 border-b border-slate-800' : 'bg-white/80 border-b border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)]'} px-6 py-4`}>
        <div className="mx-auto max-w-[1800px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full bg-violet-600" />
            <div>
              <h1 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Team Management</h1>
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Manage users and roles within your organization</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
            className={`h-8 gap-1.5 text-xs font-semibold shadow-sm ${isDark ? 'bg-white hover:bg-white/90 text-black' : 'bg-violet-600 hover:bg-violet-700 text-white'}`}
          >
            <Plus size={14} />
            <span>Add New User</span>
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-[1800px] mx-auto">

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {loading
            ? [...Array(4)].map((_, i) => <StatSkeleton key={i} isDark={isDark} />)
            : STAT_CONFIG.map((cfg) => (
              <div key={cfg.key} className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-sm   ${isDark ? cfg.accent.dark : cfg.accent.light}`}>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

            <div className="space-y-1.5">
              <Label className={`flex items-center gap-1.5 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <Search size={13} /> Search
              </Label>
              <Input
                placeholder="Search by name, email, username…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`h-8 text-sm ${isDark ? 'bg-gray-900 border-gray-700 text-gray-200 placeholder:text-gray-600' : ''}`}
              />
            </div>

            <div className="space-y-1.5">
              <Label className={`flex items-center gap-1.5 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <Filter size={13} /> Role
              </Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className={`h-8 text-sm ${isDark ? 'bg-gray-900 border-gray-700 text-gray-200' : ''}`}>
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Roles</SelectItem>
                  {uniqueRoles.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status</Label>
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
                [...Array(5)].map((_, i) => <SkeletonRow key={i} isDark={isDark} />)
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length}>
                    <div className={`text-center py-14 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      <User size={40} className="mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">No users found</p>
                      <p className="text-xs mt-1 opacity-60">Try adjusting your filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className={`transition-colors ${isDark ? 'border-slate-700 hover:bg-slate-700/50' : 'hover:bg-gray-50'}`}>
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
        <UserFormModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} mode="add" onSubmit={handleAddUser} isDark={isDark} />
      )}
      {showEditModal && selectedUser && (
        <UserFormModal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedUser(null); }} mode="edit" userData={selectedUser} onSubmit={handleUpdateUser} isDark={isDark} />
      )}
    </div>
  );
}