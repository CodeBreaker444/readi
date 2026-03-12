'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/components/useTheme';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Skeleton } from '../ui/skeleton';

interface EditComponentModalProps {
  open: boolean;
  toolId: number | null;
  onClose: () => void;
  onSuccess: () => void;
  models: any[];
  clients: any[];
  initialComponentId?: number | null;
}

const EMPTY_FORM = {
  fk_tool_id: '',
  component_type: '',
  component_code: '',
  component_desc: '',
  fk_tool_model_id: '',
  component_sn: '',
  cc_platform: '',
  gcs_type: '',
  component_activation_date: '',
  component_purchase_date: '',
  component_vendor: '',
  component_guarantee_day: '',
  component_status: 'OPERATIONAL',
  fk_client_id: '',
};

export default function EditComponentModal({
  open, toolId, onClose, onSuccess, models, clients, initialComponentId,
}: EditComponentModalProps) {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [components, setComponents] = useState<any[]>([]);
  const [selectedComponentId, setSelectedComponentId] = useState<string>('');
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    if (open) {
      if (initialComponentId) {
        fetchAllComponentsAndSelect(initialComponentId);
      } else if (toolId) {
        fetchComponents();
      } else {
        setComponents([]);
        setSelectedComponentId('');
        setFormData(EMPTY_FORM);
      }
    } else {
      setComponents([]);
      setSelectedComponentId('');
      setFormData(EMPTY_FORM);
    }
  }, [open, toolId, initialComponentId]);

  const fetchAllComponentsAndSelect = async (componentId: number) => {
    setFetching(true);
    try {
      const res = await fetch('/api/system/component/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const result = await res.json();
      if (result.code === 1) {
        const allComps: any[] = result.data || [];
        setComponents(allComps);
        const comp = allComps.find(c => c.tool_component_id === componentId);
        if (comp) {
          setSelectedComponentId(String(componentId));
          setFormData({
            fk_tool_id: String(comp.fk_tool_id || ''),
            component_type: comp.component_type || '',
            component_code: comp.component_code || '',
            component_desc: comp.component_desc || '',
            fk_tool_model_id: comp.fk_tool_model_id ? String(comp.fk_tool_model_id) : '',
            component_sn: comp.component_sn || '',
            cc_platform: comp.cc_platform || '',
            gcs_type: comp.gcs_type || '',
            component_activation_date: comp.component_activation_date?.split('T')[0] || '',
            component_purchase_date: comp.component_purchase_date?.split('T')[0] || '',
            component_vendor: comp.component_vendor || '',
            component_guarantee_day: comp.component_guarantee_day ? String(comp.component_guarantee_day) : '',
            component_status: comp.component_status || 'OPERATIONAL',
            fk_client_id: comp.fk_client_id ? String(comp.fk_client_id) : '',
          });
        }
      }
    } catch {
      toast.error('Error loading component');
    } finally {
      setFetching(false);
    }
  };

  const fetchComponents = async () => {
    setFetching(true);
    try {
      const res = await fetch('/api/system/component/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_id: toolId }),
      });
      const result = await res.json();
      if (result.code === 1) {
        setComponents(result.data || []);
      }
    } catch {
      toast.error('Error loading components');
    } finally {
      setFetching(false);
    }
  };

  const handleComponentSelect = (componentId: string) => {
    setSelectedComponentId(componentId);
    const comp = components.find(c => String(c.tool_component_id) === componentId);
    if (comp) {
      setFormData({
        fk_tool_id: String(comp.fk_tool_id || toolId || ''),
        component_type: comp.component_type || '',
        component_code: comp.component_code || '',
        component_desc: comp.component_desc || '',
        fk_tool_model_id: comp.fk_tool_model_id ? String(comp.fk_tool_model_id) : '',
        component_sn: comp.component_sn || '',
        cc_platform: comp.cc_platform || '',
        gcs_type: comp.gcs_type || '',
        component_activation_date: comp.component_activation_date?.split('T')[0] || '',
        component_purchase_date: comp.component_purchase_date?.split('T')[0] || '',
        component_vendor: comp.component_vendor || '',
        component_guarantee_day: comp.component_guarantee_day ? String(comp.component_guarantee_day) : '',
        component_status: comp.component_status || 'OPERATIONAL',
        fk_client_id: comp.fk_client_id ? String(comp.fk_client_id) : '',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComponentId) { toast.error('Please select a component'); return; }
    setLoading(true);
    try {
      const payload = {
        fk_tool_id: Number(formData.fk_tool_id),
        component_type: formData.component_type,
        component_code: formData.component_code || null,
        component_desc: formData.component_desc || null,
        fk_tool_model_id: formData.fk_tool_model_id ? Number(formData.fk_tool_model_id) : null,
        component_sn: formData.component_sn || null,
        cc_platform: formData.cc_platform || null,
        gcs_type: formData.gcs_type || null,
        component_activation_date: formData.component_activation_date || null,
        component_purchase_date: formData.component_purchase_date || null,
        component_vendor: formData.component_vendor || null,
        component_guarantee_day: formData.component_guarantee_day ? Number(formData.component_guarantee_day) : null,
        component_status: formData.component_status,
        fk_client_id: formData.fk_client_id ? Number(formData.fk_client_id) : null,
      };

      const res = await fetch(`/api/system/component/${selectedComponentId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.code === 1) {
        toast.success('Component updated successfully');
        onSuccess();
      } else {
        toast.error(result.message || 'Failed to update component');
      }
    } catch {
      toast.error('Error updating component');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const inputCls = isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : '';
  const selectTriggerCls = isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : '';
  const selectContentCls = isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : '';
  const labelCls = `pb-2 text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-600'}`;
  const sectionLabelCls = `text-sm font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-muted-foreground'}`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`!max-w-[900px] w-[90vw] max-h-[90vh] overflow-y-auto ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}>
        <DialogHeader className={`border-b pb-3 ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
          <DialogTitle className={isDark ? 'text-white' : ''}>Edit Component</DialogTitle>
        </DialogHeader>

        {fetching ? (
         <div className="space-y-6 py-4">
        <div className="space-y-2">
          <Skeleton className={`h-4 w-40 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
          <Skeleton className={`h-10 w-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
        </div>

        <div className="grid grid-cols-12 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="col-span-3 space-y-2">
              <Skeleton className={`h-4 w-20 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
              <Skeleton className={`h-10 w-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Skeleton className={`h-4 w-24 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
          <Skeleton className={`h-10 w-3/4 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
        </div>

        <div className="grid grid-cols-12 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="col-span-3 space-y-2">
              <Skeleton className={`h-4 w-20 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
              <Skeleton className={`h-10 w-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-transparent">
          <Skeleton className={`h-10 w-24 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
          <Skeleton className={`h-10 w-32 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
        </div>
      </div>
        ) : components.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">
            No components found for this system.
            <div className="mt-4">
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <p className={sectionLabelCls}>Select Component to Edit</p>
              <Select value={selectedComponentId} onValueChange={handleComponentSelect}>
                <SelectTrigger className={selectTriggerCls}>
                  <SelectValue placeholder="Select a component..." />
                </SelectTrigger>
                <SelectContent className={selectContentCls}>
                  {components.map(c => (
                    <SelectItem key={c.tool_component_id} value={String(c.tool_component_id)}>
                      {c.component_type} — {c.component_code || c.component_sn || `#${c.tool_component_id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedComponentId && (
              <>
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-3">
                    <Label className={labelCls}>Component Type *</Label>
                    <Select value={formData.component_type} onValueChange={v => handleChange('component_type', v)}>
                      <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent className={selectContentCls}>
                        <SelectItem value="BATTERY">Battery</SelectItem>
                        <SelectItem value="PROPELLER">Propeller</SelectItem>
                        <SelectItem value="CAMERA">Camera</SelectItem>
                        <SelectItem value="GIMBAL">Gimbal</SelectItem>
                        <SelectItem value="GPS">GPS</SelectItem>
                        <SelectItem value="CONTROLLER">Controller</SelectItem>
                        <SelectItem value="SENSOR">Sensor</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Label className={labelCls}>Code</Label>
                    <Input className={inputCls} value={formData.component_code} onChange={e => handleChange('component_code', e.target.value)} />
                  </div>
                  <div className="col-span-3">
                    <Label className={labelCls}>Serial Number</Label>
                    <Input className={inputCls} value={formData.component_sn} onChange={e => handleChange('component_sn', e.target.value)} />
                  </div>
                  <div className="col-span-3">
                    <Label className={labelCls}>Brand / Model</Label>
                    <Select value={formData.fk_tool_model_id} onValueChange={v => handleChange('fk_tool_model_id', v)}>
                      <SelectTrigger className={`w-full truncate ${selectTriggerCls}`}><SelectValue placeholder="Select Model" /></SelectTrigger>
                      <SelectContent className={selectContentCls}>
                        {models.map((m: any) => (
                          <SelectItem key={m.tool_model_id} value={m.tool_model_id.toString()}>
                            {m.factory_model} - {m.factory_type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-9">
                    <Label className={labelCls}>Description</Label>
                    <Input className={inputCls} value={formData.component_desc} onChange={e => handleChange('component_desc', e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-3">
                    <Label className={labelCls}>C2 Platform</Label>
                    <Select value={formData.cc_platform} onValueChange={v => handleChange('cc_platform', v)}>
                      <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className={selectContentCls}>
                        <SelectItem value="_FLYTBASE">Flytbase</SelectItem>
                        <SelectItem value="_VOTIX">Votix</SelectItem>
                        <SelectItem value="_FLIGHTHUB">DJI FlightHub</SelectItem>
                        <SelectItem value="_APP">APP on GCS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Label className={labelCls}>GCS</Label>
                    <Select value={formData.gcs_type} onValueChange={v => handleChange('gcs_type', v)}>
                      <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className={selectContentCls}>
                        <SelectItem value="_DOCK">Docking Station</SelectItem>
                        <SelectItem value="_RC">Remote Control</SelectItem>
                        <SelectItem value="_GCS">Ground Control Station</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Label className={labelCls}>Status *</Label>
                    <Select value={formData.component_status} onValueChange={v => handleChange('component_status', v)}>
                      <SelectTrigger className={selectTriggerCls}><SelectValue /></SelectTrigger>
                      <SelectContent className={selectContentCls}>
                        <SelectItem value="OPERATIONAL">Operational</SelectItem>
                        <SelectItem value="NOT_OPERATIONAL">Not Operational</SelectItem>
                        <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                        <SelectItem value="DECOMMISSIONED">Decommissioned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Label className={labelCls}>Client</Label>
                    <Select value={formData.fk_client_id} onValueChange={v => handleChange('fk_client_id', v)}>
                      <SelectTrigger className={`w-full truncate ${selectTriggerCls}`}><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className={selectContentCls}>
                        <SelectItem value="0">None</SelectItem>
                        {clients.map((c: any) => (
                          <SelectItem key={c.client_id} value={c.client_id.toString()}>{c.client_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-3">
                    <Label className={labelCls}>Activation Date</Label>
                    <Input type="date" className={inputCls} value={formData.component_activation_date} onChange={e => handleChange('component_activation_date', e.target.value)} />
                  </div>
                  <div className="col-span-3">
                    <Label className={labelCls}>Purchase Date</Label>
                    <Input type="date" className={inputCls} value={formData.component_purchase_date} onChange={e => handleChange('component_purchase_date', e.target.value)} />
                  </div>
                  <div className="col-span-3">
                    <Label className={labelCls}>Vendor</Label>
                    <Input className={inputCls} value={formData.component_vendor} onChange={e => handleChange('component_vendor', e.target.value)} />
                  </div>
                  <div className="col-span-3">
                    <Label className={labelCls}>Guarantee (days)</Label>
                    <Input type="number" className={inputCls} value={formData.component_guarantee_day} onChange={e => handleChange('component_guarantee_day', e.target.value)} />
                  </div>
                </div>
              </>
            )}

            <div className={`flex justify-end gap-2 pt-2 border-t ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
              <Button type="button" variant="outline" onClick={onClose}
                className={isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}>Cancel</Button>
              {selectedComponentId && (
                <Button type="submit" disabled={loading} className="bg-violet-600 hover:bg-violet-500 text-white">
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              )}
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
