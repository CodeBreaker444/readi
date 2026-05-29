"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useTheme } from "@/components/useTheme";
import type { Client, MapFilters } from "@/config/types/types";
import { useTranslation } from "react-i18next";

interface MapFiltersProps {
  filters: MapFilters;
  clients: Client[];
  onChange: (updated: Partial<MapFilters>) => void;
}

export default function MapFilters({ filters, clients, onChange }: MapFiltersProps) {
  const { isDark } = useTheme();
  const { t } = useTranslation();

  const labelCls = `text-xs font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`;
  const inputCls = `h-8 text-sm ${isDark
    ? "bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-500"
    : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"}`;
  const selectTriggerCls = `h-8 text-sm ${isDark
    ? "bg-slate-700 border-slate-600 text-slate-200"
    : "bg-gray-50 border-gray-200 text-gray-700"}`;
  const selectContentCls = isDark ? "bg-slate-800 border-slate-700 text-slate-200" : "";
  const checkLabelCls = `text-sm font-normal cursor-pointer ${isDark ? "text-slate-400" : "text-gray-600"}`;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">

      <div className="space-y-1.5">
        <Label className={labelCls}>{t('systems.map.filters.status')}</Label>
        <Select
          value={filters.status || "__all__"}
          onValueChange={(val) => onChange({ status: val === "__all__" ? "" : val })}
        >
          <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="All" /></SelectTrigger>
        <SelectContent className={selectContentCls}>
            <SelectItem value="__all__">{t('systems.map.filters.statusAll')}</SelectItem>
            <SelectItem value="OPERATIONAL">{t('systems.map.filters.statusOperational')}</SelectItem>
            <SelectItem value="NOT_OPERATIONAL">{t('systems.map.filters.statusNotOperational')}</SelectItem>
            <SelectItem value="MAINTENANCE">{t('systems.map.filters.statusMaintenance')}</SelectItem>
            <SelectItem value="DECOMMISSIONED">{t('systems.map.filters.statusDecommissioned')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className={labelCls}>{t('systems.map.filters.client')}</Label>
        <Select
          value={filters.clientId || "__all__"}
          onValueChange={(val) => onChange({ clientId: val === "__all__" ? "" : val })}
        >
          <SelectTrigger className={selectTriggerCls}><SelectValue placeholder={t('systems.map.filters.allClients')} /></SelectTrigger>
          <SelectContent className={selectContentCls}>
            <SelectItem value="__all__">{t('systems.map.filters.allClients')}</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.client_id} value={String(c.client_id)}>
                {c.client_name}{c.client_code ? ` (${c.client_code})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className={labelCls}>{t('systems.map.filters.search')}</Label>
        <Input
          type="text"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
        placeholder={t('systems.map.filters.searchPlaceholder')}
          className={inputCls}
        />
      </div>

      <div className="flex items-center gap-2 cursor-pointer pb-0.5">
        <Checkbox
          id="only-dock"
          checked={filters.onlyDock}
          onCheckedChange={(checked) => onChange({ onlyDock: !!checked })}
        />
        <Label htmlFor="only-dock" className={checkLabelCls}>{t('systems.map.filters.docksOnly')}</Label>
      </div>

      <div className="flex items-center gap-2 cursor-pointer pb-0.5">
        <Checkbox
          id="only-installed"
          checked={filters.onlyInstalled}
          onCheckedChange={(checked) => onChange({ onlyInstalled: !!checked })}
        />
        <Label htmlFor="only-installed" className={checkLabelCls}>{t('systems.map.filters.installedOnly')}</Label>
      </div>

    </div>
  );
}