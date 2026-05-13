'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface AddModelModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const INITIAL_FORM = {
  model_category: '',
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

export default function AddModelModal({ open, onClose, onSuccess }: AddModelModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);

  const AIRCRAFT_SUBTYPES = [
    { value: 'MULTIROTOR',    label: t('systems.components.addModel.subtypeOptions.multirotor') },
    { value: 'FIXED_WING',   label: t('systems.components.addModel.subtypeOptions.fixedWing') },
    { value: 'VTOL',         label: t('systems.components.addModel.subtypeOptions.vtol') },
    { value: 'HELICOPTER',   label: t('systems.components.addModel.subtypeOptions.helicopter') },
    { value: 'SINGLE_ROTOR', label: t('systems.components.addModel.subtypeOptions.singleRotor') },
  ];

  const DOCK_SUBTYPES = [
    { value: 'INDOOR',    label: t('systems.components.addModel.subtypeOptions.indoorDock') },
    { value: 'OUTDOOR',   label: t('systems.components.addModel.subtypeOptions.outdoorDock') },
    { value: 'MOBILE',    label: t('systems.components.addModel.subtypeOptions.mobileDock') },
    { value: 'PORTABLE',  label: t('systems.components.addModel.subtypeOptions.portableDock') },
  ];

  useEffect(() => {
    if (open) {
      setFormData(INITIAL_FORM);
    }
  }, [open]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCategoryChange = (value: string) => {
    setFormData((prev) => ({ ...prev, model_category: value, model_subtype: '' }));
  };

  const handleCycleChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      maintenance_cycle: value,
      maintenance_cycle_hour: '',
      maintenance_cycle_day: '',
      maintenance_cycle_flight: '',
    }));
  };

  const handleCycleInput = (field: string, value: string ) => {
    const num = Number(value);
    if (value === '' || num >= 0  ) {
      handleChange(field, value);
    }
  };

  const showHours    = formData.maintenance_cycle === 'HOURS'   || formData.maintenance_cycle === 'MIXED';
  const showDays     = formData.maintenance_cycle === 'DAYS'    || formData.maintenance_cycle === 'MIXED';
  const showFlights  = formData.maintenance_cycle === 'FLIGHTS' || formData.maintenance_cycle === 'MIXED';
  const showNone     = formData.maintenance_cycle === 'NONE';

  const subtypeOptions = formData.model_category === 'AIRCRAFT'
    ? AIRCRAFT_SUBTYPES
    : formData.model_category === 'DOCK'
    ? DOCK_SUBTYPES
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.model_category) { toast.error(t('systems.components.addModel.toasts.selectType')); return; }
    if (!formData.model_code.trim()) { toast.error(t('systems.components.addModel.toasts.modelCodeRequired')); return; }
    if (!formData.model_name.trim()) { toast.error(t('systems.components.addModel.toasts.modelNameRequired')); return; }
    if (!formData.manufacturer.trim()) { toast.error(t('systems.components.addModel.toasts.manufacturerRequired')); return; }

    if (formData.wind_min && formData.wind_max && Number(formData.wind_min) > Number(formData.wind_max)) {
      toast.error(t('systems.components.addModel.toasts.windMinMax')); return;
    }
    if (formData.temp_min && formData.temp_max && Number(formData.temp_min) > Number(formData.temp_max)) {
      toast.error(t('systems.components.addModel.toasts.tempMinMax')); return;
    }
    if (formData.endurance_min && formData.endurance_max && Number(formData.endurance_min) > Number(formData.endurance_max)) {
      toast.error(t('systems.components.addModel.toasts.enduranceMinMax')); return;
    }
    if (formData.max_flight_time && Number(formData.max_flight_time) <= 0) {
      toast.error(t('systems.components.addModel.toasts.flightTimePositive')); return;
    }
    if (formData.max_speed && Number(formData.max_speed) <= 0) {
      toast.error(t('systems.components.addModel.toasts.speedPositive')); return;
    }
    if (formData.max_altitude && Number(formData.max_altitude) <= 0) {
      toast.error(t('systems.components.addModel.toasts.altitudePositive')); return;
    }
    if (formData.weight && Number(formData.weight) <= 0) {
      toast.error(t('systems.components.addModel.toasts.weightPositive')); return;
    }

    setLoading(true);

    try {

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
        model_code:      formData.model_code.trim(),
        model_name:      formData.model_name.trim(),
        manufacturer:    formData.manufacturer.trim(),
        specifications:  extendedSpecs || undefined,
        max_flight_time: formData.max_flight_time ? Number(formData.max_flight_time) : undefined,
        max_speed:       formData.max_speed       ? Number(formData.max_speed)       : undefined,
        max_altitude:    formData.max_altitude    ? Number(formData.max_altitude)    : undefined,
        weight:          formData.weight          ? Number(formData.weight)          : undefined,
      };

      const response = await fetch('/api/system/model/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.code === 1) {
        toast.success(t('systems.components.addModel.toasts.success'));
        onSuccess();
      } else {
        toast.error(result.message || t('systems.components.addModel.toasts.failed'));
      }
    } catch (error) {
      toast.error(t('systems.components.addModel.toasts.error'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="!max-w-[900px] w-[90vw] h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('systems.components.addModel.title')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">{t('systems.components.addModel.sections.identification')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="col-span-1 sm:col-span-3">
                <Label className="pb-2">{t('systems.components.addModel.fields.componentType')}</Label>
                <Select value={formData.model_category} onValueChange={handleCategoryChange}>
                  <SelectTrigger><SelectValue placeholder={t('systems.components.addModel.placeholders.selectType')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AIRCRAFT">{t('systems.components.addModel.categoryOptions.aircraft')}</SelectItem>
                    <SelectItem value="DOCK">{t('systems.components.addModel.categoryOptions.dock')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="col-span-1 sm:col-span-3">
                <Label className="pb-2">{t('systems.components.addModel.fields.brand')}</Label>
                <Input value={formData.manufacturer} onChange={(e) => handleChange('manufacturer', e.target.value)} required />
              </div>
              <div className="col-span-1 sm:col-span-3">
                <Label className="pb-2">{t('systems.components.addModel.fields.serie')}</Label>
                <Input value={formData.model_code} onChange={(e) => handleChange('model_code', e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mt-3">
              <div className="col-span-1 sm:col-span-3">
                <Label className="pb-2">{t('systems.components.addModel.fields.modelName')}</Label>
                <Input value={formData.model_name} onChange={(e) => handleChange('model_name', e.target.value)} required />
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">{t('systems.components.addModel.sections.classificationWeight')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="col-span-1 sm:col-span-4">
                <Label className="pb-2">{t('systems.components.addModel.fields.version')}</Label>
                <Input value={formData.version} onChange={(e) => handleChange('version', e.target.value)} />
              </div>
              <div className="col-span-1 sm:col-span-4">
                <Label className="pb-2">{t('systems.components.addModel.fields.mtom')}</Label>
                <Input type="number" step="0.01" value={formData.mtom} onChange={(e) => handleChange('mtom', e.target.value)} />
              </div>
              <div className="col-span-1 sm:col-span-4">
                <Label className="pb-2">{t('systems.components.addModel.fields.weight')}</Label>
                <Input type="number" step="0.01" value={formData.weight} onChange={(e) => handleChange('weight', e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">{t('systems.components.addModel.sections.operatingConditions')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="col-span-1 sm:col-span-3">
                <Label className="pb-2">{t('systems.components.addModel.fields.windMin')}</Label>
                <Input type="number" step="0.1" value={formData.wind_min} onChange={(e) => handleChange('wind_min', e.target.value)} />
              </div>
              <div className="col-span-1 sm:col-span-3">
                <Label className="pb-2">{t('systems.components.addModel.fields.windMax')}</Label>
                <Input type="number" step="0.1" value={formData.wind_max} onChange={(e) => handleChange('wind_max', e.target.value)} />
              </div>
              <div className="col-span-1 sm:col-span-3">
                <Label className="pb-2">{t('systems.components.addModel.fields.tempMin')}</Label>
                <Input type="number" step="0.1" value={formData.temp_min} onChange={(e) => handleChange('temp_min', e.target.value)} />
              </div>
              <div className="col-span-1 sm:col-span-3">
                <Label className="pb-2">{t('systems.components.addModel.fields.tempMax')}</Label>
                <Input type="number" step="0.1" value={formData.temp_max} onChange={(e) => handleChange('temp_max', e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">{t('systems.components.addModel.sections.performance')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="col-span-1 sm:col-span-3">
                <Label className="pb-2">{t('systems.components.addModel.fields.enduranceMin')}</Label>
                <Input type="number" value={formData.endurance_min} onChange={(e) => handleChange('endurance_min', e.target.value)} />
              </div>
              <div className="col-span-1 sm:col-span-3">
                <Label className="pb-2">{t('systems.components.addModel.fields.enduranceMax')}</Label>
                <Input type="number" value={formData.endurance_max} onChange={(e) => handleChange('endurance_max', e.target.value)} />
              </div>
              <div className="col-span-1 sm:col-span-3">
                <Label className="pb-2">{t('systems.components.addModel.fields.maxSpeed')}</Label>
                <Input type="number" value={formData.max_speed} onChange={(e) => handleChange('max_speed', e.target.value)} />
              </div>
              <div className="col-span-1 sm:col-span-3">
                <Label className="pb-2">{t('systems.components.addModel.fields.maxAltitude')}</Label>
                <Input type="number" value={formData.max_altitude} onChange={(e) => handleChange('max_altitude', e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">{t('systems.components.addModel.sections.maintenance')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">

              <div className="col-span-1 sm:col-span-3">
                <Label className="pb-2">{t('systems.components.addModel.fields.phaseOut')}</Label>
                <Select value={formData.phase_out} onValueChange={(v) => handleChange('phase_out', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="N">{t('systems.components.common.phaseOutOptions.no')}</SelectItem>
                    <SelectItem value="Y">{t('systems.components.common.phaseOutOptions.yes')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-1 sm:col-span-3">
                <Label className="pb-2">{t('systems.components.addModel.fields.maintenanceCycle')}</Label>
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
                <div className="col-span-1 sm:col-span-6 flex items-end">
                  <span className="inline-flex items-center px-3 py-2 rounded-md bg-muted text-muted-foreground text-sm">
                    {t('systems.components.common.maintenanceCycle.noCycleRequired')}
                  </span>
                </div>
              )}

              {showHours && (
                <div className="col-span-1 sm:col-span-2">
                  <Label className="pb-2">{t('systems.components.common.maintenanceCycle.hoursLimit')}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.maintenance_cycle_hour}
                    onChange={(e) => handleCycleInput('maintenance_cycle_hour', e.target.value)}
                  />
                </div>
              )}

              {showDays && (
                <div className="col-span-1 sm:col-span-2">
                  <Label className="pb-2">{t('systems.components.common.maintenanceCycle.daysLimit')}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.maintenance_cycle_day}
                    onChange={(e) => handleCycleInput('maintenance_cycle_day', e.target.value)}
                  />
                </div>
              )}

              {showFlights && (
                <div className="col-span-1 sm:col-span-2">
                  <Label className="pb-2">{t('systems.components.common.maintenanceCycle.flightsLimit')}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.maintenance_cycle_flight}
                    onChange={(e) => handleCycleInput('maintenance_cycle_flight', e.target.value)}
                  />
                </div>
              )}

            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">{t('systems.components.addModel.sections.guaranteeNotes')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="col-span-1 sm:col-span-3">
                <Label className="pb-2">{t('systems.components.addModel.fields.guaranteeYears')}</Label>
                <Input type="number" step="0.1" value={formData.guarantee_years} onChange={(e) => handleChange('guarantee_years', e.target.value)} />
              </div>
              <div className="col-span-1 sm:col-span-3">
                <Label className="pb-2">{t('systems.components.addModel.fields.maxFlightTime')}</Label>
                <Input type="number" value={formData.max_flight_time} onChange={(e) => handleChange('max_flight_time', e.target.value)} />
              </div>
              <div className="col-span-1 sm:col-span-6">
                <Label className="pb-2">{t('systems.components.addModel.fields.additionalSpecs')}</Label>
                <Textarea
                  value={formData.specifications}
                  onChange={(e) => handleChange('specifications', e.target.value)}
                  rows={2}
                  placeholder={t('systems.components.addModel.placeholders.additionalNotes')}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>{t('systems.components.addModel.buttons.cancel')}</Button>
            <Button
              type="submit"
              className="bg-violet-600 hover:bg-violet-700"
              disabled={loading}
            >
              {loading ? t('systems.components.addModel.buttons.adding') : t('systems.components.addModel.buttons.addModel')}
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}
