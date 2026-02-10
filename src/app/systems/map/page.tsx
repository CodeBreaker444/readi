'use client';

import { useTheme } from '@/components/useTheme';
import { useEffect, useState } from 'react';

// Dummy data
const DUMMY_DOCKS = [
  {
    id: 1,
    tool_code: 'DOCK-RFI-001',
    client_name: 'RFI Infrastructure',
    tool_desc: 'Central Station Rome',
    factory_model: 'DJI Dock',
    factory_serie: 'DOCK-2024',
    tool_status: 'OPERATIONAL',
    tool_latitude: 41.9028,
    tool_longitude: 12.4964,
    tool_gcs_type: 'GCS_DOCK',
    fk_client_id: '1',
    tot_mission: 145,
    tot_flown_meter: 25000
  },
  {
    id: 2,
    tool_code: 'DOCK-OVADA-001',
    client_name: 'OVADA Construction',
    tool_desc: 'Construction Site Monitor',
    factory_model: 'DJI Dock',
    factory_serie: 'DOCK-2024',
    tool_status: 'OPERATIONAL',
    tool_latitude: 44.6367,
    tool_longitude: 8.6414,
    tool_gcs_type: 'GCS_DOCK',
    fk_client_id: '2',
    tot_mission: 89,
    tot_flown_meter: 15000
  },
  {
    id: 3,
    tool_code: 'DOCK-ENERGY-001',
    client_name: 'Energy Solutions Ltd',
    tool_desc: 'Solar Farm Inspection',
    factory_model: 'DJI Dock',
    factory_serie: 'DOCK-2024',
    tool_status: 'NOT_OPERATIONAL',
    tool_latitude: 43.7696,
    tool_longitude: 11.2558,
    tool_gcs_type: 'GCS_DOCK',
    fk_client_id: '3',
    tot_mission: 67,
    tot_flown_meter: 12500
  },
  {
    id: 4,
    tool_code: 'DJI-M300-001',
    client_name: 'RFI Infrastructure',
    tool_desc: 'Mobile Survey Unit',
    factory_model: 'Matrice 300',
    factory_serie: 'M300-2023',
    tool_status: 'OPERATIONAL',
    tool_latitude: 45.4642,
    tool_longitude: 9.1900,
    tool_gcs_type: 'GCS_STANDARD',
    fk_client_id: '1',
    tot_mission: 234,
    tot_flown_meter: 45000
  }
];

const CONTROL_CENTER = {
  lat: 41.9136,
  lon: 12.5,
  label: 'Control Center — Via Nizza 53, Roma'
};

