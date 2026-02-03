'use client';

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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h1 className="text-2xl font-semibold text-gray-900">Drone System List</h1>
              <div className="flex flex-wrap gap-2">
                <button 
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  onClick={() => console.log('Add Tool')}
                >
                  Add Tool
                </button>
                <button 
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  onClick={() => console.log('Add Model')}
                >
                  Add Model
                </button>
                <button 
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  onClick={() => console.log('Add Component')}
                >
                  Add Component
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm mb-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                placeholder="Search by code, client, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">All Status</option>
                <option value="OPERATIONAL">Operational</option>
                <option value="NOT_OPERATIONAL">Not Operational</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Model
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Missions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSystems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      No systems found
                    </td>
                  </tr>
                ) : (
                  filteredSystems.map((system) => (
                    <tr key={system.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {system.tool_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {system.tool_desc}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {system.client_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {system.factory_model}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(system.tool_status)}`}>
                          {system.tool_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {system.tot_mission}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button 
                            className="text-blue-600 hover:text-blue-800"
                            onClick={() => console.log('View', system.id)}
                          >
                            View
                          </button>
                          <button 
                            className="text-gray-600 hover:text-gray-800"
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

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-500 mb-1">Total Systems</div>
            <div className="text-2xl font-semibold text-gray-900">{systems.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-500 mb-1">Operational</div>
            <div className="text-2xl font-semibold text-green-600">
              {systems.filter(s => s.tool_status === 'OPERATIONAL').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-500 mb-1">Not Operational</div>
            <div className="text-2xl font-semibold text-red-600">
              {systems.filter(s => s.tool_status === 'NOT_OPERATIONAL').length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}