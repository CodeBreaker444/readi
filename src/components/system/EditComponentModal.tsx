'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/components/useTheme';
import axios from 'axios';
import { Loader2, Pencil, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Skeleton } from '../ui/skeleton';
import { ManageComponentTypesModal } from './ManageComponentTypesModal';

function SystemOptionLabel({ tool }: { tool: any }) {
  const statusColors: Record<string, string> = {
    OPERATIONAL: 'bg-green-100 text-green-700',
    MAINTENANCE: 'bg-yellow-100 text-yellow-700',
    NOT_OPERATIONAL: 'bg-red-100 text-red-700',
  };
  const statusClass = statusColors[tool.tool_status] || 'bg-gray-100 text-gray-600';
  return (
    <div className="flex flex-col gap-0.5 leading-tight">
      <div className="flex gap-2">
        <span className="w-20 shrink-0 text-[10px] font-semibold uppercase text-muted-foreground">Code</span>
        <span className="truncate text-[11px] font-medium">{tool.tool_code}</span>
      </div>
      <div className="flex gap-2">
        <span className="w-20 shrink-0 text-[10px] font-semibold uppercase text-muted-foreground">Description</span>
        <span className="truncate text-[11px]">{tool.tool_desc || '—'}</span>
      </div>
      <div className="flex gap-2 items-center">
        <span className="w-20 shrink-0 text-[10px] font-semibold uppercase text-muted-foreground">Status</span>
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusClass}`}>{tool.tool_status || '—'}</span>
      </div>
    </div>
  );
}

function ComponentOptionLabel({ comp }: { comp: any }) {
  return (
    <div className="flex flex-col gap-0.5 leading-tight">
      <div className="flex gap-2">
        <span className="w-20 shrink-0 text-[10px] font-semibold uppercase text-muted-foreground">Code</span>
        <span className="truncate text-[11px] font-medium">{comp.component_code || '—'}</span>
      </div>
      <div className="flex gap-2">
        <span className="w-20 shrink-0 text-[10px] font-semibold uppercase text-muted-foreground">S/N</span>
        <span className="truncate font-mono text-[11px]">{comp.component_sn || '—'}</span>
      </div>
      <div className="flex gap-2">
        <span className="w-20 shrink-0 text-[10px] font-semibold uppercase text-muted-foreground">Description</span>
        <span className="truncate text-[11px]">{comp.component_desc || '—'}</span>
      </div>
    </div>
  );
}

interface EditComponentModalProps {
  open: boolean;
  toolId: number | null;
  onClose: () => void;
  onSuccess: () => void;
  models: any[];
  clients: any[];
  tools: any[];
  initialComponentId?: number | null;
}

const EMPTY_FORM = {
  fk_tool_id: '',
  component_type: '',
  component_name: '',
  component_code: '',
  component_desc: '',
  fk_tool_model_id: '',
  component_sn: '',
  cc_platform: '',
  gcs_type: '',
  dcc_drone_id: '',
  component_activation_date: '',
  component_purchase_date: '',
  component_vendor: '',
  component_guarantee_day: '',
  component_status: 'OPERATIONAL',
  maintenance_cycle: '',
  maintenance_cycle_hour: '',
  maintenance_cycle_day: '',
  maintenance_cycle_flight: '',
  battery_cycle_ratio: '',
};
interface ComponentType {
  type_id: number;
  type_value: string;
  type_label: string;
}
export default function EditComponentModal({
  open, toolId, onClose, onSuccess, models, clients, tools, initialComponentId,
}: EditComponentModalProps) {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [components, setComponents] = useState<any[]>([]);
  const [selectedComponentId, setSelectedComponentId] = useState<string>('');
  const [showManageTypes, setShowManageTypes] = useState(false);
  
    const [formData, setFormData] = useState(EMPTY_FORM);

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

  const populateForm = (comp: any) => {
    setFormData({
      fk_tool_id: String(comp.fk_tool_id || ''),
      component_type: comp.component_type || '',
      component_name: comp.component_name || '',
      component_code: comp.component_code || '',
      component_desc: comp.component_desc || '',
      fk_tool_model_id: comp.fk_tool_model_id ? String(comp.fk_tool_model_id) : '',
      component_sn: comp.component_sn || '',
      cc_platform: comp.cc_platform || '',
      gcs_type: comp.gcs_type || '',
      dcc_drone_id: comp.dcc_drone_id || '',
      component_activation_date: comp.component_activation_date?.split('T')[0] || '',
      component_purchase_date: comp.component_purchase_date?.split('T')[0] || '',
      component_vendor: comp.component_vendor || '',
      component_guarantee_day: comp.component_guarantee_day ? String(comp.component_guarantee_day) : '',
      component_status: comp.component_status || 'OPERATIONAL',
      maintenance_cycle: comp.maintenance_cycle || '',
      maintenance_cycle_hour: comp.maintenance_cycle_hour != null && comp.maintenance_cycle_hour !== '' ? String(comp.maintenance_cycle_hour) : '',
      maintenance_cycle_day: comp.maintenance_cycle_day != null && comp.maintenance_cycle_day !== '' ? String(comp.maintenance_cycle_day) : '',
      maintenance_cycle_flight: comp.maintenance_cycle_flight != null && comp.maintenance_cycle_flight !== '' ? String(comp.maintenance_cycle_flight) : '',
      battery_cycle_ratio: comp.battery_cycle_ratio != null ? String(comp.battery_cycle_ratio) : '',
    });
  };

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
          populateForm(comp);
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
    if (comp) populateForm(comp);
  };

  const handleChange = (field: string, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const handleModelSelect = (modelId: string) => {
    handleChange('fk_tool_model_id', modelId);
    const model = models.find(m => String(m.tool_model_id) === modelId);
    if (model) {
      setFormData(prev => ({
        ...prev,
        fk_tool_model_id: modelId,
        maintenance_cycle: model.maintenance_cycle || '',
        maintenance_cycle_hour: model.maintenance_cycle_hour != null ? String(model.maintenance_cycle_hour) : '',
        maintenance_cycle_day: model.maintenance_cycle_day != null ? String(model.maintenance_cycle_day) : '',
        maintenance_cycle_flight: model.maintenance_cycle_flight != null ? String(model.maintenance_cycle_flight) : '',
      }));
    }
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
    setFormData(prev => ({
      ...prev,
      maintenance_cycle: value,
      maintenance_cycle_hour: '',
      maintenance_cycle_day: '',
      maintenance_cycle_flight: '',
    }));
  };

  const handleCycleInput = (field: string, value: string ) => {
    const num = Number(value);
    if (value === '' || num >= 0) handleChange(field, value);
  };

  const showHours = formData.maintenance_cycle === 'HOURS' || formData.maintenance_cycle === 'MIXED';
  const showDays = formData.maintenance_cycle === 'DAYS' || formData.maintenance_cycle === 'MIXED';
  const showFlights = formData.maintenance_cycle === 'FLIGHTS' || formData.maintenance_cycle === 'MIXED';
  const showNone = formData.maintenance_cycle === 'NONE';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComponentId) { toast.error('Please select a component'); return; }
    setLoading(true);
    try {
      const payload = {
        fk_tool_id: Number(formData.fk_tool_id),
        component_type: formData.component_type,
        component_name: formData.component_name || null,
        component_code: formData.component_code || null,
        component_desc: formData.component_desc || null,
        fk_tool_model_id: formData.fk_tool_model_id ? Number(formData.fk_tool_model_id) : null,
        component_sn: formData.component_sn || null,
        cc_platform: formData.cc_platform || null,
        gcs_type: formData.gcs_type || null,
        dcc_drone_id: formData.dcc_drone_id || null,
        component_activation_date: formData.component_activation_date || null,
        component_purchase_date: formData.component_purchase_date || null,
        component_vendor: formData.component_vendor || null,
        component_guarantee_day: formData.component_guarantee_day ? Number(formData.component_guarantee_day) : null,
        component_status: formData.component_status,
        maintenance_cycle: formData.maintenance_cycle || null,
        maintenance_cycle_hour: formData.maintenance_cycle_hour ? Number(formData.maintenance_cycle_hour) : null,
        maintenance_cycle_day: formData.maintenance_cycle_day ? Number(formData.maintenance_cycle_day) : null,
        maintenance_cycle_flight: formData.maintenance_cycle_flight ? Number(formData.maintenance_cycle_flight) : null,
        battery_cycle_ratio: formData.battery_cycle_ratio ? Number(formData.battery_cycle_ratio) : null,
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

  const inputCls = isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : '';
  const selectTriggerCls = isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : '';
  const selectContentCls = isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : '';
  const labelCls = `pb-2 text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-600'}`;
  const sectionLabelCls = `text-sm font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-muted-foreground'}`;

  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`!max-w-[900px] w-[90vw] h-[90vh] overflow-y-auto ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}>
        <DialogHeader className={`border-b pb-3 ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
          <DialogTitle className={isDark ? 'text-white' : ''}>Edit Component</DialogTitle>
        </DialogHeader>

        {fetching ? (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Skeleton className={`h-4 w-40 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
              <Skeleton className={`h-10 w-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="col-span-1 sm:col-span-3 space-y-2">
                  <Skeleton className={`h-4 w-20 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                  <Skeleton className={`h-10 w-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Skeleton className={`h-4 w-24 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
              <Skeleton className={`h-10 w-3/4 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="col-span-1 sm:col-span-3 space-y-2">
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
                      <ComponentOptionLabel comp={c} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedComponentId && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="col-span-1 sm:col-span-3 min-w-0">
                    <Label className={labelCls}>System</Label>
                    <Select value={formData.fk_tool_id} onValueChange={v => handleChange('fk_tool_id', v)}>
                      <SelectTrigger className={`w-full truncate ${selectTriggerCls}`}>
                        <SelectValue placeholder="Select System">
                          {formData.fk_tool_id
                            ? (() => { const t = tools.find((x: any) => String(x.tool_id) === formData.fk_tool_id); return t ? <span className="block w-full truncate text-left">{t.tool_code}</span> : null; })()
                            : null}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className={`z-50 max-h-60 overflow-y-auto ${selectContentCls}`}>
                        {tools.map((tool: any) => (
                          <SelectItem key={tool.tool_id} value={tool.tool_id.toString()}>
                            <SystemOptionLabel tool={tool} />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 sm:col-span-3">
                    <div className="flex items-center gap-1.5 pb-2">
                      <Label className={labelCls.replace(' pb-2', '')}>Component Type *</Label>
                      <button type="button" onClick={() => setShowManageTypes(true)} className="text-slate-400 hover:text-violet-600 transition-colors" title="Manage types">
                        <Pencil className="h-3 w-3" />
                      </button>
                    </div>
                    <Select value={formData.component_type} onValueChange={v => handleChange('component_type', v)} disabled={typesLoading}>
                      <SelectTrigger className={selectTriggerCls}>
                        {typesLoading ? (
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...
                          </span>
                        ) : (
                          <SelectValue placeholder="Select type" />
                        )}
                      </SelectTrigger>
                      <SelectContent className={selectContentCls}>
                        {types.map((t) => (
                          <SelectItem key={t.type_id} value={t.type_value}>{t.type_label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 sm:col-span-3">
                    <Label className={labelCls}>Code</Label>
                    <Input className={inputCls} value={formData.component_code} onChange={e => handleChange('component_code', e.target.value)} placeholder="e.g. BATT-01" />
                  </div>
                  <div className="col-span-1 sm:col-span-3">
                    <Label className={labelCls}>Serial Number</Label>
                    <Input className={inputCls} value={formData.component_sn} onChange={e => handleChange('component_sn', e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="col-span-1 sm:col-span-4">
                    <Label className={labelCls}>Name</Label>
                    <Input className={inputCls} value={formData.component_name} onChange={e => handleChange('component_name', e.target.value)} placeholder="Component name" />
                  </div>
                  <div className="col-span-1 sm:col-span-4 min-w-0">
                    <Label className={labelCls}>Brand / Model</Label>
                    <Select value={formData.fk_tool_model_id} onValueChange={handleModelSelect}>
                      <SelectTrigger className={`h-14 min-h-10 py-2 items-start ${selectTriggerCls}`}>
                        <SelectValue placeholder="Select Model" />
                      </SelectTrigger>
                      <SelectContent className={selectContentCls}>
                        {models.map((m: any) => (
                          <SelectItem key={m.tool_model_id} value={m.tool_model_id.toString()}>
                            {m.factory_model} — {m.factory_type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 sm:col-span-4">
                    <Label className={labelCls}>Description</Label>
                    <Input className={inputCls} value={formData.component_desc} onChange={e => handleChange('component_desc', e.target.value)} placeholder="Component description" />
                  </div>
                </div>

                {formData.component_type === 'DRONE' && (
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="col-span-1 sm:col-span-3">
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
                    <div className="col-span-1 sm:col-span-3">
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
                    <div className="col-span-1 sm:col-span-6">
                      <Label className={labelCls}>DCC Drone ID (UUID)</Label>
                      <Input
                        className={inputCls}
                        value={formData.dcc_drone_id}
                        onChange={e => handleChange('dcc_drone_id', e.target.value)}
                        placeholder="e.g. e47c7fa4-f6c7-4bc2-9d55-84ad69bf2a95"
                      />
                    </div>
                  </div>
                )}

                {/* Maintenance Cycle */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className={sectionLabelCls}>Maintenance Cycle</p>
                    {formData.fk_tool_model_id && (
                      <button
                        type="button"
                        onClick={handleResetMaintenanceToModel}
                        className={`inline-flex items-center gap-1 text-xs transition-colors ${isDark ? 'text-violet-400 hover:text-violet-300' : 'text-violet-600 hover:text-violet-500'}`}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reset to model defaults
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="col-span-1 sm:col-span-3">
                      <Label className={labelCls}>Cycle Type</Label>
                      <Select value={formData.maintenance_cycle} onValueChange={handleCycleChange}>
                        <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent className={selectContentCls}>
                          <SelectItem value="HOURS">Hours</SelectItem>
                          <SelectItem value="DAYS">Days</SelectItem>
                          <SelectItem value="FLIGHTS">Flights</SelectItem>
                          <SelectItem value="MIXED">Mixed</SelectItem>
                          <SelectItem value="NONE">None</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {showNone && (
                      <div className="col-span-1 sm:col-span-9 flex items-end">
                        <span className={`inline-flex items-center px-3 py-2 rounded-md text-sm ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-muted text-muted-foreground'}`}>
                          No maintenance cycle required
                        </span>
                      </div>
                    )}
                    {showHours && (
                      <div className="col-span-1 sm:col-span-2">
                        <Label className={labelCls}>Hours Limit</Label>
                        <Input type="number" min={0} className={inputCls} value={formData.maintenance_cycle_hour}
                          onChange={e => handleCycleInput('maintenance_cycle_hour', e.target.value)}  />
                      </div>
                    )}
                    {showDays && (
                      <div className="col-span-1 sm:col-span-2">
                        <Label className={labelCls}>Days Limit</Label>
                        <Input type="number" min={0} className={inputCls} value={formData.maintenance_cycle_day}
                          onChange={e => handleCycleInput('maintenance_cycle_day', e.target.value)}  />
                      </div>
                    )}
                    {showFlights && (
                      <div className="col-span-1 sm:col-span-4 flex items-end gap-2">
                        <div className="flex-1 min-w-0">
                          <Label className={labelCls}>Flights Limit</Label>
                          <Input type="number" min={0} className={inputCls} value={formData.maintenance_cycle_flight}
                            onChange={e => handleCycleInput('maintenance_cycle_flight', e.target.value)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Label className={labelCls}>Cycle Ratio</Label>
                          <Input
                            type="number"
                            min={0.01}
                            max={1}
                            step={0.01}
                            placeholder="e.g. 0.87"
                            className={inputCls}
                            value={formData.battery_cycle_ratio}
                            onChange={e => handleChange('battery_cycle_ratio', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="col-span-1 sm:col-span-3">
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
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mt-2">
                  <div className="col-span-1 sm:col-span-3">
                    <Label className={labelCls}>Activation Date</Label>
                    <Input type="date" className={inputCls} value={formData.component_activation_date} onChange={e => handleChange('component_activation_date', e.target.value)} />
                  </div>
                  <div className="col-span-1 sm:col-span-3">
                    <Label className={labelCls}>Purchase Date</Label>
                    <Input type="date" className={inputCls} value={formData.component_purchase_date} onChange={e => handleChange('component_purchase_date', e.target.value)} />
                  </div>
                  <div className="col-span-1 sm:col-span-3">
                    <Label className={labelCls}>Vendor</Label>
                    <Input className={inputCls} value={formData.component_vendor} onChange={e => handleChange('component_vendor', e.target.value)} />
                  </div>
                  <div className="col-span-1 sm:col-span-3">
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

    <ManageComponentTypesModal
      open={showManageTypes}
      onClose={() => setShowManageTypes(false)}
      types={types}
      onReload={reload}
      isDark={isDark}
    />
    </>
  );
}