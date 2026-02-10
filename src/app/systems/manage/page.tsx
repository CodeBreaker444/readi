'use client';

import { useTheme } from '@/components/useTheme';
import { useState } from 'react';

// Dummy data
const DUMMY_SYSTEMS = [
  {
    id: 1,
    tool_code: 'DJI-DOCK-001',
    tool_desc: 'Main Dock Station',
    client_name: 'RFI Infrastructure',
    tool_status: 'OPERATIONAL',
    factory_model: 'DJI Dock',
    factory_serie: 'DOCK-2024',
    tool_gcs_type: 'GCS_DOCK',
    tool_latitude: 41.9028,
    tool_longitude: 12.4964,
    tot_mission: 145,
    tot_flown_meter: 25000
  },
  {
    id: 2,
    tool_code: 'DJI-M300-002',
    tool_desc: 'Survey Drone Alpha',
    client_name: 'OVADA Construction',
    tool_status: 'NOT_OPERATIONAL',
    factory_model: 'Matrice 300 RTK',
    factory_serie: 'M300-2023',
    tool_gcs_type: 'GCS_STANDARD',
    tool_latitude: 42.1234,
    tool_longitude: 12.5678,
    tot_mission: 89,
    tot_flown_meter: 15000
  },
  {
    id: 3,
    tool_code: 'DJI-M30T-003',
    tool_desc: 'Thermal Inspection Unit',
    client_name: 'Energy Solutions Ltd',
    tool_status: 'OPERATIONAL',
    factory_model: 'Matrice 30T',
    factory_serie: 'M30T-2024',
    tool_gcs_type: 'GCS_THERMAL',
    tool_latitude: 41.8902,
    tool_longitude: 12.4923,
    tot_mission: 67,
    tot_flown_meter: 12500
  },
  {
    id: 4,
    tool_code: 'DJI-DOCK-004',
    tool_desc: 'Remote Monitoring Station',
    client_name: 'RFI Infrastructure',
    tool_status: 'OPERATIONAL',
    factory_model: 'DJI Dock',
    factory_serie: 'DOCK-2024',
    tool_gcs_type: 'GCS_DOCK',
    tool_latitude: 0,
    tool_longitude: 0,
    tot_mission: 0,
    tot_flown_meter: 0
  }
];

export default function SystemsManage() {
  const { isDark } = useTheme()
  const [systems, setSystems] = useState(DUMMY_SYSTEMS);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredSystems = systems.filter(system => {
    const matchesSearch = 
      system.tool_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      system.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      system.tool_desc.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || system.tool_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // const handleAddTool = () => {
  //   // API call would go here
  //   // await fetch('/api/tools', { method: 'POST', ... })
  //   console.log('Add tool clicked');
  // };

  const getStatusBadge = (status: string) => {
    const styles = {
      OPERATIONAL: 'bg-green-100 text-green-800',
      NOT_OPERATIONAL: 'bg-red-100 text-red-800',
      DEFAULT: 'bg-gray-100 text-gray-800'
    };
    return styles[status as keyof typeof styles] || styles.DEFAULT;
  };

  return (
   <div className={`min-h-screen p-6 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
  <div className="max-w-7xl mx-auto">
    <div className={`rounded-lg shadow-sm mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className={`text-2xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Drone System List</h1>
          <div className="flex flex-wrap gap-2">
            {['Add Tool', 'Add Model', 'Add Component'].map((label) => (
              <button 
                key={label}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  isDark
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
                onClick={() => console.log(label)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>

    <div className={`rounded-lg shadow-sm mb-6 p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
            Search
          </label>
          <input
            type="text"
            placeholder="Search by code, client, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
              isDark
                ? 'border-gray-600 bg-gray-700 text-gray-100 focus:ring-blue-400'
                : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500'
            }`}
          />
        </div>
        <div>
          <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
              isDark
                ? 'border-gray-600 bg-gray-700 text-gray-100 focus:ring-blue-400'
                : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500'
            }`}
          >
            <option value="ALL">All Status</option>
            <option value="OPERATIONAL">Operational</option>
            <option value="NOT_OPERATIONAL">Not Operational</option>
          </select>
        </div>
      </div>
    </div>

    <div className={`rounded-lg shadow-sm overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} border-b ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
            <tr>
              {['Code', 'Description', 'Client', 'Model', 'Status', 'Missions', 'Actions'].map((col) => (
                <th
                  key={col}
                  className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDark ? 'text-gray-300' : 'text-gray-500'
                  }`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {filteredSystems.length === 0 ? (
              <tr>
                <td colSpan={7} className={`px-6 py-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  No systems found
                </td>
              </tr>
            ) : (
              filteredSystems.map((system) => (
                <tr key={system.id} className={`transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    {system.tool_code}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-200' : 'text-gray-600'}`}>
                    {system.tool_desc}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-200' : 'text-gray-600'}`}>
                    {system.client_name}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-200' : 'text-gray-600'}`}>
                    {system.factory_model}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(system.tool_status)}`}>
                      {system.tool_status}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-200' : 'text-gray-600'}`}>
                    {system.tot_mission}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button 
                        className={`transition-colors ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                        onClick={() => console.log('View', system.id)}
                      >
                        View
                      </button>
                      <button 
                        className={`transition-colors ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800'}`}
                        onClick={() => console.log('Edit', system.id)}
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

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
      {[
        { label: 'Total Systems', value: systems.length, color: isDark ? 'text-gray-100' : 'text-gray-900' },
        { label: 'Operational', value: systems.filter(s => s.tool_status === 'OPERATIONAL').length, color: 'text-green-600' },
        { label: 'Not Operational', value: systems.filter(s => s.tool_status === 'NOT_OPERATIONAL').length, color: 'text-red-600' },
      ].map((stat) => (
        <div key={stat.label} className={`rounded-lg shadow-sm p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <div className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{stat.label}</div>
          <div className={`text-2xl font-semibold ${stat.color}`}>{stat.value}</div>
        </div>
      ))}
    </div>
  </div>
</div>
  );
}