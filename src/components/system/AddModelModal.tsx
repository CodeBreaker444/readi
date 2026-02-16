'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface AddModelModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddModelModal({ open, onClose, onSuccess }: AddModelModalProps) {
  const [loading, setLoading] = useState(false);
  const [toolTypes, setToolTypes] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    tool_type_id: '',
    model_code: '',
    model_name: '',
    manufacturer: '',
    model_type: '',
    specifications: '',
    max_flight_time: '',
    max_speed: '',
    max_altitude: '',
    weight: '',
  });

  useEffect(() => {
    if (open) {
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
        setToolTypes(result.data);
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
  setLoading(true);

  try {
    const specificationsObj = {
      model_type: formData.model_type,
      max_flight_time: formData.max_flight_time ? Number(formData.max_flight_time) : undefined,
      max_speed: formData.max_speed ? Number(formData.max_speed) : undefined,
      max_altitude: formData.max_altitude ? Number(formData.max_altitude) : undefined,
      weight: formData.weight ? Number(formData.weight) : undefined,
    };

    const payload = {
      tool_type_id: formData.tool_type_id,  
      fk_tool_type_id: Number(formData.tool_type_id),
      model_code: formData.model_code,
      model_name: formData.model_name,
      manufacturer: formData.manufacturer,
      model_description: formData.specifications,
      specifications: JSON.stringify(specificationsObj),  
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

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Model</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="tool_type_id" className='pb-2'>Tool Type *</Label>
              <Select
                value={formData.tool_type_id}
                onValueChange={(v) => handleChange('tool_type_id', v)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tool type" />
                </SelectTrigger>
                <SelectContent>
                  {toolTypes.length > 0 ? (
                    toolTypes.map((type) => (
                      <SelectItem key={type.tool_type_id} value={type.tool_type_id.toString()}>
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

            <div>
              <Label htmlFor="model_code"  className='pb-2'>Model Code *</Label>
              <Input
                id="model_code"
                value={formData.model_code}
                onChange={(e) => handleChange('model_code', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="model_name" className='pb-2'>Model Name *</Label>
              <Input
                id="model_name"
                value={formData.model_name}
                onChange={(e) => handleChange('model_name', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="manufacturer" className='pb-2'>Manufacturer *</Label>
              <Input
                id="manufacturer"
                value={formData.manufacturer}
                onChange={(e) => handleChange('manufacturer', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="model_type" className='pb-2'>Model Type</Label>
              <Input
                id="model_type"
                value={formData.model_type}
                onChange={(e) => handleChange('model_type', e.target.value)}
                placeholder="e.g., Quadcopter, Fixed-wing"
              />
            </div>

            <div>
              <Label htmlFor="max_flight_time" className='pb-2'>Max Flight Time (min)</Label>
              <Input
                id="max_flight_time"
                type="number"
                value={formData.max_flight_time}
                onChange={(e) => handleChange('max_flight_time', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="max_speed" className='pb-2'>Max Speed (km/h)</Label>
              <Input
                id="max_speed"
                type="number"
                value={formData.max_speed}
                onChange={(e) => handleChange('max_speed', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="max_altitude" className='pb-2'>Max Altitude (m)</Label>
              <Input
                id="max_altitude"
                type="number"
                value={formData.max_altitude}
                onChange={(e) => handleChange('max_altitude', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="weight" className='pb-2'>Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.01"
                value={formData.weight}
                onChange={(e) => handleChange('weight', e.target.value)}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="specifications" className='pb-2'>Specifications</Label>
              <Textarea
                id="specifications"
                value={formData.specifications}
                onChange={(e) => handleChange('specifications', e.target.value)}
                rows={4}
                placeholder="Additional specifications..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.tool_type_id}>
              {loading ? 'Adding...' : 'Add Model'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
