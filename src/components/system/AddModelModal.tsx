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
import { toast } from 'sonner';

interface AddModelModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AIRCRAFT_SUBTYPES = [
  { value: 'MULTIROTOR',    label: 'Multirotor / Drone' },
  { value: 'FIXED_WING',   label: 'Fixed Wing' },
  { value: 'VTOL',         label: 'VTOL' },
  { value: 'HELICOPTER',   label: 'Helicopter' },
  { value: 'SINGLE_ROTOR', label: 'Single Rotor' },
];

const DOCK_SUBTYPES = [
  { value: 'INDOOR',    label: 'Indoor Dock' },
  { value: 'OUTDOOR',   label: 'Outdoor Dock' },
  { value: 'MOBILE',    label: 'Mobile Dock' },
  { value: 'PORTABLE',  label: 'Portable Dock' },
];

const INITIAL_FORM = {
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

export default function AddModelModal({ open, onClose, onSuccess }: AddModelModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);

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

    if (!formData.model_category) { toast.error('Please select a component type'); return; }
    if (!formData.model_subtype)   { toast.error('Please select a sub-type'); return; }
    if (!formData.model_code.trim()) { toast.error('Model code (Serie) is required'); return; }
    if (!formData.model_name.trim()) { toast.error('Model name is required'); return; }
    if (!formData.manufacturer.trim()) { toast.error('Manufacturer (Brand) is required'); return; }

    if (formData.wind_min && formData.wind_max && Number(formData.wind_min) > Number(formData.wind_max)) {
      toast.error('Wind min cannot be greater than wind max'); return;
    }
    if (formData.temp_min && formData.temp_max && Number(formData.temp_min) > Number(formData.temp_max)) {
      toast.error('Temperature min cannot be greater than temperature max'); return;
    }
    if (formData.endurance_min && formData.endurance_max && Number(formData.endurance_min) > Number(formData.endurance_max)) {
      toast.error('Endurance min cannot be greater than endurance max'); return;
    }
    if (formData.max_flight_time && Number(formData.max_flight_time) <= 0) {
      toast.error('Max flight time must be greater than 0'); return;
    }
    if (formData.max_speed && Number(formData.max_speed) <= 0) {
      toast.error('Max speed must be greater than 0'); return;
    }
    if (formData.max_altitude && Number(formData.max_altitude) <= 0) {
      toast.error('Max altitude must be greater than 0'); return;
    }
    if (formData.weight && Number(formData.weight) <= 0) {
      toast.error('Weight must be greater than 0'); return;
    }

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
        model_code:      formData.model_code.trim(),
        model_name:      formData.model_name.trim(),
        manufacturer:    formData.manufacturer.trim(),
        model_type:      combinedModelType,
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
        toast.success('Model added successfully');
        onSuccess();
      } else {
        toast.error(result.message || 'Failed to add model');
      }
    } catch (error) {
      toast.error('Error adding model');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="!max-w-[900px] w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New System Model</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Identification</p>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-3">
                <Label className="pb-2">Component Type *</Label>
                <Select value={formData.model_category} onValueChange={handleCategoryChange}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AIRCRAFT">Aircraft</SelectItem>
                    <SelectItem value="DOCK">Dock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3">
                <Label className="pb-2">Sub-Type *</Label>
                <Select
                  value={formData.model_subtype}
                  onValueChange={(v) => handleChange('model_subtype', v)}
                  disabled={!formData.model_category}
                >
                  <SelectTrigger><SelectValue placeholder={formData.model_category ? 'Select sub-type' : 'Select type first'} /></SelectTrigger>
                  <SelectContent>
                    {subtypeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3">
                <Label className="pb-2">Brand (Manufacturer) *</Label>
                <Input value={formData.manufacturer} onChange={(e) => handleChange('manufacturer', e.target.value)} required />
              </div>
              <div className="col-span-3">
                <Label className="pb-2">Serie (Model Code) *</Label>
                <Input value={formData.model_code} onChange={(e) => handleChange('model_code', e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-12 gap-3 mt-3">
              <div className="col-span-3">
                <Label className="pb-2">Model (Name) *</Label>
                <Input value={formData.model_name} onChange={(e) => handleChange('model_name', e.target.value)} required />
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Classification & Weight</p>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-4">
                <Label className="pb-2">Version</Label>
                <Input value={formData.version} onChange={(e) => handleChange('version', e.target.value)} />
              </div>
              <div className="col-span-4">
                <Label className="pb-2">MTOM (kg)</Label>
                <Input type="number" step="0.01" value={formData.mtom} onChange={(e) => handleChange('mtom', e.target.value)} />
              </div>
              <div className="col-span-4">
                <Label className="pb-2">Weight (kg)</Label>
                <Input type="number" step="0.01" value={formData.weight} onChange={(e) => handleChange('weight', e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Operating Conditions</p>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-3">
                <Label className="pb-2">Wind Min (m/s)</Label>
                <Input type="number" step="0.1" value={formData.wind_min} onChange={(e) => handleChange('wind_min', e.target.value)} />
              </div>
              <div className="col-span-3">
                <Label className="pb-2">Wind Max (m/s)</Label>
                <Input type="number" step="0.1" value={formData.wind_max} onChange={(e) => handleChange('wind_max', e.target.value)} />
              </div>
              <div className="col-span-3">
                <Label className="pb-2">Temp Min (°C)</Label>
                <Input type="number" step="0.1" value={formData.temp_min} onChange={(e) => handleChange('temp_min', e.target.value)} />
              </div>
              <div className="col-span-3">
                <Label className="pb-2">Temp Max (°C)</Label>
                <Input type="number" step="0.1" value={formData.temp_max} onChange={(e) => handleChange('temp_max', e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Performance</p>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-3">
                <Label className="pb-2">Endurance Min (min)</Label>
                <Input type="number" value={formData.endurance_min} onChange={(e) => handleChange('endurance_min', e.target.value)} />
              </div>
              <div className="col-span-3">
                <Label className="pb-2">Endurance Max (min)</Label>
                <Input type="number" value={formData.endurance_max} onChange={(e) => handleChange('endurance_max', e.target.value)} />
              </div>
              <div className="col-span-3">
                <Label className="pb-2">Max Speed (km/h)</Label>
                <Input type="number" value={formData.max_speed} onChange={(e) => handleChange('max_speed', e.target.value)} />
              </div>
              <div className="col-span-3">
                <Label className="pb-2">Max Altitude (m)</Label>
                <Input type="number" value={formData.max_altitude} onChange={(e) => handleChange('max_altitude', e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Maintenance</p>
            <div className="grid grid-cols-12 gap-3 items-end">

              <div className="col-span-3">
                <Label className="pb-2">Phase-out</Label>
                <Select value={formData.phase_out} onValueChange={(v) => handleChange('phase_out', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="N">No</SelectItem>
                    <SelectItem value="Y">Yes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-3">
                <Label className="pb-2">Maintenance Cycle</Label>
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
                <div className="col-span-6 flex items-end">
                  <span className="inline-flex items-center px-3 py-2 rounded-md bg-muted text-muted-foreground text-sm">
                    No maintenance cycle required
                  </span>
                </div>
              )}

              {showHours && (
                <div className="col-span-2">
                  <Label className="pb-2">
                    Hours Limit 
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.maintenance_cycle_hour}
                    onChange={(e) => handleCycleInput('maintenance_cycle_hour', e.target.value )}
                  />
                </div>
              )}

              {showDays && (
                <div className="col-span-2">
                  <Label className="pb-2">
                    Days Limit 
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.maintenance_cycle_day}
                    onChange={(e) => handleCycleInput('maintenance_cycle_day', e.target.value )}
                  />
                </div>
              )}

              {showFlights && (
                <div className="col-span-2">
                  <Label className="pb-2">
                    Flights Limit 
                  </Label>
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
            <p className="text-sm font-medium text-muted-foreground mb-2">Guarantee & Notes</p>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-3">
                <Label className="pb-2">Guarantee (years)</Label>
                <Input type="number" step="0.1" value={formData.guarantee_years} onChange={(e) => handleChange('guarantee_years', e.target.value)} />
              </div>
              <div className="col-span-3">
                <Label className="pb-2">Max Flight Time (min)</Label>
                <Input type="number" value={formData.max_flight_time} onChange={(e) => handleChange('max_flight_time', e.target.value)} />
              </div>
              <div className="col-span-6">
                <Label className="pb-2">Additional Specifications</Label>
                <Textarea
                  value={formData.specifications}
                  onChange={(e) => handleChange('specifications', e.target.value)}
                  rows={2}
                  placeholder="Additional notes..."
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              className="bg-violet-600 hover:bg-violet-700"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Model'}
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}
