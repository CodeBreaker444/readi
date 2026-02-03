'use client';

import { useState } from 'react';

// Dummy data
const DUMMY_TICKETS = [
  {
    id: 1,
    type: 'STANDARD',
    tool_code: 'DJI-M300-001',
    tool_sn: 'SN12345678',
    entity: 'Matrice 300 RTK',
    component: null,
    assigned_to: 'John Smith',
    status: 'OPEN',
    priority: 'HIGH',
    trigger: 'FLIGHT_HOURS',
    opened_date: '2024-12-15',
    closed_date: null,
    description: 'Scheduled maintenance due to flight hours threshold'
  },
  {
    id: 2,
    type: 'EXTRAORDINARY',
    tool_code: 'DJI-M30T-002',
    tool_sn: 'SN87654321',
    entity: 'Matrice 30T',
    component: 'Gimbal Camera',
    assigned_to: 'Maria Garcia',
    status: 'OPEN',
    priority: 'MEDIUM',
    trigger: 'MALFUNCTION',
    opened_date: '2024-12-20',
    closed_date: null,
    description: 'Camera stabilization issue detected'
  },
  {
    id: 3,
    type: 'BASIC',
    tool_code: 'DJI-DOCK-001',
    tool_sn: 'DOCK-001',
    entity: 'DJI Dock',
    component: null,
    assigned_to: 'Robert Chen',
    status: 'CLOSED',
    priority: 'LOW',
    trigger: 'ROUTINE',
    opened_date: '2024-11-01',
    closed_date: '2024-11-05',
    description: 'Monthly inspection and cleaning'
  },
  {
    id: 4,
    type: 'STANDARD',
    tool_code: 'DJI-M300-001',
    tool_sn: 'SN12345678',
    entity: 'Matrice 300 RTK',
    component: 'Battery Pack 1',
    assigned_to: 'John Smith',
    status: 'OPEN',
    priority: 'HIGH',
    trigger: 'CYCLE_COUNT',
    opened_date: '2024-12-18',
    closed_date: null,
    description: 'Battery cycle count approaching limit'
  }
];

const DUMMY_DRONES = [
  { id: 1, code: 'DJI-M300-001', name: 'Matrice 300 RTK' },
  { id: 2, code: 'DJI-M30T-002', name: 'Matrice 30T' },
  { id: 3, code: 'DJI-DOCK-001', name: 'DJI Dock' }
];

const DUMMY_COMPONENTS = [
  { id: 1, name: 'Battery Pack 1' },
  { id: 2, name: 'Battery Pack 2' },
  { id: 3, name: 'Gimbal Camera' },
  { id: 4, name: 'Propellers Set' }
];

const DUMMY_TECHNICIANS = [
  { id: 1, name: 'John Smith' },
  { id: 2, name: 'Maria Garcia' },
  { id: 3, name: 'Robert Chen' }
];