export default function SystemsMap() {
  const { isDark } = useTheme()
  const [tools, setTools] = useState(DUMMY_DOCKS);
  const [filteredTools, setFilteredTools] = useState(DUMMY_DOCKS);
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyDock, setOnlyDock] = useState(true);
  const [onlyInstalled, setOnlyInstalled] = useState(true);

  const clients = Array.from(new Set(tools.map(t => t.client_name))).sort();

  useEffect(() => {
    applyFilters();
  }, [statusFilter, clientFilter, searchQuery, onlyDock, onlyInstalled]);

  const applyFilters = () => {
    let filtered = [...tools];

    if (statusFilter) {
      filtered = filtered.filter(t => t.tool_status === statusFilter);
    }

    if (clientFilter) {
      filtered = filtered.filter(t => t.client_name === clientFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.tool_code.toLowerCase().includes(query) ||
        t.client_name.toLowerCase().includes(query) ||
        t.tool_desc.toLowerCase().includes(query)
      );
    }

    if (onlyDock) {
      filtered = filtered.filter(t => 
        t.tool_gcs_type.includes('DOCK') || 
        t.factory_model.includes('Dock')
      );
    }

    if (onlyInstalled) {
      filtered = filtered.filter(t => 
        t.tool_latitude !== 0 && t.tool_longitude !== 0
      );
    }

    setFilteredTools(filtered);
  };

  const getStatusColor = (status: string) => {
    return status === 'OPERATIONAL' ? '#2e7d32' : '#b71c1c';
  };

  const isDock = (tool: typeof DUMMY_DOCKS[0]) => {
    return tool.tool_gcs_type.includes('DOCK') || tool.factory_model.includes('Dock');
  };

  return (
   <div className={`min-h-screen p-6 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
  <div className="max-w-7xl mx-auto">
    <div className={`rounded-lg shadow-sm mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className={`text-2xl font-semibold flex items-center gap-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            <span>🗺️</span> Installed Docks
          </h1>
          <div className="flex gap-2">
            {['Fit map', 'Reload'].map((label) => (
              <button
                key={label}
                className={`px-4 py-2 text-sm border rounded-lg transition-colors ${
                  isDark
                    ? 'border-gray-600 text-gray-100 hover:bg-gray-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => console.log(label)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent ${
                isDark
                  ? 'border-gray-600 bg-gray-700 text-gray-100 focus:ring-blue-400'
                  : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500'
              }`}
            >
              <option value="">All</option>
              <option value="OPERATIONAL">OPERATIONAL</option>
              <option value="NOT_OPERATIONAL">NOT OPERATIONAL</option>
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Client</label>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent ${
                isDark
                  ? 'border-gray-600 bg-gray-700 text-gray-100 focus:ring-blue-400'
                  : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500'
              }`}
            >
              <option value="">All clients</option>
              {clients.map(client => (
                <option key={client} value={client}>{client}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. RFI, OVADA, DOCK 2"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent ${
                isDark
                  ? 'border-gray-600 bg-gray-700 text-gray-100 focus:ring-blue-400'
                  : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500'
              }`}
            />
          </div>

          {[['onlyDock', 'Dock only'], ['onlyInstalled', 'Installed only']].map(([state, label]) => (
            <div key={state} className="flex items-end">
              <label className={`flex items-center gap-2 cursor-pointer ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                <input
                  type="checkbox"
                  checked={state === 'onlyDock' ? onlyDock : onlyInstalled}
                  onChange={(e) => state === 'onlyDock' ? setOnlyDock(e.target.checked) : setOnlyInstalled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <span className="text-sm">{label}</span>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <div className={`rounded-lg shadow-sm overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className={`p-4 border-b flex justify-between ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>List</h2>
          <span className={`px-2 py-1 rounded-full text-xs ${isDark ? 'bg-gray-700 text-gray-100' : 'bg-gray-100 text-gray-700'}`}>
            {filteredTools.length}
          </span>
        </div>

        <div className="overflow-auto" style={{ maxHeight: '420px' }}>
          <table className="w-full text-sm">
            <thead className={`sticky top-0 ${isDark ? 'bg-gray-700 text-gray-100' : 'bg-gray-50'}`}>
              <tr>
                {['Code', 'Status', 'Actions'].map(col => (
                  <th key={col} className="px-4 py-2 text-left text-xs uppercase">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {filteredTools.length === 0 ? (
                <tr>
                  <td colSpan={3} className={`px-4 py-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No results</td>
                </tr>
              ) : (
                filteredTools.map(tool => (
                  <tr key={tool.id} className={`hover:${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <td className={`${isDark ? 'text-gray-100' : 'text-gray-900'} px-4 py-3`}>{tool.tool_code}</td>
                    <td className="px-4 py-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getStatusColor(tool.tool_status) }}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className={`px-2 py-1 text-xs ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Go</button>
                      <button className={`px-2 py-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Details</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`lg:col-span-2 rounded-lg shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="relative h-105 bg-linear-to-br from-blue-50 to-indigo-50">
          <div className="absolute inset-0 flex items-center justify-center text-center">
            <div>
              <div className="text-4xl mb-2">🗺️</div>
              <p className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Interactive Map</p>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Leaflet map would render here</p>
              <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Center: {CONTROL_CENTER.label}
              </p>
            </div>
          </div>

          <div className={`absolute bottom-4 left-4 rounded-lg p-3 text-xs shadow ${isDark ? 'bg-gray-700 text-gray-100' : 'text-black'}`}>
            <div className="font-medium mb-2">Legend</div>
            <div className="flex gap-2"><div className="w-3 h-3 bg-green-700 rounded-full" /> OPERATIONAL</div>
            <div className="flex gap-2"><div className="w-3 h-3 bg-red-700 rounded-full" /> NOT OPERATIONAL</div>
            <div className="mt-2 border-t pt-2 border-gray-300">
              <div>🏠 Control Center</div>
              <div>⛳ Dock</div>
              <div>● Drone</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
      {[
        { label: 'Total Visible', value: filteredTools.length },
        { label: 'Docks', value: filteredTools.filter(t => isDock(t)).length, color: 'text-blue-600' },
        { label: 'Operational', value: filteredTools.filter(t => t.tool_status === 'OPERATIONAL').length, color: 'text-green-600' },
      ].map(stat => (
        <div key={stat.label} className={`p-6 rounded-lg shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <div className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{stat.label}</div>
          <div className={`text-2xl font-semibold ${stat.color ? stat.color : isDark ? 'text-gray-100' : 'text-gray-900'}`}>{stat.value}</div>
        </div>
      ))}
    </div>

  </div>
</div>
  );
}