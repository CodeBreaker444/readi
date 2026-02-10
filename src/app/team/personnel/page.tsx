'use client';

import { useTheme } from '@/components/useTheme';
import { useState } from 'react';

// Dummy data
const DUMMY_PERSONNEL = [
  {
    id: 1,
    username: 'jsmith',
    first_name: 'John',
    last_name: 'Smith',
    email: 'john.smith@example.com',
    role: 'PILOT',
    status: 'ACTIVE',
    certifications: ['Part 107', 'VLOS Operations'],
    phone: '+1-555-0101',
    joined_date: '2023-01-15',
    total_missions: 245
  },
  {
    id: 2,
    username: 'mgarcia',
    first_name: 'Maria',
    last_name: 'Garcia',
    email: 'maria.garcia@example.com',
    role: 'TECHNICIAN',
    status: 'ACTIVE',
    certifications: ['Drone Maintenance', 'Electronics Repair'],
    phone: '+1-555-0102',
    joined_date: '2023-03-20',
    total_missions: 0
  },
  {
    id: 3,
    username: 'rchen',
    first_name: 'Robert',
    last_name: 'Chen',
    email: 'robert.chen@example.com',
    role: 'OPERATOR',
    status: 'ACTIVE',
    certifications: ['GCS Operations', 'Mission Planning'],
    phone: '+1-555-0103',
    joined_date: '2023-05-10',
    total_missions: 178
  },
  {
    id: 4,
    username: 'sjohnson',
    first_name: 'Sarah',
    last_name: 'Johnson',
    email: 'sarah.johnson@example.com',
    role: 'ADMIN',
    status: 'ACTIVE',
    certifications: ['System Administration'],
    phone: '+1-555-0104',
    joined_date: '2022-11-01',
    total_missions: 0
  },
  {
    id: 5,
    username: 'dwilson',
    first_name: 'David',
    last_name: 'Wilson',
    email: 'david.wilson@example.com',
    role: 'PILOT',
    status: 'INACTIVE',
    certifications: ['Part 107', 'BVLOS Operations'],
    phone: '+1-555-0105',
    joined_date: '2023-07-01',
    total_missions: 89
  }
];

