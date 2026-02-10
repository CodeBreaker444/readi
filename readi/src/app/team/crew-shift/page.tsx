'use client';

import { useTheme } from '@/components/useTheme';
import { useState } from 'react';

// Dummy shift data
const DUMMY_SHIFTS = [
  {
    id: 1,
    pilot_name: 'John Smith',
    shift_type: 'ON_DUTY',
    start_date: '2024-12-20',
    start_time: '08:00',
    end_date: '2024-12-20',
    end_time: '16:00',
    location: 'Rome Station',
    notes: 'Regular shift'
  },
  {
    id: 2,
    pilot_name: 'Maria Garcia',
    shift_type: 'STAND_BY',
    start_date: '2024-12-20',
    start_time: '16:00',
    end_date: '2024-12-20',
    end_time: '24:00',
    location: 'Rome Station',
    notes: 'Evening standby'
  },
  {
    id: 3,
    pilot_name: 'Robert Chen',
    shift_type: 'ON_DUTY',
    start_date: '2024-12-21',
    start_time: '08:00',
    end_date: '2024-12-21',
    end_time: '16:00',
    location: 'Milan Station',
    notes: ''
  },
  {
    id: 4,
    pilot_name: 'Sarah Johnson',
    shift_type: 'TRAINING',
    start_date: '2024-12-22',
    start_time: '09:00',
    end_date: '2024-12-22',
    end_time: '17:00',
    location: 'Training Center',
    notes: 'Advanced operations training'
  },
  {
    id: 5,
    pilot_name: 'David Wilson',
    shift_type: 'OFF_DUTY',
    start_date: '2024-12-23',
    start_time: '00:00',
    end_date: '2024-12-23',
    end_time: '24:00',
    location: '-',
    notes: 'Personal leave'
  }
];

const PILOTS = [
  { id: 1, name: 'John Smith' },
  { id: 2, name: 'Maria Garcia' },
  { id: 3, name: 'Robert Chen' },
  { id: 4, name: 'Sarah Johnson' },
  { id: 5, name: 'David Wilson' }
];

