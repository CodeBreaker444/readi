'use client';

import type {
  ComponentOption,
  DroneOption,
  MaintenanceTicket,
  TicketEvent,
  TicketPriority,
  TicketType,
  UserOption,
} from '@/config/types/maintenance';
import axios from 'axios';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export interface NewTicketForm {
  fk_tool_id: number;
  components: number[];
  type: TicketType;
  priority: TicketPriority;
  assigned_to: number;
  note: string;
}

export interface ReportForm {
  text: string;
  work_start: string;
  work_end: string;
  close: boolean;
}

export const defaultNewTicket: NewTicketForm = {
  fk_tool_id: 0,
  components: [],
  type: 'STANDARD',
  priority: 'MEDIUM',
  assigned_to: 0,
  note: '',
};

export const defaultReport: ReportForm = {
  text: '',
  work_start: '',
  work_end: '',
  close: false,
};


export function useMaintenanceLogbook() {
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);

  const [drones, setDrones] = useState<DroneOption[]>([]);
  const [components, setComponents] = useState<ComponentOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [events, setEvents] = useState<TicketEvent[]>([]);

  const [activeTicketId, setActiveTicketId] = useState<number | null>(null);

  const [modals, setModals] = useState({
    newTicket: false,
    close: false,
    assign: false,
    report: false,
    upload: false,
    events: false,
  });

  const [newTicket, setNewTicket] = useState<NewTicketForm>(defaultNewTicket);
  const [closeNote, setCloseNote] = useState('');
  const [assignTo, setAssignTo] = useState(0);
  const [report, setReport] = useState<ReportForm>(defaultReport);
  const [uploadDesc, setUploadDesc] = useState('');

  const openModal = (key: keyof typeof modals) =>
    setModals((p) => ({ ...p, [key]: true }));

  const closeModal = (key: keyof typeof modals) =>
    setModals((p) => ({ ...p, [key]: false }));


  const loadTickets = useCallback(async () => {
    try {
      setTicketsLoading(true);
      const { data } = await axios.get(`/api/system/maintenance/tickets`);
      setTickets(data.tickets);
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? e.message);
    } finally {
      setTicketsLoading(false);
    }
  }, []);

  const updateLocalTicket = (ticketId: number, updates: Partial<MaintenanceTicket>) => {
    setTickets((prev) =>
      prev.map((t) => (t.ticket_id === ticketId ? { ...t, ...updates } : t))
    );
  };


  async function openNewTicketModal() {
    try {
      const [dronesRes, usersRes] = await Promise.all([
        axios.get(`/api/system/maintenance/lookups?type=drones`),
        axios.get(`/api/system/maintenance/lookups?type=users&profile=PIC`),
      ]);
      setDrones(dronesRes.data.data);
      setUsers(usersRes.data.data);
      setNewTicket(defaultNewTicket);
      setComponents([]);
      openModal('newTicket');
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? e.message);
    }
  }

  async function handleDroneChange(toolId: number) {
    setNewTicket((p) => ({ ...p, fk_tool_id: toolId, components: [] }));
    if (!toolId) return;
    try {
      const { data } = await axios.get(`/api/system/maintenance/lookups?type=components&tool_id=${toolId}`);
      setComponents(data.data);
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? e.message);
    }
  }

  function openCloseModal(id: number) {
    setActiveTicketId(id);
    setCloseNote('');
    openModal('close');
  }

  async function openAssignModal(id: number) {
    setActiveTicketId(id);
    try {
      const { data } = await axios.get(`/api/system/maintenance/lookups?type=users`);
      setUsers(data.data);
      setAssignTo(0);
      openModal('assign');
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? e.message);
    }
  }

  function openReportModal(id: number) {
    setActiveTicketId(id);
    setReport(defaultReport);
    openModal('report');
  }

  function openUploadModal(id: number) {
    setActiveTicketId(id);
    setUploadDesc('');
    openModal('upload');
  }

  async function openEventsModal(id: number) {
    setActiveTicketId(id);
    try {
      const { data } = await axios.get(`/api/system/maintenance/tickets/events?ticket_id=${id}`);
      setEvents(data.events);
      openModal('events');
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? e.message);
    }
  }


  async function handleCreateTicket() {
    try {
      const res = await axios.post(`/api/system/maintenance/tickets/create`, {
        ...newTicket,
        opened_by: 'web',
      });
      toast.success('Ticket created successfully');
      closeModal('newTicket');
      if (res.data.ticket) {
        setTickets(prev => [res.data.ticket, ...prev]);
      } else {
        loadTickets();
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? e.message);
    }
  }

  async function handleCloseTicket() {
    if (!activeTicketId) return;
    try {
      await axios.post(`/api/system/maintenance/tickets/close`, {
        ticket_id: activeTicketId,
        note: closeNote,
      });
      toast.success('Ticket closed');
      closeModal('close');
      updateLocalTicket(activeTicketId, {
        ticket_status: 'CLOSED',
        closed_at: new Date().toISOString(),
      });
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? e.message);
    }
  }

  async function handleAssignTicket() {
    if (!activeTicketId || !assignTo) return;
    try {
      await axios.post(`/api/system/maintenance/tickets/assign`, {
        ticket_id: activeTicketId,
        assigned_to: assignTo,
      });
      toast.success('Ticket assigned');
      closeModal('assign');
      const selectedUser = users.find(u => u.user_id === assignTo);
      updateLocalTicket(activeTicketId, {
        assigned_to_user_id: assignTo,
        assigner_name: selectedUser?.fullname
      });
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? e.message);
    }
  }

  async function handleAddReport() {
    if (!activeTicketId) return;
    try {
      await axios.post(`/api/system/maintenance/tickets/report`, {
        ticket_id: activeTicketId,
        report_text: report.text,
        work_start: report.work_start || undefined,
        work_end: report.work_end || undefined,
        report_by: 'web',
        close_report: report.close ? 'Y' : undefined,
      });
      toast.success('Report saved');
      closeModal('report');
      if (report.close) {
        updateLocalTicket(activeTicketId, {
          ticket_status: 'CLOSED',
          closed_at: new Date().toISOString()
        });
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? e.message);
    }
  }

  async function handleUploadFile(file: File) {
    if (!activeTicketId) return;
    const fd = new FormData();
    fd.append('ticket_id', String(activeTicketId));
    fd.append('file', file);
    fd.append('attachment_desc', uploadDesc);
    fd.append('uploaded_by', 'web');
    try {
      await axios.post(`/api/system/maintenance/tickets/upload`, fd);
      toast.success('File uploaded');
      closeModal('upload');
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? e.message);
    }
  }

  return {
    tickets,
    ticketsLoading,
    drones,
    components,
    users,
    events,
    activeTicketId,
    modals,
    closeModal,
    newTicket,
    setNewTicket,
    closeNote,
    setCloseNote,
    assignTo,
    setAssignTo,
    report,
    setReport,
    uploadDesc,
    setUploadDesc,
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
  };
}