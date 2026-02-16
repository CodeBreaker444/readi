'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';

interface ViewToolModalProps {
  open: boolean;
  toolId: number;
  onClose: () => void;
}

export default function ViewToolModal({ open, toolId, onClose }: ViewToolModalProps) {
  const [loading, setLoading] = useState(false);
  const [toolData, setToolData] = useState<any>(null);
  const [components, setComponents] = useState([]);

  useEffect(() => {
    if (open && toolId) {
      fetchToolDetails();
      fetchComponents();
    }
  }, [open, toolId]);

  const fetchToolDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/system/tool/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const result = await response.json();
      if (result.code === 1) {
        const tool = result.data.find((t: any) => t.tool_id === toolId);
        setToolData(tool);
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
      const response = await fetch('/api/system/tool/component/list', {
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

  if (loading || !toolData) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tool Details - {toolData.tool_code}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General Info</TabsTrigger>
            <TabsTrigger value="specifications">Specifications</TabsTrigger>
            <TabsTrigger value="components">Components</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Tool Code</p>
                <p className="text-base">{toolData.tool_code}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Serial Number</p>
                <p className="text-base">{toolData.tool_serialnumber || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Model</p>
                <p className="text-base">{toolData.factory_model || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Manufacturer</p>
                <p className="text-base">{toolData.factory_type || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <Badge variant={toolData.tool_status === 'OPERATIONAL' ? 'default' : 'secondary'}>
                  {toolData.tool_status}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Active</p>
                <Badge variant={toolData.active === 'Y' ? 'default' : 'destructive'}>
                  {toolData.active === 'Y' ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Client</p>
                <p className="text-base">{toolData.client_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Purchase Date</p>
                <p className="text-base">{toolData.tool_purchase_date || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-medium text-gray-500">Description</p>
                <p className="text-base">{toolData.tool_desc || 'N/A'}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-3">Flight Statistics</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Missions</p>
                  <p className="text-2xl font-bold">{toolData.tot_mission ?? 0}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Flight Time</p>
                  <p className="text-2xl font-bold">{Math.round((toolData.tot_flown_time || 0) / 60)} min</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Distance</p>
                  <p className="text-2xl font-bold">{((toolData.tot_flown_meter || 0) / 1000).toFixed(2)} km</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="specifications" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Vendor</p>
                <p className="text-base">{toolData.tool_vendor || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">GCS Type</p>
                <p className="text-base">{toolData.tool_gcs_type || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Streaming Type</p>
                <p className="text-base">{toolData.tool_streaming_type || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">C2 Platform</p>
                <p className="text-base">{toolData.tool_ccPlatform || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Latitude</p>
                <p className="text-base">{toolData.tool_latitude || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Longitude</p>
                <p className="text-base">{toolData.tool_longitude || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Guarantee Days</p>
                <p className="text-base">{toolData.tool_guarantee_day || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-medium text-gray-500">Streaming URL</p>
                <p className="text-base break-all">{toolData.tool_streaming_url || 'N/A'}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="components">
            {components.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No components found for this tool
              </div>
            ) : (
              <div className="space-y-3">
                {components.map((component: any) => (
                  <div key={component.tool_component_id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{component.factory_model}</h4>
                        <p className="text-sm text-gray-500">{component.component_type}</p>
                      </div>
                      <Badge variant={component.component_status === 'OPERATIONAL' ? 'default' : 'secondary'}>
                        {component.component_status}
                      </Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Code:</span> {component.factory_serie}
                      </div>
                      <div>
                        <span className="text-gray-500">Serial:</span> {component.component_sn || 'N/A'}
                      </div>
                      <div>
                        <span className="text-gray-500">Usage:</span> {component.component_cycles || 0} / {component.component_total_cycles || 'N/A'} hrs
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}