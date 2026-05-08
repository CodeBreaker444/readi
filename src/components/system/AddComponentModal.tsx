'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import axios from 'axios';
import { Loader2, Pencil, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  maintenance_cycle: '',
  maintenance_cycle_hour: '',
  maintenance_cycle_day: '',
  maintenance_cycle_flight: '',
  battery_cycle_ratio: '',
  fk_parent_component_id: '',
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

  return (
    <div className="flex flex-col gap-0.5 leading-tight">
      <div className="flex gap-2">
        <span className="w-24 shrink-0 text-[10px] font-semibold uppercase text-muted-foreground">Manufacturer</span>
        <span className="truncate text-[11px] font-medium">{manufacturer}</span>
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
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [showManageTypes, setShowManageTypes] = useState(false);
  const [parentComponents, setParentComponents] = useState<any[]>([]);
  const [parentLoading, setParentLoading] = useState(false);

  const selectedModel = models.find((m) => String(m.tool_model_id) === formData.fk_tool_model_id);
  const selectedModelLabel = selectedModel
    ? `${selectedModel.factory_type ?? '—'} / ${selectedModel.factory_model ?? '—'} / ${selectedModel.factory_serie ?? '—'}`
    : '';

  useEffect(() => {
    if (open) setFormData(INITIAL_FORM);
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
      toast.info(t('systems.components.addComponent.toasts.resetToModel'));
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
    if (!formData.fk_tool_id) { toast.error(t('systems.components.addComponent.toasts.selectSystem')); return; }
    if (!formData.component_type) { toast.error(t('systems.components.addComponent.toasts.selectType')); return; }
    if (formData.component_activation_date && formData.component_purchase_date &&
        formData.component_activation_date < formData.component_purchase_date) {
      toast.error(t('systems.components.addComponent.toasts.activationBeforePurchase')); return;
    }

    setLoading(true);
    try {
      const payload = {
        fk_tool_id: Number(formData.fk_tool_id),
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
        maintenance_cycle: formData.maintenance_cycle || null,
        maintenance_cycle_hour: formData.maintenance_cycle_hour ? Number(formData.maintenance_cycle_hour) : null,
        maintenance_cycle_day: formData.maintenance_cycle_day ? Number(formData.maintenance_cycle_day) : null,
        maintenance_cycle_flight: formData.maintenance_cycle_flight ? Number(formData.maintenance_cycle_flight) : null,
        battery_cycle_ratio: formData.battery_cycle_ratio ? Number(formData.battery_cycle_ratio) : null,
        fk_parent_component_id: formData.fk_parent_component_id ? Number(formData.fk_parent_component_id) : null,
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
                <Select value={formData.fk_tool_id} onValueChange={(v) => { handleChange('fk_tool_id', v); handleChange('fk_parent_component_id', ''); }}>
                  <SelectTrigger className="w-full truncate">
                    <SelectValue placeholder={t('systems.components.addComponent.placeholders.selectSystem')}>
                      {formData.fk_tool_id
                        ? (() => { const tool = tools.find(x => String(x.tool_id) === formData.fk_tool_id); return tool ? <span className="block w-full truncate text-left">{tool.tool_code}</span> : null; })()
                        : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="z-50 max-h-60 overflow-y-auto">
                    {tools.map((tool: any) => (
                      <SelectItem key={tool.tool_id} value={tool.tool_id.toString()}>
                        <SystemOptionLabel tool={tool} />
                      </SelectItem>
                    ))}
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
                    {models.map((m: any) => (
                      <SelectItem key={m.tool_model_id} value={m.tool_model_id.toString()}>
                        <ModelOptionLabel model={m} />
                      </SelectItem>
                    ))}
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

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">{t('systems.components.common.maintenanceCycle.label')}</p>
                {formData.fk_tool_model_id && (
                  <button type="button" onClick={handleResetMaintenanceToModel} className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-500 transition-colors">
                    <RotateCcw className="h-3 w-3" /> {t('systems.components.common.maintenanceCycle.resetToModel')}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="col-span-1 sm:col-span-3">
                  <Label className="pb-2">{t('systems.components.common.maintenanceCycle.cycleType')}</Label>
                  <Select value={formData.maintenance_cycle} onValueChange={handleCycleChange}>
                    <SelectTrigger><SelectValue placeholder={t('systems.components.common.select')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HOURS">{t('systems.components.common.maintenanceCycle.hours')}</SelectItem>
                      <SelectItem value="DAYS">{t('systems.components.common.maintenanceCycle.days')}</SelectItem>
                      <SelectItem value="FLIGHTS">{t('systems.components.common.maintenanceCycle.flights')}</SelectItem>
                      <SelectItem value="MIXED">{t('systems.components.common.maintenanceCycle.mixed')}</SelectItem>
                      <SelectItem value="NONE">{t('systems.components.common.maintenanceCycle.none')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {showNone && (
                  <div className="col-span-1 sm:col-span-9 flex items-end">
                    <span className="inline-flex items-center px-3 py-2 rounded-md bg-muted text-muted-foreground text-sm">{t('systems.components.common.maintenanceCycle.noCycleRequired')}</span>
                  </div>
                )}
                {showHours && (
                  <div className="col-span-1 sm:col-span-2">
                    <Label className="pb-2">{t('systems.components.common.maintenanceCycle.hoursLimit')}</Label>
                    <Input type="number" min={0} value={formData.maintenance_cycle_hour} onChange={(e) => handleCycleInput('maintenance_cycle_hour', e.target.value)} />
                  </div>
                )}
                {showDays && (
                  <div className="col-span-1 sm:col-span-2">
                    <Label className="pb-2">{t('systems.components.common.maintenanceCycle.daysLimit')}</Label>
                    <Input type="number" min={0} value={formData.maintenance_cycle_day} onChange={(e) => handleCycleInput('maintenance_cycle_day', e.target.value)} />
                  </div>
                )}
                {showFlights && (
                  <div className="col-span-1 sm:col-span-4 flex items-end gap-2">
                    <div className="flex-1 min-w-0">
                      <Label className="pb-2">{t('systems.components.common.maintenanceCycle.flightsLimit')}</Label>
                      <Input type="number" min={0} value={formData.maintenance_cycle_flight} onChange={(e) => handleCycleInput('maintenance_cycle_flight', e.target.value)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Label className="pb-2">{t('systems.components.common.maintenanceCycle.cycleRatio')}</Label>
                      <Input
                        type="number"
                        min={0.01}
                        max={1}
                        step={0.01}
                        placeholder="e.g. 0.87"
                        value={formData.battery_cycle_ratio}
                        onChange={(e) => handleChange('battery_cycle_ratio', e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
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
    </>
  );
}
