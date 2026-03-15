'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTheme } from '@/components/useTheme';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Skeleton } from '../ui/skeleton';

interface EditModelModalProps {
  open: boolean;
  toolId: number | null;
  onClose: () => void;
  onSuccess: () => void;
  initialModelId?: number | null;
}

const AIRCRAFT_SUBTYPES = [
  { value: 'MULTIROTOR',    label: 'Multirotor / Drone' },
  { value: 'FIXED_WING',   label: 'Fixed Wing' },
  { value: 'VTOL',         label: 'VTOL' },
  { value: 'HELICOPTER',   label: 'Helicopter' },
  { value: 'SINGLE_ROTOR', label: 'Single Rotor' },
];

const DOCK_SUBTYPES = [
  { value: 'INDOOR',   label: 'Indoor Dock' },
  { value: 'OUTDOOR',  label: 'Outdoor Dock' },
  { value: 'MOBILE',   label: 'Mobile Dock' },
  { value: 'PORTABLE', label: 'Portable Dock' },
];

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
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [allModels, setAllModels] = useState<any[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [formData, setFormData] = useState(EMPTY_FORM);

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
      toast.error('Error loading models');
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
      toast.error('Error loading model');
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

  const handleCycleInput = (field: string, value: string, max: number) => {
    const num = Number(value);
    if (value === '' || (num >= 0 && num <= max)) handleChange(field, value);
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
    if (!selectedModelId) { toast.error('Please select a model'); return; }
    if (!formData.model_category) { toast.error('Please select a component type'); return; }
    if (!formData.model_subtype)   { toast.error('Please select a sub-type'); return; }
    if (!formData.manufacturer.trim()) { toast.error('Manufacturer (Brand) is required'); return; }
    if (!formData.model_code.trim()) { toast.error('Model code (Serie) is required'); return; }
    if (!formData.model_name.trim()) { toast.error('Model name is required'); return; }

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
        toast.success('Model updated successfully');
        onSuccess();
      } else {
        toast.error(result.message || 'Failed to update model');
      }
    } catch {
      toast.error('Error updating model');
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
      <DialogContent className={`!max-w-[900px] w-[90vw] max-h-[90vh] overflow-y-auto ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}>
        <DialogHeader className={`border-b pb-3 ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
          <DialogTitle className={isDark ? 'text-white' : ''}>Edit Model</DialogTitle>
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
            <div className="flex justify-end gap-2 pt-2 border-t border-transparent">
              <Skeleton className={`h-10 w-24 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
              <Skeleton className={`h-10 w-32 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <p className={sectionLabelCls}>Select Model to Edit</p>
              <Select value={selectedModelId} onValueChange={handleModelSelect}>
                <SelectTrigger className={selectTriggerCls}>
                  <SelectValue placeholder="Select a model..." />
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
                {/* Identification */}
                <div>
                  <p className={sectionLabelCls}>Identification</p>
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-3">
                      <Label className={labelCls}>Component Type *</Label>
                      <Select value={formData.model_category} onValueChange={handleCategoryChange}>
                        <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent className={selectContentCls}>
                          <SelectItem value="AIRCRAFT">Aircraft</SelectItem>
                          <SelectItem value="DOCK">Dock</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Label className={labelCls}>Sub-Type *</Label>
                      <Select
                        value={formData.model_subtype}
                        onValueChange={v => handleChange('model_subtype', v)}
                        disabled={!formData.model_category}
                      >
                        <SelectTrigger className={selectTriggerCls}>
                          <SelectValue placeholder={formData.model_category ? 'Select sub-type' : 'Select type first'} />
                        </SelectTrigger>
                        <SelectContent className={selectContentCls}>
                          {subtypeOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Label className={labelCls}>Brand (Manufacturer) *</Label>
                      <Input className={inputCls} value={formData.manufacturer} onChange={e => handleChange('manufacturer', e.target.value)} required />
                    </div>
                    <div className="col-span-3">
                      <Label className={labelCls}>Serie (Model Code) *</Label>
                      <Input className={inputCls} value={formData.model_code} onChange={e => handleChange('model_code', e.target.value)} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-3 mt-3">
                    <div className="col-span-3">
                      <Label className={labelCls}>Model (Name) *</Label>
                      <Input className={inputCls} value={formData.model_name} onChange={e => handleChange('model_name', e.target.value)} required />
                    </div>
                  </div>
                </div>

                {/* Classification & Weight */}
                <div>
                  <p className={sectionLabelCls}>Classification & Weight</p>
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-4">
                      <Label className={labelCls}>Version</Label>
                      <Input className={inputCls} value={formData.version} onChange={e => handleChange('version', e.target.value)} />
                    </div>
                    <div className="col-span-4">
                      <Label className={labelCls}>MTOM (kg)</Label>
                      <Input type="number" step="0.01" className={inputCls} value={formData.mtom} onChange={e => handleChange('mtom', e.target.value)} />
                    </div>
                    <div className="col-span-4">
                      <Label className={labelCls}>Weight (kg)</Label>
                      <Input type="number" step="0.01" className={inputCls} value={formData.weight} onChange={e => handleChange('weight', e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Operating Conditions */}
                <div>
                  <p className={sectionLabelCls}>Operating Conditions</p>
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-3">
                      <Label className={labelCls}>Wind Min (m/s)</Label>
                      <Input type="number" step="0.1" className={inputCls} value={formData.wind_min} onChange={e => handleChange('wind_min', e.target.value)} />
                    </div>
                    <div className="col-span-3">
                      <Label className={labelCls}>Wind Max (m/s)</Label>
                      <Input type="number" step="0.1" className={inputCls} value={formData.wind_max} onChange={e => handleChange('wind_max', e.target.value)} />
                    </div>
                    <div className="col-span-3">
                      <Label className={labelCls}>Temp Min (°C)</Label>
                      <Input type="number" step="0.1" className={inputCls} value={formData.temp_min} onChange={e => handleChange('temp_min', e.target.value)} />
                    </div>
                    <div className="col-span-3">
                      <Label className={labelCls}>Temp Max (°C)</Label>
                      <Input type="number" step="0.1" className={inputCls} value={formData.temp_max} onChange={e => handleChange('temp_max', e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Performance */}
                <div>
                  <p className={sectionLabelCls}>Performance</p>
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-3">
                      <Label className={labelCls}>Endurance Min (min)</Label>
                      <Input type="number" className={inputCls} value={formData.endurance_min} onChange={e => handleChange('endurance_min', e.target.value)} />
                    </div>
                    <div className="col-span-3">
                      <Label className={labelCls}>Endurance Max (min)</Label>
                      <Input type="number" className={inputCls} value={formData.endurance_max} onChange={e => handleChange('endurance_max', e.target.value)} />
                    </div>
                    <div className="col-span-3">
                      <Label className={labelCls}>Max Speed (km/h)</Label>
                      <Input type="number" className={inputCls} value={formData.max_speed} onChange={e => handleChange('max_speed', e.target.value)} />
                    </div>
                    <div className="col-span-3">
                      <Label className={labelCls}>Max Altitude (m)</Label>
                      <Input type="number" className={inputCls} value={formData.max_altitude} onChange={e => handleChange('max_altitude', e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Maintenance */}
                <div>
                  <p className={sectionLabelCls}>Maintenance</p>
                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-3">
                      <Label className={labelCls}>Phase-out</Label>
                      <Select value={formData.phase_out} onValueChange={v => handleChange('phase_out', v)}>
                        <SelectTrigger className={selectTriggerCls}><SelectValue /></SelectTrigger>
                        <SelectContent className={selectContentCls}>
                          <SelectItem value="N">No</SelectItem>
                          <SelectItem value="Y">Yes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Label className={labelCls}>Maintenance Cycle</Label>
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
                      <div className="col-span-6 flex items-end">
                        <span className={`inline-flex items-center px-3 py-2 rounded-md text-sm ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-muted text-muted-foreground'}`}>
                          No maintenance cycle required
                        </span>
                      </div>
                    )}
                    {showHours && (
                      <div className="col-span-2">
                        <Label className={labelCls}>Hours Limit<span className="text-xs text-muted-foreground">(0–24)</span></Label>
                        <Input type="number" min={0} max={24} className={inputCls} value={formData.maintenance_cycle_hour}
                          onChange={e => handleCycleInput('maintenance_cycle_hour', e.target.value, 24)} placeholder="0–24" />
                      </div>
                    )}
                    {showDays && (
                      <div className="col-span-2">
                        <Label className={labelCls}>Days Limit<span className="text-xs text-muted-foreground">(0–30)</span></Label>
                        <Input type="number" min={0} max={30} className={inputCls} value={formData.maintenance_cycle_day}
                          onChange={e => handleCycleInput('maintenance_cycle_day', e.target.value, 30)} placeholder="0–30" />
                      </div>
                    )}
                    {showFlights && (
                      <div className="col-span-2">
                        <Label className={labelCls}>Flights Limit<span className="text-xs text-muted-foreground">(0–10)</span></Label>
                        <Input type="number" min={0} max={10} className={inputCls} value={formData.maintenance_cycle_flight}
                          onChange={e => handleCycleInput('maintenance_cycle_flight', e.target.value, 10)} placeholder="0–10" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Guarantee & Notes */}
                <div>
                  <p className={sectionLabelCls}>Guarantee & Notes</p>
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-3">
                      <Label className={labelCls}>Guarantee (years)</Label>
                      <Input type="number" step="0.1" className={inputCls} value={formData.guarantee_years} onChange={e => handleChange('guarantee_years', e.target.value)} />
                    </div>
                    <div className="col-span-3">
                      <Label className={labelCls}>Max Flight Time (min)</Label>
                      <Input type="number" className={inputCls} value={formData.max_flight_time} onChange={e => handleChange('max_flight_time', e.target.value)} />
                    </div>
                    <div className="col-span-6">
                      <Label className={labelCls}>Additional Specifications</Label>
                      <Textarea
                        className={inputCls}
                        value={formData.specifications}
                        onChange={e => handleChange('specifications', e.target.value)}
                        rows={2}
                        placeholder="Additional notes..."
                      />
                    </div>
                  </div>
                </div>

                <div className={`flex justify-end gap-2 pt-2 border-t ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
                  <Button type="button" variant="outline" onClick={onClose}
                    className={isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}>Cancel</Button>
                  <Button type="submit" disabled={loading} className="bg-violet-600 hover:bg-violet-500 text-white">
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </>
            )}

            {!selectedModelId && (
              <div className={`flex justify-end pt-2 border-t ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
                <Button type="button" variant="outline" onClick={onClose}
                  className={isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}>Cancel</Button>
              </div>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
