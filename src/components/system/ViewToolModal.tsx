'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect, useState } from 'react';
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
    }
  };

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
          <DialogTitle>
            {loading ? <Skeleton className="h-6 w-48" /> : `System Details - ${toolData?.tool_code || 'Loading...'}`}
          </DialogTitle>
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
                    <Badge variant={toolData?.tool_status === 'OPERATIONAL' ? 'default' : 'secondary'}>
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
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Total Missions</p>
                      <p className="text-2xl font-bold">{toolData?.tot_mission ?? 0}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Flight Time</p>
                      <p className="text-2xl font-bold">{Math.round((toolData?.tot_flown_time || 0) / 60)} min</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Distance</p>
                      <p className="text-2xl font-bold">{((toolData?.tot_flown_meter || 0) / 1000).toFixed(2)} km</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="specifications" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">GCS Type</p>
                    <p className="text-base">{toolData?.tool_gcs_type || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">C2 Platform</p>
                    <p className="text-base">{toolData?.tool_ccPlatform || 'N/A'}</p>
                  </div>
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
                          <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                            <div><span className="text-gray-500">Code:</span> {component.component_code || component.factory_serie || '—'}</div>
                            <div><span className="text-gray-500">Serial:</span> {component.component_sn || 'N/A'}</div>
                            <div><span className="text-gray-500">Usage:</span> {component.component_cycles || 0} hrs</div>
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