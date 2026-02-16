// src/components/system/drone-tool/add-component-modal.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface AddComponentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddComponentModal({ open, onClose, onSuccess }: AddComponentModalProps) {
  const [loading, setLoading] = useState(false);
  const [tools, setTools] = useState([]);
  const [clients, setClients] = useState([]);
  const [models, setModels] = useState([]);
  const [formData, setFormData] = useState({
    fk_tool_id: '',
    component_type: '',
    fk_tool_model_id: '',
    component_sn: '',
    component_activation_date: '',
    component_purchase_date: '',
    component_vendor: '',
    component_guarantee_day: '',
    component_status: 'OPERATIONAL',
    fk_client_id: '',
  });

  useEffect(() => {
    if (open) {
      fetchTools();
      fetchClients();
      fetchModels();
    }
  }, [open]);

  const fetchClients = async () => {
    try {
      const response = await axios.get('/api/client/list');
      if (response.data?.clients) {
        setClients(response.data.clients);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/system/tool/model/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const result = await response.json();
      if (result.code === 1) setModels(result.data);
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  };

  const fetchTools = async () => {
    try {
      const response = await axios.post('/api/system/tool/list', {
        data: { active: 'Y' },
      });

      const result = await response.data;
      if (result.code === 1) {
        setTools(result.data);
      }
    } catch (error) {
      console.error('Error fetching tools:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        fk_tool_id: Number(formData.fk_tool_id),
        component_type: formData.component_type,
        fk_tool_model_id: formData.fk_tool_model_id ? Number(formData.fk_tool_model_id) : null,
        component_sn: formData.component_sn,
        component_activation_date: formData.component_activation_date || null,
        component_purchase_date: formData.component_purchase_date || null,
        component_vendor: formData.component_vendor || null,
        component_guarantee_day: formData.component_guarantee_day ? Number(formData.component_guarantee_day) : null,
        component_status: formData.component_status,
        fk_client_id: formData.fk_client_id ? Number(formData.fk_client_id) : null,
      };

      const response = await axios.post('/api/system/tool/component/add', payload);

      if (response.data.code === 1) {
        toast.success('Component added successfully');
        setFormData({
          fk_tool_id: '',
          component_type: '',
          fk_tool_model_id: '',
          component_sn: '',
          component_activation_date: '',
          component_purchase_date: '',
          component_vendor: '',
          component_guarantee_day: '',
          component_status: 'OPERATIONAL',
          fk_client_id: '',
        });
        onSuccess();
      } else {
        toast.error(response.data.message || 'Failed to add component');
      }
    } catch (error: any) {
      const serverMessage = error.response?.data?.message;
      toast.error(serverMessage || 'Error adding component');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="!max-w-[900px] w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Component</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-12 gap-3 overflow-visible">
            <div className="col-span-3 min-w-0">
              <Label className='pb-2'>Tool *</Label>
              <Select value={formData.fk_tool_id} onValueChange={(v) => handleChange('fk_tool_id', v)}>
                <SelectTrigger className="w-full truncate"><SelectValue placeholder="Select Tool" /></SelectTrigger>
                <SelectContent className="z-50 max-h-60 overflow-y-auto">
                  {tools.map((tool: any) => (
                    <SelectItem key={tool.tool_id} value={tool.tool_id.toString()}>
                      {tool.tool_code} - {tool.factory_model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3">
              <Label className='pb-2'>Component Type *</Label>
              <Select value={formData.component_type} onValueChange={(v) => handleChange('component_type', v)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BATTERY">Battery</SelectItem>
                  <SelectItem value="PROPELLER">Propeller</SelectItem>
                  <SelectItem value="CAMERA">Camera</SelectItem>
                  <SelectItem value="GIMBAL">Gimbal</SelectItem>
                  <SelectItem value="GPS">GPS</SelectItem>
                  <SelectItem value="CONTROLLER">Controller</SelectItem>
                  <SelectItem value="SENSOR">Sensor</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3 min-w-0">
              <Label className='pb-2'>Tool Model</Label>
              <Select value={formData.fk_tool_model_id} onValueChange={(v) => handleChange('fk_tool_model_id', v)}>
                <SelectTrigger className="w-full truncate"><SelectValue placeholder="Select Model" /></SelectTrigger>
                <SelectContent>
                  {models.map((m: any) => (
                    <SelectItem key={m.tool_model_id} value={m.tool_model_id.toString()}>
                      {m.factory_model} - {m.factory_type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3">
              <Label className='pb-2'>Serial Number</Label>
              <Input value={formData.component_sn} onChange={(e) => handleChange('component_sn', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-12 gap-3 overflow-visible">
            <div className="col-span-3">
              <Label className='pb-2'>Activation Date</Label>
              <Input type="date" value={formData.component_activation_date} onChange={(e) => handleChange('component_activation_date', e.target.value)} />
            </div>
            <div className="col-span-3">
              <Label className='pb-2'>Purchase Date</Label>
              <Input type="date" value={formData.component_purchase_date} onChange={(e) => handleChange('component_purchase_date', e.target.value)} />
            </div>
            <div className="col-span-3">
              <Label className='pb-2'>Vendor</Label>
              <Input value={formData.component_vendor} onChange={(e) => handleChange('component_vendor', e.target.value)} />
            </div>
            <div className="col-span-3">
              <Label>Guarantee (days)</Label>
              <Input type="number" value={formData.component_guarantee_day} onChange={(e) => handleChange('component_guarantee_day', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-12 gap-3 overflow-visible">
            <div className="col-span-3">
              <Label className='pb-2'>Status *</Label>
              <Select value={formData.component_status} onValueChange={(v) => handleChange('component_status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPERATIONAL">Operational</SelectItem>
                  <SelectItem value="NOT_OPERATIONAL">Not Operational</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="DECOMMISSIONED">Decommissioned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3 min-w-0">
              <Label className='pb-2'>Client</Label>
              <Select value={formData.fk_client_id} onValueChange={(v) => handleChange('fk_client_id', v)}>
                <SelectTrigger className="w-full truncate"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">None</SelectItem>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Adding...' : 'Add Component'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}