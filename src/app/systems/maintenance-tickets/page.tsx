'use client';

import {
  AssignTicketModal,
  CloseTicketModal,
  EventsModal,
  NewTicketModal,
  ReportModal,
  UploadModal,
} from '@/components/system/ModalModals';
import { TicketFilters } from '@/components/system/TicketFilters';
import { TicketTable } from '@/components/system/TicketTable';
import { TicketStats } from '@/components/system/TicketUi';
import { useMaintenanceLogbook } from '@/components/system/useMaintenance';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/useTheme';
import { useEffect, useState } from 'react';

export default function MaintenanceLogbookPage() {
  const { isDark } = useTheme();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const {
    tickets, ticketsLoading,
    drones, components, users, events, activeTicketId,

    modals, closeModal,

    newTicket, setNewTicket,
    closeNote, setCloseNote,
    assignTo, setAssignTo,
    report, setReport,
    uploadDesc, setUploadDesc,

    loadTickets,
    openNewTicketModal,
    handleDroneChange,
    openCloseModal,
    openAssignModal,
    openReportModal,
    openUploadModal,
    openEventsModal,
    handleCreateTicket,
    handleCloseTicket,
    handleAssignTicket,
    handleAddReport,
    handleUploadFile,
  } = useMaintenanceLogbook();

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const filtered = tickets.filter((t) => {
    const matchStatus = statusFilter === 'ALL' || t.ticket_status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      t.drone_code?.toLowerCase().includes(q) ||
      t.drone_serial?.toLowerCase().includes(q) ||
      t.assigner_name?.toLowerCase().includes(q) ||
      String(t.ticket_id).includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <div className={`${isDark ? 'bg-slate-900 text-white' : 'bg-slate-50 text-gray-900'} font-sans`}>
      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.3s ease; }
      `}</style>

      <div className={`${isDark ? 'bg-slate-800 text-white' : 'bg-gray-50 text-gray-900 border-slate-200'} border-b px-6 py-5`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} tracking-tight`}>
              Maintenance Logbook
            </h1>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-0.5`}>
              Track and manage all maintenance tickets
            </p>
          </div>
          <Button
            onClick={openNewTicketModal}
            className={`inline-flex items-center gap-2   text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm ${isDark
              ? 'bg-white hover:bg-white/90 text-black'
              : ''
              }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Ticket
          </Button>
        </div>
      </div>

      <div className={`px-6 py-6 space-y-6 flex flex-col min-h-full ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
        <TicketStats tickets={tickets} isDark={isDark} />

        <TicketFilters
          search={search}
          statusFilter={statusFilter}
          onSearch={setSearch}
          onStatusChange={setStatusFilter}
          isDark={isDark}
        />

        <div className="flex-1">
          <TicketTable
            tickets={filtered}
            loading={ticketsLoading}
            onEvents={openEventsModal}
            onAssign={openAssignModal}
            onReport={openReportModal}
            onUpload={openUploadModal}
            onClose={openCloseModal}
            isDark={isDark}
          />
        </div>
      </div>


      <NewTicketModal
        open={modals.newTicket}
        onClose={() => closeModal('newTicket')}
        drones={drones}
        components={components}
        users={users}
        form={newTicket}
        onFormChange={(u) => setNewTicket((p) => ({ ...p, ...u }))}
        onDroneChange={handleDroneChange}
        onSubmit={handleCreateTicket}
        isDark={isDark}
      />

      <CloseTicketModal
        open={modals.close}
        onClose={() => closeModal('close')}
        note={closeNote}
        onNoteChange={setCloseNote}
        onSubmit={handleCloseTicket}
        isDark={isDark}
      />

      <AssignTicketModal
        open={modals.assign}
        onClose={() => closeModal('assign')}
        users={users}
        assignTo={assignTo}
        onAssignChange={setAssignTo}
        onSubmit={handleAssignTicket}
        isDark={isDark}
      />

      <ReportModal
        open={modals.report}
        onClose={() => closeModal('report')}
        form={report}
        onFormChange={(u) => setReport((p) => ({ ...p, ...u }))}
        onSubmit={handleAddReport}
        isDark={isDark}
      />

      <UploadModal
        open={modals.upload}
        onClose={() => closeModal('upload')}
        desc={uploadDesc}
        onDescChange={setUploadDesc}
        onSubmit={handleUploadFile}
        isDark={isDark}
      />

      <EventsModal
        open={modals.events}
        onClose={() => closeModal('events')}
        ticketId={activeTicketId}
        events={events}
        isDark={isDark}
      />
    </div>
  );
}