export default function CrewShiftCalendar() {
  const { isDark } = useTheme()
  const [shifts, setShifts] = useState(DUMMY_SHIFTS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  const [newShift, setNewShift] = useState({
    pilot_name: '',
    shift_type: 'ON_DUTY',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    location: '',
    notes: ''
  });

  const getShiftColor = (type: string) => {
    const colors = {
      STAND_BY: '#1976d2',
      ON_DUTY: '#2e7d32',
      OFF_DUTY: '#ef6c00',
      TRAINING: '#6a1b9a'
    };
    return colors[type as keyof typeof colors] || '#616161';
  };

  const getShiftBadge = (type: string) => {
    const styles = {
      STAND_BY: 'bg-blue-100 text-blue-800 border-blue-200',
      ON_DUTY: 'bg-green-100 text-green-800 border-green-200',
      OFF_DUTY: 'bg-orange-100 text-orange-800 border-orange-200',
      TRAINING: 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return styles[type as keyof typeof styles] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const handleAddShift = () => {
    // API call would go here
    // await fetch('/api/shifts', { method: 'POST', body: JSON.stringify(newShift) })
    console.log('Adding shift:', newShift);
    setShowAddModal(false);
    setNewShift({
      pilot_name: '',
      shift_type: 'ON_DUTY',
      start_date: '',
      start_time: '',
      end_date: '',
      end_time: '',
      location: '',
      notes: ''
    });
  };

  const stats = {
    total: shifts.length,
    onDuty: shifts.filter(s => s.shift_type === 'ON_DUTY').length,
    standBy: shifts.filter(s => s.shift_type === 'STAND_BY').length,
    training: shifts.filter(s => s.shift_type === 'TRAINING').length
  };

  return (
 <div className={`min-h-screen p-6 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
  <div className="max-w-7xl mx-auto">
    {/* Header */}
    <div className={`rounded-lg shadow-sm mb-6 p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
      <div className="flex items-center justify-between mb-6">
        <h1 className={`text-2xl font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>Crew Shift Calendar</h1>
        <div className="flex gap-3">
          <div className={`flex gap-1 rounded-lg p-1 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-md text-sm transition-colors ${
                viewMode === 'list'
                  ? `${isDark ? 'bg-gray-900 shadow-sm text-white' : 'bg-white shadow-sm text-gray-900'}`
                  : `${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 rounded-md text-sm transition-colors ${
                viewMode === 'calendar'
                  ? `${isDark ? 'bg-gray-900 shadow-sm text-white' : 'bg-white shadow-sm text-gray-900'}`
                  : `${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
              }`}
            >
              Calendar
            </button>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            Add New Shift
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 items-center">
        <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Legend:</span>
        {[
          { label: 'STAND BY', bg: '#e3f2fd', color: '#1976d2', border: '#1976d2' },
          { label: 'ON DUTY', bg: '#e8f5e9', color: '#2e7d32', border: '#2e7d32' },
          { label: 'OFF DUTY', bg: '#fff3e0', color: '#ef6c00', border: '#ef6c00' },
          { label: 'TRAINING', bg: '#f3e5f5', color: '#6a1b9a', border: '#6a1b9a' },
        ].map((item) => (
          <span
            key={item.label}
            className="px-3 py-1 text-xs font-semibold rounded-full border"
            style={{
              backgroundColor: isDark ? item.color + '20' : item.bg,
              color: isDark ? item.bg : item.color,
              borderColor: isDark ? item.color : item.border,
            }}
          >
            {item.label}
          </span>
        ))}
      </div>
    </div>

    {/* Stats */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
      {[
        { label: 'Total Shifts', value: stats.total, bg: isDark ? 'bg-gray-700' : 'bg-white', text: isDark ? 'text-gray-200' : 'text-gray-900' },
        { label: 'On Duty', value: stats.onDuty, bg: isDark ? 'bg-green-900' : 'bg-green-50', text: isDark ? 'text-green-300' : 'text-green-700' },
        { label: 'Stand By', value: stats.standBy, bg: isDark ? 'bg-blue-900' : 'bg-blue-50', text: isDark ? 'text-blue-300' : 'text-blue-700' },
        { label: 'Training', value: stats.training, bg: isDark ? 'bg-purple-900' : 'bg-purple-50', text: isDark ? 'text-purple-300' : 'text-purple-700' },
      ].map((stat) => (
        <div key={stat.label} className={`rounded-lg shadow-sm p-6 ${stat.bg}`}>
          <div className={`text-sm mb-1 font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{stat.label}</div>
          <div className={`text-3xl font-bold ${stat.text}`}>{stat.value}</div>
        </div>
      ))}
    </div>

    {/* Content */}
    {viewMode === 'list' ? (
      <div className={`rounded-lg shadow-sm overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={`${isDark ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-500'} border-b`}>
              <tr>
                {['Pilot', 'Shift Type', 'Start', 'End', 'Location', 'Notes', 'Actions'].map((col) => (
                  <th key={col} className="px-6 py-3 text-left text-xs font-medium uppercase">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className={`${isDark ? 'bg-gray-900 divide-gray-700' : 'bg-white divide-gray-200'} divide-y`}>
              {shifts.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`px-6 py-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    No shifts scheduled
                  </td>
                </tr>
              ) : (
                shifts.map((shift) => (
                  <tr key={shift.id} className={`${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                    <td className={`px-6 py-4 whitespace-nowrap font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                      {shift.pilot_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getShiftBadge(shift.shift_type)}`}>
                        {shift.shift_type}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {shift.start_date} {shift.start_time}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {shift.end_date} {shift.end_time}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {shift.location}
                    </td>
                    <td className={`px-6 py-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {shift.notes || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm flex gap-2">
                      <button className={`${isDark ? 'text-blue-300 hover:text-blue-400' : 'text-blue-600 hover:text-blue-800'}`} onClick={() => console.log('Edit', shift.id)}>Edit</button>
                      <button className={`${isDark ? 'text-red-300 hover:text-red-400' : 'text-red-600 hover:text-red-800'}`} onClick={() => console.log('Delete', shift.id)}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    ) : (
      /* Calendar View Placeholder */
      <div className={`rounded-lg shadow-sm p-8 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="text-center">
          <div className="text-6xl mb-4">📅</div>
          <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>Calendar View</h3>
          <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
            Full calendar view would be rendered here using a calendar library like FullCalendar
          </p>
          <div className={`inline-block text-left rounded-lg p-6 max-w-md ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <h4 className={`font-medium mb-3 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>Upcoming Shifts:</h4>
            <div className="space-y-2">
              {shifts.slice(0, 5).map(shift => (
                <div key={shift.id} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getShiftColor(shift.shift_type) }} />
                  <div className="text-sm">
                    <span className="font-medium">{shift.pilot_name}</span>
                    <span className={`${isDark ? 'text-gray-300' : 'text-gray-500'} ml-2`}>{shift.start_date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Add Shift Modal */}
    {showAddModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className={`rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <div className={`p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <h2 className={`text-xl font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>Add New Shift</h2>
          </div>
          <div className="p-6 space-y-4">
            {/* All inputs */}
            {[
              { label: 'Pilot', key: 'pilot_name', type: 'select', options: PILOTS.map(p => p.name) },
              { label: 'Shift Type', key: 'shift_type', type: 'select', options: ['ON_DUTY', 'STAND_BY', 'OFF_DUTY', 'TRAINING'] },
              { label: 'Start Date', key: 'start_date', type: 'date' },
              { label: 'Start Time', key: 'start_time', type: 'time' },
              { label: 'End Date', key: 'end_date', type: 'date' },
              { label: 'End Time', key: 'end_time', type: 'time' },
              { label: 'Location', key: 'location', type: 'text' },
              { label: 'Notes', key: 'notes', type: 'textarea' },
            ].map(field => (
              <div key={field.key}>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{field.label}</label>
                {field.type === 'select' ? (
                  <select
                    value={field.key}
                    onChange={e => setNewShift({...newShift, [field.key]: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDark ? 'border-gray-600 bg-gray-700 text-gray-200' : 'border-gray-300 bg-white text-gray-900'}`}
                  >
                    <option value="">Select {field.label.toLowerCase()}...</option>
                    {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    value={field.key}
                    onChange={e => setNewShift({...newShift, [field.key]: e.target.value})}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDark ? 'border-gray-600 bg-gray-700 text-gray-200' : 'border-gray-300 bg-white text-gray-900'}`}
                  />
                ) : (
                  <input
                    type={field.type}
                    value={field.key}
                    onChange={e => setNewShift({...newShift, [field.key]: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDark ? 'border-gray-600 bg-gray-700 text-gray-200' : 'border-gray-300 bg-white text-gray-900'}`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className={`p-6 border-t flex gap-3 justify-end ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <button
              onClick={() => setShowAddModal(false)}
              className={`px-4 py-2 rounded-lg border ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              Cancel
            </button>
            <button
              onClick={handleAddShift}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Shift
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
</div>

  );
}