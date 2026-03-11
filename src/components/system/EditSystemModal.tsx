'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/components/useTheme';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Skeleton } from '../ui/skeleton';

interface EditSystemModalProps {
  open: boolean;
  toolId: number | null;
  onClose: () => void;
  onSuccess: () => void;
  clients: any[];
}

const EMPTY_FORM = {
  tool_code: '', tool_desc: '',
  tool_status: 'OPERATIONAL', tool_active: 'Y',
  fk_client_id: '', tool_ccPlatform: '', tool_gcs_type: '',
  tool_latitude: '', tool_longitude: '',
  date_activation: '', location: '',
  tool_maintenance_logbook: 'N',
};

export default function EditSystemModal({ open, toolId, onClose, onSuccess, clients }: EditSystemModalProps) {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    if (open && toolId) fetchTool();
  }, [open, toolId]);

  const fetchTool = async () => {
    setFetching(true);
    try {
      const res = await fetch('/api/system/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: 'ALL', status: 'ALL' }),
      });
      const result = await res.json();
      if (result.code === 1) {
        const tool = result.data.find((t: any) => t.tool_id === toolId);
        if (tool) {
          setFormData({
            tool_code: tool.tool_code || '',
            tool_desc: tool.tool_desc || '',
            tool_status: tool.tool_status || 'OPERATIONAL',
            tool_active: tool.active || 'Y',
            fk_client_id: tool.fk_client_id ? String(tool.fk_client_id) : '',
            tool_ccPlatform: tool.tool_ccPlatform || '',
            tool_gcs_type: tool.tool_gcs_type || '',
            tool_latitude: tool.tool_latitude != null ? String(tool.tool_latitude) : '',
            tool_longitude: tool.tool_longitude != null ? String(tool.tool_longitude) : '',
            date_activation: tool.date_activation || '',
            location: tool.location || '',
            tool_maintenance_logbook: tool.tool_maintenance_logbook || 'N',
          });
        }
      }
    } catch {
      toast.error('Error loading tool data');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        tool_code: formData.tool_code,
        tool_desc: formData.tool_desc,
        tool_status: formData.tool_status,
        tool_active: formData.tool_active,
        fk_client_id: formData.fk_client_id ? Number(formData.fk_client_id) : null,
        tool_ccPlatform: formData.tool_ccPlatform || null,
        tool_gcs_type: formData.tool_gcs_type || null,
        tool_latitude: formData.tool_latitude ? Number(formData.tool_latitude) : null,
        tool_longitude: formData.tool_longitude ? Number(formData.tool_longitude) : null,
        date_activation: formData.date_activation || null,
        location: formData.location || null,
        tool_maintenance_logbook: formData.tool_maintenance_logbook,
      };

      const res = await fetch(`/api/system/${toolId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.code === 1) {
        toast.success('System updated successfully');
        onSuccess();
      } else {
        toast.error(result.message || 'Failed to update system');
      }
    } catch {
      toast.error('Error updating system');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const inputCls = isDark
    ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-500'
    : 'bg-gray-50 border-gray-200 text-gray-900';
  const selectTriggerCls = isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : '';
  const selectContentCls = isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : '';
  const labelCls = `pb-2 text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-600'}`;
  const sectionLabelCls = `text-sm font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-muted-foreground'}`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`max-w-225! w-[90vw] max-h-[90vh] overflow-y-auto ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}>
        <DialogHeader className={`border-b pb-3 ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
          <DialogTitle className={isDark ? 'text-white' : ''}>Edit System</DialogTitle>
        </DialogHeader>

        {fetching ? (
          <div className="space-y-8 py-4">
            <div className="space-y-3">
              <Skeleton className={`h-4 w-32 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-2 space-y-2">
                  <Skeleton className={`h-3 w-10 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                  <Skeleton className={`h-10 w-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                </div>
                <div className="col-span-3 space-y-2">
                  <Skeleton className={`h-3 w-16 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                  <Skeleton className={`h-10 w-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Skeleton className={`h-4 w-40 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
              <div className="grid grid-cols-12 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="col-span-3 space-y-2">
                    <Skeleton className={`h-3 w-14 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                    <Skeleton className={`h-10 w-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Skeleton className={`h-4 w-44 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
              <div className="grid grid-cols-12 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="col-span-3 space-y-2">
                    <Skeleton className={`h-3 w-14 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                    <Skeleton className={`h-10 w-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-transparent">
              <Skeleton className={`h-10 w-24 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
              <Skeleton className={`h-10 w-32 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <p className={sectionLabelCls}>Basic Information</p>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-2">
                  <Label className={labelCls}>Code *</Label>
                  <Input className={inputCls} value={formData.tool_code} onChange={e => handleChange('tool_code', e.target.value)} required />
                </div>
                <div className="col-span-3">
                  <Label className={labelCls}>Description</Label>
                  <Input className={inputCls} value={formData.tool_desc} onChange={e => handleChange('tool_desc', e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <p className={sectionLabelCls}>Platform & Location</p>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-3">
                  <Label className={labelCls}>C2 Platform</Label>
                  <Select value={formData.tool_ccPlatform} onValueChange={v => handleChange('tool_ccPlatform', v)}>
                    <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Select Type" /></SelectTrigger>
                    <SelectContent className={selectContentCls}>
                      <SelectItem value="_FLYTBASE">Flytbase</SelectItem>
                      <SelectItem value="_VOTIX">Votix</SelectItem>
                      <SelectItem value="_FLIGHTHUB">DJI FlightHub</SelectItem>
                      <SelectItem value="_APP">APP on GCS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Label className={labelCls}>GCS</Label>
                  <Select value={formData.tool_gcs_type} onValueChange={v => handleChange('tool_gcs_type', v)}>
                    <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Select Type" /></SelectTrigger>
                    <SelectContent className={selectContentCls}>
                      <SelectItem value="_DOCK">Docking Station</SelectItem>
                      <SelectItem value="_RC">Remote Control</SelectItem>
                      <SelectItem value="_GCS">Ground Control Station</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Label className={labelCls}>Latitude</Label>
                  <Input className={inputCls} value={formData.tool_latitude} onChange={e => handleChange('tool_latitude', e.target.value)} />
                </div>
                <div className="col-span-3">
                  <Label className={labelCls}>Longitude</Label>
                  <Input className={inputCls} value={formData.tool_longitude} onChange={e => handleChange('tool_longitude', e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <p className={sectionLabelCls}>Status & Assignment</p>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-3">
                  <Label className={labelCls}>Status</Label>
                  <Select value={formData.tool_status} onValueChange={v => handleChange('tool_status', v)}>
                    <SelectTrigger className={selectTriggerCls}><SelectValue /></SelectTrigger>
                    <SelectContent className={selectContentCls}>
                      <SelectItem value="OPERATIONAL">Operational</SelectItem>
                      <SelectItem value="NOT_OPERATIONAL">Not Operational</SelectItem>
                      <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Label className={labelCls}>Active</Label>
                  <Select value={formData.tool_active} onValueChange={v => handleChange('tool_active', v)}>
                    <SelectTrigger className={selectTriggerCls}><SelectValue /></SelectTrigger>
                    <SelectContent className={selectContentCls}>
                      <SelectItem value="Y">ACTIVE</SelectItem>
                      <SelectItem value="N">NOT ACTIVE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Label className={labelCls}>Client</Label>
                  <Select value={formData.fk_client_id} onValueChange={v => handleChange('fk_client_id', v)}>
                    <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent className={selectContentCls}>
                      <SelectItem value="0">None</SelectItem>
                      {clients.map((c: any) => (
                        <SelectItem key={c.client_id} value={c.client_id.toString()}>{c.client_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Label className={labelCls}>Location</Label>
                  <Input className={inputCls} value={formData.location} onChange={e => handleChange('location', e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <p className={sectionLabelCls}>Dates & Settings</p>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-3">
                  <Label className={labelCls}>Activation Date</Label>
                  <Input type="date" className={inputCls} value={formData.date_activation} onChange={e => handleChange('date_activation', e.target.value)} />
                </div>
                <div className="col-span-3">
                  <Label className={labelCls}>Maintenance Logbook</Label>
                  <Select value={formData.tool_maintenance_logbook} onValueChange={v => handleChange('tool_maintenance_logbook', v)}>
                    <SelectTrigger className={selectTriggerCls}><SelectValue /></SelectTrigger>
                    <SelectContent className={selectContentCls}>
                      <SelectItem value="Y">Enabled</SelectItem>
                      <SelectItem value="N">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
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
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
