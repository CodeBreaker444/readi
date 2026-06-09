'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/components/useTheme';
import axios from 'axios';
import { Loader2, Pencil, Search, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Skeleton } from '../ui/skeleton';
import LocationPicker from '@/components/system/LocationPicker';
import { ManageComponentTypesModal } from './ManageComponentTypesModal';
import { DroneClassRow, ManageDroneClassesModal } from './ManageDroneClassesModal';

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
  fk_tool_id: '_none',
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
  expiration_date: '',
  expiry_type: 'EXPIRATION_DATE',
  expiration_flights: '',
  component_vendor: '',
  component_guarantee_day: '',
  component_status: 'OPERATIONAL',
  battery_cycle_ratio: '',
  fk_parent_component_id: '_none',
  latitude: '',
  longitude: '',
  drone_classes: [] as string[],
  initial_usage_hours: '',
  initial_maintenance_hours: '',
  initial_maintenance_flights: '',
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
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(false);
  const [fetching, setFetching] = useState<boolean>(false);
  const [systemSearch, setSystemSearch] = useState('');
  const [components, setComponents] = useState<any[]>([]);
  const [selectedComponentId, setSelectedComponentId] = useState<string>('');
  const [showManageTypes, setShowManageTypes] = useState<boolean>(false);
  const [showManageClasses, setShowManageClasses] = useState<boolean>(false);
  const [droneClasses, setDroneClasses] = useState<DroneClassRow[]>([]);
  const [droneClassesLoading, setDroneClassesLoading] = useState<boolean>(false);
  const [customClassInput, setCustomClassInput] = useState('');
  const [loadingParent, setLoadingParent] = useState<boolean>(false);
  const [originalFkToolId, setOriginalFkToolId] = useState<number | null>(null);
  const [drcSyncedAt, setDrcSyncedAt] = useState<string | null>(null);

    const [formData, setFormData] = useState(EMPTY_FORM);

    const [types, setTypes] = useState<ComponentType[]>([]);
    const [typesLoading, setTypesLoading] = useState<boolean>(false);

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
    } catch { /* non-fatal */ } finally { setDroneClassesLoading(false); }
  }, []);
  useEffect(() => { reloadDroneClasses(); }, [reloadDroneClasses]);

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
      setOriginalFkToolId(null);
      setDrcSyncedAt(null);
      setSystemSearch('');
    }
  }, [open, toolId, initialComponentId]);

  const populateForm = (comp: any) => {
    setOriginalFkToolId(comp.fk_tool_id ?? null);
    setDrcSyncedAt(comp.drc_synced_at ?? null);
    setFormData({
      fk_tool_id: (comp.system_detached || !comp.fk_tool_id) ? '_none' : String(comp.fk_tool_id),
      component_type: comp.component_type || '',
      component_name: comp.component_name || '',
      component_code: comp.component_code || '',
      component_desc: comp.component_desc || '',
      fk_tool_model_id: comp.fk_tool_model_id ? String(comp.fk_tool_model_id) : '',
      component_sn: comp.component_sn || '',
      cc_platform: comp.cc_platform || '',
      gcs_type: comp.gcs_type || '',
      dcc_drone_id: comp.dcc_drone_id || '',
      drone_registration_code: comp.drone_registration_code || '',
      component_activation_date: comp.component_activation_date?.split('T')[0] || '',
      component_purchase_date: comp.component_purchase_date?.split('T')[0] || '',
      expiration_date: comp.expiration_date?.split('T')[0] || '',
      expiry_type: comp.expiry_type || 'EXPIRATION_DATE',
      expiration_flights: comp.expiration_flights != null ? String(comp.expiration_flights) : '',
      component_vendor: comp.component_vendor || '',
      component_guarantee_day: comp.component_guarantee_day ? String(comp.component_guarantee_day) : '',
      component_status: comp.component_status || 'OPERATIONAL',
      battery_cycle_ratio: comp.battery_cycle_ratio != null ? String(comp.battery_cycle_ratio) : '',
      fk_parent_component_id: comp.fk_parent_component_id ? String(comp.fk_parent_component_id) : '_none',
      latitude: comp.latitude != null ? String(comp.latitude) : '',
      longitude: comp.longitude != null ? String(comp.longitude) : '',
      drone_classes: Array.isArray(comp.drone_classes) ? comp.drone_classes : [],
      initial_usage_hours: comp.current_usage_hours != null && comp.current_usage_hours !== 0 ? String(comp.current_usage_hours) : '',
      initial_maintenance_hours: comp.current_maintenance_hours != null && comp.current_maintenance_hours !== 0 ? String(comp.current_maintenance_hours) : '',
      initial_maintenance_flights: comp.current_maintenance_flights != null && comp.current_maintenance_flights !== 0 ? String(comp.current_maintenance_flights) : '',
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
      toast.error(t('systems.components.editComponent.toasts.loadError'));
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
      toast.error(t('systems.components.editComponent.toasts.loadComponentsError'));
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
  };

  const selectedModel = models.find(m => String(m.tool_model_id) === formData.fk_tool_model_id);
  const selectedModelCycle = selectedModel?.maintenance_cycle || '';
  const showHours = selectedModelCycle === 'HOURS' || selectedModelCycle === 'MIXED';
  const showFlights = selectedModelCycle === 'FLIGHTS' || selectedModelCycle === 'MIXED';

  const handleSystemChange = async (v: string) => {
    handleChange('fk_tool_id', v);
    handleChange('fk_parent_component_id', '_none');
    if (!v || v === '_none') return;
    setLoadingParent(true);
    try {
      const res = await fetch('/api/system/component/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_id: Number(v) }),
      });
      const result = await res.json();
      if (result.code === 1) setComponents(result.data || []);
    } catch {
      toast.error(t('systems.components.editComponent.toasts.loadComponentsError'));
    } finally {
      setLoadingParent(false);
    }
  };

  const filteredTools = tools.filter((t: any) => {
    if (!systemSearch) return true;
    const q = systemSearch.toLowerCase();
    return t.tool_code?.toLowerCase().includes(q) || t.tool_desc?.toLowerCase().includes(q);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComponentId) { toast.error(t('systems.components.editComponent.toasts.selectComponent')); return; }
    setLoading(true);
    try {
      const isDetached = formData.fk_tool_id === '_none';
      const payload = {
        fk_tool_id: !isDetached
          ? Number(formData.fk_tool_id)
          : (originalFkToolId ?? Number(formData.fk_tool_id)),
        system_detached: isDetached,
        component_type: formData.component_type,
        component_name: formData.component_name || null,
        component_code: formData.component_code || null,
        component_desc: formData.component_desc || null,
        fk_tool_model_id: formData.fk_tool_model_id ? Number(formData.fk_tool_model_id) : null,
        component_sn: formData.component_sn || null,
        cc_platform: formData.cc_platform || null,
        gcs_type: formData.gcs_type || null,
        dcc_drone_id: formData.dcc_drone_id || null,
        drone_registration_code: formData.drone_registration_code || null,
        component_activation_date: formData.component_activation_date || null,
        component_purchase_date: formData.component_purchase_date || null,
        expiration_date: formData.expiration_date || null,
        expiry_type: formData.expiry_type,
        expiration_flights: formData.expiration_flights ? Number(formData.expiration_flights) : null,
        component_vendor: formData.component_vendor || null,
        component_guarantee_day: formData.component_guarantee_day ? Number(formData.component_guarantee_day) : null,
        component_status: formData.component_status,
        battery_cycle_ratio: formData.battery_cycle_ratio ? Number(formData.battery_cycle_ratio) : null,
        fk_parent_component_id: formData.fk_parent_component_id && formData.fk_parent_component_id !== '_none' ? Number(formData.fk_parent_component_id) : null,
        latitude: formData.latitude ? Number(formData.latitude) : null,
        longitude: formData.longitude ? Number(formData.longitude) : null,
        drone_classes: formData.drone_classes.length > 0 ? formData.drone_classes : null,
        initial_usage_hours: formData.initial_usage_hours !== '' ? Number(formData.initial_usage_hours) : null,
        initial_maintenance_hours: formData.initial_maintenance_hours !== '' ? Number(formData.initial_maintenance_hours) : null,
        initial_maintenance_flights: formData.initial_maintenance_flights !== '' ? Number(formData.initial_maintenance_flights) : null,
      };

      const res = await fetch(`/api/system/component/${selectedComponentId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.code === 1) {
        toast.success(t('systems.components.editComponent.toasts.success'));
        onSuccess();
      } else {
        toast.error(result.message || t('systems.components.editComponent.toasts.failed'));
      }
    } catch {
      toast.error(t('systems.components.editComponent.toasts.error'));
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
      <DialogContent className={`max-w-225! w-[90vw] h-[90vh] overflow-y-auto ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}>
        <DialogHeader className={`border-b pb-3 ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
          <DialogTitle className={isDark ? 'text-white' : ''}>{t('systems.components.editComponent.title')}</DialogTitle>
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
        ) : components.length === 0 && !selectedComponentId ? (
          <div className="py-8 text-center text-sm text-gray-400">
            {t('systems.components.editComponent.noComponents')}
            <div className="mt-4">
              <Button variant="outline" onClick={onClose}>{t('systems.components.editComponent.buttons.close')}</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {selectedComponentId && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="col-span-1 sm:col-span-3 min-w-0">
                    <Label className={labelCls}>{t('systems.components.editComponent.fields.system')}</Label>
                    <Select value={formData.fk_tool_id} onValueChange={handleSystemChange}>
                      <SelectTrigger className={`w-full truncate ${selectTriggerCls}`}>
                        <SelectValue placeholder={t('systems.components.common.select')}>
                          {formData.fk_tool_id === '_none'
                            ? <span className="font-medium text-amber-600">Warehouse</span>
                            : formData.fk_tool_id
                              ? (() => { const tool = tools.find((x: any) => String(x.tool_id) === formData.fk_tool_id); return tool ? <span className="block w-full truncate text-left">{tool.tool_code}</span> : null; })()
                              : null}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className={`z-50 max-h-80 overflow-hidden p-0 ${selectContentCls}`}>
                        <div className={`p-2 pb-1 border-b ${isDark ? 'border-slate-700' : ''}`}>
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <input
                              className={`w-full h-7 rounded-sm border pl-7 pr-2 text-xs outline-none focus:ring-1 focus:ring-violet-500/30 ${isDark ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-500' : 'bg-background'}`}
                              placeholder="Search system..."
                              value={systemSearch}
                              onChange={e => setSystemSearch(e.target.value)}
                              onKeyDown={e => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <div className="overflow-y-auto max-h-60">
                          <SelectItem value="_none">
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

                  <div className="col-span-1 sm:col-span-3 min-w-0">
                    <Label className={labelCls}>{t('systems.components.addComponent.fields.parentComponent')} <span className="font-normal opacity-60">{t('systems.components.common.optional')}</span></Label>
                    <Select
                      value={formData.fk_parent_component_id}
                      onValueChange={(v) => handleChange('fk_parent_component_id', v)}
                      disabled={loadingParent}
                    >
                      <SelectTrigger className={`w-full truncate ${selectTriggerCls}`}>
                        <SelectValue placeholder={t('systems.components.common.noneTopLevel')}>
                          {formData.fk_parent_component_id && formData.fk_parent_component_id !== '_none'
                            ? (() => {
                                const p = components.find((c: any) => String(c.tool_component_id) === formData.fk_parent_component_id);
                                return p ? <span className="block w-full truncate text-left">{p.component_code || p.component_name || `#${p.tool_component_id}`}</span> : null;
                              })()
                            : null}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className={`z-50 max-h-60 overflow-y-auto ${selectContentCls}`}>
                        <SelectItem value="_none"><span className={`italic ${isDark ? 'text-slate-400' : 'text-muted-foreground'}`}>{t('systems.components.common.noneTopLevel')}</span></SelectItem>
                        {components
                          .filter((c: any) =>
                            String(c.tool_component_id) !== selectedComponentId &&
                            String(c.fk_tool_id) === formData.fk_tool_id &&
                            c.component_status !== 'DECOMMISSIONED'
                          )
                          .map((c: any) => (
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
                  <div className="col-span-1 sm:col-span-3">
                    <div className="flex items-center gap-1.5 pb-2">
                      <Label className={labelCls.replace(' pb-2', '')}>{t('systems.components.editComponent.fields.componentType')}</Label>
                      <button type="button" onClick={() => setShowManageTypes(true)} className="cursor-pointer text-slate-400 hover:text-violet-600 transition-colors" title="Manage types">
                        <Pencil className="h-3 w-3" />
                      </button>
                    </div>
                    <Select value={formData.component_type} onValueChange={v => handleChange('component_type', v)} disabled={typesLoading}>
                      <SelectTrigger className={selectTriggerCls}>
                        {typesLoading ? (
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('systems.components.common.loading')}
                          </span>
                        ) : (
                          <SelectValue placeholder={t('systems.components.addComponent.placeholders.selectType')} />
                        )}
                      </SelectTrigger>
                      <SelectContent className={selectContentCls}>
                        {types.map((tp) => (
                          <SelectItem key={tp.type_id} value={tp.type_value}>{tp.type_label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 sm:col-span-3">
                    <Label className={labelCls}>{t('systems.components.addComponent.fields.code')}</Label>
                    <Input className={inputCls} value={formData.component_code} onChange={e => handleChange('component_code', e.target.value)} placeholder={t('systems.components.addComponent.placeholders.code')} />
                  </div>
                  <div className="col-span-1 sm:col-span-3">
                    <Label className={labelCls}>{t('systems.components.addComponent.fields.serialNumber')}</Label>
                    <Input className={inputCls} value={formData.component_sn} onChange={e => handleChange('component_sn', e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="col-span-1 sm:col-span-4">
                    <Label className={labelCls}>{t('systems.components.addComponent.fields.name')}</Label>
                    <Input className={inputCls} value={formData.component_name} onChange={e => handleChange('component_name', e.target.value)} placeholder={t('systems.components.addComponent.placeholders.componentName')} />
                  </div>
                  <div className="col-span-1 sm:col-span-4 min-w-0">
                    <Label className={labelCls}>{t('systems.components.addComponent.fields.brandModel')}</Label>
                    <Select value={formData.fk_tool_model_id} onValueChange={handleModelSelect}>
                      <SelectTrigger className={`h-14 min-h-10 py-2 items-start ${selectTriggerCls}`}>
                        <SelectValue placeholder={t('systems.components.common.select')} />
                      </SelectTrigger>
                      <SelectContent className={selectContentCls}>
                        {models.map((m: any) => {
                          const inactive = m.model_active !== 'Y';
                          return (
                            <SelectItem
                              key={m.tool_model_id}
                              value={m.tool_model_id.toString()}
                              disabled={inactive}
                              className={inactive ? 'opacity-50 cursor-not-allowed' : ''}
                            >
                              <span className="flex items-center gap-2">
                                <span>{m.factory_model} — {m.factory_type}</span>
                                {inactive && (
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${isDark ? 'bg-slate-700 text-slate-500 border-slate-600' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
                                    Inactive
                                  </span>
                                )}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 sm:col-span-4">
                    <Label className={labelCls}>{t('systems.components.addComponent.fields.description')}</Label>
                    <Input className={inputCls} value={formData.component_desc} onChange={e => handleChange('component_desc', e.target.value)} placeholder={t('systems.components.addComponent.placeholders.componentDesc')} />
                  </div>
                </div>

                {formData.component_type === 'DRONE' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label className={`${labelCls} pb-0`}>{t('systems.components.common.droneClasses')} <span className="font-normal opacity-60 text-xs">{t('systems.components.common.optional')}</span></Label>
                      <button type="button" onClick={() => setShowManageClasses(true)} className="cursor-pointer text-slate-400 hover:text-violet-600 transition-colors" title={t('systems.components.common.manageClasses')}>
                        <Pencil className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Selected classes — independent removable chips per component */}
                    {formData.drone_classes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {formData.drone_classes.map(cls => (
                          <span key={cls} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-600 text-white border border-violet-600">
                            {cls}
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, drone_classes: prev.drone_classes.filter(v => v !== cls) }))}
                              className="ml-0.5 hover:bg-violet-700 rounded-full p-0.5 transition-colors"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Global suggestions — only those not yet added to this component */}
                    {!droneClassesLoading && droneClasses.filter(dc => !formData.drone_classes.includes(dc.class_value)).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] font-semibold uppercase text-slate-400 mr-1">Add:</span>
                        {droneClasses
                          .filter(dc => !formData.drone_classes.includes(dc.class_value))
                          .map(dc => (
                            <button
                              key={dc.class_id}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, drone_classes: [...prev.drone_classes, dc.class_value] }))}
                              className="px-2.5 py-1 rounded-full text-xs font-medium border border-dashed border-slate-300 text-slate-500 hover:border-violet-400 hover:text-violet-600 transition-colors"
                            >
                              + {dc.class_value}
                            </button>
                          ))}
                      </div>
                    )}
                    {droneClassesLoading && (
                      <div className="flex flex-wrap gap-2">
                        {[72, 88, 64, 80, 76].map(w => <Skeleton key={w} className="h-7 rounded-full" style={{ width: w }} />)}
                      </div>
                    )}

                    {/* Free-text input for custom class values */}
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={customClassInput}
                        onChange={e => setCustomClassInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = customClassInput.trim();
                            if (val && !formData.drone_classes.includes(val)) {
                              setFormData(prev => ({ ...prev, drone_classes: [...prev.drone_classes, val] }));
                            }
                            setCustomClassInput('');
                          }
                        }}
                        placeholder="Custom class (e.g. C2)…"
                        className="h-7 rounded-md border border-slate-300 px-2.5 text-xs outline-none focus:ring-1 focus:ring-violet-500/30 bg-background w-44"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = customClassInput.trim();
                          if (val && !formData.drone_classes.includes(val)) {
                            setFormData(prev => ({ ...prev, drone_classes: [...prev.drone_classes, val] }));
                          }
                          setCustomClassInput('');
                        }}
                        disabled={!customClassInput.trim()}
                        className="h-7 px-3 rounded-md text-xs font-medium bg-slate-100 border border-slate-300 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}

                {formData.component_type === 'DRONE' && (
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="col-span-1 sm:col-span-3">
                      <Label className={labelCls}>{t('systems.components.addComponent.fields.c2Platform')}</Label>
                      <Select value={formData.cc_platform} onValueChange={v => handleChange('cc_platform', v)}>
                        <SelectTrigger className={selectTriggerCls}><SelectValue placeholder={t('systems.components.common.select')} /></SelectTrigger>
                        <SelectContent className={selectContentCls}>
                          <SelectItem value="_FLYTBASE">{t('systems.components.addComponent.c2Options.flytbase')}</SelectItem>
                          <SelectItem value="_VOTIX">{t('systems.components.addComponent.c2Options.votix')}</SelectItem>
                          <SelectItem value="_FLIGHTHUB">{t('systems.components.addComponent.c2Options.flighthub')}</SelectItem>
                          <SelectItem value="_APP">{t('systems.components.addComponent.c2Options.app')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 sm:col-span-3">
                      <Label className={labelCls}>{t('systems.components.addComponent.fields.gcs')}</Label>
                      <Select value={formData.gcs_type} onValueChange={v => handleChange('gcs_type', v)}>
                        <SelectTrigger className={selectTriggerCls}><SelectValue placeholder={t('systems.components.common.select')} /></SelectTrigger>
                        <SelectContent className={selectContentCls}>
                          <SelectItem value="_DOCK">{t('systems.components.addComponent.gcsOptions.dock')}</SelectItem>
                          <SelectItem value="_RC">{t('systems.components.addComponent.gcsOptions.rc')}</SelectItem>
                          <SelectItem value="_GCS">{t('systems.components.addComponent.gcsOptions.gcs')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 sm:col-span-3">
                      <Label className={labelCls}>{t('systems.components.addComponent.fields.dccDroneId')}</Label>
                      <Input className={inputCls} value={formData.dcc_drone_id} onChange={e => handleChange('dcc_drone_id', e.target.value)} placeholder={t('systems.components.addComponent.placeholders.dccId')} />
                    </div>
                    <div className="col-span-1 sm:col-span-3">
                      <Label className={labelCls}>{t('systems.components.addComponent.fields.droneRegCode')} <span className="font-normal opacity-60">{t('systems.components.common.optional')}</span></Label>
                      <Input className={inputCls} value={formData.drone_registration_code} onChange={e => handleChange('drone_registration_code', e.target.value)} placeholder={t('systems.components.addComponent.placeholders.regCode')} />
                      {drcSyncedAt && (
                        <p className={`mt-1 text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          Synced from dFlight &middot; {new Date(drcSyncedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <p className={sectionLabelCls}>{t('systems.components.common.locationOptional')}</p>
                  <LocationPicker
                    lat={formData.latitude}
                    lng={formData.longitude}
                    isDark={isDark}
                    onChange={(lat, lng) => setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }))}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <p className={sectionLabelCls}>{t('systems.components.common.defaultCounters.label')}</p>
                    <span className={`text-xs font-normal ${isDark ? 'text-slate-500' : 'text-muted-foreground'}`}>{t('systems.components.common.defaultCounters.hint')}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="col-span-1 sm:col-span-3">
                      <Label className={labelCls}>{t('systems.components.common.defaultCounters.usageHours')}</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="0"
                        className={inputCls}
                        value={formData.initial_usage_hours}
                        onChange={(e) => { if (e.target.value === '' || Number(e.target.value) >= 0) handleChange('initial_usage_hours', e.target.value); }}
                      />
                    </div>
                    {showHours && (
                      <div className="col-span-1 sm:col-span-3">
                        <Label className={labelCls}>{t('systems.components.common.defaultCounters.maintenanceHours')}</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          placeholder="0"
                          className={inputCls}
                          value={formData.initial_maintenance_hours}
                          onChange={(e) => { if (e.target.value === '' || Number(e.target.value) >= 0) handleChange('initial_maintenance_hours', e.target.value); }}
                        />
                      </div>
                    )}
                    {showFlights && (
                      <div className="col-span-1 sm:col-span-3">
                        <Label className={labelCls}>{t('systems.components.common.defaultCounters.maintenanceFlights')}</Label>
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          placeholder="0"
                          className={inputCls}
                          value={formData.initial_maintenance_flights}
                          onChange={(e) => { if (e.target.value === '' || Number(e.target.value) >= 0) handleChange('initial_maintenance_flights', e.target.value); }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="col-span-1 sm:col-span-3">
                    <Label className={labelCls}>{t('systems.components.addComponent.fields.status')}</Label>
                    <Select value={formData.component_status} onValueChange={v => handleChange('component_status', v)}>
                      <SelectTrigger className={selectTriggerCls}><SelectValue /></SelectTrigger>
                      <SelectContent className={selectContentCls}>
                        <SelectItem value="OPERATIONAL">{t('systems.components.common.statusOptions.operational')}</SelectItem>
                        <SelectItem value="NOT_OPERATIONAL">{t('systems.components.common.statusOptions.notOperational')}</SelectItem>
                        <SelectItem value="MAINTENANCE">{t('systems.components.common.statusOptions.maintenance')}</SelectItem>
                        <SelectItem value="DECOMMISSIONED">{t('systems.components.common.statusOptions.decommissioned')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mt-2">
                  <div className="col-span-1 sm:col-span-3">
                    <Label className={labelCls}>{t('systems.components.addComponent.fields.activationDate')}</Label>
                    <Input type="date" className={inputCls} value={formData.component_activation_date} onChange={e => handleChange('component_activation_date', e.target.value)} />
                  </div>
                  <div className="col-span-1 sm:col-span-3">
                    <Label className={labelCls}>{t('systems.components.addComponent.fields.purchaseDate')}</Label>
                    <Input type="date" className={inputCls} value={formData.component_purchase_date} onChange={e => handleChange('component_purchase_date', e.target.value)} />
                  </div>
                  <div className="col-span-1 sm:col-span-3">
                    <Label className={labelCls}>{t('systems.components.common.expiryType.label')} <span className="font-normal opacity-60">{t('systems.components.common.optional')}</span></Label>
                    <Select value={formData.expiry_type} onValueChange={v => handleChange('expiry_type', v)}>
                      <SelectTrigger className={selectTriggerCls}><SelectValue /></SelectTrigger>
                      <SelectContent className={selectContentCls}>
                        <SelectItem value="EXPIRATION_DATE">{t('systems.components.common.expiryType.expirationDate')}</SelectItem>
                        <SelectItem value="FLIGHTS">{t('systems.components.common.expiryType.flights')}</SelectItem>
                        <SelectItem value="MIXED">{t('systems.components.common.expiryType.mixed')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(formData.expiry_type === 'EXPIRATION_DATE' || formData.expiry_type === 'MIXED') && (
                    <div className="col-span-1 sm:col-span-3">
                      <Label className={labelCls}>{t('systems.components.addComponent.fields.expirationDate')}</Label>
                      <Input type="date" className={inputCls} value={formData.expiration_date} onChange={e => handleChange('expiration_date', e.target.value)} />
                      {formData.expiry_type === 'EXPIRATION_DATE' && (
                        <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-500' : 'text-muted-foreground'}`}>{t('systems.components.common.autoDecommissionHint')}</p>
                      )}
                    </div>
                  )}
                  {(formData.expiry_type === 'FLIGHTS' || formData.expiry_type === 'MIXED') && (
                    <div className="col-span-1 sm:col-span-3">
                      <Label className={labelCls}>{t('systems.components.common.expiryType.expirationFlights')}</Label>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        placeholder="e.g. 500"
                        className={inputCls}
                        value={formData.expiration_flights}
                        onChange={e => handleChange('expiration_flights', e.target.value)}
                      />
                      {formData.expiry_type === 'FLIGHTS' && (
                        <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-500' : 'text-muted-foreground'}`}>{t('systems.components.common.expiryType.flightsHint')}</p>
                      )}
                    </div>
                  )}
                  {formData.expiry_type === 'MIXED' && (
                    <div className="col-span-1 sm:col-span-12">
                      <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-muted-foreground'}`}>{t('systems.components.common.expiryType.mixedHint')}</p>
                    </div>
                  )}
                  <div className="col-span-1 sm:col-span-3">
                    <Label className={labelCls}>{t('systems.components.addComponent.fields.vendor')}</Label>
                    <Input className={inputCls} value={formData.component_vendor} onChange={e => handleChange('component_vendor', e.target.value)} />
                  </div>
                  <div className="col-span-1 sm:col-span-3">
                    <Label className={labelCls}>{t('systems.components.addComponent.fields.guarantee')}</Label>
                    <Input type="number" className={inputCls} value={formData.component_guarantee_day} onChange={e => handleChange('component_guarantee_day', e.target.value)} />
                  </div>
                  <div className="col-span-1 sm:col-span-3">
                    <Label className={labelCls}>{t('systems.components.addComponent.fields.batteryRatio')}</Label>
                    <Input type="number" step="0.01" min={0} max={1} placeholder="0.00 – 1.00" className={inputCls} value={formData.battery_cycle_ratio} onChange={e => handleChange('battery_cycle_ratio', e.target.value)} />
                  </div>
                </div>
              </>
            )}

            <div className={`flex justify-end gap-2 pt-2 border-t ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
              <Button type="button" variant="outline" onClick={onClose}
                className={isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}>
                {t('systems.components.editComponent.buttons.cancel')}
              </Button>
              {selectedComponentId && (
                <Button type="submit" disabled={loading} className="bg-violet-600 hover:bg-violet-500 text-white">
                  {loading ? t('systems.components.editComponent.buttons.saving') : t('systems.components.editComponent.buttons.saveChanges')}
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
    <ManageDroneClassesModal
      open={showManageClasses}
      onClose={() => setShowManageClasses(false)}
      classes={droneClasses}
      onReload={reloadDroneClasses}
      isDark={isDark}
    />
    </>
  );
}