export default function MaintenanceTickets() {
  const [tickets, setTickets] = useState(DUMMY_TICKETS);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<typeof DUMMY_TICKETS[0] | null>(null);

  const [newTicket, setNewTicket] = useState({
    drone_id: '',
    components: [] as string[],
    type: 'STANDARD',
    priority: 'MEDIUM',
    assigned_to: '',
    note: ''
  });

  const getStatusStyle = (status: string) => {
    return status === 'OPEN' 
      ? 'bg-red-50 text-red-700 border-red-200' 
      : 'bg-green-50 text-green-700 border-green-200';
  };

  const getPriorityStyle = (priority: string) => {
    const styles = {
      HIGH: 'text-red-700 font-semibold',
      MEDIUM: 'text-yellow-700 font-medium',
      LOW: 'text-green-700 font-medium'
    };
    return styles[priority as keyof typeof styles] || '';
  };

  const handleCreateTicket = () => {
    // API call would go here
    // await fetch('/api/tickets', { method: 'POST', body: JSON.stringify(newTicket) })
    console.log('Creating ticket:', newTicket);
    setShowNewTicketModal(false);
    setNewTicket({
      drone_id: '',
      components: [],
      type: 'STANDARD',
      priority: 'MEDIUM',
      assigned_to: '',
      note: ''
    });
  };

  const handleCloseTicket = () => {
    // API call would go here
    console.log('Closing ticket:', selectedTicket?.id);
    setShowCloseModal(false);
    setSelectedTicket(null);
  };

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'OPEN').length,
    closed: tickets.filter(t => t.status === 'CLOSED').length,
    highPriority: tickets.filter(t => t.priority === 'HIGH' && t.status === 'OPEN').length
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm mb-6 p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Maintenance Ticket Logbook</h1>
            <button
              onClick={() => setShowNewTicketModal(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <span>+</span> New Ticket
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Total Tickets</div>
              <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-sm text-red-700 mb-1">Open</div>
              <div className="text-3xl font-bold text-red-700">{stats.open}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-green-700 mb-1">Closed</div>
              <div className="text-3xl font-bold text-green-700">{stats.closed}</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-sm text-orange-700 mb-1">High Priority Open</div>
              <div className="text-3xl font-bold text-orange-700">{stats.highPriority}</div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-center">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tool Code</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tool / Component SN</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Entity / Component</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Assigned to</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Priority</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Trigger</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Open</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Closed</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Details</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-6 py-8 text-center text-gray-500">
                      No tickets found
                    </td>
                  </tr>
                ) : (
                  tickets.map((ticket) => (
                    <tr 
                      key={ticket.id} 
                      className={`hover:bg-gray-50 text-center ${getStatusStyle(ticket.status)}`}
                    >
                      <td className="px-4 py-3 font-medium">{ticket.id}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {ticket.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{ticket.tool_code}</td>
                      <td className="px-4 py-3 text-gray-600">{ticket.tool_sn}</td>
                      <td className="px-4 py-3">
                        <div>{ticket.entity}</div>
                        {ticket.component && (
                          <div className="text-xs text-gray-500">{ticket.component}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{ticket.assigned_to}</td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusStyle(ticket.status)}`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td className={`px-4 py-3 ${getPriorityStyle(ticket.priority)}`}>
                        {ticket.priority}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{ticket.trigger}</td>
                      <td className="px-4 py-3 text-gray-600">{ticket.opened_date}</td>
                      <td className="px-4 py-3 text-gray-600">{ticket.closed_date || '-'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setShowDetailsModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                        >
                          View
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {ticket.status === 'OPEN' && (
                          <button
                            onClick={() => {
                              setSelectedTicket(ticket);
                              setShowCloseModal(true);
                            }}
                            className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                          >
                            Close
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* New Ticket Modal */}
      {showNewTicketModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900"> New Maintenance Ticket</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Drone</label>
                <select
                  value={newTicket.drone_id}
                  onChange={(e) => setNewTicket({...newTicket, drone_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select...</option>
                  {DUMMY_DRONES.map(d => (
                    <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={newTicket.type}
                  onChange={(e) => setNewTicket({...newTicket, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="BASIC">Basic</option>
                  <option value="STANDARD">Standard</option>
                  <option value="EXTRAORDINARY">Extraordinary</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket({...newTicket, priority: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign to</label>
                <select
                  value={newTicket.assigned_to}
                  onChange={(e) => setNewTicket({...newTicket, assigned_to: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select...</option>
                  {DUMMY_TECHNICIANS.map(t => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <textarea
                  value={newTicket.note}
                  onChange={(e) => setNewTicket({...newTicket, note: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => setShowNewTicketModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTicket}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Ticket Modal */}
      {showCloseModal && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Close Ticket #{selectedTicket.id}</h2>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Closing Note</label>
              <textarea
                rows={4}
                placeholder="Describe the work completed..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCloseModal(false);
                  setSelectedTicket(null);
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCloseTicket}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Close Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Ticket Details #{selectedTicket.id}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Tool Code</div>
                  <div className="font-medium">{selectedTicket.tool_code}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Serial Number</div>
                  <div className="font-medium">{selectedTicket.tool_sn}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Type</div>
                  <div className="font-medium">{selectedTicket.type}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Priority</div>
                  <div className={`font-medium ${getPriorityStyle(selectedTicket.priority)}`}>
                    {selectedTicket.priority}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Status</div>
                  <div className="font-medium">{selectedTicket.status}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Assigned To</div>
                  <div className="font-medium">{selectedTicket.assigned_to}</div>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Description</div>
                <div className="p-3 bg-gray-50 rounded-lg">{selectedTicket.description}</div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedTicket(null);
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}