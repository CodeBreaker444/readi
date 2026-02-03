'use client';

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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm mb-6 p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Crew Shift Calendar</h1>
            <div className="flex gap-3">
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-md text-sm transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white shadow-sm text-gray-900'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  List
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-4 py-2 rounded-md text-sm transition-colors ${
                    viewMode === 'calendar'
                      ? 'bg-white shadow-sm text-gray-900'
                      : 'text-gray-600 hover:text-gray-900'
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
            <span className="text-sm text-gray-600 font-medium">Legend:</span>
            <span className="px-3 py-1 text-xs font-semibold rounded-full border" style={{ backgroundColor: '#e3f2fd', color: '#1976d2', borderColor: '#1976d2' }}>
              STAND BY
            </span>
            <span className="px-3 py-1 text-xs font-semibold rounded-full border" style={{ backgroundColor: '#e8f5e9', color: '#2e7d32', borderColor: '#2e7d32' }}>
              ON DUTY
            </span>
            <span className="px-3 py-1 text-xs font-semibold rounded-full border" style={{ backgroundColor: '#fff3e0', color: '#ef6c00', borderColor: '#ef6c00' }}>
              OFF DUTY
            </span>
            <span className="px-3 py-1 text-xs font-semibold rounded-full border" style={{ backgroundColor: '#f3e5f5', color: '#6a1b9a', borderColor: '#6a1b9a' }}>
              TRAINING
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-1">Total Shifts</div>
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-green-50 rounded-lg shadow-sm p-6">
            <div className="text-sm text-green-700 mb-1">On Duty</div>
            <div className="text-3xl font-bold text-green-700">{stats.onDuty}</div>
          </div>
          <div className="bg-blue-50 rounded-lg shadow-sm p-6">
            <div className="text-sm text-blue-700 mb-1">Stand By</div>
            <div className="text-3xl font-bold text-blue-700">{stats.standBy}</div>
          </div>
          <div className="bg-purple-50 rounded-lg shadow-sm p-6">
            <div className="text-sm text-purple-700 mb-1">Training</div>
            <div className="text-3xl font-bold text-purple-700">{stats.training}</div>
          </div>
        </div>

        {/* Content */}
        {viewMode === 'list' ? (
          /* List View */
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pilot</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shift Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {shifts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        No shifts scheduled
                      </td>
                    </tr>
                  ) : (
                    shifts.map((shift) => (
                      <tr key={shift.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                          {shift.pilot_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getShiftBadge(shift.shift_type)}`}>
                            {shift.shift_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {shift.start_date} {shift.start_time}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {shift.end_date} {shift.end_time}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {shift.location}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {shift.notes || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            <button 
                              className="text-blue-600 hover:text-blue-800"
                              onClick={() => console.log('Edit', shift.id)}
                            >
                              Edit
                            </button>
                            <button 
                              className="text-red-600 hover:text-red-800"
                              onClick={() => console.log('Delete', shift.id)}
                            >
                              Delete
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
        ) : (
          /* Calendar View Placeholder */
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center">
              <div className="text-6xl mb-4">📅</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Calendar View</h3>
              <p className="text-gray-600 mb-4">
                Full calendar view would be rendered here using a calendar library like FullCalendar
              </p>
              <div className="inline-block text-left bg-gray-50 rounded-lg p-6 max-w-md">
                <h4 className="font-medium text-gray-900 mb-3">Upcoming Shifts:</h4>
                <div className="space-y-2">
                  {shifts.slice(0, 5).map(shift => (
                    <div key={shift.id} className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: getShiftColor(shift.shift_type) }}
                      />
                      <div className="text-sm">
                        <span className="font-medium">{shift.pilot_name}</span>
                        <span className="text-gray-500 ml-2">{shift.start_date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Shift Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Add New Shift</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pilot</label>
                <select
                  value={newShift.pilot_name}
                  onChange={(e) => setNewShift({...newShift, pilot_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select pilot...</option>
                  {PILOTS.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shift Type</label>
                <select
                  value={newShift.shift_type}
                  onChange={(e) => setNewShift({...newShift, shift_type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ON_DUTY">On Duty</option>
                  <option value="STAND_BY">Stand By</option>
                  <option value="OFF_DUTY">Off Duty</option>
                  <option value="TRAINING">Training</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newShift.start_date}
                    onChange={(e) => setNewShift({...newShift, start_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newShift.start_time}
                    onChange={(e) => setNewShift({...newShift, start_time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={newShift.end_date}
                    onChange={(e) => setNewShift({...newShift, end_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={newShift.end_time}
                    onChange={(e) => setNewShift({...newShift, end_time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={newShift.location}
                  onChange={(e) => setNewShift({...newShift, location: e.target.value})}
                  placeholder="e.g., Rome Station"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={newShift.notes}
                  onChange={(e) => setNewShift({...newShift, notes: e.target.value})}
                  rows={3}
                  placeholder="Optional notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
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
  );
}