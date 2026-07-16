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
  latitude: string;
  longitude: string;
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
  latitude: '',
  longitude: '',
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
  const [modalLoading, setModalLoading] = useState(false);

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

  const openModal = useCallback((key: keyof typeof modals) =>
    setModals((p) => ({ ...p, [key]: true })), []);

  const closeModal = useCallback((key: keyof typeof modals) =>
    setModals((p) => ({ ...p, [key]: false })), []);


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

  const updateLocalTicket = useCallback((ticketId: number, updates: Partial<MaintenanceTicket>) => {
    setTickets((prev) =>
      prev.map((t) => (t.ticket_id === ticketId ? { ...t, ...updates } : t))
    );
  }, []);

  const openNewTicketModal = useCallback(async () => {
    setNewTicket(defaultNewTicket);
    setComponents([]);
    setDrones([]);
    setUsers([]);
    setModalLoading(true);
    openModal('newTicket');
    try {
      const [dronesRes, usersRes] = await Promise.all([
        axios.get(`/api/system/maintenance/lookups?type=drones`),
        axios.get(`/api/system/maintenance/lookups?type=users&profile=PIC`),
      ]);
      setDrones(dronesRes.data.data);
      setUsers(usersRes.data.data);
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? e.message);
    } finally {
      setModalLoading(false);
    }
  }, [openModal]);

  const handleDroneChange = useCallback(async (toolId: number, ticketType?: string) => {
    setNewTicket((p) => ({ ...p, fk_tool_id: toolId, components: [] }));
    if (!toolId) return;
    try {
      const typeParam = ticketType ? `&ticket_type=${ticketType}` : '';
      const { data } = await axios.get(`/api/system/maintenance/lookups?type=components&tool_id=${toolId}${typeParam}`);
      setComponents(data.data);
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? e.message);
    }
  }, []);

  const handleTicketTypeChange = useCallback(async (ticketType: string) => {
    setNewTicket((p) => ({ ...p, type: ticketType as typeof p.type, components: [] }));
    setComponents((prev) => {
      // Will be replaced by the fetch below; clear immediately so stale list is gone
      return prev.length ? [] : prev;
    });
    setNewTicket((p) => {
      const toolId = p.fk_tool_id;
      if (toolId) {
        const typeParam = `&ticket_type=${ticketType}`;
        axios
          .get(`/api/system/maintenance/lookups?type=components&tool_id=${toolId}${typeParam}`)
          .then(({ data }) => setComponents(data.data))
          .catch((e: any) => toast.error(e.response?.data?.message ?? e.message));
      }
      return p;
    });
  }, []);

  const openCloseModal = useCallback((id: number) => {
    setActiveTicketId(id);
    setCloseNote('');
    openModal('close');
  }, [openModal]);

  const openAssignModal = useCallback(async (id: number) => {
    setActiveTicketId(id);
    setUsers([]);
    setAssignTo(0);
    setModalLoading(true);
    openModal('assign');
    try {
      const { data } = await axios.get(`/api/system/maintenance/lookups?type=users`);
      setUsers(data.data);
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? e.message);
    } finally {
      setModalLoading(false);
    }
  }, [openModal]);

  const openReportModal = useCallback((id: number) => {
    setActiveTicketId(id);
    setReport(defaultReport);
    openModal('report');
  }, [openModal]);

  const openUploadModal = useCallback((id: number) => {
    setActiveTicketId(id);
    setUploadDesc('');
    openModal('upload');
  }, [openModal]);

  const openEventsModal = useCallback(async (id: number) => {
    setActiveTicketId(id);
    setEvents([]);
    setModalLoading(true);
    openModal('events');
    try {
      const { data } = await axios.get(`/api/system/maintenance/tickets/events?ticket_id=${id}`);
      setEvents(data.events);
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? e.message);
    } finally {
      setModalLoading(false);
    }
  }, [openModal]);

  const handleCreateTicket = useCallback(async () => {
    if (!newTicket.fk_tool_id) { toast.error('Please select a drone/system'); return; }
    setModalLoading(true);
    try {
      const res = await axios.post(`/api/system/maintenance/tickets/create`, {
        fk_tool_id: newTicket.fk_tool_id,
        components: newTicket.components,
        type: newTicket.type,
        priority: newTicket.priority,
        assigned_to: newTicket.assigned_to,
        note: newTicket.note,
        opened_by: 'web',
        latitude:  newTicket.latitude  ? Number(newTicket.latitude)  : null,
        longitude: newTicket.longitude ? Number(newTicket.longitude) : null,
      });
      toast.success('Ticket created successfully');
      closeModal('newTicket');
      if (res.data.ticket) {
        setTickets(prev => [res.data.ticket, ...prev]);
      } else {
        loadTickets();
      }
    } catch (e: any) {
      if(e.response?.status === 409) {
        toast.error('An open ticket already exists for this system');
      } else {
        toast.error(e.response?.data?.message ?? e.message);
      }
    }finally {
      setModalLoading(false);
    }
  }, [newTicket, closeModal, loadTickets]);

  const handleCloseTicket = useCallback(async () => {
    if (!activeTicketId) return;
    if (!closeNote.trim()) { toast.error('Please enter a closing note'); return; }
    setModalLoading(true);
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
    } finally {
      setModalLoading(false);
    }
  }, [activeTicketId, closeNote, closeModal, updateLocalTicket]);

  const handleAssignTicket = useCallback(async () => {
    if (!activeTicketId || !assignTo) return;
    setModalLoading(true);
    try {
      await axios.post(`/api/system/maintenance/tickets/assign`, {
        ticket_id: activeTicketId,
        assigned_to: assignTo,
      });
      toast.success('Ticket assigned');
      closeModal('assign');
      const selectedUser = users.find(u => Number(u.user_id) === assignTo);
      updateLocalTicket(activeTicketId, {
        assigned_to_user_id: assignTo,
        assigner_name: selectedUser?.fullname ?? '',
        assigner_email: selectedUser?.email ?? '',
      });
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? e.message);
    } finally {
      setModalLoading(false);
    }
  }, [activeTicketId, assignTo, users, closeModal, updateLocalTicket]);

  const handleAddReport = useCallback(async (file?: File) => {
    if (!activeTicketId) return;
    if (!report.text.trim()) { toast.error('Please enter a report description'); return; }
    if (report.work_start && report.work_end && report.work_end < report.work_start) {
      toast.error('Work end time must be after work start time'); return;
    }
    setModalLoading(true);
    try {
      const fd = new FormData();
      fd.append('ticket_id', String(activeTicketId));
      fd.append('report_text', report.text);
      if (report.work_start) fd.append('work_start', report.work_start);
      if (report.work_end) fd.append('work_end', report.work_end);
      fd.append('report_by', 'web');
      if (report.close) fd.append('close_report', 'Y');
      if (file) fd.append('file', file);

      await axios.post(`/api/system/maintenance/tickets/report`, fd);
      toast.success('Report saved');
      closeModal('report');
      if (report.close) {
        updateLocalTicket(activeTicketId, {
          ticket_status: 'CLOSED',
          closed_at: new Date().toISOString(),
        });
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? e.message);
    } finally {
      setModalLoading(false);
    }
  }, [activeTicketId, report, closeModal, updateLocalTicket]);

  const handleUploadFile = useCallback(async (file: File) => {
    if (!activeTicketId) return;
    const fd = new FormData();
    fd.append('ticket_id', String(activeTicketId));
    fd.append('file', file);
    fd.append('attachment_desc', uploadDesc);
    fd.append('uploaded_by', 'web');
    setModalLoading(true);
    try {
      await axios.post(`/api/system/maintenance/tickets/upload`, fd);
      toast.success('File uploaded');
      closeModal('upload');
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? e.message);
    } finally {
      setModalLoading(false);
    }
  }, [activeTicketId, uploadDesc, closeModal]);

  const handleIntervention = useCallback(async (ticketId: number, action: 'start' | 'end') => {
    try {
      await axios.post('/api/system/maintenance/tickets/intervention', { ticket_id: ticketId, action });
      const now = new Date().toISOString();
      updateLocalTicket(ticketId, action === 'start'
        ? { intervention_started_at: now, ticket_status: 'IN_PROGRESS' }
        : { intervention_ended_at: now, ticket_status: 'OPEN' }
      );
      toast.success(action === 'start' ? 'Intervention started' : 'Intervention ended');
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? e.message);
    }
  }, [updateLocalTicket]);

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
    modalLoading,
    loadTickets,
    openNewTicketModal,
    handleDroneChange,
    handleTicketTypeChange,
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
    handleIntervention,
  };
}