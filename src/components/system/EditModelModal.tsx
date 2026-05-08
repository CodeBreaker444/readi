'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTheme } from '@/components/useTheme';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Skeleton } from '../ui/skeleton';

interface EditModelModalProps {
  open: boolean;
  toolId: number | null;
  onClose: () => void;
  onSuccess: () => void;
  initialModelId?: number | null;
}

function splitModelType(modelType: string): { category: string; subtype: string } {
  if (!modelType) return { category: '', subtype: '' };
  const idx = modelType.indexOf('_');
  if (idx === -1) return { category: modelType, subtype: '' };
  return { category: modelType.slice(0, idx), subtype: modelType.slice(idx + 1) };
}

const EMPTY_FORM = {
  model_category: '',
  model_subtype: '',
  model_code: '',
  model_name: '',
  manufacturer: '',
  version: '',
  max_flight_time: '',
  max_speed: '',
  max_altitude: '',
  weight: '',
  mtom: '',
  wind_min: '',
  wind_max: '',
  temp_min: '',
  temp_max: '',
  endurance_min: '',
  endurance_max: '',
  maintenance_cycle: '',
  maintenance_cycle_hour: '',
  maintenance_cycle_day: '',
  maintenance_cycle_flight: '',
  phase_out: 'N',
  guarantee_years: '',
  specifications: '',
};

