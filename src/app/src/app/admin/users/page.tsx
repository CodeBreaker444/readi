'use client';

import { useTheme } from '@/src/components/useTheme';
import { Edit, Filter, Mail, Plus, Search, Trash2, User } from 'lucide-react';
import { useEffect, useState } from 'react';

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

export default function AdminUsers() {
  const { isDark } = useTheme();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [newUser, setNewUser] = useState({
    username: '',
    fullname: '',
    email: '',
    phone: '',
    fk_user_profile_id: 9,
    user_type: 'EMPLOYEE',
    is_viewer: 'N',
    is_manager: 'N',
    timezone: 'UTC',
    fk_client_id: 0,
    fk_territorial_unit: 0,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Replace with your actual API endpoint
      const response = await fetch('/api/user/getUserListByOwner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add auth headers
        },
        body: JSON.stringify({
          o_id: 0, // 0 = all owners, or use specific owner_id
          userRequest: 0,
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
    
    const matchesRole = roleFilter === 'ALL' || ROLE_MAPPING[user.fk_user_profile_id] === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' && user.active === 1) || (statusFilter === 'INACTIVE' && user.active === 0);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleEdit = (user: UserData) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleDelete = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      // Add delete API call
      await fetch(`/api/user/deleteUser`, {
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

  const handleAddUser = async () => {
    try {
      const response = await fetch('/api/user/userDataAdd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });
      
      const data = await response.json();
      if (data.code === 1) {
        setShowAddModal(false);
        setNewUser({
          username: '',
          fullname: '',
          email: '',
          phone: '',
          fk_user_profile_id: 9,
          user_type: 'EMPLOYEE',
          is_viewer: 'N',
          is_manager: 'N',
          timezone: 'UTC',
          fk_client_id: 0,
          fk_territorial_unit: 0,
        });
        fetchUsers();
      }
    } catch (error) {
      console.error('Error adding user:', error);
    }
  };

  const handleUpdateUser = async () => {
    // if (!selectedUser) return;
    
    // try {
    //   const response = await fetch('/api/user/userDataUpdate', {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({
    //     //   user_id: selectedUser.user_id,
    //       ...selectedUser,
    //     }),
    //   });
      
    //   const data = await response.json();
    //   if (data.code === 1) {
    //     setShowEditModal(false);
    //     setSelectedUser(null);
    //     fetchUsers();
    //   }
    // } catch (error) {
    //   console.error('Error updating user:', error);
    // }
  };

  const stats = {
    total: users.length,
    active: users.filter((u) => u.active === 1).length,
    inactive: users.filter((u) => u.active === 0).length,
    managers: users.filter((u) => u.is_manager === 'Y').length,
  };

  return (
    <div className={`min-h-screen p-6 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className={`rounded-lg shadow-sm mb-6 p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className={`text-2xl font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                User Management
              </h1>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Manage users and their roles across the system
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

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className={`rounded-lg p-4 ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className={`text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Total Users</div>
              <div className={`text-3xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{stats.total}</div>
            </div>
            <div className={`rounded-lg p-4 ${isDark ? 'bg-green-900' : 'bg-green-50'}`}>
              <div className={`text-sm mb-1 ${isDark ? 'text-green-300' : 'text-green-700'}`}>Active</div>
              <div className={`text-3xl font-bold ${isDark ? 'text-green-300' : 'text-green-700'}`}>{stats.active}</div>
            </div>
            <div className={`rounded-lg p-4 ${isDark ? 'bg-red-900' : 'bg-red-50'}`}>
              <div className={`text-sm mb-1 ${isDark ? 'text-red-300' : 'text-red-700'}`}>Inactive</div>
              <div className={`text-3xl font-bold ${isDark ? 'text-red-300' : 'text-red-700'}`}>{stats.inactive}</div>
            </div>
            <div className={`rounded-lg p-4 ${isDark ? 'bg-purple-900' : 'bg-purple-50'}`}>
              <div className={`text-sm mb-1 ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>Managers</div>
              <div className={`text-3xl font-bold ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>{stats.managers}</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className={`rounded-lg shadow-sm mb-6 p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <Search size={16} className="inline mr-2" />
                Search
              </label>
              <input
                type="text"
                placeholder="Search by name, email, or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  isDark ? 'border-gray-600 bg-gray-700 text-gray-200' : 'border-gray-300 bg-white'
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
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  isDark ? 'border-gray-600 bg-gray-700 text-gray-200' : 'border-gray-300 bg-white'
                }`}
              >
                <option value="ALL">All Roles</option>
                {Object.entries(ROLE_MAPPING).map(([id, role]) => (
                  <option key={id} value={role}>{role}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  isDark ? 'border-gray-600 bg-gray-700 text-gray-200' : 'border-gray-300 bg-white'
                }`}
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Loading...</div>
        ) : (
          <div className={`rounded-lg shadow-sm overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} border-b`}>
                  <tr>
                    {['Name', 'Username', 'Email', 'Role', 'Type', 'Status', 'Permissions', 'Actions'].map((col) => (
                      <th
                        key={col}
                        className={`px-6 py-3 text-left text-xs font-medium uppercase ${
                          isDark ? 'text-gray-300' : 'text-gray-500'
                        }`}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`${isDark ? 'divide-gray-700' : 'divide-gray-200'} divide-y`}>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className={`px-6 py-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        No users found
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.user_id} className={isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                        <td className={`px-6 py-4 whitespace-nowrap ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                          <div className="flex items-center gap-2">
                            <User size={16} className={isDark ? 'text-gray-400' : 'text-gray-500'} />
                            {user.fullname}
                          </div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          {user.username}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          <div className="flex items-center gap-1">
                            <Mail size={14} className={isDark ? 'text-gray-400' : 'text-gray-500'} />
                            {user.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {ROLE_MAPPING[user.fk_user_profile_id] || 'Unknown'}
                          </span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          {user.user_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.active === 1
                                ? isDark
                                  ? 'bg-green-900 text-green-300'
                                  : 'bg-green-100 text-green-800'
                                : isDark
                                ? 'bg-gray-700 text-gray-300'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {user.active === 1 ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-2">
                            {user.is_manager === 'Y' && (
                              <span
                                className={`px-2 py-1 text-xs rounded ${
                                  isDark ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-800'
                                }`}
                              >
                                Manager
                              </span>
                            )}
                            {user.is_viewer === 'Y' && (
                              <span
                                className={`px-2 py-1 text-xs rounded ${
                                  isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                Viewer
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(user)}
                              className={`p-2 rounded hover:bg-opacity-80 ${
                                isDark ? 'text-blue-400 hover:bg-gray-700' : 'text-blue-600 hover:bg-blue-50'
                              }`}
                              title="Edit User"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(user.user_id)}
                              className={`p-2 rounded hover:bg-opacity-80 ${
                                isDark ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-red-50'
                              }`}
                              title="Delete User"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-xl font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>Add New User</h2>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: 'Username', key: 'username', type: 'text', required: true },
                { label: 'Full Name', key: 'fullname', type: 'text', required: true },
                { label: 'Email', key: 'email', type: 'email', required: true },
                { label: 'Phone', key: 'phone', type: 'tel', required: false },
              ].map((field) => (
                <div key={field.key}>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type={field.type}
                    value={newUser[field.key as keyof typeof newUser]}
                    onChange={(e) => setNewUser({ ...newUser, [field.key]: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      isDark ? 'border-gray-600 bg-gray-700 text-gray-200' : 'border-gray-300 bg-white'
                    }`}
                  />
                </div>
              ))}
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={newUser.fk_user_profile_id}
                  onChange={(e) => setNewUser({ ...newUser, fk_user_profile_id: parseInt(e.target.value) })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDark ? 'border-gray-600 bg-gray-700 text-gray-200' : 'border-gray-300 bg-white'
                  }`}
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  User Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={newUser.user_type}
                  onChange={(e) => setNewUser({ ...newUser, user_type: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDark ? 'border-gray-600 bg-gray-700 text-gray-200' : 'border-gray-300 bg-white'
                  }`}
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="EXTERNAL">External</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Viewer Only
                  </label>
                  <select
                    value={newUser.is_viewer}
                    onChange={(e) => setNewUser({ ...newUser, is_viewer: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      isDark ? 'border-gray-600 bg-gray-700 text-gray-200' : 'border-gray-300 bg-white'
                    }`}
                  >
                    <option value="N">Full Access</option>
                    <option value="Y">Viewer</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Manager Role
                  </label>
                  <select
                    value={newUser.is_manager}
                    onChange={(e) => setNewUser({ ...newUser, is_manager: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      isDark ? 'border-gray-600 bg-gray-700 text-gray-200' : 'border-gray-300 bg-white'
                    }`}
                  >
                    <option value="N">Not Manager</option>
                    <option value="Y">Manager</option>
                  </select>
                </div>
              </div>
            </div>
            <div className={`p-6 border-t flex gap-3 justify-end ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => setShowAddModal(false)}
                className={`px-4 py-2 rounded-lg border ${
                  isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal - Similar structure to Add Modal but with selectedUser data */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-xl font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>Edit User</h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Similar form fields as Add Modal, but populated with selectedUser */}
              {/* Implementation similar to Add Modal */}
            </div>
            <div className={`p-6 border-t flex gap-3 justify-end ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                }}
                className={`px-4 py-2 rounded-lg border ${
                  isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Update User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}