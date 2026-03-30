"use client";

import MaintenanceTable, { SummaryBar } from "@/components/system/MaintenanceTable";
import { MaintenanceTableSkeleton } from "@/components/tables/MaintenanceTableSkeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/useTheme";
import { MaintenanceDrone } from "@/config/types/maintenance";
import axios from "axios";
import { Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaFileExcel, FaFilePdf, FaFileWord } from "react-icons/fa";
import { HiDownload } from "react-icons/hi";
import { toast } from "sonner";

const MIN_THRESHOLD = 50;
const MAX_THRESHOLD = 99;
const DEFAULT_THRESHOLD = 80;

export default function MaintenancePage() {
  const { isDark } = useTheme();
  const [data, setData] = useState<MaintenanceDrone[]>([]);
  const [loading, setLoading] = useState(false);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const hasFetched = useRef(false);

  const fetchData = useCallback(async (alertThreshold: number) => {
    setLoading(true);
    try {
      const res = await axios.post("/api/system/maintenance/dashboard", {
        threshold_alert: alertThreshold,
      });
      const json = res.data;
      if (json.code === 1) {
        setData(json.data ?? []);
      } else {
        toast.error(json.message ?? "Failed to load data");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchData(DEFAULT_THRESHOLD);
    }
  }, [fetchData]);

  const applyThreshold = (value: number) => {
    const clamped = Math.min(MAX_THRESHOLD, Math.max(MIN_THRESHOLD, value));
    setThreshold(clamped);
    fetchData(clamped);
  };

  const [exporting, setExporting] = useState<'xlsx' | 'pdf' | 'docx' | null>(null);

  const summaryCounts = useMemo(() => {
    let ok = 0, alert = 0, due = 0, inMaintenance = 0;
    for (const d of data) {
      const all = [d.status, ...d.components.map((c) => c.status)];
      const eff = all.includes('IN_MAINTENANCE') ? 'IN_MAINTENANCE'
                : all.includes('DUE')            ? 'DUE'
                : all.includes('ALERT')          ? 'ALERT'
                : 'OK';
      if (eff === 'IN_MAINTENANCE') inMaintenance++;
      else if (eff === 'DUE') due++;
      else if (eff === 'ALERT') alert++;
      else ok++;
    }
    return { total: data.length, ok, alert, due, inMaintenance };
  }, [data]);

  const exportSections = useMemo(() => {
    const thresholdLabel = threshold < 70 ? 'Sensitive' : threshold < 85 ? 'Normal' : 'Lenient';
    return [
      {
        title: 'Summary',
        headers: ['Metric', 'Value'],
        rows: [
          ['Alert Threshold', `${threshold}% (${thresholdLabel})`],
          ['Total Systems',   String(summaryCounts.total)],
          ['OK',              String(summaryCounts.ok)],
          ['Alert',           String(summaryCounts.alert)],
          ['Due',             String(summaryCounts.due)],
          ['In Maintenance',  String(summaryCounts.inMaintenance)],
        ],
      },
      {
        title: 'Drone Systems',
        headers: ['System Code', 'Serial', 'Status', 'Hours', 'Flights', 'Last Maintenance', 'Triggers'],
        rows: data.map((d) => [
          d.code,
          d.serial_number ?? '',
          d.status,
          String(d.total_hours),
          String(d.total_flights),
          d.last_maintenance ? new Date(d.last_maintenance).toLocaleDateString('en-GB') : '—',
          (d.trigger ?? []).filter((v): v is string => !!v && v !== 'null').join(', ') || '—',
        ]),
      },
      {
        title: 'Component Details',
        headers: ['System', 'Component', 'Type', 'Serial', 'Status', 'Hours (cur/limit)', 'Flights (cur/limit)', 'Days (cur/limit)', 'Last Maintenance', 'Triggers'],
        rows: data.flatMap((d) =>
          d.components.map((c) => [
            d.code,
            c.component_name,
            c.component_type ?? '',
            c.serial_number ?? '',
            c.status,
            c.model.maintenance_cycle_hour > 0
              ? `${c.total_hours} / ${c.model.maintenance_cycle_hour}h (${Math.round((c.total_hours / c.model.maintenance_cycle_hour) * 100)}%)`
              : `${c.total_hours}h`,
            c.model.maintenance_cycle_flight > 0
              ? `${c.total_flights} / ${c.model.maintenance_cycle_flight}fl (${Math.round((c.total_flights / c.model.maintenance_cycle_flight) * 100)}%)`
              : `${c.total_flights}fl`,
            c.model.maintenance_cycle_day > 0
              ? `${c.total_days} / ${c.model.maintenance_cycle_day}d (${Math.round((c.total_days / c.model.maintenance_cycle_day) * 100)}%)`
              : `${c.total_days}d`,
            c.last_maintenance ? new Date(c.last_maintenance).toLocaleDateString('en-GB') : '—',
            (c.trigger ?? []).filter((v): v is string => !!v && v !== 'null').join(', ') || '—',
          ])
        ),
      },
    ];
  }, [data, threshold, summaryCounts]);

  function triggerDownload(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  async function handleServerExport(format: 'xlsx' | 'docx') {
    setExporting(format);
    try {
      const date = new Date().toISOString().slice(0, 10);
      const res = await fetch('/api/export/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, sections: exportSections, title: 'Maintenance Dashboard', filename: `maintenance-dashboard-${date}` }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      triggerDownload(await res.blob(), `maintenance-dashboard-${date}.${format}`);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to export ${format.toUpperCase()}`);
    } finally { setExporting(null); }
  }

  async function handlePdfExport() {
    setExporting('pdf');
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'), import('jspdf-autotable'),
      ]);

      let logoBase64: string | null = null;
      try {
        const res = await fetch('/logo-sm.png');
        const blob = await res.blob();
        logoBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch { /* skip */ }

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm' });
      const pageW = doc.internal.pageSize.width;
      const pageH = doc.internal.pageSize.height;
      const exportedOn = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const thresholdLabel = threshold < 70 ? 'Sensitive' : threshold < 85 ? 'Normal' : 'Lenient';

      // Title
      doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 15, 15);
      doc.text('Maintenance Dashboard', 14, 15);
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
      doc.text(`Exported ${exportedOn}`, 14, 21);
      doc.setTextColor(0, 0, 0);

      // Summary stat boxes
      const boxY = 26; const boxH = 17; const gap = 3;
      const boxW = (pageW - 28 - gap * 5) / 6;
      const statBoxes = [
        { label: 'Alert Threshold', value: `${threshold}%`, sub: thresholdLabel, bg: [109,40,217] as [number,number,number], fg: [255,255,255] as [number,number,number] },
        { label: 'Total Systems',   value: String(summaryCounts.total),         bg: [241,245,249] as [number,number,number], fg: [51,65,85]   as [number,number,number] },
        { label: 'OK',              value: String(summaryCounts.ok),            bg: [236,253,245] as [number,number,number], fg: [5,150,105]  as [number,number,number] },
        { label: 'Alert',           value: String(summaryCounts.alert),         bg: [255,251,235] as [number,number,number], fg: [217,119,6]  as [number,number,number] },
        { label: 'Due',             value: String(summaryCounts.due),           bg: [255,241,242] as [number,number,number], fg: [225,29,72]  as [number,number,number] },
        { label: 'In Maintenance',  value: String(summaryCounts.inMaintenance), bg: [239,246,255] as [number,number,number], fg: [37,99,235]  as [number,number,number] },
      ];
      statBoxes.forEach((box, i) => {
        const x = 14 + i * (boxW + gap);
        doc.setFillColor(...box.bg); doc.roundedRect(x, boxY, boxW, boxH, 1.5, 1.5, 'F');
        doc.setFontSize(6); doc.setFont('helvetica', 'normal'); doc.setTextColor(...box.fg);
        doc.text(box.label, x + 3, boxY + 5);
        doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.text(box.value, x + 3, boxY + 13);
        if (box.sub) {
          doc.setFontSize(5.5); doc.setFont('helvetica', 'normal');
          doc.text(box.sub, x + 3 + doc.getTextWidth(box.value) + 1.5, boxY + 13);
        }
      });
      doc.setTextColor(0, 0, 0);

      // Tables (skip Summary section — already drawn as boxes)
      let startY = boxY + boxH + 6;
      for (const section of exportSections.slice(1)) {
        doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(109, 40, 217);
        doc.text(section.title, 14, startY); doc.setTextColor(0, 0, 0); startY += 5;
        autoTable(doc, {
          startY, head: [section.headers], body: section.rows,
          styles: { fontSize: 7.5, cellPadding: { top: 2, right: 2.5, bottom: 2, left: 2.5 }, overflow: 'linebreak' },
          headStyles: { fillColor: [109, 40, 217], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
          alternateRowStyles: { fillColor: [248, 248, 252] },
          margin: { left: 14, right: 14, bottom: 16 },
          tableLineColor: [226, 232, 240], tableLineWidth: 0.1,
          didDrawPage: (d) => { startY = d.cursor?.y ?? startY; },
        });
        startY = (doc as any).lastAutoTable.finalY + 8;
        if (startY > pageH - 20) { doc.addPage(); startY = 15; }
      }

      // Logo + footer on every page
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        if (logoBase64) doc.addImage(logoBase64, 'PNG', pageW - 26, 5, 12, 12);
        doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.3);
        doc.line(14, pageH - 12, pageW - 14, pageH - 12); doc.setLineWidth(0.2);
        doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(148, 163, 184);
        doc.text('Generated by Readi Platform', 14, pageH - 7);
        doc.text(`Page ${i} of ${totalPages}`, pageW - 14, pageH - 7, { align: 'right' });
      }

      doc.save(`maintenance-dashboard-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error(err); toast.error('Failed to export PDF');
    } finally { setExporting(null); }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div
        className={`top-0 z-10 backdrop-blur-md transition-colors ${
          isDark
            ? "bg-slate-900/90 border-b border-slate-800"
            : "bg-white/90 border-b border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
        } px-6 py-3`}
      >
        <div className="mx-auto max-w-450 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full bg-violet-600" />
            <div>
              <h1 className={`font-semibold text-base tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                Maintenance Dashboard
              </h1>
              <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                Drone systems & component maintenance status
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(threshold)}
            disabled={loading}
            className={`h-8 gap-1.5 text-xs transition-all ${
              isDark
                ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            <span>{loading ? "Loading..." : "Refresh"}</span>
          </Button>
        </div>
      </div>

      <main className="mx-auto px-4 sm:px-6 py-4">
        {loading && !data.length ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 px-4 py-3 h-16 animate-pulse" />
              ))}
            </div>
            <MaintenanceTableSkeleton />
          </>
        ) : (
          <>
            <SummaryBar data={data} threshold={threshold} />

            <div className={`transition-opacity duration-200 ${loading ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
              <MaintenanceTable
                data={data}
                threshold={threshold}
                onApplyThreshold={applyThreshold}
              />

              <div className="mt-3 flex justify-start">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline" size="sm"
                      disabled={!!exporting || loading || data.length === 0}
                      className={`gap-1.5 text-xs h-7 ${isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      <HiDownload className="w-3.5 h-3.5" />
                      {exporting ? 'Exporting…' : 'Export'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className={`min-w-47 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : ''}`}>
                    <DropdownMenuLabel className={`text-[10px] uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Download as</DropdownMenuLabel>
                    <DropdownMenuSeparator className={isDark ? 'bg-slate-700' : ''} />
                    <DropdownMenuItem onClick={() => handleServerExport('xlsx')} disabled={!!exporting} className={`text-xs gap-2 cursor-pointer ${isDark ? 'hover:bg-slate-700' : ''}`}>
                      <FaFileExcel className="w-3.5 h-3.5 text-emerald-600" />
                      Excel (.xlsx)
                      {exporting === 'xlsx' && <span className="ml-auto text-[10px] opacity-60">…</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handlePdfExport} disabled={!!exporting} className={`text-xs gap-2 cursor-pointer ${isDark ? 'hover:bg-slate-700' : ''}`}>
                      <FaFilePdf className="w-3.5 h-3.5 text-red-500" />
                      PDF (.pdf)
                      {exporting === 'pdf' && <span className="ml-auto text-[10px] opacity-60">…</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleServerExport('docx')} disabled={!!exporting} className={`text-xs gap-2 cursor-pointer ${isDark ? 'hover:bg-slate-700' : ''}`}>
                      <FaFileWord className="w-3.5 h-3.5 text-blue-600" />
                      Word (.docx)
                      {exporting === 'docx' && <span className="ml-auto text-[10px] opacity-60">…</span>}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
