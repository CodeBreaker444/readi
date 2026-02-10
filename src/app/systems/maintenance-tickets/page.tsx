'use client';

import { useTheme } from '@/components/useTheme';
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
  const { isDark } = useTheme()
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
    if (status === 'OPEN') {
      return isDark ? 'bg-red-800 text-red-100 border-red-700' : 'bg-red-50 text-red-700 border-red-200';
    } else {
      return isDark ? 'bg-green-800 text-green-100 border-green-700' : 'bg-green-50 text-green-700 border-green-200';
    }
  };

  const getPriorityStyle = (priority: string) => {
    const styles = {
      HIGH: isDark ? 'text-red-400 font-semibold' : 'text-red-700 font-semibold',
      MEDIUM: isDark ? 'text-yellow-400 font-medium' : 'text-yellow-700 font-medium',
      LOW: isDark ? 'text-green-400 font-medium' : 'text-green-700 font-medium'
    };
    return styles[priority as keyof typeof styles] || '';
  };

  const handleCreateTicket = () => {
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
    <div className={`min-h-screen p-6 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className={`rounded-lg shadow-sm mb-6 p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-6">
            <h1 className={`text-2xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Maintenance Ticket Logbook</h1>
            <button
              onClick={() => setShowNewTicketModal(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <span>+</span> New Ticket
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4`}>
              <div className={`text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Total Tickets</div>
              <div className={`text-3xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{stats.total}</div>
            </div>
            <div className={`${isDark ? 'bg-red-900' : 'bg-red-50'} rounded-lg p-4`}>
              <div className={`text-sm mb-1 ${isDark ? 'text-red-200' : 'text-red-700'}`}>Open</div>
              <div className={`text-3xl font-bold ${isDark ? 'text-red-100' : 'text-red-700'}`}>{stats.open}</div>
            </div>
            <div className={`${isDark ? 'bg-green-900' : 'bg-green-50'} rounded-lg p-4`}>
              <div className={`text-sm mb-1 ${isDark ? 'text-green-200' : 'text-green-700'}`}>Closed</div>
              <div className={`text-3xl font-bold ${isDark ? 'text-green-100' : 'text-green-700'}`}>{stats.closed}</div>
            </div>
            <div className={`${isDark ? 'bg-orange-900' : 'bg-orange-50'} rounded-lg p-4`}>
              <div className={`text-sm mb-1 ${isDark ? 'text-orange-200' : 'text-orange-700'}`}>High Priority Open</div>
              <div className={`text-3xl font-bold ${isDark ? 'text-orange-100' : 'text-orange-700'}`}>{stats.highPriority}</div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className={`rounded-lg shadow-sm overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={`${isDark ? 'bg-gray-700 text-gray-100 border-gray-600' : 'bg-gray-50 border-b border-gray-200'}`}>
                <tr className="text-center">
                  {['ID','Type','Tool Code','Tool / Component SN','Entity / Component','Assigned to','Status','Priority','Trigger','Open','Closed','Details','Action'].map(col => (
                    <th key={col} className="px-4 py-3 text-xs font-medium uppercase">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={13} className={`px-6 py-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      No tickets found
                    </td>
                  </tr>
                ) : (
                  tickets.map(ticket => (
                    <tr key={ticket.id} className={`hover:${isDark ? 'bg-gray-700' : 'bg-gray-50'} text-center ${getStatusStyle(ticket.status)}`}>
                      <td className={`px-4 py-3 font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{ticket.id}</td>
                      <td className="px-4 py-3">
                        <span className={`${isDark ? 'bg-blue-700 text-blue-100' : 'bg-blue-100 text-blue-800'} px-2 py-1 text-xs rounded`}>
                          {ticket.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{ticket.tool_code}</td>
                      <td className={`px-4 py-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{ticket.tool_sn}</td>
                      <td className={`px-4 py-3 ${isDark ? 'text-gray-200' : ''}`}>
                        <div>{ticket.entity}</div>
                        {ticket.component && (
                          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{ticket.component}</div>
                        )}
                      </td>
                      <td className={`px-4 py-3 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{ticket.assigned_to}</td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusStyle(ticket.status)}`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td className={`px-4 py-3 ${getPriorityStyle(ticket.priority)}`}>
                        {ticket.priority}
                      </td>
                      <td className={`px-4 py-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{ticket.trigger}</td>
                      <td className={`px-4 py-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{ticket.opened_date}</td>
                      <td className={`px-4 py-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{ticket.closed_date || '-'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setShowDetailsModal(true);
                          }}
                          className={`text-xs ${isDark ? 'text-blue-400 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
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
                            className={`px-2 py-1 rounded text-xs text-white ${isDark ? 'bg-green-700 hover:bg-green-600' : 'bg-green-600 hover:bg-green-700'}`}
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

      {/* Modals */}
      {[showNewTicketModal, showCloseModal && selectedTicket, showDetailsModal && selectedTicket].map((modal, idx) =>
        modal ? (
          <div key={idx} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`${isDark ? 'bg-gray-800 text-gray-100' : 'bg-white'} rounded-lg shadow-xl max-w-2xl w-full overflow-y-auto`}>
              {/* The content inside each modal should also have isDark applied similarly */}
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}
