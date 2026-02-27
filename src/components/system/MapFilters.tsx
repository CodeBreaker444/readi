"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Client, MapFilters } from "@/config/types/types";

interface MapFiltersProps {
  filters: MapFilters;
  clients: Client[];
  onChange: (updated: Partial<MapFilters>) => void;
}

export default function MapFilters({ filters, clients, onChange }: MapFiltersProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-gray-500">Status</Label>
        <Select
          value={filters.status || "__all__"}
          onValueChange={(val) => onChange({ status: val === "__all__" ? "" : val })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All</SelectItem>
            <SelectItem value="OPERATIONAL">Operational</SelectItem>
            <SelectItem value="NOT_OPERATIONAL">Not Operational</SelectItem>
            <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
            <SelectItem value="DECOMMISSIONED">Decommissioned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-gray-500">Client</Label>
        <Select
          value={filters.clientId || "__all__"}
          onValueChange={(val) => onChange({ clientId: val === "__all__" ? "" : val })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="All Clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Clients</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.client_id} value={String(c.client_id)}>
                {c.client_name}
                {c.client_code ? ` (${c.client_code})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-gray-500">Search</Label>
        <Input
          type="text"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="e.g. RFI, OVADA, DOCK 2"
          className="h-8 text-sm"
        />
      </div>

      <div className="flex items-center gap-2 cursor-pointer pb-0.5">
        <Checkbox
          id="only-dock"
          checked={filters.onlyDock}
          onCheckedChange={(checked) => onChange({ onlyDock: !!checked })}
        />
        <Label htmlFor="only-dock" className="text-sm text-gray-600 cursor-pointer font-normal">
          Docks only
        </Label>
      </div>

      <div className="flex items-center gap-2 cursor-pointer pb-0.5">
        <Checkbox
          id="only-installed"
          checked={filters.onlyInstalled}
          onCheckedChange={(checked) => onChange({ onlyInstalled: !!checked })}
        />
        <Label htmlFor="only-installed" className="text-sm text-gray-600 cursor-pointer font-normal">
          Installed only
        </Label>
      </div>
    </div>
  );
}