export default function EditModelModal({ open, toolId, onClose, onSuccess, initialModelId }: EditModelModalProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [allModels, setAllModels] = useState<any[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [formData, setFormData] = useState(EMPTY_FORM);

  const AIRCRAFT_SUBTYPES = [
    { value: 'MULTIROTOR',    label: t('systems.components.addModel.subtypeOptions.multirotor') },
    { value: 'FIXED_WING',   label: t('systems.components.addModel.subtypeOptions.fixedWing') },
    { value: 'VTOL',         label: t('systems.components.addModel.subtypeOptions.vtol') },
    { value: 'HELICOPTER',   label: t('systems.components.addModel.subtypeOptions.helicopter') },
    { value: 'SINGLE_ROTOR', label: t('systems.components.addModel.subtypeOptions.singleRotor') },
  ];

  const DOCK_SUBTYPES = [
    { value: 'INDOOR',   label: t('systems.components.addModel.subtypeOptions.indoorDock') },
    { value: 'OUTDOOR',  label: t('systems.components.addModel.subtypeOptions.outdoorDock') },
    { value: 'MOBILE',   label: t('systems.components.addModel.subtypeOptions.mobileDock') },
    { value: 'PORTABLE', label: t('systems.components.addModel.subtypeOptions.portableDock') },
  ];

  useEffect(() => {
    if (open) {
      if (initialModelId) {
        fetchAllModelsAndSelect(initialModelId);
      } else if (toolId) {
        fetchModelsForTool();
      } else {
        setAllModels([]);
        setSelectedModelId('');
        setFormData(EMPTY_FORM);
      }
    } else {
      setAllModels([]);
      setSelectedModelId('');
      setFormData(EMPTY_FORM);
    }
  }, [open, toolId, initialModelId]);

  const fetchModelsForTool = async () => {
    setFetching(true);
    try {
      const [compRes, modelRes] = await Promise.all([
        fetch('/api/system/component/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool_id: toolId }),
        }),
        fetch('/api/system/model/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }),
      ]);

      const compResult = await compRes.json();
      const modelResult = await modelRes.json();

      if (modelResult.code === 1) {
        const models: any[] = modelResult.data || [];
        if (compResult.code === 1 && compResult.data?.length > 0) {
          const usedModelIds = new Set(
            compResult.data.map((c: any) => c.fk_tool_model_id).filter(Boolean)
          );
          const filtered = models.filter(m => usedModelIds.has(m.tool_model_id));
          setAllModels(filtered.length > 0 ? filtered : models);
        } else {
          setAllModels(models);
        }
      }
    } catch {
      toast.error(t('systems.components.editModel.toasts.loadError'));
    } finally {
      setFetching(false);
    }
  };

  const fetchAllModelsAndSelect = async (modelId: number) => {
    setFetching(true);
    try {
      const modelRes = await fetch('/api/system/model/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const modelResult = await modelRes.json();
      if (modelResult.code === 1) {
        const models: any[] = modelResult.data || [];
        setAllModels(models);
        const model = models.find(m => m.tool_model_id === modelId);
        if (model) {
          setSelectedModelId(String(modelId));
          populateForm(model);
        }
      }
    } catch {
      toast.error(t('systems.components.editModel.toasts.loadModelError'));
    } finally {
      setFetching(false);
    }
  };

  const parseNotes = (notes: string) => {
    const parsed: Record<string, string> = {};
    const knownPatterns: [string, RegExp][] = [
      ['version',                /^Version:\s*(.+)$/],
      ['mtom',                   /^MTOM:\s*([\d.]+)\s*kg$/],
      ['wind_min',               /^Wind Min:\s*([\d.]+)\s*m\/s$/],
      ['wind_max',               /^Wind Max:\s*([\d.]+)\s*m\/s$/],
      ['temp_min',               /^Temp Min:\s*(-?[\d.]+)\s*°C$/],
      ['temp_max',               /^Temp Max:\s*(-?[\d.]+)\s*°C$/],
      ['endurance_min',          /^Endurance Min:\s*([\d.]+)\s*min$/],
      ['endurance_max',          /^Endurance Max:\s*([\d.]+)\s*min$/],
      ['maintenance_cycle',      /^Maintenance Cycle:\s*(.+)$/],
      ['maintenance_cycle_hour', /^Maint\. Hours:\s*([\d.]+)$/],
      ['maintenance_cycle_day',  /^Maint\. Days:\s*([\d.]+)$/],
      ['maintenance_cycle_flight',/^Maint\. Flights:\s*([\d.]+)$/],
      ['phase_out',              /^Phase-out:\s*(.+)$/],
      ['guarantee_years',        /^Guarantee:\s*([\d.]+)\s*years$/],
    ];

    const lines = notes.split('\n');
    const remainingLines: string[] = [];

    for (const line of lines) {
      let matched = false;
      for (const [key, regex] of knownPatterns) {
        const m = line.match(regex);
        if (m) {
          parsed[key] = m[1].trim();
          matched = true;
          break;
        }
      }
      if (!matched) remainingLines.push(line);
    }

    parsed['extra'] = remainingLines.join('\n').trim();
    return parsed;
  };

  const populateForm = (model: any) => {
    const specs = model.specifications || {};
    const notes = typeof specs.notes === 'string' ? specs.notes : '';
    const parsed = notes ? parseNotes(notes) : {};
    const { category, subtype } = splitModelType(model.model_type || '');

    setFormData({
      model_category: category,
      model_subtype: subtype,
      manufacturer: model.factory_type || '',
      model_code: model.factory_serie || '',
      model_name: model.factory_model || '',
      version: model.version || parsed.version || '',
      max_flight_time: model.max_flight_time ? String(model.max_flight_time) : (specs.max_flight_time ? String(specs.max_flight_time) : ''),
      max_speed: model.max_speed ? String(model.max_speed) : (specs.max_speed ? String(specs.max_speed) : ''),
      max_altitude: model.max_altitude ? String(model.max_altitude) : (specs.max_altitude ? String(specs.max_altitude) : ''),
      weight: model.weight ? String(model.weight) : (specs.weight ? String(specs.weight) : ''),
      mtom: model.mtom ? String(model.mtom) : (parsed.mtom || ''),
      wind_min: model.wind_min ? String(model.wind_min) : (parsed.wind_min || ''),
      wind_max: model.wind_max ? String(model.wind_max) : (parsed.wind_max || ''),
      temp_min: model.temp_min ? String(model.temp_min) : (parsed.temp_min || ''),
      temp_max: model.temp_max ? String(model.temp_max) : (parsed.temp_max || ''),
      endurance_min: model.endurance_min ? String(model.endurance_min) : (parsed.endurance_min || ''),
      endurance_max: model.endurance_max ? String(model.endurance_max) : (parsed.endurance_max || ''),
      maintenance_cycle: model.maintenance_cycle || parsed.maintenance_cycle || '',
      maintenance_cycle_hour: model.maintenance_cycle_hour ? String(model.maintenance_cycle_hour) : (parsed.maintenance_cycle_hour || ''),
      maintenance_cycle_day: model.maintenance_cycle_day ? String(model.maintenance_cycle_day) : (parsed.maintenance_cycle_day || ''),
      maintenance_cycle_flight: model.maintenance_cycle_flight ? String(model.maintenance_cycle_flight) : (parsed.maintenance_cycle_flight || ''),
      phase_out: model.phase_out || (parsed.phase_out === 'Yes' ? 'Y' : 'N'),
      guarantee_years: model.guarantee_years ? String(model.guarantee_years) : (parsed.guarantee_years || ''),
      specifications: parsed.extra || '',
    });
  };

  const handleModelSelect = (modelId: string) => {
    setSelectedModelId(modelId);
    const model = allModels.find(m => String(m.tool_model_id) === modelId);
    if (model) populateForm(model);
  };

  const handleChange = (field: string, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const handleCategoryChange = (value: string) =>
    setFormData(prev => ({ ...prev, model_category: value, model_subtype: '' }));

  const handleCycleChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      maintenance_cycle: value,
      maintenance_cycle_hour: '',
      maintenance_cycle_day: '',
      maintenance_cycle_flight: '',
    }));
  };

  const handleCycleInput = (field: string, value: string) => {
    const num = Number(value);
    if (value === '' || num >= 0) handleChange(field, value);
  };

  const showHours   = formData.maintenance_cycle === 'HOURS'   || formData.maintenance_cycle === 'MIXED';
  const showDays    = formData.maintenance_cycle === 'DAYS'    || formData.maintenance_cycle === 'MIXED';
  const showFlights = formData.maintenance_cycle === 'FLIGHTS' || formData.maintenance_cycle === 'MIXED';
  const showNone    = formData.maintenance_cycle === 'NONE';

  const subtypeOptions = formData.model_category === 'AIRCRAFT'
    ? AIRCRAFT_SUBTYPES
    : formData.model_category === 'DOCK'
    ? DOCK_SUBTYPES
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModelId) { toast.error(t('systems.components.editModel.toasts.selectModel')); return; }
    if (!formData.model_category) { toast.error(t('systems.components.editModel.toasts.selectType')); return; }
    if (!formData.model_subtype)   { toast.error(t('systems.components.editModel.toasts.selectSubType')); return; }
    if (!formData.manufacturer.trim()) { toast.error(t('systems.components.editModel.toasts.manufacturerRequired')); return; }
    if (!formData.model_code.trim()) { toast.error(t('systems.components.editModel.toasts.modelCodeRequired')); return; }
    if (!formData.model_name.trim()) { toast.error(t('systems.components.editModel.toasts.modelNameRequired')); return; }

    setLoading(true);
    try {
      const combinedModelType = `${formData.model_category}_${formData.model_subtype}`;

      const extendedSpecs = [
        formData.version              && `Version: ${formData.version}`,
        formData.mtom                 && `MTOM: ${formData.mtom} kg`,
        formData.wind_min             && `Wind Min: ${formData.wind_min} m/s`,
        formData.wind_max             && `Wind Max: ${formData.wind_max} m/s`,
        formData.temp_min             && `Temp Min: ${formData.temp_min} °C`,
        formData.temp_max             && `Temp Max: ${formData.temp_max} °C`,
        formData.endurance_min        && `Endurance Min: ${formData.endurance_min} min`,
        formData.endurance_max        && `Endurance Max: ${formData.endurance_max} min`,
        formData.maintenance_cycle    && `Maintenance Cycle: ${formData.maintenance_cycle}`,
        formData.maintenance_cycle_hour   && `Maint. Hours: ${formData.maintenance_cycle_hour}`,
        formData.maintenance_cycle_day    && `Maint. Days: ${formData.maintenance_cycle_day}`,
        formData.maintenance_cycle_flight && `Maint. Flights: ${formData.maintenance_cycle_flight}`,
        formData.phase_out === 'Y'    && `Phase-out: Yes`,
        formData.guarantee_years      && `Guarantee: ${formData.guarantee_years} years`,
        formData.specifications,
      ]
        .filter(Boolean)
        .join('\n');

      const payload = {
        manufacturer:    formData.manufacturer.trim(),
        model_code:      formData.model_code.trim(),
        model_name:      formData.model_name.trim(),
        model_type:      combinedModelType || null,
        notes:           extendedSpecs || null,
        max_flight_time: formData.max_flight_time ? Number(formData.max_flight_time) : null,
        max_speed:       formData.max_speed       ? Number(formData.max_speed)       : null,
        max_altitude:    formData.max_altitude    ? Number(formData.max_altitude)    : null,
        weight:          formData.weight          ? Number(formData.weight)          : null,
      };

      const res = await fetch(`/api/system/model/${selectedModelId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.code === 1) {
        toast.success(t('systems.components.editModel.toasts.updateSuccess'));
        onSuccess();
      } else {
        toast.error(result.message || t('systems.components.editModel.toasts.updateFailed'));
      }
    } catch {
      toast.error(t('systems.components.editModel.toasts.updateError'));
    } finally {
      setLoading(false);
    }
  };

  const inputCls = isDark ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-500' : 'bg-gray-50 border-gray-200 text-gray-900';
  const selectTriggerCls = isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : '';
  const selectContentCls = isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : '';
  const labelCls = `pb-2 text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-600'}`;
  const sectionLabelCls = `text-sm font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-muted-foreground'}`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`!max-w-[900px] w-[90vw] h-[90vh] overflow-y-auto ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}>
        <DialogHeader className={`border-b pb-3 ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
          <DialogTitle className={isDark ? 'text-white' : ''}>{t('systems.components.editModel.title')}</DialogTitle>
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
            <div className="flex justify-end gap-2 pt-2 border-t border-transparent">
              <Skeleton className={`h-10 w-24 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
              <Skeleton className={`h-10 w-32 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <p className={sectionLabelCls}>{t('systems.components.editModel.selectModelLabel')}</p>
              <Select value={selectedModelId} onValueChange={handleModelSelect}>
                <SelectTrigger className={selectTriggerCls}>
                  <SelectValue placeholder={t('systems.components.editModel.selectModelPlaceholder')} />
                </SelectTrigger>
                <SelectContent className={selectContentCls}>
                  {allModels.map(m => (
                    <SelectItem key={m.tool_model_id} value={String(m.tool_model_id)}>
                      {m.factory_type} — {m.factory_serie} — {m.factory_model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedModelId && (
              <>
                <div>
                  <p className={sectionLabelCls}>{t('systems.components.addModel.sections.identification')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="col-span-1 sm:col-span-3">
                      <Label className={labelCls}>{t('systems.components.addModel.fields.componentType')}</Label>
                      <Select value={formData.model_category} onValueChange={handleCategoryChange}>
                        <SelectTrigger className={selectTriggerCls}>
                          <SelectValue placeholder={t('systems.components.addModel.placeholders.selectType')} />
                        </SelectTrigger>
                        <SelectContent className={selectContentCls}>
                          <SelectItem value="AIRCRAFT">{t('systems.components.addModel.categoryOptions.aircraft')}</SelectItem>
                          <SelectItem value="DOCK">{t('systems.components.addModel.categoryOptions.dock')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 sm:col-span-3">
                      <Label className={labelCls}>{t('systems.components.addModel.fields.subType')}</Label>
                      <Select
                        value={formData.model_subtype}
                        onValueChange={v => handleChange('model_subtype', v)}
                        disabled={!formData.model_category}
                      >
                        <SelectTrigger className={selectTriggerCls}>
                          <SelectValue placeholder={formData.model_category ? t('systems.components.addModel.placeholders.selectSubType') : t('systems.components.addModel.placeholders.selectTypeFirst')} />
                        </SelectTrigger>
                        <SelectContent className={selectContentCls}>
                          {subtypeOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 sm:col-span-3">
                      <Label className={labelCls}>{t('systems.components.addModel.fields.brand')}</Label>
                      <Input className={inputCls} value={formData.manufacturer} onChange={e => handleChange('manufacturer', e.target.value)} required />
                    </div>
                    <div className="col-span-1 sm:col-span-3">
                      <Label className={labelCls}>{t('systems.components.addModel.fields.serie')}</Label>
                      <Input className={inputCls} value={formData.model_code} onChange={e => handleChange('model_code', e.target.value)} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mt-3">
                    <div className="col-span-1 sm:col-span-3">
                      <Label className={labelCls}>{t('systems.components.addModel.fields.modelName')}</Label>
                      <Input className={inputCls} value={formData.model_name} onChange={e => handleChange('model_name', e.target.value)} required />
                    </div>
                  </div>
                </div>

                <div>
                  <p className={sectionLabelCls}>{t('systems.components.addModel.sections.classificationWeight')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="col-span-1 sm:col-span-4">
                      <Label className={labelCls}>{t('systems.components.addModel.fields.version')}</Label>
                      <Input className={inputCls} value={formData.version} onChange={e => handleChange('version', e.target.value)} />
                    </div>
                    <div className="col-span-1 sm:col-span-4">
                      <Label className={labelCls}>{t('systems.components.addModel.fields.mtom')}</Label>
                      <Input type="number" step="0.01" className={inputCls} value={formData.mtom} onChange={e => handleChange('mtom', e.target.value)} />
                    </div>
                    <div className="col-span-1 sm:col-span-4">
                      <Label className={labelCls}>{t('systems.components.addModel.fields.weight')}</Label>
                      <Input type="number" step="0.01" className={inputCls} value={formData.weight} onChange={e => handleChange('weight', e.target.value)} />
                    </div>
                  </div>
                </div>

                <div>
                  <p className={sectionLabelCls}>{t('systems.components.addModel.sections.operatingConditions')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="col-span-1 sm:col-span-3">
                      <Label className={labelCls}>{t('systems.components.addModel.fields.windMin')}</Label>
                      <Input type="number" step="0.1" className={inputCls} value={formData.wind_min} onChange={e => handleChange('wind_min', e.target.value)} />
                    </div>
                    <div className="col-span-1 sm:col-span-3">
                      <Label className={labelCls}>{t('systems.components.addModel.fields.windMax')}</Label>
                      <Input type="number" step="0.1" className={inputCls} value={formData.wind_max} onChange={e => handleChange('wind_max', e.target.value)} />
                    </div>
                    <div className="col-span-1 sm:col-span-3">
                      <Label className={labelCls}>{t('systems.components.addModel.fields.tempMin')}</Label>
                      <Input type="number" step="0.1" className={inputCls} value={formData.temp_min} onChange={e => handleChange('temp_min', e.target.value)} />
                    </div>
                    <div className="col-span-1 sm:col-span-3">
                      <Label className={labelCls}>{t('systems.components.addModel.fields.tempMax')}</Label>
                      <Input type="number" step="0.1" className={inputCls} value={formData.temp_max} onChange={e => handleChange('temp_max', e.target.value)} />
                    </div>
                  </div>
                </div>

                <div>
                  <p className={sectionLabelCls}>{t('systems.components.addModel.sections.performance')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="col-span-1 sm:col-span-3">
                      <Label className={labelCls}>{t('systems.components.addModel.fields.enduranceMin')}</Label>
                      <Input type="number" className={inputCls} value={formData.endurance_min} onChange={e => handleChange('endurance_min', e.target.value)} />
                    </div>
                    <div className="col-span-1 sm:col-span-3">
                      <Label className={labelCls}>{t('systems.components.addModel.fields.enduranceMax')}</Label>
                      <Input type="number" className={inputCls} value={formData.endurance_max} onChange={e => handleChange('endurance_max', e.target.value)} />
                    </div>
                    <div className="col-span-1 sm:col-span-3">
                      <Label className={labelCls}>{t('systems.components.addModel.fields.maxSpeed')}</Label>
                      <Input type="number" className={inputCls} value={formData.max_speed} onChange={e => handleChange('max_speed', e.target.value)} />
                    </div>
                    <div className="col-span-1 sm:col-span-3">
                      <Label className={labelCls}>{t('systems.components.addModel.fields.maxAltitude')}</Label>
                      <Input type="number" className={inputCls} value={formData.max_altitude} onChange={e => handleChange('max_altitude', e.target.value)} />
                    </div>
                  </div>
                </div>

                <div>
                  <p className={sectionLabelCls}>{t('systems.components.addModel.sections.maintenance')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="col-span-1 sm:col-span-3">
                      <Label className={labelCls}>{t('systems.components.addModel.fields.phaseOut')}</Label>
                      <Select value={formData.phase_out} onValueChange={v => handleChange('phase_out', v)}>
                        <SelectTrigger className={selectTriggerCls}><SelectValue /></SelectTrigger>
                        <SelectContent className={selectContentCls}>
                          <SelectItem value="N">{t('systems.components.common.phaseOutOptions.no')}</SelectItem>
                          <SelectItem value="Y">{t('systems.components.common.phaseOutOptions.yes')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 sm:col-span-3">
                      <Label className={labelCls}>{t('systems.components.addModel.fields.maintenanceCycle')}</Label>
                      <Select value={formData.maintenance_cycle} onValueChange={handleCycleChange}>
                        <SelectTrigger className={selectTriggerCls}>
                          <SelectValue placeholder={t('systems.components.common.select')} />
                        </SelectTrigger>
                        <SelectContent className={selectContentCls}>
                          <SelectItem value="HOURS">{t('systems.components.common.maintenanceCycle.hours')}</SelectItem>
                          <SelectItem value="DAYS">{t('systems.components.common.maintenanceCycle.days')}</SelectItem>
                          <SelectItem value="FLIGHTS">{t('systems.components.common.maintenanceCycle.flights')}</SelectItem>
                          <SelectItem value="MIXED">{t('systems.components.common.maintenanceCycle.mixed')}</SelectItem>
                          <SelectItem value="NONE">{t('systems.components.common.maintenanceCycle.none')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {showNone && (
                      <div className="col-span-1 sm:col-span-6 flex items-end">
                        <span className={`inline-flex items-center px-3 py-2 rounded-md text-sm ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-muted text-muted-foreground'}`}>
                          {t('systems.components.common.maintenanceCycle.noCycleRequired')}
                        </span>
                      </div>
                    )}
                    {showHours && (
                      <div className="col-span-1 sm:col-span-2">
                        <Label className={labelCls}>{t('systems.components.common.maintenanceCycle.hoursLimit')}</Label>
                        <Input type="number" min={0} className={inputCls} value={formData.maintenance_cycle_hour}
                          onChange={e => handleCycleInput('maintenance_cycle_hour', e.target.value)} />
                      </div>
                    )}
                    {showDays && (
                      <div className="col-span-1 sm:col-span-2">
                        <Label className={labelCls}>{t('systems.components.common.maintenanceCycle.daysLimit')}</Label>
                        <Input type="number" min={0} className={inputCls} value={formData.maintenance_cycle_day}
                          onChange={e => handleCycleInput('maintenance_cycle_day', e.target.value)} />
                      </div>
                    )}
                    {showFlights && (
                      <div className="col-span-1 sm:col-span-2">
                        <Label className={labelCls}>{t('systems.components.common.maintenanceCycle.flightsLimit')}</Label>
                        <Input type="number" min={0} className={inputCls} value={formData.maintenance_cycle_flight}
                          onChange={e => handleCycleInput('maintenance_cycle_flight', e.target.value)} />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <p className={sectionLabelCls}>{t('systems.components.addModel.sections.guaranteeNotes')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="col-span-1 sm:col-span-3">
                      <Label className={labelCls}>{t('systems.components.addModel.fields.guaranteeYears')}</Label>
                      <Input type="number" step="0.1" className={inputCls} value={formData.guarantee_years} onChange={e => handleChange('guarantee_years', e.target.value)} />
                    </div>
                    <div className="col-span-1 sm:col-span-3">
                      <Label className={labelCls}>{t('systems.components.addModel.fields.maxFlightTime')}</Label>
                      <Input type="number" className={inputCls} value={formData.max_flight_time} onChange={e => handleChange('max_flight_time', e.target.value)} />
                    </div>
                    <div className="col-span-1 sm:col-span-6">
                      <Label className={labelCls}>{t('systems.components.addModel.fields.additionalSpecs')}</Label>
                      <Textarea
                        className={inputCls}
                        value={formData.specifications}
                        onChange={e => handleChange('specifications', e.target.value)}
                        rows={2}
                        placeholder={t('systems.components.addModel.placeholders.additionalNotes')}
                      />
                    </div>
                  </div>
                </div>

                <div className={`flex justify-end gap-2 pt-2 border-t ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
                  <Button type="button" variant="outline" onClick={onClose}
                    className={isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}>
                    {t('systems.components.editModel.buttons.cancel')}
                  </Button>
                  <Button type="submit" disabled={loading} className="bg-violet-600 hover:bg-violet-500 text-white">
                    {loading ? t('systems.components.editModel.buttons.saving') : t('systems.components.editModel.buttons.saveChanges')}
                  </Button>
                </div>
              </>
            )}

            {!selectedModelId && (
              <div className={`flex justify-end pt-2 border-t ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
                <Button type="button" variant="outline" onClick={onClose}
                  className={isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}>
                  {t('systems.components.editModel.buttons.cancel')}
                </Button>
              </div>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
