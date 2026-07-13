'use client';

import { TablePagination } from '@/components/tables/Pagination';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/components/useTheme';
import '@/lib/i18n/config';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import axios from 'axios';
import { Building2, Plus, ShieldCheck, User as UserIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { getOrgColumns, getUserColumns, Organization, UserWithAccess } from '../tables/ConfigColumns';
import { DataTable, DeleteAlertDialog, EditUserDialog, OrgDialog, SearchBar } from './ConfigDialogs';

export default function C2Config() {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('organizations');

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [orgLoading, setOrgLoading] = useState(true);
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [orgSearchTerm, setOrgSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [users, setUsers] = useState<UserWithAccess[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [editUserModalOpen, setEditUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithAccess | null>(null);

  const fetchOrganizations = useCallback(async () => {
    setOrgLoading(true);
    try {
      const res = await axios.get('/api/admin/c2-config/organizations');
      setOrganizations(res.data.organizations || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('flytbase.c2Config.organizations.toasts.loadFailed'));
    } finally {
      setOrgLoading(false);
    }
  }, [t]);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await axios.get('/api/admin/c2-config/permissions');
      setUsers(res.data.users || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('flytbase.c2Config.permissions.toasts.loadFailed'));
    } finally {
      setUsersLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchOrganizations();
    fetchUsers();
  }, [fetchOrganizations, fetchUsers]);

  const handleOrgSubmit = async (form: Record<string, any>) => {
    try {
      await axios.post('/api/admin/c2-config/organizations', form);
      toast.success(t('flytbase.c2Config.organizations.toasts.created'));
      setOrgDialogOpen(false);
      fetchOrganizations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('flytbase.c2Config.organizations.toasts.createFailed'));
      throw err;
    }
  };

  const handleOrgDeleteRequest = (id: string) => {
    setDeleteTargetId(id);
    setDeleteDialogOpen(true);
  };

  const handleOrgDeleteConfirm = async () => {
    try {
      await axios.delete('/api/admin/c2-config/organizations', { data: { id: deleteTargetId } });
      toast.success(t('flytbase.c2Config.organizations.toasts.deleted'));
      fetchOrganizations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('flytbase.c2Config.organizations.toasts.deleteFailed'));
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTargetId(null);
    }
  };

  const handleGrantAccess = async (userId: string, organizationId: string) => {
    try {
      await axios.post('/api/admin/c2-config/permissions', { userId, organizationId });
      toast.success(t('flytbase.c2Config.permissions.toasts.granted'));
      setSelectedUser((prev) => {
        if (!prev) return prev;
        const org = organizations.find((o) => o.id === organizationId);
        if (!org) return prev;
        return { ...prev, organizations: [...prev.organizations, org] };
      });
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('flytbase.c2Config.permissions.toasts.grantFailed'));
    }
  };

  const handleRevokeAccess = async (userId: string, organizationId: string) => {
    try {
      await axios.delete('/api/admin/c2-config/permissions', { 
        data: { userId, organizationId } 
      });
      toast.success(t('flytbase.c2Config.permissions.toasts.revoked'));
      setSelectedUser((prev) => {
        if (!prev) return prev;
        return { ...prev, organizations: prev.organizations.filter((o: Organization) => o.id !== organizationId) };
      });
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('flytbase.c2Config.permissions.toasts.revokeFailed'));
    }
  };

  const handleEditUser = (user: UserWithAccess) => {
    setSelectedUser(user);
    setEditUserModalOpen(true);
  };

  const handleEditUserClose = (val: boolean) => {
    setEditUserModalOpen(val);
    if (!val) setSelectedUser(null);
  };

  const filteredOrganizations = useMemo(
    () =>
      organizations.filter((org) => {
        const s = orgSearchTerm.toLowerCase();
        return org.name.toLowerCase().includes(s) || org.org_id.toLowerCase().includes(s);
      }),
    [organizations, orgSearchTerm]
  );

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const s = userSearchTerm.toLowerCase();
        const matchesSearch = user.fullname.toLowerCase().includes(s) || user.email.toLowerCase().includes(s);
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesSearch && matchesRole;
      }),
    [users, userSearchTerm, roleFilter]
  );

  const orgColumns = useMemo(
    () => getOrgColumns({ isDark, t, onDelete: handleOrgDeleteRequest }),
    [isDark, t]
  );

  const userColumns = useMemo(
    () => getUserColumns({ isDark, t, onEdit: handleEditUser }),
    [isDark, t]
  );

  const orgTable = useReactTable({
    data: filteredOrganizations,
    columns: orgColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
  });

  const userTable = useReactTable({
    data: filteredUsers,
    columns: userColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
  });

  const tabs = ['organizations', 'permissions'];

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0a0d14] text-white' : 'bg-slate-50 text-slate-900'}`}>
      <div className={`border-b px-5 py-4 ${isDark ? 'border-slate-800 bg-[#0a0d14]' : 'border-slate-200 bg-white'}`}>
        <div className="max-w-450 mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full bg-violet-600 shrink-0" />
            <div>
              <h1 className={`font-semibold text-base tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {t('flytbase.c2Config.title')}
              </h1>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {t('flytbase.c2Config.subtitle')}
              </p>
            </div>
          </div>

          {activeTab === 'organizations' && (
            <Button
              size="sm"
              onClick={() => setOrgDialogOpen(true)}
              className={`h-8 gap-1.5 cursor-pointer text-xs font-semibold shadow-sm ${
                isDark ? 'text-white hover:bg-slate-600/90 bg-slate-600/50 border border-slate-500' : 'bg-violet-600 hover:bg-violet-700 text-white'
              }`}
            >
              <Plus size={14} />
              {t('flytbase.c2Config.organizations.add')}
            </Button>
          )}
        </div>
      </div>

      <div className="p-5 space-y-5 max-w-450 mx-auto">
        <div className={`flex gap-1 p-1 rounded-lg w-fit ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex cursor-pointer items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-violet-600 text-white shadow-sm'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'organizations' ? <Building2 className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              {t(`flytbase.c2Config.tabs.${tab}`)}
            </button>
          ))}
        </div>

        {activeTab === 'organizations' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="w-64">
                <SearchBar
                  value={orgSearchTerm}
                  onChange={setOrgSearchTerm}
                  placeholder={t('flytbase.c2Config.organizations.table.name')}
                  isDark={isDark}
                />
              </div>
              <span className={`text-xs tabular-nums ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {filteredOrganizations.length} {filteredOrganizations.length === 1 ? 'org' : 'orgs'}
              </span>
            </div>

            <DataTable
              table={orgTable}
              loading={orgLoading}
              colSpan={4}
              emptyIcon={<Building2 size={36} className="opacity-40" />}
              emptyText={t('flytbase.c2Config.organizations.noOrgs')}
              isDark={isDark}
            />

            <TablePagination table={orgTable} />
          </div>
        )}

        {activeTab === 'permissions' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-48">
                  <SearchBar
                    value={userSearchTerm}
                    onChange={setUserSearchTerm}
                    placeholder={t('flytbase.c2Config.permissions.table.name')}
                    isDark={isDark}
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                    <SelectItem value="PIC">PIC</SelectItem>
                    <SelectItem value="OPM">OPM</SelectItem>
                    <SelectItem value="SM">SM</SelectItem>
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="CMM">CMM</SelectItem>
                    <SelectItem value="RM">RM</SelectItem>
                    <SelectItem value="TM">TM</SelectItem>
                    <SelectItem value="DC">DC</SelectItem>
                    <SelectItem value="SLA">SLA</SelectItem>
                    <SelectItem value="OM">OM</SelectItem>
                    <SelectItem value="MM">MM</SelectItem>
                    <SelectItem value="VM">VM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <span className={`text-xs tabular-nums ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
              </span>
            </div>

            <DataTable
              table={userTable}
              loading={usersLoading}
              colSpan={5}
              emptyIcon={<UserIcon size={36} className="opacity-40" />}
              emptyText={t('flytbase.c2Config.permissions.noUsers')}
              isDark={isDark}
            />

            <TablePagination table={userTable} />
          </div>
        )}
      </div>

      <OrgDialog
        open={orgDialogOpen}
        onOpenChange={setOrgDialogOpen}
        onSubmit={handleOrgSubmit}
        isDark={isDark}
      />

      <DeleteAlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleOrgDeleteConfirm}
        isDark={isDark}
      />

      <EditUserDialog
        open={editUserModalOpen}
        onOpenChange={handleEditUserClose}
        selectedUser={selectedUser}
        organizations={organizations}
        onGrant={handleGrantAccess}
        onRevoke={handleRevokeAccess}
        isDark={isDark}
      />
    </div>
  );
}