'use client';

import { useTheme } from '@/components/useTheme';
import { Session } from '@/lib/auth/server-session';
import axios from 'axios';
import { Edit, Filter, Mail, Plus, Search, Trash2, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { UserFormModal } from './UserFormModal';

interface UserData {
  user_id: number;
  username: string;
  fullname: string;
  email: string;
  user_profile: string;
  fk_user_profile_id: number;
  active: number;
  user_type: string;
  is_viewer: string;
  is_manager: string;
  fk_territorial_unit?: number;
  terr_unit_code?: string;
  owner_code?: string;
  owner_name?: string;
}

const ROLE_MAPPING: Record<number, string> = {
  8: 'PIC',
  9: 'OPM',
  10: 'SM',
  11: 'AM',
  12: 'CMM',
  13: 'RM',
  14: 'TM',
  15: 'DC',
  16: 'SLA',
};

const ROLE_OPTIONS = [
  { value: 8, label: 'Pilot in Command (PIC)' },
  { value: 9, label: 'Operation Manager (OPM)' },
  { value: 10, label: 'Safety Manager (SM)' },
  { value: 11, label: 'Accountable Manager (AM)' },
  { value: 12, label: 'Compliance Monitoring Manager (CMM)' },
  { value: 13, label: 'Responsabile Manutenzione (RM)' },
  { value: 14, label: 'Training Manager (TM)' },
  { value: 15, label: 'Data Controller (DC)' },
  { value: 16, label: 'SLA Manager (SLA)' },
];

interface UserManagementProps {
  session: Session;
}
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
 

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/team/user/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          o_id: 0,
          user_profile: 0,
        }),
      });

      const data = await response.json();
      if (data.code === 1 && data.data) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole =
      roleFilter === 'ALL' || ROLE_MAPPING[user.fk_user_profile_id] === roleFilter;

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && user.active === 1) ||
      (statusFilter === 'INACTIVE' && user.active === 0);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleEdit = (user: UserData) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleDelete = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await fetch(`/api/team/user/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId }),
      });
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleAddUser = async (formData: any) => {
    try {
      const response = await axios.post('/api/team/user/add', {
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
        timezone: 'IST',
      });

      const data = await response.data;
      if (data.code === 1) {
        toast.success('User created successfully');
        setShowAddModal(false);
        fetchUsers();
      } else {
        toast.error(data.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Error adding user:', error);
      toast.error('Error creating user');
    }
  };

  const handleUpdateUser = async (formData: any) => {
    try {
      const response = await axios.post('/api/team/user/update', {
        data: JSON.stringify({
          ...formData,
          owner_id: session?.user.ownerId,
          profile_id: formData.fk_user_profile_id,
          user_viewer: formData.is_viewer,
          user_manager: formData.is_manager,
        }),
      });

      const data = await response.data;
      if (data.code === 1) {
        toast.success('User updated successfully');
        setShowEditModal(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        toast.error(data.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Error updating user');
    }
  };

  const stats = {
    total: users.length,
    active: users.filter((u) => u.active === 1).length,
    inactive: users.filter((u) => u.active === 0).length,
    managers: users.filter((u) => u.is_manager === 'Y').length,
  };

  return (
    <div className={`p-4 sm:p-6 lg:p-8 ${isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="mb-6 lg:mb-8 flex items-center justify-between">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Team Management
          </h1>
          <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Manage users and roles within your organization.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={18} />
          Add New User
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Users', value: stats.total, color: 'blue' },
          { label: 'Active', value: stats.active, color: 'green' },
          { label: 'Inactive', value: stats.inactive, color: 'red' },
          { label: 'Managers', value: stats.managers, color: 'purple' },
        ].map((stat, idx) => (
          <div
            key={idx}
            className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
              } rounded-lg shadow-sm border p-4`}
          >
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 text-${stat.color}-500`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-4 mb-6`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              <Search size={16} className="inline mr-2" />
              Search
            </label>
            <input
              type="text"
              placeholder="Search by name, email, username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDark ? 'border-gray-600 bg-gray-700 text-gray-200' : 'border-gray-300 bg-white'
                }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              <Filter size={16} className="inline mr-2" />
              Role
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDark ? 'border-gray-600 bg-gray-700 text-gray-200' : 'border-gray-300 bg-white'
                }`}
            >
              <option value="ALL">All Roles</option>
              {Object.entries(ROLE_MAPPING).map(([id, role]) => (
                <option key={id} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDark ? 'border-gray-600 bg-gray-700 text-gray-200' : 'border-gray-300 bg-white'
                }`}
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <div className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border overflow-hidden`}>
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className={`mt-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Loading...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className={isDark ? 'bg-slate-700' : 'bg-gray-50'}>
                <tr>
                  {['Name', 'Username', 'Email', 'Role', 'Type', 'Status', 'Permissions', 'Actions'].map((col) => (
                    <th
                      key={col}
                      className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'
                        }`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={`${isDark ? 'bg-slate-800 divide-slate-700' : 'bg-white divide-gray-200'} divide-y`}>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center">
                      <User size={48} className={`mx-auto mb-2 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                      <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>No users found</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.user_id} className={isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User size={20} className="text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {user.fullname}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                        {user.username}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                        <div className="flex items-center">
                          <Mail size={14} className="mr-2" />
                          {user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {ROLE_MAPPING[user.fk_user_profile_id] || 'Unknown'}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                        {user.user_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.active === 1
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                            }`}
                        >
                          {user.active === 1 ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-1">
                          {user.is_manager === 'Y' && (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                              Manager
                            </span>
                          )}
                          {user.is_viewer === 'Y' && (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              Viewer
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className={`p-2 rounded hover:bg-opacity-80 ${isDark ? 'text-blue-400 hover:bg-gray-700' : 'text-blue-600 hover:bg-blue-50'
                              }`}
                            title="Edit User"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(user.user_id)}
                            className={`p-2 rounded hover:bg-opacity-80 ${isDark ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-red-50'
                              }`}
                            title="Delete User"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <UserFormModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          mode="add"
          onSubmit={handleAddUser}
          isDark={isDark}
        />
      )}

      {showEditModal && selectedUser && (
        <UserFormModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          mode="edit"
          userData={selectedUser}
          onSubmit={handleUpdateUser}
          isDark={isDark}
        />
      )}
    </div>
  );
}