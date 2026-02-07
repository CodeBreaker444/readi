'use client';
import React, { useEffect, useRef } from 'react';


const dummyEvents = [
  {
    id: 1,
    title: 'John Doe - ON DUTY',
    start: '2026-01-20T08:00:00',
    end: '2026-01-20T16:00:00',
    backgroundColor: '#2e7d32',
    borderColor: '#2e7d32'
  },
  {
    id: 2,
    title: 'Jane Smith - STAND BY',
    start: '2026-01-20T10:00:00',
    end: '2026-01-20T14:00:00',
    backgroundColor: '#1976d2',
    borderColor: '#1976d2'
  },
  {
    id: 3,
    title: 'Bob Johnson - TRAINING',
    start: '2026-01-21T09:00:00',
    end: '2026-01-21T17:00:00',
    backgroundColor: '#6a1b9a',
    borderColor: '#6a1b9a'
  },
  {
    id: 4,
    title: 'Alice Brown - OFF DUTY',
    start: '2026-01-22T08:00:00',
    end: '2026-01-22T16:00:00',
    backgroundColor: '#ef6c00',
    borderColor: '#ef6c00'
  }
];

interface CrewShiftCalendarProps {
  isDark?: boolean;
}

export const CrewShiftCalendar: React.FC<CrewShiftCalendarProps> = ({ isDark = false }) => {
  const calendarRef = useRef<HTMLDivElement>(null);
  const calendarInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadFullCalendar = async () => {
      // Load FullCalendar CSS
      const fullCalendarCSS = document.createElement('link');
      fullCalendarCSS.rel = 'stylesheet';
      fullCalendarCSS.href = 'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.10/index.global.min.css';
      document.head.appendChild(fullCalendarCSS);

      // Load FullCalendar JS
      const fullCalendarScript = document.createElement('script');
      fullCalendarScript.src = 'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.10/index.global.min.js';
      fullCalendarScript.async = true;

      fullCalendarScript.onload = () => {
        const { FullCalendar } = window as any;
        if (FullCalendar && calendarRef.current) {
          calendarInstanceRef.current = new FullCalendar.Calendar(calendarRef.current, {
            initialView: 'dayGridMonth',
            headerToolbar: {
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            events: dummyEvents,
            editable: true,
            selectable: true,
            dayMaxEvents: true,
            height: 'auto'
          });

          calendarInstanceRef.current.render();
        }
      };

      document.body.appendChild(fullCalendarScript);
    };

    loadFullCalendar();

    return () => {
      if (calendarInstanceRef.current) {
        calendarInstanceRef.current.destroy();
      }
    };
  }, []);

  return (
    <div className={`rounded-lg shadow-sm ${isDark ? 'bg-slate-800' : 'bg-white'} p-4`}>
      <div id="calendar" ref={calendarRef}></div>
    </div>
  );
};

interface CalendarLegendProps {
  isDark?: boolean;
}

export const CalendarLegend: React.FC<CalendarLegendProps> = ({ isDark = false }) => {
  const legendItems = [
    { label: 'STAND BY', color: '#1976d2' },
    { label: 'ON DUTY', color: '#2e7d32' },
    { label: 'OFF DUTY', color: '#ef6c00' },
    { label: 'TRAINING', color: '#6a1b9a' }
  ];

  return (
    <div className="flex items-center gap-4 mb-4">
      {legendItems.map((item) => (
        <span
          key={item.label}
          className="px-3 py-1 rounded text-sm text-white"
          style={{ backgroundColor: item.color }}
        >
          {item.label}
        </span>
      ))}
    </div>
  );
};


interface CalendarDashboardProps {
  isDark?: boolean;
}

export const CalendarDashboard: React.FC<CalendarDashboardProps> = ({ isDark = false }) => {
  return (
    <div className={`p-6 ${isDark ? 'bg-slate-900' : 'bg-gray-50'} min-h-screen`}>
      <div className="flex justify-end mb-4">
        <CalendarLegend isDark={isDark} />
      </div>
      <CrewShiftCalendar isDark={isDark} />
    </div>
  );
};