export default function TeamPersonnel() {
  const { isDark } = useTheme()
  const [personnel, setPersonnel] = useState(DUMMY_PERSONNEL);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  const [newUser, setNewUser] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    role: 'OPERATOR',
    phone: ''
  });

  const filteredPersonnel = personnel.filter(person => {
    const matchesSearch = 
      person.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'ALL' || person.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || person.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadge = (role: string) => {
    const styles = {
      PILOT: 'bg-blue-100 text-blue-800',
      TECHNICIAN: 'bg-purple-100 text-purple-800',
      OPERATOR: 'bg-green-100 text-green-800',
      ADMIN: 'bg-red-100 text-red-800'
    };
    return styles[role as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status: string) => {
    return status === 'ACTIVE' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-gray-100 text-gray-800';
  };

  const handleAddUser = () => {
    // API call would go here
    // await fetch('/api/users', { method: 'POST', body: JSON.stringify(newUser) })
    console.log('Adding user:', newUser);
    setShowAddModal(false);
    setNewUser({
      username: '',
      first_name: '',
      last_name: '',
      email: '',
      role: 'OPERATOR',
      phone: ''
    });
  };

  const stats = {
    total: personnel.length,
    active: personnel.filter(p => p.status === 'ACTIVE').length,
    pilots: personnel.filter(p => p.role === 'PILOT').length,
    technicians: personnel.filter(p => p.role === 'TECHNICIAN').length
  };

  return (
    <div className={`min-h-screen p-6 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
  <div className="max-w-7xl mx-auto">
    {/* Header */}
    <div className={`rounded-lg shadow-sm mb-6 p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
      <div className="flex items-center justify-between mb-6">
        <h1 className={`text-2xl font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>Personnel List</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          Add New User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`rounded-lg p-4 ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <div className={`text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Total Personnel</div>
          <div className={`text-3xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{stats.total}</div>
        </div>
        <div className={`rounded-lg p-4 ${isDark ? 'bg-green-900' : 'bg-green-50'}`}>
          <div className={`text-sm mb-1 ${isDark ? 'text-green-300' : 'text-green-700'}`}>Active</div>
          <div className={`text-3xl font-bold ${isDark ? 'text-green-300' : 'text-green-700'}`}>{stats.active}</div>
        </div>
        <div className={`rounded-lg p-4 ${isDark ? 'bg-blue-900' : 'bg-blue-50'}`}>
          <div className={`text-sm mb-1 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>Pilots</div>
          <div className={`text-3xl font-bold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>{stats.pilots}</div>
        </div>
        <div className={`rounded-lg p-4 ${isDark ? 'bg-purple-900' : 'bg-purple-50'}`}>
          <div className={`text-sm mb-1 ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>Technicians</div>
          <div className={`text-3xl font-bold ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>{stats.technicians}</div>
        </div>
      </div>
    </div>

    {/* Filters */}
    <div className={`rounded-lg shadow-sm mb-6 p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Search</label>
          <input
            type="text"
            placeholder="Search by name, email, or username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              isDark ? 'border-gray-600 bg-gray-700 text-gray-200' : 'border-gray-300 bg-white text-gray-900'
            }`}
          />
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Role</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              isDark ? 'border-gray-600 bg-gray-700 text-gray-200' : 'border-gray-300 bg-white text-gray-900'
            }`}
          >
            <option value="ALL">All Roles</option>
            <option value="PILOT">Pilot</option>
            <option value="TECHNICIAN">Technician</option>
            <option value="OPERATOR">Operator</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              isDark ? 'border-gray-600 bg-gray-700 text-gray-200' : 'border-gray-300 bg-white text-gray-900'
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
    <div className={`rounded-lg shadow-sm overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className={`${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} border-b`}>
            <tr>
              {['Name', 'Username', 'Email', 'Role', 'Status', 'Missions', 'Actions'].map((col) => (
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
          <tbody className={`${isDark ? 'bg-gray-900 divide-gray-700' : 'bg-white divide-gray-200'} divide-y`}>
            {filteredPersonnel.length === 0 ? (
              <tr>
                <td colSpan={7} className={`px-6 py-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  No personnel found
                </td>
              </tr>
            ) : (
              filteredPersonnel.map((person) => (
                <tr
                  key={person.id}
                  className={`${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
                >
                  <td className={`${isDark ? 'text-gray-200' : 'text-gray-900'} px-6 py-4 whitespace-nowrap`}>
                    {person.first_name} {person.last_name}
                  </td>
                  <td className={`${isDark ? 'text-gray-300' : 'text-gray-600'} px-6 py-4 whitespace-nowrap`}>
                    {person.username}
                  </td>
                  <td className={`${isDark ? 'text-gray-300' : 'text-gray-600'} px-6 py-4 whitespace-nowrap`}>
                    {person.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadge(person.role)}`}
                    >
                      {person.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(person.status)}`}
                    >
                      {person.status}
                    </span>
                  </td>
                  <td className={`${isDark ? 'text-gray-300' : 'text-gray-600'} px-6 py-4 whitespace-nowrap`}>
                    {person.total_missions}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button
                        className={`hover:${isDark ? 'text-blue-400' : 'text-blue-800'} ${isDark ? 'text-blue-300' : 'text-blue-600'}`}
                        onClick={() => console.log('View', person.id)}
                      >
                        View
                      </button>
                      <button
                        className={`${isDark ? 'text-gray-300 hover:text-gray-100' : 'text-gray-600 hover:text-gray-800'}`}
                        onClick={() => console.log('Edit', person.id)}
                      >
                        Edit
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
  </div>

  {/* Add User Modal */}
  {showAddModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className={`p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-xl font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>Add New User</h2>
        </div>
        <div className="p-6 space-y-4">
          {[
            { label: 'Username', key: 'username', type: 'text' },
            { label: 'First Name', key: 'first_name', type: 'text' },
            { label: 'Last Name', key: 'last_name', type: 'text' },
            { label: 'Email', key: 'email', type: 'email' },
            { label: 'Phone', key: 'phone', type: 'tel' },
          ].map((field) => (
            <div key={field.key}>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{field.label}</label>
              <input
                type={field.type}
                value={field.key}
                onChange={(e) => setNewUser({ ...newUser, [field.key]: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  isDark ? 'border-gray-600 bg-gray-700 text-gray-200' : 'border-gray-300 bg-white text-gray-900'
                }`}
              />
            </div>
          ))}
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Role</label>
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                isDark ? 'border-gray-600 bg-gray-700 text-gray-200' : 'border-gray-300 bg-white text-gray-900'
              }`}
            >
              <option value="OPERATOR">Operator</option>
              <option value="PILOT">Pilot</option>
              <option value="TECHNICIAN">Technician</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        </div>
        <div className={`p-6 border-t flex gap-3 justify-end ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={() => setShowAddModal(false)}
            className={`px-4 py-2 rounded-lg border ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
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
</div>
  );
}