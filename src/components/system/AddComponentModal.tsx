'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import axios from 'axios';
import { Loader2, Pencil, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import LocationPicker from './LocationPicker';
import { ManageComponentTypesModal } from './ManageComponentTypesModal';
import { DroneClassRow, ManageDroneClassesModal } from './ManageDroneClassesModal';

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
  component_name: '',
  component_code: '',
  component_desc: '',
  fk_tool_model_id: '',
  component_sn: '',
  cc_platform: '',
  gcs_type: '',
  dcc_drone_id: '',
  drone_registration_code: '',
  component_activation_date: '',
  component_purchase_date: '',
  component_vendor: '',
  component_guarantee_day: '',
  component_status: 'OPERATIONAL',
  fk_client_id: '',
  battery_cycle_ratio: '',
  fk_parent_component_id: '',
  latitude: '',
  longitude: '',
  drone_classes: [] as string[],
  initial_usage_hours: '',
  initial_maintenance_hours: '',
  initial_maintenance_flights: '',
};
export interface ComponentType {
  type_id: number;
  type_value: string;
  type_label: string;
}

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

function ModelOptionLabel({ model }: { model: any }) {
  const manufacturer = model.factory_type ?? '—';
  const modelName = model.factory_model ?? '—';
  const modelCode = model.factory_serie ?? '—';
  const isInactive = model.model_active !== 'Y';

  return (
    <div className="flex flex-col gap-0.5 leading-tight">
      <div className="flex gap-2 items-center">
        <span className="w-24 shrink-0 text-[10px] font-semibold uppercase text-muted-foreground">Manufacturer</span>
        <span className="truncate text-[11px] font-medium">{manufacturer}</span>
        {isInactive && (
          <span className="ml-auto shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-gray-100 text-gray-400 border border-gray-200">
            Inactive
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <span className="w-24 shrink-0 text-[10px] font-semibold uppercase text-muted-foreground">Model name</span>
        <span className="truncate text-[11px]">{modelName}</span>
      </div>
      <div className="flex gap-2">
        <span className="w-24 shrink-0 text-[10px] font-semibold uppercase text-muted-foreground">Model code</span>
        <span className="truncate font-mono text-[11px]">{modelCode}</span>
      </div>
    </div>
  );
}

export default function AddComponentModal({ open, onClose, onSuccess, tools, models }: AddComponentModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [systemSearch, setSystemSearch] = useState('');
  const [showManageTypes, setShowManageTypes] = useState<boolean>(false);
  const [showManageClasses, setShowManageClasses] = useState<boolean>(false);
  const [droneClasses, setDroneClasses] = useState<DroneClassRow[]>([]);
  const [droneClassesLoading, setDroneClassesLoading] = useState<boolean>(false);
  const [parentComponents, setParentComponents] = useState<any[]>([]);
  const [parentLoading, setParentLoading] = useState<boolean>(false);

  const selectedModel = models.find((m) => String(m.tool_model_id) === formData.fk_tool_model_id);
  const selectedModelLabel = selectedModel
    ? `${selectedModel.factory_type ?? '—'} / ${selectedModel.factory_model ?? '—'} / ${selectedModel.factory_serie ?? '—'}`
    : '';

  useEffect(() => {
    if (open) { setFormData(INITIAL_FORM); setSystemSearch(''); }
  }, [open]);

  useEffect(() => {
    if (!formData.fk_tool_id) { setParentComponents([]); return; }
    setParentLoading(true);
    fetch('/api/system/component/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool_id: Number(formData.fk_tool_id) }),
    })
      .then(r => r.json())
      .then(res => { if (res.code === 1) setParentComponents(res.data ?? []); })
      .catch(() => setParentComponents([]))
      .finally(() => setParentLoading(false));
  }, [formData.fk_tool_id]);

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

  const reloadDroneClasses = useCallback(async () => {
    setDroneClassesLoading(true);
    try {
      const { data } = await axios.get('/api/system/drone-classes');
      if (data.code === 1) setDroneClasses(data.data ?? []);
    } catch { 
      console.error('Failed to load drone classes');
     } finally { setDroneClassesLoading(false); }
  }, []);
  useEffect(() => { reloadDroneClasses(); }, [reloadDroneClasses]);


  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleModelSelect = (modelId: string) => {
    setFormData(prev => ({ ...prev, fk_tool_model_id: modelId }));
  };

  const selectedModelCycle = selectedModel?.maintenance_cycle || '';
  const showHours = selectedModelCycle === 'HOURS' || selectedModelCycle === 'MIXED';
  const showFlights = selectedModelCycle === 'FLIGHTS' || selectedModelCycle === 'MIXED';

  const filteredTools = tools.filter((t: any) => {
    if (!systemSearch) return true;
    const q = systemSearch.toLowerCase();
    return t.tool_code?.toLowerCase().includes(q) || t.tool_desc?.toLowerCase().includes(q);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fk_tool_id) { toast.error(t('systems.components.addComponent.toasts.selectSystem')); return; }
    if (!formData.component_type) { toast.error(t('systems.components.addComponent.toasts.selectType')); return; }
    if (formData.component_activation_date && formData.component_purchase_date &&
        formData.component_activation_date < formData.component_purchase_date) {
      toast.error(t('systems.components.addComponent.toasts.activationBeforePurchase')); return;
    }

    setLoading(true);
    try {
      const isWarehouse = formData.fk_tool_id === '_warehouse';
      const payload = {
        ...(isWarehouse ? { warehouse: true } : { fk_tool_id: Number(formData.fk_tool_id) }),
        component_type: formData.component_type,
        component_name: formData.component_name || null,
        component_code: formData.component_code || null,
        component_desc: formData.component_desc || null,
        fk_tool_model_id: formData.fk_tool_model_id ? Number(formData.fk_tool_model_id) : null,
        component_sn: formData.component_sn,
        cc_platform: formData.cc_platform || null,
        gcs_type: formData.gcs_type || null,
        dcc_drone_id: formData.dcc_drone_id || null,
        drone_registration_code: formData.drone_registration_code || null,
        component_activation_date: formData.component_activation_date || null,
        component_purchase_date: formData.component_purchase_date || null,
        component_vendor: formData.component_vendor || null,
        component_guarantee_day: formData.component_guarantee_day ? Number(formData.component_guarantee_day) : null,
        component_status: formData.component_status,
        fk_client_id: formData.fk_client_id ? Number(formData.fk_client_id) : null,
        battery_cycle_ratio: formData.battery_cycle_ratio ? Number(formData.battery_cycle_ratio) : null,
        fk_parent_component_id: formData.fk_parent_component_id ? Number(formData.fk_parent_component_id) : null,
        latitude: formData.latitude ? Number(formData.latitude) : null,
        longitude: formData.longitude ? Number(formData.longitude) : null,
        drone_classes: formData.drone_classes.length > 0 ? formData.drone_classes : null,
        initial_usage_hours: formData.initial_usage_hours ? Number(formData.initial_usage_hours) : null,
        initial_maintenance_hours: formData.initial_maintenance_hours ? Number(formData.initial_maintenance_hours) : null,
        initial_maintenance_flights: formData.initial_maintenance_flights ? Number(formData.initial_maintenance_flights) : null,
      };

      const response = await axios.post('/api/system/component/add', payload);
      if (response.data.code === 1) {
        toast.success(t('systems.components.addComponent.toasts.success'));
        setFormData(INITIAL_FORM);
        onSuccess();
      } else {
        toast.error(response.data.message || t('systems.components.addComponent.toasts.failed'));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('systems.components.addComponent.toasts.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="!max-w-[900px] w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('systems.components.addComponent.title')}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 overflow-visible">
              <div className="col-span-1 sm:col-span-3 min-w-0">
                <Label className="pb-2">{t('systems.components.addComponent.fields.system')}</Label>
                <Select
                  value={formData.fk_tool_id}
                  onValueChange={(v) => { handleChange('fk_tool_id', v); handleChange('fk_parent_component_id', ''); }}
                >
                  <SelectTrigger className="w-full truncate">
                    <SelectValue placeholder={t('systems.components.addComponent.placeholders.selectSystem')}>
                      {formData.fk_tool_id === '_warehouse'
                        ? <span className="block w-full truncate text-left text-amber-600 font-medium">Warehouse</span>
                        : formData.fk_tool_id
                          ? (() => { const tool = tools.find((x: any) => String(x.tool_id) === formData.fk_tool_id); return tool ? <span className="block w-full truncate text-left">{tool.tool_code}</span> : null; })()
                          : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="z-50 max-h-80 overflow-hidden p-0">
                    <div className="p-2 pb-1 border-b">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          className="w-full h-7 rounded-sm border pl-7 pr-2 text-xs outline-none focus:ring-1 focus:ring-violet-500/30 bg-background"
                          placeholder="Search system..."
                          value={systemSearch}
                          onChange={e => setSystemSearch(e.target.value)}
                          onKeyDown={e => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto max-h-60">
                      <SelectItem value="_warehouse">
                        <span className="flex items-center gap-2 text-xs font-medium text-amber-600">
                          Warehouse <span className="font-normal text-muted-foreground">(temporary storage)</span>
                        </span>
                      </SelectItem>
                      {filteredTools.map((tool: any) => (
                        <SelectItem key={tool.tool_id} value={tool.tool_id.toString()}>
                          <SystemOptionLabel tool={tool} />
                        </SelectItem>
                      ))}
                    </div>
                  </SelectContent>
                </Select>
              </div>

              {formData.fk_tool_id && (
                <div className="col-span-1 sm:col-span-3 min-w-0">
                  <Label className="pb-2">{t('systems.components.addComponent.fields.parentComponent')} <span className="text-muted-foreground font-normal">{t('systems.components.common.optional')}</span></Label>
                  <Select
                    value={formData.fk_parent_component_id}
                    onValueChange={(v) => handleChange('fk_parent_component_id', v === '_none' ? '' : v)}
                    disabled={parentLoading}
                  >
                    <SelectTrigger className="w-full truncate">
                      {parentLoading ? (
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('systems.components.common.loading')}
                        </span>
                      ) : (
                        <SelectValue placeholder={t('systems.components.common.noneTopLevel')}>
                          {formData.fk_parent_component_id
                            ? (() => {
                                const p = parentComponents.find(c => String(c.tool_component_id) === formData.fk_parent_component_id);
                                return p ? <span className="block w-full truncate text-left">{p.component_code || p.component_name || `#${p.tool_component_id}`}</span> : null;
                              })()
                            : null}
                        </SelectValue>
                      )}
                    </SelectTrigger>
                    <SelectContent className="z-50 max-h-60 overflow-y-auto">
                      <SelectItem value="_none"><span className="text-muted-foreground italic">{t('systems.components.common.noneTopLevel')}</span></SelectItem>
                      {parentComponents.map((c: any) => (
                        <SelectItem key={c.tool_component_id} value={String(c.tool_component_id)}>
                          <div className="flex flex-col gap-0.5 leading-tight">
                            <span className="text-[11px] font-medium">{c.component_code || c.component_name || `#${c.tool_component_id}`}</span>
                            <span className="text-[10px] text-muted-foreground">{c.component_type}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="col-span-1 sm:col-span-3">
                <div className="flex items-center gap-1.5 pb-2">
                  <Label>{t('systems.components.addComponent.fields.componentType')}</Label>
                  <button type="button" onClick={() => setShowManageTypes(true)} className="text-slate-400 hover:text-violet-600 transition-colors" title="Manage types">
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
                <Select value={formData.component_type} onValueChange={(v) => handleChange('component_type', v)} disabled={typesLoading}>
                  <SelectTrigger>
                    {typesLoading ? (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('systems.components.common.loading')}
                      </span>
                    ) : (
                      <SelectValue placeholder={t('systems.components.addComponent.placeholders.selectType')} />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((tp) => (
                      <SelectItem key={tp.type_id} value={tp.type_value}>{tp.type_label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-1 sm:col-span-3">
                <Label className="pb-2">{t('systems.components.addComponent.fields.code')}</Label>
                <Input value={formData.component_code} onChange={(e) => handleChange('component_code', e.target.value)} placeholder={t('systems.components.addComponent.placeholders.code')} />
              </div>
              <div className="col-span-1 sm:col-span-3">
                <Label className="pb-2">{t('systems.components.addComponent.fields.serialNumber')}</Label>
                <Input value={formData.component_sn} onChange={(e) => handleChange('component_sn', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 overflow-visible">
              <div className="col-span-1 sm:col-span-4">
                <Label className="pb-2">{t('systems.components.addComponent.fields.name')}</Label>
                <Input value={formData.component_name} onChange={(e) => handleChange('component_name', e.target.value)} placeholder={t('systems.components.addComponent.placeholders.componentName')} />
              </div>
              <div className="col-span-1 sm:col-span-4 min-w-0">
                <Label className="pb-2">{t('systems.components.addComponent.fields.brandModel')}</Label>
                <Select value={formData.fk_tool_model_id} onValueChange={handleModelSelect}>
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder={t('systems.components.common.select')}>
                      {selectedModelLabel ? <span className="block w-full truncate text-left">{selectedModelLabel}</span> : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m: any) => {
                      const inactive = m.model_active !== 'Y';
                      return (
                        <SelectItem
                          key={m.tool_model_id}
                          value={m.tool_model_id.toString()}
                          disabled={inactive}
                          className={inactive ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                          <ModelOptionLabel model={m} />
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1 sm:col-span-4">
                <Label className="pb-2">{t('systems.components.addComponent.fields.description')}</Label>
                <Input value={formData.component_desc} onChange={(e) => handleChange('component_desc', e.target.value)} placeholder={t('systems.components.addComponent.placeholders.componentDesc')} />
              </div>
            </div>

            {formData.component_type === 'DRONE' && (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 overflow-visible">
                <div className="col-span-1 sm:col-span-3">
                  <Label className="pb-2">{t('systems.components.addComponent.fields.c2Platform')}</Label>
                  <Select value={formData.cc_platform} onValueChange={(v) => handleChange('cc_platform', v)}>
                    <SelectTrigger><SelectValue placeholder={t('systems.components.common.select')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_FLYTBASE">{t('systems.components.addComponent.c2Options.flytbase')}</SelectItem>
                      <SelectItem value="_VOTIX">{t('systems.components.addComponent.c2Options.votix')}</SelectItem>
                      <SelectItem value="_FLIGHTHUB">{t('systems.components.addComponent.c2Options.flighthub')}</SelectItem>
                      <SelectItem value="_APP">{t('systems.components.addComponent.c2Options.app')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1 sm:col-span-3">
                  <Label className="pb-2">{t('systems.components.addComponent.fields.gcs')}</Label>
                  <Select value={formData.gcs_type} onValueChange={(v) => handleChange('gcs_type', v)}>
                    <SelectTrigger><SelectValue placeholder={t('systems.components.common.select')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_DOCK">{t('systems.components.addComponent.gcsOptions.dock')}</SelectItem>
                      <SelectItem value="_RC">{t('systems.components.addComponent.gcsOptions.rc')}</SelectItem>
                      <SelectItem value="_GCS">{t('systems.components.addComponent.gcsOptions.gcs')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1 sm:col-span-3">
                  <Label className="pb-2">{t('systems.components.addComponent.fields.dccDroneId')}</Label>
                  <Input
                    value={formData.dcc_drone_id}
                    onChange={(e) => handleChange('dcc_drone_id', e.target.value)}
                    placeholder={t('systems.components.addComponent.placeholders.dccId')}
                  />
                </div>
                <div className="col-span-1 sm:col-span-3">
                  <Label className="pb-2">{t('systems.components.addComponent.fields.droneRegCode')} <span className="text-muted-foreground font-normal">{t('systems.components.common.optional')}</span></Label>
                  <Input
                    value={formData.drone_registration_code}
                    onChange={(e) => handleChange('drone_registration_code', e.target.value)}
                    placeholder={t('systems.components.addComponent.placeholders.regCode')}
                  />
                </div>
              </div>
            )}

            {formData.component_type === 'DRONE' && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label className="pb-0">{t('systems.components.common.droneClasses')} <span className="font-normal opacity-60 text-xs">{t('systems.components.common.optional')}</span></Label>
                  <button type="button" onClick={() => setShowManageClasses(true)} className="text-slate-400 hover:text-violet-600 transition-colors" title={t('systems.components.common.manageClasses')}>
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
                {droneClassesLoading ? (
                  <div className="flex flex-wrap gap-2">
                    {[72, 88, 64, 80, 76].map(w => (
                      <Skeleton key={w} className="h-7 rounded-full" style={{ width: w }} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {droneClasses.map(dc => {
                      const selected = formData.drone_classes.includes(dc.class_value);
                      return (
                        <button
                          key={dc.class_id}
                          type="button"
                          onClick={() => {
                            const next = selected
                              ? formData.drone_classes.filter((v: string) => v !== dc.class_value)
                              : [...formData.drone_classes, dc.class_value];
                            setFormData(prev => ({ ...prev, drone_classes: next }));
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                            selected
                              ? 'bg-violet-600 border-violet-600 text-white'
                              : 'bg-white border-slate-300 text-slate-600 hover:border-violet-400 hover:text-violet-600'
                          }`}
                        >
                          {dc.class_value} — {dc.class_label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-medium text-muted-foreground">{t('systems.components.common.defaultCounters.label')}</p>
                <span className="text-xs text-muted-foreground font-normal">{t('systems.components.common.defaultCounters.hint')}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="col-span-1 sm:col-span-3">
                  <Label className="pb-2">{t('systems.components.common.defaultCounters.usageHours')}</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="0"
                    value={formData.initial_usage_hours}
                    onChange={(e) => { if (e.target.value === '' || Number(e.target.value) >= 0) handleChange('initial_usage_hours', e.target.value); }}
                  />
                </div>
                {showHours && (
                  <div className="col-span-1 sm:col-span-3">
                    <Label className="pb-2">{t('systems.components.common.defaultCounters.maintenanceHours')}</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0"
                      value={formData.initial_maintenance_hours}
                      onChange={(e) => { if (e.target.value === '' || Number(e.target.value) >= 0) handleChange('initial_maintenance_hours', e.target.value); }}
                    />
                  </div>
                )}
                {showFlights && (
                  <div className="col-span-1 sm:col-span-3">
                    <Label className="pb-2">{t('systems.components.common.defaultCounters.maintenanceFlights')}</Label>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="0"
                      value={formData.initial_maintenance_flights}
                      onChange={(e) => { if (e.target.value === '' || Number(e.target.value) >= 0) handleChange('initial_maintenance_flights', e.target.value); }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium mb-2 text-muted-foreground">{t('systems.components.common.locationOptional')}</p>
              <LocationPicker
                lat={formData.latitude}
                lng={formData.longitude}
                onChange={(lat, lng) => {
                  handleChange('latitude', lat);
                  handleChange('longitude', lng);
                }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 overflow-visible mt-2">
              <div className="col-span-1 sm:col-span-3">
                <Label className="pb-2">{t('systems.components.addComponent.fields.activationDate')}</Label>
                <Input type="date" value={formData.component_activation_date} onChange={(e) => handleChange('component_activation_date', e.target.value)} />
              </div>
              <div className="col-span-1 sm:col-span-3">
                <Label className="pb-2">{t('systems.components.addComponent.fields.purchaseDate')}</Label>
                <Input type="date" value={formData.component_purchase_date} onChange={(e) => handleChange('component_purchase_date', e.target.value)} />
              </div>
              <div className="col-span-1 sm:col-span-3">
                <Label className="pb-2">{t('systems.components.addComponent.fields.vendor')}</Label>
                <Input value={formData.component_vendor} onChange={(e) => handleChange('component_vendor', e.target.value)} />
              </div>
              <div className="col-span-1 sm:col-span-3">
                <Label className="pb-2">{t('systems.components.addComponent.fields.guarantee')}</Label>
                <Input type="number" value={formData.component_guarantee_day} onChange={(e) => handleChange('component_guarantee_day', e.target.value)} />
              </div>
              <div className="col-span-1 sm:col-span-3">
                <Label className="pb-2">{t('systems.components.addComponent.fields.batteryRatio')}</Label>
                <Input type="number" step="0.01" min={0} max={1} placeholder="0.00 – 1.00" value={formData.battery_cycle_ratio} onChange={(e) => handleChange('battery_cycle_ratio', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 overflow-visible">
              <div className="col-span-1 sm:col-span-3">
                <Label className="pb-2">{t('systems.components.addComponent.fields.status')}</Label>
                <Select value={formData.component_status} onValueChange={(v) => handleChange('component_status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPERATIONAL">{t('systems.components.common.statusOptions.operational')}</SelectItem>
                    <SelectItem value="NOT_OPERATIONAL">{t('systems.components.common.statusOptions.notOperational')}</SelectItem>
                    <SelectItem value="MAINTENANCE">{t('systems.components.common.statusOptions.maintenance')}</SelectItem>
                    <SelectItem value="DECOMMISSIONED">{t('systems.components.common.statusOptions.decommissioned')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>{t('systems.components.addComponent.buttons.cancel')}</Button>
              <Button type="submit" className="bg-violet-600 hover:bg-violet-700" disabled={loading}>
                {loading ? t('systems.components.addComponent.buttons.adding') : t('systems.components.addComponent.buttons.addComponent')}
              </Button>
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
      <ManageDroneClassesModal
        open={showManageClasses}
        onClose={() => setShowManageClasses(false)}
        classes={droneClasses}
        onReload={reloadDroneClasses}
        isDark={false}
      />
    </>
  );
}
