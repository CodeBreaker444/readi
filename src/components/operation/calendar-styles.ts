/** Shared FullCalendar theme (light = .fc-light, dark = .fc-dark wrapper) for the operations calendar and the Best Time to Fly tab. */
export const FC_CALENDAR_CSS = `
.fc-event {
  cursor: pointer;
  border-radius: 6px !important;
  font-size: 11.5px !important;
  font-weight: 600 !important;
  padding: 1px 5px !important;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15) !important;
  transition: filter 0.15s, transform 0.15s !important;
}
.fc-event:hover { filter: brightness(1.12); transform: translateY(-1px); }
.fc-toolbar { flex-wrap: wrap; gap: 8px; margin-bottom: 1.25rem !important; }
.fc-button {
  border-radius: 8px !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  padding: 5px 12px !important;
  text-transform: capitalize !important;
  transition: all 0.15s !important;
  letter-spacing: 0.02em !important;
}
.fc-toolbar-title {
  font-size: 1.1rem !important;
  font-weight: 700 !important;
  letter-spacing: -0.02em !important;
}
.fc-col-header-cell-cushion,
.fc-daygrid-day-number,
.fc-list-day-text,
.fc-list-day-side-text { text-decoration: none !important; }

/* ── Light ── */
.fc-light .fc-toolbar-title { color: #1e293b; }
.fc-light .fc-button { background: #f8fafc !important; border: 1px solid #e2e8f0 !important; color: #475569 !important; }
.fc-light .fc-button:hover { background: #f1f5f9 !important; border-color: #cbd5e1 !important; color: #1e293b !important; }
.fc-light .fc-button-active,
.fc-light .fc-button-primary:not(:disabled).fc-button-active { background: #0284c7 !important; border-color: #0284c7 !important; color: #fff !important; }
.fc-light .fc-today-button { background: #e0f2fe !important; border-color: #bae6fd !important; color: #0284c7 !important; }
.fc-light .fc-col-header-cell-cushion { color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
.fc-light .fc-daygrid-day-number { color: #64748b; font-size: 12px; font-weight: 600; }
.fc-light .fc-timegrid-slot-label { color: #94a3b8; font-size: 11px; }
.fc-light .fc-scrollgrid { border-color: #e2e8f0 !important; }
.fc-light .fc-scrollgrid-section > td { border-color: #e2e8f0 !important; }
.fc-light .fc-timegrid-slot { border-color: #f1f5f9 !important; }
.fc-light .fc-col-header-cell { border-color: #e2e8f0 !important; background: #f8fafc; }
.fc-light .fc-daygrid-day { border-color: #f1f5f9 !important; }
.fc-light .fc-day-today { background: #f0f9ff !important; }
.fc-light .fc-list-day-cushion { background: #f8fafc; }
.fc-light .fc-list-day-text,
.fc-light .fc-list-day-side-text { color: #475569; font-weight: 700; font-size: 12px; }
.fc-light .fc-list-event-title { color: #1e293b; }
.fc-light .fc-list-event-time { color: #94a3b8; font-size: 11px; }
.fc-light .fc-list-table td { border-color: #f1f5f9; }
.fc-light .fc-list-table tr:hover td { background: #fafafa; }
.fc-light .fc-list-empty { color: #94a3b8; }

/* ── Dark ── */
.fc-dark .fc-toolbar-title { color: #f1f5f9; }
.fc-dark .fc-button { background: #1e293b !important; border: 1px solid #334155 !important; color: #94a3b8 !important; }
.fc-dark .fc-button:hover { background: #334155 !important; border-color: #475569 !important; color: #f1f5f9 !important; }
.fc-dark .fc-button-active,
.fc-dark .fc-button-primary:not(:disabled).fc-button-active { background: #0284c7 !important; border-color: #0284c7 !important; color: #fff !important; }
.fc-dark .fc-today-button { background: #082f49 !important; border-color: #0c4a6e !important; color: #7dd3fc !important; }
.fc-dark .fc-col-header-cell-cushion { color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
.fc-dark .fc-daygrid-day-number { color: #64748b; font-size: 12px; font-weight: 600; }
.fc-dark .fc-timegrid-slot-label { color: #475569; font-size: 11px; }
.fc-dark .fc-scrollgrid { border-color: #1e293b !important; }
.fc-dark .fc-scrollgrid-section > td { border-color: #1e293b !important; }
.fc-dark .fc-timegrid-slot { border-color: #0f172a !important; }
.fc-dark .fc-col-header-cell { border-color: #1e293b !important; background: #0f172a; }
.fc-dark .fc-daygrid-day { border-color: #1e293b !important; }
.fc-dark .fc-day-today { background: #082f49 !important; }
.fc-dark .fc-list-day-cushion { background: #0f172a; }
.fc-dark .fc-list-day-text,
.fc-dark .fc-list-day-side-text { color: #64748b; font-weight: 700; font-size: 12px; }
.fc-dark .fc-list-event-title { color: #e2e8f0; }
.fc-dark .fc-list-event-time { color: #475569; font-size: 11px; }
.fc-dark .fc-list-table td { border-color: #1e293b; }
.fc-dark .fc-list-table tr:hover td { background: #0f172a; }
.fc-dark .fc-list-empty { color: #475569; }
.fc-dark .fc-theme-standard td,
.fc-dark .fc-theme-standard th { border-color: #1e293b; }
.fc-event-non-operational { opacity: 0.6 !important; }
.fc-event-non-operational .fc-event-title { text-decoration: line-through; }
`
