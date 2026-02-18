"use client";

import type { Client, MapFilters } from "@/config/types";

interface MapFiltersProps {
  filters: MapFilters;
  clients: Client[];
  onChange: (updated: Partial<MapFilters>) => void;
}

export default function MapFilters({ filters, clients, onChange }: MapFiltersProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
        <select
          value={filters.status}
          onChange={(e) => onChange({ status: e.target.value })}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All</option>
          <option value="OPERATIONAL">Operational</option>
          <option value="NOT_OPERATIONAL">Not Operational</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="DECOMMISSIONED">Decommissioned</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Client</label>
        <select
          value={filters.clientId}
          onChange={(e) => onChange({ clientId: e.target.value })}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Clients</option>
          {clients.map((c) => (
            <option key={c.client_id} value={String(c.client_id)}>
              {c.client_name}
              {c.client_code ? ` (${c.client_code})` : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="e.g. RFI, OVADA, DOCK 2"
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={filters.onlyDock}
          onChange={(e) => onChange({ onlyDock: e.target.checked })}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-600">Docks only</span>
      </label>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={filters.onlyInstalled}
          onChange={(e) => onChange({ onlyInstalled: e.target.checked })}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-600">Installed only</span>
      </label>
    </div>
  );
}