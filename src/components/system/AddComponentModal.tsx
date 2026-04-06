'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import axios from 'axios';
import { Loader2, Pencil, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ManageComponentTypesModal } from './ManageComponentTypesModal';

interface AddComponentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tools: any[];
  models: any[];
}

const INITIAL_FORM = {
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
  maintenance_cycle: '',
  maintenance_cycle_hour: '',
  maintenance_cycle_day: '',
  maintenance_cycle_flight: '',
};
export interface ComponentType {
  type_id: number;
  type_value: string;
  type_label: string;
}

export default function AddComponentModal({ open, onClose, onSuccess, tools, models }: AddComponentModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [showManageTypes, setShowManageTypes] = useState(false);

  useEffect(() => {
    if (open) setFormData(INITIAL_FORM);
  }, [open]);

   const [types, setTypes] = useState<ComponentType[]>([]);
   const [typesLoading, setTypesLoading] = useState(false);

    const reload = useCallback(async () => {
      setTypesLoading(true);
      try {
        const { data } = await axios.get('/api/system/component-types');
        if (data.code === 1) setTypes(data.data ?? []);
      } catch(err:any) {
        toast.error(err)
      } finally {
        setTypesLoading(false);
      }
    }, []);

    useEffect(() => { reload(); }, [reload]);
  

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleModelSelect = (modelId: string) => {
    const model = models.find(m => String(m.tool_model_id) === modelId);
    setFormData(prev => ({
      ...prev,
      fk_tool_model_id: modelId,
      maintenance_cycle: model?.maintenance_cycle || prev.maintenance_cycle,
      maintenance_cycle_hour: model?.maintenance_cycle_hour != null ? String(model.maintenance_cycle_hour) : prev.maintenance_cycle_hour,
      maintenance_cycle_day: model?.maintenance_cycle_day != null ? String(model.maintenance_cycle_day) : prev.maintenance_cycle_day,
      maintenance_cycle_flight: model?.maintenance_cycle_flight != null ? String(model.maintenance_cycle_flight) : prev.maintenance_cycle_flight,
    }));
  };

  const handleResetMaintenanceToModel = () => {
    const model = models.find(m => String(m.tool_model_id) === formData.fk_tool_model_id);
    if (model) {
      setFormData(prev => ({
        ...prev,
        maintenance_cycle: model.maintenance_cycle || '',
        maintenance_cycle_hour: model.maintenance_cycle_hour != null ? String(model.maintenance_cycle_hour) : '',
        maintenance_cycle_day: model.maintenance_cycle_day != null ? String(model.maintenance_cycle_day) : '',
        maintenance_cycle_flight: model.maintenance_cycle_flight != null ? String(model.maintenance_cycle_flight) : '',
      }));
      toast.info('Maintenance cycle reset to model defaults');
    }
  };

  const handleCycleChange = (value: string) => {
    setFormData(prev => ({ ...prev, maintenance_cycle: value, maintenance_cycle_hour: '', maintenance_cycle_day: '', maintenance_cycle_flight: '' }));
  };

  const handleCycleInput = (field: string, value: string) => {
    if (value === '' || Number(value) >= 0) handleChange(field, value);
  };

  const showHours = formData.maintenance_cycle === 'HOURS' || formData.maintenance_cycle === 'MIXED';
  const showDays = formData.maintenance_cycle === 'DAYS' || formData.maintenance_cycle === 'MIXED';
  const showFlights = formData.maintenance_cycle === 'FLIGHTS' || formData.maintenance_cycle === 'MIXED';
  const showNone = formData.maintenance_cycle === 'NONE';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fk_tool_id) { toast.error('Please select a system'); return; }
    if (!formData.component_type) { toast.error('Please select a component type'); return; }
    if (formData.component_activation_date && formData.component_purchase_date &&
        formData.component_activation_date < formData.component_purchase_date) {
      toast.error('Activation date cannot be before purchase date'); return;
    }

    setLoading(true);
    try {
      const payload = {
        fk_tool_id: Number(formData.fk_tool_id),
        component_type: formData.component_type,
        component_code: formData.component_code || null,
        component_desc: formData.component_desc || null,
        fk_tool_model_id: formData.fk_tool_model_id ? Number(formData.fk_tool_model_id) : null,
        component_sn: formData.component_sn,
        cc_platform: formData.cc_platform || null,
        gcs_type: formData.gcs_type || null,
        component_activation_date: formData.component_activation_date || null,
        component_purchase_date: formData.component_purchase_date || null,
        component_vendor: formData.component_vendor || null,
        component_guarantee_day: formData.component_guarantee_day ? Number(formData.component_guarantee_day) : null,
        component_status: formData.component_status,
        fk_client_id: formData.fk_client_id ? Number(formData.fk_client_id) : null,
        maintenance_cycle: formData.maintenance_cycle || null,
        maintenance_cycle_hour: formData.maintenance_cycle_hour ? Number(formData.maintenance_cycle_hour) : null,
        maintenance_cycle_day: formData.maintenance_cycle_day ? Number(formData.maintenance_cycle_day) : null,
        maintenance_cycle_flight: formData.maintenance_cycle_flight ? Number(formData.maintenance_cycle_flight) : null,
      };

      const response = await axios.post('/api/system/component/add', payload);
      if (response.data.code === 1) {
        toast.success('Component added successfully');
        setFormData(INITIAL_FORM);
        onSuccess();
      } else {
        toast.error(response.data.message || 'Failed to add component');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error adding component');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="!max-w-[900px] w-[90vw] h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Component</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-12 gap-3 overflow-visible">
              <div className="col-span-3 min-w-0">
                <Label className="pb-2">System *</Label>
                <Select value={formData.fk_tool_id} onValueChange={(v) => handleChange('fk_tool_id', v)}>
                  <SelectTrigger className="w-full truncate"><SelectValue placeholder="Select System" /></SelectTrigger>
                  <SelectContent className="z-50 max-h-60 overflow-y-auto">
                    {tools.map((tool: any) => (
                      <SelectItem key={tool.tool_id} value={tool.tool_id.toString()}>{tool.tool_code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-3">
                <div className="flex items-center gap-1.5 pb-2">
                  <Label>Component Type *</Label>
                  <button type="button" onClick={() => setShowManageTypes(true)} className="text-slate-400 hover:text-violet-600 transition-colors" title="Manage types">
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
                <Select value={formData.component_type} onValueChange={(v) => handleChange('component_type', v)} disabled={typesLoading}>
                  <SelectTrigger>
                    {typesLoading ? (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...
                      </span>
                    ) : (
                      <SelectValue placeholder="Select type" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((t) => (
                      <SelectItem key={t.type_id} value={t.type_value}>{t.type_label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-3">
                <Label className="pb-2">Code</Label>
                <Input value={formData.component_code} onChange={(e) => handleChange('component_code', e.target.value)} placeholder="e.g. BATT-01" />
              </div>
              <div className="col-span-3">
                <Label className="pb-2">Serial Number</Label>
                <Input value={formData.component_sn} onChange={(e) => handleChange('component_sn', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-3 overflow-visible">
              <div className="col-span-3 min-w-0">
                <Label className="pb-2">Brand / Model</Label>
                <Select value={formData.fk_tool_model_id} onValueChange={handleModelSelect}>
                  <SelectTrigger className="w-full truncate"><SelectValue placeholder="Select Model" /></SelectTrigger>
                  <SelectContent>
                    {models.map((m: any) => (
                      <SelectItem key={m.tool_model_id} value={m.tool_model_id.toString()}>{m.factory_model} - {m.factory_type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-9">
                <Label className="pb-2">Description</Label>
                <Input value={formData.component_desc} onChange={(e) => handleChange('component_desc', e.target.value)} placeholder="Component description" />
              </div>
            </div>

            {formData.component_type === 'DRONE' && (
              <div className="grid grid-cols-12 gap-3 overflow-visible">
                <div className="col-span-3">
                  <Label className="pb-2">C2 Platform</Label>
                  <Select value={formData.cc_platform} onValueChange={(v) => handleChange('cc_platform', v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_FLYTBASE">Flytbase</SelectItem>
                      <SelectItem value="_VOTIX">Votix</SelectItem>
                      <SelectItem value="_FLIGHTHUB">DJI FlightHub</SelectItem>
                      <SelectItem value="_APP">APP on GCS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Label className="pb-2">GCS</Label>
                  <Select value={formData.gcs_type} onValueChange={(v) => handleChange('gcs_type', v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_DOCK">Docking Station</SelectItem>
                      <SelectItem value="_RC">Remote Control</SelectItem>
                      <SelectItem value="_GCS">Ground Control Station</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Maintenance Cycle</p>
                {formData.fk_tool_model_id && (
                  <button type="button" onClick={handleResetMaintenanceToModel} className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-500 transition-colors">
                    <RotateCcw className="h-3 w-3" /> Reset to model defaults
                  </button>
                )}
              </div>
              <div className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-3">
                  <Label className="pb-2">Cycle Type</Label>
                  <Select value={formData.maintenance_cycle} onValueChange={handleCycleChange}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HOURS">Hours</SelectItem>
                      <SelectItem value="DAYS">Days</SelectItem>
                      <SelectItem value="FLIGHTS">Flights</SelectItem>
                      <SelectItem value="MIXED">Mixed</SelectItem>
                      <SelectItem value="NONE">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {showNone && (
                  <div className="col-span-9 flex items-end">
                    <span className="inline-flex items-center px-3 py-2 rounded-md bg-muted text-muted-foreground text-sm">No maintenance cycle required</span>
                  </div>
                )}
                {showHours && (
                  <div className="col-span-2">
                    <Label className="pb-2">Hours Limit</Label>
                    <Input type="number" min={0} value={formData.maintenance_cycle_hour} onChange={(e) => handleCycleInput('maintenance_cycle_hour', e.target.value)} />
                  </div>
                )}
                {showDays && (
                  <div className="col-span-2">
                    <Label className="pb-2">Day Limit</Label>
                    <Input type="number" min={0} value={formData.maintenance_cycle_day} onChange={(e) => handleCycleInput('maintenance_cycle_day', e.target.value)} />
                  </div>
                )}
                {showFlights && (
                  <div className="col-span-2">
                    <Label className="pb-2">Flights Limit</Label>
                    <Input type="number" min={0} value={formData.maintenance_cycle_flight} onChange={(e) => handleCycleInput('maintenance_cycle_flight', e.target.value)} />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-12 gap-3 overflow-visible">
              <div className="col-span-3">
                <Label className="pb-2">Activation Date</Label>
                <Input type="date" value={formData.component_activation_date} onChange={(e) => handleChange('component_activation_date', e.target.value)} />
              </div>
              <div className="col-span-3">
                <Label className="pb-2">Purchase Date</Label>
                <Input type="date" value={formData.component_purchase_date} onChange={(e) => handleChange('component_purchase_date', e.target.value)} />
              </div>
              <div className="col-span-3">
                <Label className="pb-2">Vendor</Label>
                <Input value={formData.component_vendor} onChange={(e) => handleChange('component_vendor', e.target.value)} />
              </div>
              <div className="col-span-3">
                <Label className="pb-2">Guarantee (days)</Label>
                <Input type="number" value={formData.component_guarantee_day} onChange={(e) => handleChange('component_guarantee_day', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-3 overflow-visible">
              <div className="col-span-3">
                <Label className="pb-2">Status *</Label>
                <Select value={formData.component_status} onValueChange={(v) => handleChange('component_status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPERATIONAL">Operational</SelectItem>
                    <SelectItem value="NOT_OPERATIONAL">Not Operational</SelectItem>
                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                    <SelectItem value="DECOMMISSIONED">Decommissioned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" className="bg-violet-600 hover:bg-violet-700" disabled={loading}>{loading ? 'Adding...' : 'Add Component'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ManageComponentTypesModal
        open={showManageTypes}
        onClose={() => setShowManageTypes(false)}
        types={types}
        onReload={reload}
        isDark={false}
      />
    </>
  );
}
