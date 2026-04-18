'use client';

import { ExportColumn } from '@/components/ExportButton';
import { DownloadModal } from '@/components/system/DownloadModal';
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
import { Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const TICKET_COLUMNS: ExportColumn[] = [
  { header: 'Ticket #',    key: 'ticket_id' },
  { header: 'Type',        key: 'type' },
  { header: 'Status',      key: 'status' },
  { header: 'Priority',    key: 'priority' },
  { header: 'System',      key: 'system' },
  { header: 'Serial',      key: 'serial' },
  { header: 'Entity',      key: 'entity' },
  { header: 'Assigned To', key: 'assigned_to' },
  { header: 'Opened',      key: 'opened' },
  { header: 'Closed',      key: 'closed' },
  { header: 'Notes',       key: 'note' },
];

interface Props {
  canClose: boolean;
}

export default function MaintenanceLogbookClient({ canClose }: Props) {
  const { isDark } = useTheme();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [downloadTicketId, setDownloadTicketId] = useState<number | null>(null);
  const [downloadOpen, setDownloadOpen] = useState(false);

  const {
    tickets, ticketsLoading,
    drones, components, users, events, activeTicketId,
    modalLoading,

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

  const ticketExportData = useMemo(
    () =>
      filtered.map((t) => ({
        ticket_id:   `#${t.ticket_id}`,
        type:        t.ticket_type,
        status:      t.ticket_status,
        priority:    t.ticket_priority,
        system:      t.drone_code ?? '',
        serial:      t.drone_serial ?? '',
        entity:      t.entity_name ?? '',
        assigned_to: t.assigner_name ?? 'Unassigned',
        opened:      t.opened_at  ? new Date(t.opened_at).toLocaleDateString('en-GB')  : '—',
        closed:      t.closed_at  ? new Date(t.closed_at).toLocaleDateString('en-GB')  : '—',
        note:        t.note ?? '',
      })),
    [filtered]
  );

  const openDownloadModal = (ticketId: number) => {
    setDownloadTicketId(ticketId);
    setDownloadOpen(true);
  };

  return (
    <div className={`${isDark ? 'bg-slate-900 text-white' : 'bg-slate-50 text-gray-900'} font-sans`}>
      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.3s ease; }
      `}</style>

      <div
        className={`top-0 z-10 backdrop-blur-md transition-colors ${
          isDark
            ? "bg-slate-900/80 border-b border-slate-800 text-white"
            : "bg-white/80 border-b border-slate-200 text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
        } px-6 py-4`}
      >
        <div className="mx-auto max-w-[1800px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full bg-violet-600" />
            <div>
              <h1
                className={`font-semibold text-base tracking-tight ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                Maintenance Logbook
              </h1>
              <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                Track and manage all maintenance tickets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={openNewTicketModal}
              className={`h-8 cursor-pointer gap-1.5 text-xs font-semibold transition-all shadow-sm ${
                isDark
                  ? "bg-white hover:bg-white/90 text-black"
                  : "bg-violet-600 hover:bg-violet-700 text-white"
              }`}
            >
              <Plus size={14} />
              <span>New Ticket</span>
            </Button>
          </div>
        </div>
      </div>

      <div
        className={`px-6 py-6 space-y-6 flex flex-col min-h-[calc(100vh-64px)] ${
          isDark ? "bg-slate-800" : "bg-white"
        }`}
      >
        <TicketStats tickets={tickets} isDark={isDark} />

        <TicketFilters
          search={search}
          statusFilter={statusFilter}
          onSearch={setSearch}
          onStatusChange={setStatusFilter}
          isDark={isDark}
        />

        <div>
          <TicketTable
            tickets={filtered}
            loading={ticketsLoading}
            onEvents={openEventsModal}
            onAssign={openAssignModal}
            onReport={openReportModal}
            onUpload={openUploadModal}
            onClose={openCloseModal}
            onDownload={openDownloadModal}
            canClose={canClose}
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
        loading={modalLoading}
      />

      <CloseTicketModal
        open={modals.close}
        onClose={() => closeModal('close')}
        note={closeNote}
        onNoteChange={setCloseNote}
        onSubmit={handleCloseTicket}
        isDark={isDark}
        loading={modalLoading}
      />

      <AssignTicketModal
        open={modals.assign}
        onClose={() => closeModal('assign')}
        users={users}
        assignTo={assignTo}
        onAssignChange={setAssignTo}
        onSubmit={handleAssignTicket}
        isDark={isDark}
        loading={modalLoading}
      />

      <ReportModal
        open={modals.report}
        onClose={() => closeModal('report')}
        form={report}
        onFormChange={(u) => setReport((p) => ({ ...p, ...u }))}
        onSubmit={(file) => handleAddReport(file)}
        isDark={isDark}
        loading={modalLoading}
        canClose={canClose}
      />

      <UploadModal
        open={modals.upload}
        onClose={() => closeModal('upload')}
        desc={uploadDesc}
        onDescChange={setUploadDesc}
        onSubmit={handleUploadFile}
        isDark={isDark}
        loading={modalLoading}
      />

      <EventsModal
        open={modals.events}
        onClose={() => closeModal('events')}
        ticketId={activeTicketId}
        events={events}
        isDark={isDark}
        loading={modalLoading}
      />

      <DownloadModal
        open={downloadOpen}
        onClose={() => setDownloadOpen(false)}
        ticketId={downloadTicketId}
        isDark={isDark}
      />
    </div>
  );
}
