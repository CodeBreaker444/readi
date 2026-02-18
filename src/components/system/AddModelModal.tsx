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

const INITIAL_FORM = {
  tool_type_id: '',
  model_code: '',        
  model_name: '',        
  manufacturer: '',     
  model_type: '',       
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
  const [toolTypes, setToolTypes] = useState<any[]>([]);
  const [formData, setFormData] = useState(INITIAL_FORM);

  useEffect(() => {
    if (open) {
      setFormData(INITIAL_FORM);
      fetchToolTypes();
    }
  }, [open]);

  const fetchToolTypes = async () => {
    try {
      const response = await fetch('/api/system/tool/type/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: 'Y' }),
      });
      const result = await response.json();
      if (result.code === 1) {
        setToolTypes(result.data ?? []);
      } else {
        toast.error('Failed to fetch tool types');
      }
    } catch (error) {
      console.error('Error fetching tool types:', error);
      toast.error('Error fetching tool types');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.tool_type_id) {
      toast.error('Please select a tool type');
      return;
    }
    if (!formData.model_code.trim()) {
      toast.error('Model code (Serie) is required');
      return;
    }
    if (!formData.model_name.trim()) {
      toast.error('Model name is required');
      return;
    }
    if (!formData.manufacturer.trim()) {
      toast.error('Manufacturer (Brand) is required');
      return;
    }

    setLoading(true);

    try {
      const extendedSpecs = [
        formData.version && `Version: ${formData.version}`,
        formData.mtom && `MTOM: ${formData.mtom} kg`,
        formData.wind_min && `Wind Min: ${formData.wind_min} m/s`,
        formData.wind_max && `Wind Max: ${formData.wind_max} m/s`,
        formData.temp_min && `Temp Min: ${formData.temp_min} °C`,
        formData.temp_max && `Temp Max: ${formData.temp_max} °C`,
        formData.endurance_min && `Endurance Min: ${formData.endurance_min} min`,
        formData.endurance_max && `Endurance Max: ${formData.endurance_max} min`,
        formData.maintenance_cycle && `Maintenance Cycle: ${formData.maintenance_cycle}`,
        formData.maintenance_cycle_hour && `Maint. Hours: ${formData.maintenance_cycle_hour}`,
        formData.maintenance_cycle_day && `Maint. Days: ${formData.maintenance_cycle_day}`,
        formData.maintenance_cycle_flight && `Maint. Flights: ${formData.maintenance_cycle_flight}`,
        formData.phase_out === 'Y' && `Phase-out: Yes`,
        formData.guarantee_years && `Guarantee: ${formData.guarantee_years} years`,
        formData.specifications,
      ]
        .filter(Boolean)
        .join('\n');

      const payload = {
        tool_type_id: formData.tool_type_id,
        model_code: formData.model_code.trim(),
        model_name: formData.model_name.trim(),
        manufacturer: formData.manufacturer.trim(),
        model_type: formData.model_type || undefined,
        specifications: extendedSpecs || undefined,
        max_flight_time: formData.max_flight_time ? Number(formData.max_flight_time) : undefined,
        max_speed: formData.max_speed ? Number(formData.max_speed) : undefined,
        max_altitude: formData.max_altitude ? Number(formData.max_altitude) : undefined,
        weight: formData.weight ? Number(formData.weight) : undefined,
      };

      const response = await fetch('/api/system/tool/model/add', {
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

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="!max-w-[900px] w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Tool Model</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Identification
            </p>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-3">
                <Label className="pb-2">Type *</Label>
                <Select
                  value={formData.model_type}
                  onValueChange={(v) => handleChange('model_type', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BATTERY">Battery</SelectItem>
                    <SelectItem value="RC">Remote Control</SelectItem>
                    <SelectItem value="DOCK">Docking Station</SelectItem>
                    <SelectItem value="PAYLOAD">Payload</SelectItem>
                    <SelectItem value="FTS">Flight Termination System</SelectItem>
                    <SelectItem value="PARACHUTE">Parachute</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3">
                <Label className="pb-2">Brand (Manufacturer) *</Label>
                <Input
                  value={formData.manufacturer}
                  onChange={(e) => handleChange('manufacturer', e.target.value)}
                  required
                />
              </div>
              <div className="col-span-3">
                <Label className="pb-2">Serie (Model Code) *</Label>
                <Input
                  value={formData.model_code}
                  onChange={(e) => handleChange('model_code', e.target.value)}
                  required
                />
              </div>
              <div className="col-span-3">
                <Label className="pb-2">Model (Name) *</Label>
                <Input
                  value={formData.model_name}
                  onChange={(e) => handleChange('model_name', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Classification & Weight
            </p>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-3">
                <Label className="pb-2">Tool Type *</Label>
                <Select
                  value={formData.tool_type_id}
                  onValueChange={(v) => handleChange('tool_type_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tool type" />
                  </SelectTrigger>
                  <SelectContent>
                    {toolTypes.length > 0 ? (
                      toolTypes.map((type: any) => (
                        <SelectItem
                          key={type.tool_type_id}
                          value={type.tool_type_id.toString()}
                        >
                          {type.tool_type_name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No tool types available
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3">
                <Label className="pb-2">Version</Label>
                <Input
                  value={formData.version}
                  onChange={(e) => handleChange('version', e.target.value)}
                />
              </div>
              <div className="col-span-3">
                <Label className="pb-2">MTOM (kg)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.mtom}
                  onChange={(e) => handleChange('mtom', e.target.value)}
                />
              </div>
              <div className="col-span-3">
                <Label className="pb-2">Weight (kg)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.weight}
                  onChange={(e) => handleChange('weight', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Operating Conditions
            </p>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-3">
                <Label className="pb-2">Wind Min (m/s)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.wind_min}
                  onChange={(e) => handleChange('wind_min', e.target.value)}
                />
              </div>
              <div className="col-span-3">
                <Label className="pb-2">Wind Max (m/s)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.wind_max}
                  onChange={(e) => handleChange('wind_max', e.target.value)}
                />
              </div>
              <div className="col-span-3">
                <Label className="pb-2">Temp Min (°C)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.temp_min}
                  onChange={(e) => handleChange('temp_min', e.target.value)}
                />
              </div>
              <div className="col-span-3">
                <Label className="pb-2">Temp Max (°C)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.temp_max}
                  onChange={(e) => handleChange('temp_max', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Performance
            </p>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-3">
                <Label className="pb-2">Endurance Min (min)</Label>
                <Input
                  type="number"
                  value={formData.endurance_min}
                  onChange={(e) => handleChange('endurance_min', e.target.value)}
                />
              </div>
              <div className="col-span-3">
                <Label className="pb-2">Endurance Max (min)</Label>
                <Input
                  type="number"
                  value={formData.endurance_max}
                  onChange={(e) => handleChange('endurance_max', e.target.value)}
                />
              </div>
              <div className="col-span-3">
                <Label className="pb-2">Max Speed (km/h)</Label>
                <Input
                  type="number"
                  value={formData.max_speed}
                  onChange={(e) => handleChange('max_speed', e.target.value)}
                />
              </div>
              <div className="col-span-3">
                <Label className="pb-2">Max Altitude (m)</Label>
                <Input
                  type="number"
                  value={formData.max_altitude}
                  onChange={(e) => handleChange('max_altitude', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Maintenance
            </p>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-3">
                <Label className="pb-2">Phase-out</Label>
                <Select
                  value={formData.phase_out}
                  onValueChange={(v) => handleChange('phase_out', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="N">No</SelectItem>
                    <SelectItem value="Y">Yes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3">
                <Label className="pb-2">Maintenance Cycle</Label>
                <Select
                  value={formData.maintenance_cycle}
                  onValueChange={(v) => handleChange('maintenance_cycle', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HOURS">Hours</SelectItem>
                    <SelectItem value="DAYS">Days</SelectItem>
                    <SelectItem value="FLIGHTS">Flights</SelectItem>
                    <SelectItem value="MIXED">Mixed</SelectItem>
                    <SelectItem value="NONE">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="pb-2">Hours</Label>
                <Input
                  type="number"
                  value={formData.maintenance_cycle_hour}
                  onChange={(e) => handleChange('maintenance_cycle_hour', e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Label className="pb-2">Days</Label>
                <Input
                  type="number"
                  value={formData.maintenance_cycle_day}
                  onChange={(e) => handleChange('maintenance_cycle_day', e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Label className="pb-2">Flights</Label>
                <Input
                  type="number"
                  value={formData.maintenance_cycle_flight}
                  onChange={(e) => handleChange('maintenance_cycle_flight', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Guarantee & Notes
            </p>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-3">
                <Label className="pb-2">Guarantee (years)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.guarantee_years}
                  onChange={(e) => handleChange('guarantee_years', e.target.value)}
                />
              </div>
              <div className="col-span-3">
                <Label className="pb-2">Max Flight Time (min)</Label>
                <Input
                  type="number"
                  value={formData.max_flight_time}
                  onChange={(e) => handleChange('max_flight_time', e.target.value)}
                />
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
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.tool_type_id}
            >
              {loading ? 'Adding...' : 'Add Model'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}