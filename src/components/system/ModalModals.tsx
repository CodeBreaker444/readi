'use client';

import type {
  ComponentOption,
  DroneOption,
  TicketEvent,
  TicketPriority,
  TicketType,
  UserOption,
} from '@/config/types/maintenance';
import { useRef } from 'react';
import type { NewTicketForm, ReportForm } from './useMaintenance';


export const inputCls =
  'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition dark:bg-slate-700 dark:border-slate-600 dark:text-white';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function ModalFooter({
  onCancel,
  onConfirm,
  confirmLabel,
  confirmClass,
  isDark,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmClass: string;
  isDark?: boolean;
}) {
  return (
    <div className="flex justify-end gap-3 pt-2 mt-4 border-t border-slate-100 dark:border-slate-700">
      <button
        type="button"
        onClick={onCancel}
        className={`px-4 py-2 text-sm rounded-lg transition ${
          isDark
            ? 'text-slate-300 hover:text-white hover:bg-slate-700'
            : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
        }`}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        className={`px-5 py-2 text-white text-sm font-semibold rounded-xl transition ${confirmClass}`}
      >
        {confirmLabel}
      </button>
    </div>
  );
}

function Modal({
  title,
  open,
  onClose,
  children,
  isDark,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  isDark?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative z-10 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col ${
          isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'
        }`}
        style={{ maxHeight: 'min(90vh, 700px)' }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className={`transition-colors ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}


interface NewTicketProps {
  open: boolean;
  onClose: () => void;
  drones: DroneOption[];
  components: ComponentOption[];
  users: UserOption[];
  form: NewTicketForm;
  onFormChange: (updates: Partial<NewTicketForm>) => void;
  onDroneChange: (toolId: number) => void;
  onSubmit: () => void;
  isDark?: boolean;
}

export function NewTicketModal({
  open, onClose, drones, components, users,
  form, onFormChange, onDroneChange, onSubmit, isDark,
}: NewTicketProps) {
  return (
    <Modal title="New Maintenance Ticket" open={open} onClose={onClose} isDark={isDark}>
      <Field label="Drone">
        <select
          className={inputCls}
          value={form.fk_tool_id}
          onChange={(e) => onDroneChange(Number(e.target.value))}
        >
          <option value={0}>Select drone…</option>
          {drones.map((d) => (
            <option key={d.tool_id} value={d.tool_id}>
              {d.tool_code} — {d.tool_desc} [{d.tool_status}]
            </option>
          ))}
        </select>
      </Field>

      <Field label="Components (optional, multi-select)">
        <select
          className={`${inputCls} min-h-[90px]`}
          multiple
          disabled={components.length === 0}
          value={form.components.map(String)}
          onChange={(e) =>
            onFormChange({
              components: Array.from(e.target.selectedOptions, (o) => Number(o.value)),
            })
          }
        >
          {components.length === 0 ? (
            <option disabled value="">Select a drone first…</option>
          ) : (
            components.map((c) => (
              <option key={c.tool_component_id} value={c.tool_component_id}>
                {c.component_type} — {c.component_sn}
              </option>
            ))
          )}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Type">
          <select
            className={inputCls}
            value={form.type}
            onChange={(e) => onFormChange({ type: e.target.value as TicketType })}
          >
            <option value="BASIC">Basic</option>
            <option value="STANDARD">Standard</option>
            <option value="EXTRAORDINARY">Extraordinary</option>
          </select>
        </Field>
        <Field label="Priority">
          <select
            className={inputCls}
            value={form.priority}
            onChange={(e) => onFormChange({ priority: e.target.value as TicketPriority })}
          >
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
        </Field>
      </div>

      <Field label="Assign To">
        <select
          className={inputCls}
          value={form.assigned_to}
          onChange={(e) => onFormChange({ assigned_to: Number(e.target.value) })}
        >
          <option value={0}>Select technician…</option>
          {users.map((u) => (
            <option key={u.user_id} value={u.user_id}>
              {u.fullname} ({u.user_profile})
            </option>
          ))}
        </select>
      </Field>

      <Field label="Note">
        <textarea
          className={inputCls}
          rows={3}
          value={form.note}
          onChange={(e) => onFormChange({ note: e.target.value })}
          placeholder="Describe the issue…"
        />
      </Field>

      <ModalFooter
        onCancel={onClose}
        onConfirm={onSubmit}
        confirmLabel="Create Ticket"
        confirmClass="bg-black hover:bg-black/60 text-white"
        isDark={isDark}
      />
    </Modal>
  );
}

export function CloseTicketModal({
  open, onClose, note, onNoteChange, onSubmit, isDark,
}: {
  open: boolean;
  onClose: () => void;
  note: string;
  onNoteChange: (v: string) => void;
  onSubmit: () => void;
  isDark?: boolean;
}) {
  return (
    <Modal title="Close Ticket" open={open} onClose={onClose} isDark={isDark}>
      <Field label="Closing Note">
        <textarea
          className={inputCls}
          rows={4}
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="Describe the intervention performed…"
        />
      </Field>
      <ModalFooter
        onCancel={onClose}
        onConfirm={onSubmit}
        confirmLabel="Close Ticket"
        confirmClass="bg-emerald-600 hover:bg-emerald-700"
        isDark={isDark}
      />
    </Modal>
  );
}


export function AssignTicketModal({
  open, onClose, users, assignTo, onAssignChange, onSubmit, isDark,
}: {
  open: boolean;
  onClose: () => void;
  users: UserOption[];
  assignTo: number;
  onAssignChange: (id: number) => void;
  onSubmit: () => void;
  isDark?: boolean;
}) {
  return (
    <Modal title="Assign Ticket" open={open} onClose={onClose} isDark={isDark}>
      <Field label="Technician">
        <select
          className={inputCls}
          value={assignTo}
          onChange={(e) => onAssignChange(Number(e.target.value))}
        >
          <option value={0}>Select technician…</option>
          {users.map((u) => (
            <option key={u.user_id} value={u.user_id}>
              {u.fullname} ({u.user_profile})
            </option>
          ))}
        </select>
      </Field>
      <ModalFooter
        onCancel={onClose}
        onConfirm={onSubmit}
        confirmLabel="Assign"
        confirmClass="bg-indigo-600 hover:bg-indigo-700"
        isDark={isDark}
      />
    </Modal>
  );
}


export function ReportModal({
  open, onClose, form, onFormChange, onSubmit, isDark,
}: {
  open: boolean;
  onClose: () => void;
  form: ReportForm;
  onFormChange: (updates: Partial<ReportForm>) => void;
  onSubmit: () => void;
  isDark?: boolean;
}) {
  return (
    <Modal title="Intervention Report" open={open} onClose={onClose} isDark={isDark}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Work Start">
          <input
            type="datetime-local"
            className={inputCls}
            value={form.work_start}
            onChange={(e) => onFormChange({ work_start: e.target.value })}
          />
        </Field>
        <Field label="Work End">
          <input
            type="datetime-local"
            className={inputCls}
            value={form.work_end}
            onChange={(e) => onFormChange({ work_end: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Report">
        <textarea
          className={inputCls}
          rows={4}
          value={form.text}
          onChange={(e) => onFormChange({ text: e.target.value })}
          placeholder="Describe work performed…"
        />
      </Field>
      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer mb-2">
        <input
          type="checkbox"
          className="w-4 h-4 rounded text-indigo-600"
          checked={form.close}
          onChange={(e) => onFormChange({ close: e.target.checked })}
        />
        Close ticket on save
      </label>
      <ModalFooter
        onCancel={onClose}
        onConfirm={onSubmit}
        confirmLabel="Save Report"
        confirmClass="bg-emerald-600 hover:bg-emerald-700"
        isDark={isDark}
      />
    </Modal>
  );
}


export function UploadModal({
  open, onClose, desc, onDescChange, onSubmit, isDark,
}: {
  open: boolean;
  onClose: () => void;
  desc: string;
  onDescChange: (v: string) => void;
  onSubmit: (file: File) => void;
  isDark?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <Modal title="Upload Attachment" open={open} onClose={onClose} isDark={isDark}>
      <Field label="Description">
        <input
          className={inputCls}
          value={desc}
          onChange={(e) => onDescChange(e.target.value)}
          placeholder="Brief description of the file"
        />
      </Field>
      <Field label="File">
        <input ref={fileRef} type="file" className={inputCls} />
      </Field>
      <ModalFooter
        onCancel={onClose}
        onConfirm={() => {
          const file = fileRef.current?.files?.[0];
          if (file) onSubmit(file);
        }}
        confirmLabel="Upload"
        confirmClass="bg-indigo-600 hover:bg-indigo-700"
        isDark={isDark}
      />
    </Modal>
  );
}


function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function EventsModal({
  open, onClose, ticketId, events, isDark,
}: {
  open: boolean;
  onClose: () => void;
  ticketId: number | null;
  events: TicketEvent[];
  isDark?: boolean;
}) {
  return (
    <Modal
      title={ticketId ? `Ticket #${ticketId} — Event History` : 'Event History'}
      open={open}
      onClose={onClose}
      isDark={isDark}
    >
      {events.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">No events recorded yet.</p>
      ) : (
        <ol className="relative border-l border-indigo-200 ml-3 space-y-4">
          {events.map((ev) => (
            <li key={ev.event_id} className="ml-6">
              <div className="absolute -left-1.5 mt-1.5 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white" />
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 mb-1">
                {ev.event_type}
              </span>
              <p className="text-sm text-slate-700 dark:text-slate-300">{ev.event_message}</p>
              <time className="text-xs text-slate-400">{fmtDate(ev.created_at)}</time>
            </li>
          ))}
        </ol>
      )}
      <div className="flex justify-end mt-4">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white transition"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}