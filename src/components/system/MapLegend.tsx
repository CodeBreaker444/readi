"use client";

export default function MapLegend() {
  const statusItems = [
    { color: "#2e7d32", label: "Operational" },
    { color: "#b71c1c", label: "Not Operational" },
    { color: "#f57c00", label: "Maintenance" },
    { color: "#616161", label: "Decommissioned" },
  ];

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-600 items-center">

      <span className="flex items-center gap-1.5">
        <svg width="18" height="20" viewBox="0 0 30 34" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="12" width="14" height="11" rx="2" fill="#5c6bc0" fillOpacity="0.25" stroke="#3949ab" strokeWidth="2"/>
          <rect x="12.5" y="8" width="5" height="4" rx="1" fill="#5c6bc0" stroke="#3949ab" strokeWidth="2"/>
          <line x1="15" y1="8" x2="15" y2="3.5" stroke="#3949ab" strokeWidth="1.8"/>
          <circle cx="15" cy="3.2" r="1.2" fill="#3949ab"/>
        </svg>
        Control Center
      </span>

      <span className="flex items-center gap-1.5">
        <svg width="18" height="18" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
          <rect x="6.5" y="11.5" width="15" height="9" rx="1.6" fill="#1976d2" fillOpacity="0.25" stroke="#1976d2" strokeWidth="2"/>
          <path d="M5.5 12 L14 6 L22.5 12" fill="#1976d2" fillOpacity="0.15" stroke="#1976d2" strokeWidth="2" strokeLinejoin="round"/>
          <rect x="12.4" y="15" width="3.2" height="5" rx="0.8" fill="#fff" fillOpacity="0.8" stroke="#1976d2" strokeWidth="1"/>
          <line x1="14" y1="6" x2="14" y2="3.4" stroke="#1976d2" strokeWidth="1.4"/>
          <circle cx="14" cy="3.2" r="1.1" fill="#1976d2"/>
        </svg>
        Dock
      </span>

      <span className="flex items-center gap-1.5">
        <svg width="18" height="18" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
          <circle cx="13" cy="12" r="7.5" fill="#2e7d32" fillOpacity="0.20" stroke="#2e7d32" strokeWidth="2"/>
          <line x1="6" y1="12" x2="20" y2="12" stroke="#2e7d32" strokeWidth="2"/>
          <line x1="13" y1="5" x2="13" y2="19" stroke="#2e7d32" strokeWidth="2"/>
          <circle cx="13" cy="12" r="2.1" fill="#2e7d32"/>
        </svg>
        Drone
      </span>

      <span className="flex items-center gap-1.5">
        <span
          className="inline-flex items-center justify-center rounded-full text-white font-semibold"
          style={{
            width: 22,
            height: 22,
            fontSize: 10,
            background: "#2e7d32",
            border: "2.5px solid #1976d2",
            boxShadow: "0 1px 4px rgba(0,0,0,.2)",
          }}
        >
          N
        </span>
        Cluster
      </span>

      <span className="text-gray-300 select-none">|</span>

      {statusItems.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: i.color }}
          />
          {i.label}
        </span>
      ))}
    </div>
  );
}