
'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/components/useTheme';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const INITIAL_FORM = {
  tool_type: 'AIRCRAFT', tool_code: '', tool_serial_number: '', tool_description: '',
  tool_status: 'OPERATIONAL', tool_active: 'Y', fk_model_id: '', fk_client_id: '',
  vendor: '', gcsType: '', streamingType: 'WEB_RTC', streamingUrl: '', ccPlatform: '',
  latitude: '', longitude: '', purchase_date: '', activation_date: '', guarantee_days: '',
  purchase_price: '', warranty_expiry: '', last_calibration_date: '', next_calibration_date: '',
  location: '',
};

interface AddToolModalProps {
  open: boolean; onClose: () => void; onSuccess: () => void; models: any[]; clients: any[];
}

export default function AddToolModal({ open, onClose, onSuccess, models, clients }: AddToolModalProps) {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  useEffect(() => { if (open) setFormData(INITIAL_FORM); }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const payload = {
        tool_code: formData.tool_code, tool_serial_number: formData.tool_serial_number,
        tool_name: formData.tool_code, tool_description: formData.tool_description,
        tool_active: formData.tool_active,
        fk_model_id: formData.fk_model_id ? Number(formData.fk_model_id) : null,
        fk_client_id: formData.fk_client_id ? Number(formData.fk_client_id) : null,
        purchase_date: formData.purchase_date || null, purchase_price: formData.purchase_price ? Number(formData.purchase_price) : null,
        warranty_expiry: formData.warranty_expiry || null, last_calibration_date: formData.last_calibration_date || null,
        next_calibration_date: formData.next_calibration_date || null, location: formData.location || null,
        ccPlatform: formData.ccPlatform || null, gcsType: formData.gcsType || null,
        streamingType: formData.streamingType || null, streamingUrl: formData.streamingUrl || null,
        vendor: formData.vendor || null, latitude: formData.latitude ? Number(formData.latitude) : null,
        longitude: formData.longitude ? Number(formData.longitude) : null,
        guaranteeDays: formData.guarantee_days ? Number(formData.guarantee_days) : null,
        activationDate: formData.activation_date || null,
      };
      const res = await fetch('/api/system/tool/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await res.json();
      if (result.code === 1) { toast.success('Tool added successfully'); onSuccess(); }
      else toast.error(result.message || 'Failed to add tool');
    } catch { toast.error('Error adding tool'); } finally { setLoading(false); }
  };
  const handleChange = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }));

  const inputCls = isDark
    ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-500'
    : 'bg-gray-50 border-gray-200 text-gray-900';
  const selectTriggerCls = isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : '';
  const selectContentCls = isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : '';
  const labelCls = `pb-2 text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-600'}`;
  const sectionLabelCls = `text-sm font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-muted-foreground'}`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`max-w-225! w-[90vw] max-h-[90vh] overflow-y-auto
        ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}>
        <DialogHeader className={`border-b pb-3 ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
          <DialogTitle className={isDark ? 'text-white' : ''}>Add New Tool</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">

          <div>
            <p className={sectionLabelCls}>Basic Information</p>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-2"><Label className={labelCls}>Type</Label>
                <Select value={formData.tool_type} onValueChange={v => handleChange('tool_type', v)}>
                  <SelectTrigger className={selectTriggerCls}><SelectValue /></SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    <SelectItem value="AIRCRAFT">Aircraft</SelectItem><SelectItem value="DRONE">Drone</SelectItem>
                    <SelectItem value="CAMERA">Camera</SelectItem><SelectItem value="SENSOR">Sensor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label className={labelCls}>Serial Number *</Label>
                <Input className={inputCls} value={formData.tool_serial_number} onChange={e => handleChange('tool_serial_number', e.target.value)} required />
              </div>
              <div className="col-span-2"><Label className={labelCls}>Code *</Label>
                <Input className={inputCls} value={formData.tool_code} onChange={e => handleChange('tool_code', e.target.value)} required />
              </div>
              <div className="col-span-3"><Label className={labelCls}>Brand-Model-Version</Label>
                <Select value={formData.fk_model_id} onValueChange={v => handleChange('fk_model_id', v)}>
                  <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Select Model" /></SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    {models.length > 0 ? models.map((m: any) => (
                      <SelectItem key={m.tool_model_id} value={m.tool_model_id.toString()}>{m.factory_model} - {m.factory_type}</SelectItem>
                    )) : <div className={`px-2 py-1.5 text-sm ${isDark ? 'text-slate-500' : 'text-muted-foreground'}`}>No models available</div>}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3"><Label className={labelCls}>Description</Label>
                <Input className={inputCls} value={formData.tool_description} onChange={e => handleChange('tool_description', e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <p className={sectionLabelCls}>Platform & Location</p>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-3"><Label className={labelCls}>C2 Platform</Label>
                <Select value={formData.ccPlatform} onValueChange={v => handleChange('ccPlatform', v)}>
                  <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Select Type" /></SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    <SelectItem value="_FLYTBASE">Flytbase</SelectItem><SelectItem value="_VOTIX">Votix</SelectItem>
                    <SelectItem value="_FLIGHTHUB">DJI FlightHub</SelectItem><SelectItem value="_APP">APP on GCS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3"><Label className={labelCls}>GCS</Label>
                <Select value={formData.gcsType} onValueChange={v => handleChange('gcsType', v)}>
                  <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Select Type" /></SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    <SelectItem value="_DOCK">Docking Station</SelectItem><SelectItem value="_RC">Remote Control</SelectItem>
                    <SelectItem value="_GCS">Ground Control Station</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3"><Label className={labelCls}>Latitude</Label>
                <Input className={inputCls} value={formData.latitude} onChange={e => handleChange('latitude', e.target.value)} />
              </div>
              <div className="col-span-3"><Label className={labelCls}>Longitude</Label>
                <Input className={inputCls} value={formData.longitude} onChange={e => handleChange('longitude', e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <p className={sectionLabelCls}>Purchase & Activation</p>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-3"><Label className={labelCls}>Vendor</Label>
                <Input className={inputCls} value={formData.vendor} onChange={e => handleChange('vendor', e.target.value)} />
              </div>
              <div className="col-span-3"><Label className={labelCls}>Purchase Date</Label>
                <Input type="date" className={inputCls} value={formData.purchase_date} onChange={e => handleChange('purchase_date', e.target.value)} />
              </div>
              <div className="col-span-3"><Label className={labelCls}>Activation Date</Label>
                <Input type="date" className={inputCls} value={formData.activation_date} onChange={e => handleChange('activation_date', e.target.value)} />
              </div>
              <div className="col-span-3"><Label className={labelCls}>Active</Label>
                <Select value={formData.tool_active} onValueChange={v => handleChange('tool_active', v)}>
                  <SelectTrigger className={selectTriggerCls}><SelectValue /></SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    <SelectItem value="Y">ACTIVE</SelectItem><SelectItem value="N">NOT ACTIVE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <p className={sectionLabelCls}>Status & Assignment</p>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-3"><Label className={labelCls}>Guarantee Days</Label>
                <Input type="number" className={inputCls} value={formData.guarantee_days} onChange={e => handleChange('guarantee_days', e.target.value)} />
              </div>
              <div className="col-span-3"><Label className={labelCls}>Status</Label>
                <Select value={formData.tool_status} onValueChange={v => handleChange('tool_status', v)}>
                  <SelectTrigger className={selectTriggerCls}><SelectValue /></SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    <SelectItem value="OPERATIONAL">Operational</SelectItem>
                    <SelectItem value="NOT_OPERATIONAL">Not Operational</SelectItem>
                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3"><Label className={labelCls}>Client</Label>
                <Select value={formData.fk_client_id} onValueChange={v => handleChange('fk_client_id', v)}>
                  <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    <SelectItem value="0">None</SelectItem>
                    {clients.map((c: any) => (<SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3"><Label className={labelCls}>Location</Label>
                <Input className={inputCls} value={formData.location} onChange={e => handleChange('location', e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <p className={sectionLabelCls}>Streaming</p>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-4"><Label className={labelCls}>Streaming Type</Label>
                <Select value={formData.streamingType} onValueChange={v => handleChange('streamingType', v)}>
                  <SelectTrigger className={selectTriggerCls}><SelectValue /></SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    <SelectItem value="WEB_RTC">WEB_RTC</SelectItem><SelectItem value="RTSP">RTSP</SelectItem><SelectItem value="RTSPS">RTSPS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-8"><Label className={labelCls}>Streaming URL</Label>
                <Input className={inputCls} value={formData.streamingUrl} onChange={e => handleChange('streamingUrl', e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <p className={sectionLabelCls}>Warranty & Calibration</p>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-3"><Label className={labelCls}>Purchase Price</Label>
                <Input type="number" step="0.01" className={inputCls} value={formData.purchase_price} onChange={e => handleChange('purchase_price', e.target.value)} />
              </div>
              <div className="col-span-3"><Label className={labelCls}>Warranty Expiry</Label>
                <Input type="date" className={inputCls} value={formData.warranty_expiry} onChange={e => handleChange('warranty_expiry', e.target.value)} />
              </div>
              <div className="col-span-3"><Label className={labelCls}>Last Calibration</Label>
                <Input type="date" className={inputCls} value={formData.last_calibration_date} onChange={e => handleChange('last_calibration_date', e.target.value)} />
              </div>
              <div className="col-span-3"><Label className={labelCls}>Next Calibration</Label>
                <Input type="date" className={inputCls} value={formData.next_calibration_date} onChange={e => handleChange('next_calibration_date', e.target.value)} />
              </div>
            </div>
          </div>

          <div className={`flex justify-end gap-2 pt-2 border-t ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
            <Button type="button" variant="outline" onClick={onClose}
              className={isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}>Cancel</Button>
            <Button type="submit" disabled={loading}
              className="bg-violet-600 hover:bg-violet-500 text-white">
              {loading ? 'Adding...' : 'Add Tool'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}