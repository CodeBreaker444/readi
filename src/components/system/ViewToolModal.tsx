'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect, useMemo, useState } from 'react';
import { HiDownload } from 'react-icons/hi';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';

interface ViewSystemModalProps {
  open: boolean;
  toolId: number;
  onClose: () => void;
}

export default function ViewSystemModal({ open, toolId, onClose }: ViewSystemModalProps) {
  const [loading, setLoading] = useState(false);
  const [toolData, setSystemData] = useState<any>(null);
  const [components, setComponents] = useState([]);
  const [maintenanceTickets, setMaintenanceTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingComponents, setLoadingComponents] = useState(false);

  useEffect(() => {
    if (open && toolId) {
      fetchSystemDetails();
      fetchComponents();
      fetchMaintenanceHistory();
    }
  }, [open, toolId]);

  const fetchSystemDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/system/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const result = await response.json();
      if (result.code === 1) {
        const tool = result.data.find((t: any) => t.tool_id === toolId);
        setSystemData(tool);
      }
    } catch (error) {
      toast.error('Error fetching tool details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComponents = async () => {
    setLoadingComponents(true);
    try {
      const response = await fetch('/api/system/component/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_id: toolId }),
      });

      const result = await response.json();
      if (result.code === 1) {
        setComponents(result.data);
      }
    } catch (error) {
      console.error('Error fetching components:', error);
    } finally {
      setLoadingComponents(false);
    }
  };

  const [exporting, setExporting] = useState<'xlsx' | 'pdf' | 'docx' | null>(null);

  const exportSections = useMemo(() => {
    const sections = [];

    if (toolData) {
      sections.push({
        title: 'General Info',
        headers: ['Field', 'Value'],
        rows: [
          ['System Code',    toolData.tool_code ?? ''],
          ['Status',         toolData.tool_status ?? ''],
          ['Active',         toolData.active === 'Y' ? 'Yes' : 'No'],
          ['Client',         toolData.client_name ?? ''],
          ['Description',    toolData.tool_desc ?? ''],
          ['GCS Type',       toolData.tool_gcs_type ?? ''],
          ['C2 Platform',    toolData.tool_ccPlatform ?? ''],
          ['Latitude',       String(toolData.tool_latitude ?? '')],
          ['Longitude',      String(toolData.tool_longitude ?? '')],
        ],
      });

      sections.push({
        title: 'Flight Statistics',
        headers: ['Metric', 'Value'],
        rows: [
          ['Total Missions', String(toolData.tot_mission ?? 0)],
          ['Flight Time',    `${Math.round((toolData.tot_flown_time || 0) / 60)} min`],
        ],
      });
    }

    sections.push({
      title: 'Components',
      headers: ['Model / Code', 'Type', 'Status', 'Serial', 'Usage (hrs)'],
      rows: (components as any[]).map((c) => [
        c.factory_model || c.component_code || `#${c.tool_component_id}`,
        c.component_type ?? '',
        c.component_status ?? '',
        c.component_sn ?? 'N/A',
        String(c.component_cycles ?? 0),
      ]),
    });

    sections.push({
      title: 'Maintenance History',
      headers: ['Ticket #', 'Status', 'Priority', 'Type', 'Assigned To', 'Opened', 'Closed', 'Notes'],
      rows: maintenanceTickets.map((t) => [
        String(t.ticket_id),
        t.ticket_status ?? '',
        t.ticket_priority ?? '',
        t.ticket_type ?? '',
        t.assigner_name || 'Unassigned',
        t.opened_at ? new Date(t.opened_at).toLocaleDateString() : '—',
        t.closed_at ? new Date(t.closed_at).toLocaleDateString() : '—',
        t.note ?? '',
      ]),
    });

    return sections;
  }, [toolData, components, maintenanceTickets]);

  const isExportDisabled = loading || loadingTickets || loadingComponents || !toolData || !!exporting;

  function triggerDownload(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleServerExport(format: 'xlsx' | 'docx') {
    setExporting(format);
    try {
      const exportTitle = `System Details — ${toolData?.tool_code ?? ''}`;
      const exportFilename = `system-details-${toolData?.tool_code ?? toolId}`;
      const res = await fetch('/api/export/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, sections: exportSections, title: exportTitle, filename: exportFilename }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? `Server returned ${res.status}`);
      }
      const blob = await res.blob();
      triggerDownload(blob, `system-details-${toolData?.tool_code ?? toolId}.${format}`);
    } catch (err) {
      console.error(`[ViewSystemModal] ${format} export error`, err);
      toast.error(`Failed to export ${format.toUpperCase()} file.`);
    } finally {
      setExporting(null);
    }
  }

  async function handlePdfExport() {
    setExporting('pdf');
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
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
      } catch { 
        console.log('Logo is Missing for PDF export!');
       }

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm' });
      const pageW = doc.internal.pageSize.width;
      const pageH = doc.internal.pageSize.height;
      const exportTitle = `System Details — ${toolData?.tool_code ?? ''}`;
      const exportedOn = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 15, 15);
      doc.text(exportTitle, 14, 15);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Exported ${exportedOn}`, 14, 21);
      doc.setTextColor(0, 0, 0);

      let startY = 27;
      for (const section of exportSections) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(109, 40, 217);
        doc.text(section.title, 14, startY);
        doc.setTextColor(0, 0, 0);
        startY += 5;

        autoTable(doc, {
          startY,
          head: [section.headers],
          body: section.rows,
          styles: { fontSize: 8, cellPadding: { top: 2, right: 3, bottom: 2, left: 3 }, overflow: 'linebreak' },
          headStyles: { fillColor: [109, 40, 217], textColor: 255, fontStyle: 'bold', fontSize: 8 },
          alternateRowStyles: { fillColor: [248, 248, 252] },
          margin: { left: 14, right: 14, bottom: 16 },
          tableLineColor: [226, 232, 240],
          tableLineWidth: 0.1,
          didDrawPage: (data) => { startY = data.cursor?.y ?? startY; },
        });

        startY = (doc as any).lastAutoTable.finalY + 8;
        if (startY > pageH - 20) {
          doc.addPage();
          startY = 15;
        }
      }

      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);

        if (logoBase64) {
          doc.addImage(logoBase64, 'PNG', pageW - 26, 5, 12, 12);
        }

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(14, pageH - 12, pageW - 14, pageH - 12);
        doc.setLineWidth(0.2);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text('Generated by Readi Platform', 14, pageH - 7);
        doc.text(`Page ${i} of ${totalPages}`, pageW - 14, pageH - 7, { align: 'right' });
      }

      doc.save(`system-details-${toolData?.tool_code ?? toolId}.pdf`);
    } catch (err) {
      console.error('[ViewSystemModal] pdf export error', err);
      toast.error('Failed to export PDF.');
    } finally {
      setExporting(null);
    }
  }

  const fetchMaintenanceHistory = async () => {
    setLoadingTickets(true);
    try {
      const response = await fetch(`/api/system/maintenance/tickets?tool_id=${toolId}`);
      const result = await response.json();
      if (result.status === 'OK') {
        setMaintenanceTickets(result.tickets);
      }
    } catch (error) {
      console.error('Error fetching maintenance history:', error);
    } finally {
      setLoadingTickets(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 mr-6">
            <DialogTitle>
              {loading ? <Skeleton className="h-6 w-48" /> : `System Details - ${toolData?.tool_code || 'Loading...'}`}
            </DialogTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isExportDisabled} className="gap-1.5 text-xs h-7 cursor-pointer">
                  <HiDownload className="w-3.5 h-3.5" />
                  {exporting ? 'Exporting…' : 'Export'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-47">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-slate-400">Download as</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleServerExport('xlsx')} disabled={!!exporting} className="text-xs gap-2 cursor-pointer">
                  <span className="w-4 text-center text-emerald-500 font-bold text-sm">X</span>
                  Excel (.xlsx)
                  {exporting === 'xlsx' && <span className="ml-auto text-[10px] opacity-60">…</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePdfExport} disabled={!!exporting} className="text-xs gap-2 cursor-pointer">
                  <span className="w-4 text-center text-red-500 font-bold text-sm">P</span>
                  PDF (.pdf)
                  {exporting === 'pdf' && <span className="ml-auto text-[10px] opacity-60">…</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleServerExport('docx')} disabled={!!exporting} className="text-xs gap-2 cursor-pointer">
                  <span className="w-4 text-center text-blue-500 font-bold text-sm">W</span>
                  Word (.docx)
                  {exporting === 'docx' && <span className="ml-auto text-[10px] opacity-60">…</span>}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ))}
              <div className="col-span-2 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          </div>
        ) : (
          <>
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general">General Info</TabsTrigger>
                <TabsTrigger value="specifications">Specifications</TabsTrigger>
                <TabsTrigger value="components">Components</TabsTrigger>
                <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">System Code</p>
                    <p className="text-base font-semibold">{toolData?.tool_code || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <Badge variant={
                      toolData?.tool_status === 'MAINTENANCE' ? 'destructive' :
                      toolData?.tool_status === 'OPERATIONAL' ? 'default' : 'secondary'
                    }>
                      {toolData?.tool_status || 'UNKNOWN'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Active</p>
                    <Badge variant={toolData?.active === 'Y' ? 'default' : 'destructive'}>
                      {toolData?.active === 'Y' ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Client</p>
                    <p className="text-base">{toolData?.client_name || 'N/A'}</p>
                  </div>
                  <div className="col-span-2 border-t pt-2">
                    <p className="text-sm font-medium text-gray-500">Description</p>
                    <p className="text-sm text-gray-700">
                      {toolData?.tool_desc || 'No description provided.'}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3">Flight Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Total Missions</p>
                      <p className="text-2xl font-bold">{toolData?.tot_mission ?? 0}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Total Hours</p>
                      <p className="text-2xl font-bold">
                        {(() => {
                          const droneComp = (components as any[]).find(c => c.component_type === 'DRONE');
                          const hours = droneComp?.current_usage_hours || toolData?.tot_flown_time || 0;
                          return `${Number(hours).toFixed(1)} h`;
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="specifications" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Latitude</p>
                    <p className="text-base">{toolData?.tool_latitude || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Longitude</p>
                    <p className="text-base">{toolData?.tool_longitude || 'N/A'}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="components" className="pt-4">
                {components.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 border rounded-lg border-dashed">
                    No components found for this tool
                  </div>
                ) : (
                  <div className="space-y-3">
                    {components.map((component: any) => {
                      const inMaintenance = component.component_status === 'MAINTENANCE';
                      return (
                        <div key={component.tool_component_id} className={`border rounded-lg p-4 shadow-sm ${inMaintenance ? 'border-yellow-300 bg-yellow-50' : ''}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{component.factory_model || component.component_code || `#${component.tool_component_id}`}</h4>
                                {inMaintenance && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-yellow-200 text-yellow-800 border border-yellow-300">
                                    In Maintenance
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">{component.component_type}</p>
                            </div>
                            {!inMaintenance && (
                              <Badge variant={component.component_status === 'OPERATIONAL' ? 'default' : 'secondary'}>
                                {component.component_status}
                              </Badge>
                            )}
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                            <div><span className="text-gray-500">Code:</span> {component.component_code || component.factory_serie || '—'}</div>
                            <div><span className="text-gray-500">Serial:</span> {component.component_sn || 'N/A'}</div>
                          </div>
                          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                            <div className="bg-gray-50 rounded px-2 py-1">
                              <p className="text-gray-400">Since last maint.</p>
                              <p className="font-semibold">{Number(component.current_maintenance_hours || 0).toFixed(1)} h</p>
                            </div>
                            <div className="bg-gray-50 rounded px-2 py-1">
                              <p className="text-gray-400">Days</p>
                              <p className="font-semibold">{component.current_maintenance_days ?? 0} d</p>
                            </div>
                            <div className="bg-gray-50 rounded px-2 py-1">
                              <p className="text-gray-400">Flights</p>
                              <p className="font-semibold">{component.current_maintenance_flights ?? 0}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="maintenance" className="pt-4">
                {loadingTickets ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
                  </div>
                ) : maintenanceTickets.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 border rounded-lg border-dashed">
                    No maintenance history for this system
                  </div>
                ) : (
                  <div className="space-y-3">
                    {maintenanceTickets.map((ticket: any) => (
                      <div key={ticket.ticket_id} className="border rounded-lg p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-700">#{ticket.ticket_id}</span>
                            <Badge variant={
                              ticket.ticket_status === 'CLOSED' ? 'default' :
                              ticket.ticket_status === 'IN_PROGRESS' ? 'secondary' : 'outline'
                            }>
                              {ticket.ticket_status}
                            </Badge>
                            <Badge variant={
                              ticket.ticket_priority === 'HIGH' ? 'destructive' :
                              ticket.ticket_priority === 'MEDIUM' ? 'secondary' : 'outline'
                            }>
                              {ticket.ticket_priority}
                            </Badge>
                          </div>
                          <span className="text-xs text-gray-400">
                            {new Date(ticket.opened_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div><span className="text-gray-500">Type:</span> {ticket.ticket_type}</div>
                          <div><span className="text-gray-500">Assigned:</span> {ticket.assigner_name || 'Unassigned'}</div>
                          <div>
                            <span className="text-gray-500">Closed:</span>{' '}
                            {ticket.closed_at ? new Date(ticket.closed_at).toLocaleDateString() : '—'}
                          </div>
                        </div>
                        {ticket.note && (
                          <p className="mt-2 text-xs text-gray-600 bg-gray-50 rounded p-2">{ticket.note}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end mt-6">
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}