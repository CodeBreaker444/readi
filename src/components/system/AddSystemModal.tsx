
'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/components/useTheme';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const INITIAL_FORM = {
  tool_code: '', tool_description: '',
  tool_status: 'OPERATIONAL', tool_active: 'Y', fk_model_id: '', fk_client_id: '',
  latitude: '', longitude: '', purchase_date: '', activation_date: '',
  location: '',
};

interface AddToolModalProps {
  open: boolean; onClose: () => void; onSuccess: () => void; models: any[]; clients: any[];
}

export default function AddSystemModal({ open, onClose, onSuccess, models, clients }: AddToolModalProps) {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => { if (open) { setFormData(INITIAL_FORM); setFiles([]); } }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.latitude) {
      const lat = Number(formData.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        toast.error(t('systems.components.addSystem.toasts.latitudeRange'));
        return;
      }
    }
    if (formData.longitude) {
      const lng = Number(formData.longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        toast.error(t('systems.components.addSystem.toasts.longitudeRange'));
        return;
      }
    }

    setLoading(true);
    try {
      const formPayload = new FormData();
      const payload = {
        tool_code: formData.tool_code,
        tool_name: formData.tool_code,
        tool_description: formData.tool_description,
        tool_active: formData.tool_active,
        fk_client_id: formData.fk_client_id ? Number(formData.fk_client_id) : null,
        location: formData.location || null,
        latitude: formData.latitude ? Number(formData.latitude) : null,
        longitude: formData.longitude ? Number(formData.longitude) : null,
        activationDate: formData.activation_date || null,
      };
      formPayload.append('data', JSON.stringify(payload));
      files.forEach(f => formPayload.append('files', f));

      const res = await fetch('/api/system/add', { method: 'POST', body: formPayload });
      const result = await res.json();
      if (result.code === 1) { toast.success(t('systems.components.addSystem.toasts.success')); onSuccess(); }
      else toast.error(result.message || t('systems.components.addSystem.toasts.failed'));
    } catch { toast.error(t('systems.components.addSystem.toasts.error')); } finally { setLoading(false); }
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
          <DialogTitle className={isDark ? 'text-white' : ''}>{t('systems.components.addSystem.title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">

          <div>
            <p className={sectionLabelCls}>{t('systems.components.addSystem.sections.basicInfo')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="col-span-1 sm:col-span-2"><Label className={labelCls}>{t('systems.components.addSystem.fields.code')}</Label>
                <Input className={inputCls} value={formData.tool_code} onChange={e => handleChange('tool_code', e.target.value)} required />
              </div>
              <div className="col-span-1 sm:col-span-3"><Label className={labelCls}>{t('systems.components.addSystem.fields.description')}</Label>
                <Input className={inputCls} value={formData.tool_description} onChange={e => handleChange('tool_description', e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <p className={sectionLabelCls}>{t('systems.components.addSystem.sections.location')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="col-span-1 sm:col-span-3"><Label className={labelCls}>{t('systems.components.addSystem.fields.latitude')}</Label>
                <Input className={inputCls} value={formData.latitude} onChange={e => handleChange('latitude', e.target.value)} />
              </div>
              <div className="col-span-1 sm:col-span-3"><Label className={labelCls}>{t('systems.components.addSystem.fields.longitude')}</Label>
                <Input className={inputCls} value={formData.longitude} onChange={e => handleChange('longitude', e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <p className={sectionLabelCls}>{t('systems.components.addSystem.sections.purchaseActivation')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="col-span-1 sm:col-span-3"><Label className={labelCls}>{t('systems.components.addSystem.fields.activationDate')}</Label>
                <Input type="date" className={inputCls} value={formData.activation_date} onChange={e => handleChange('activation_date', e.target.value)} />
              </div>
              <div className="col-span-1 sm:col-span-3"><Label className={labelCls}>{t('systems.components.addSystem.fields.active')}</Label>
                <Select value={formData.tool_active} onValueChange={v => handleChange('tool_active', v)}>
                  <SelectTrigger className={selectTriggerCls}><SelectValue /></SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    <SelectItem value="Y">{t('systems.components.addSystem.activeOptions.active')}</SelectItem>
                    <SelectItem value="N">{t('systems.components.addSystem.activeOptions.notActive')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <p className={sectionLabelCls}>{t('systems.components.addSystem.sections.statusAssignment')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="col-span-1 sm:col-span-3"><Label className={labelCls}>{t('systems.components.addSystem.fields.status')}</Label>
                <Select value={formData.tool_status} onValueChange={v => handleChange('tool_status', v)}>
                  <SelectTrigger className={selectTriggerCls}><SelectValue /></SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    <SelectItem value="OPERATIONAL">{t('systems.components.addSystem.statusOptions.operational')}</SelectItem>
                    <SelectItem value="NOT_OPERATIONAL">{t('systems.components.addSystem.statusOptions.notOperational')}</SelectItem>
                    <SelectItem value="MAINTENANCE">{t('systems.components.addSystem.statusOptions.maintenance')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1 sm:col-span-3"><Label className={labelCls}>{t('systems.components.addSystem.fields.client')}</Label>
                <Select value={formData.fk_client_id} onValueChange={v => handleChange('fk_client_id', v)}>
                  <SelectTrigger className={selectTriggerCls}><SelectValue placeholder={t('systems.components.common.select')} /></SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    <SelectItem value="0">None</SelectItem>
                    {clients.map((c: any) => (<SelectItem key={c.client_id} value={c.client_id.toString()}>{c.client_name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1 sm:col-span-3"><Label className={labelCls}>{t('systems.components.addSystem.fields.location')}</Label>
                <Input className={inputCls} value={formData.location} onChange={e => handleChange('location', e.target.value)} />
              </div>
            </div>
          </div>
          <div>
            <p className={sectionLabelCls}>{t('systems.components.addSystem.sections.documentation')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="col-span-1 sm:col-span-6">
                <Label className={labelCls}>{t('systems.components.addSystem.fields.attachFiles')}</Label>
                <Input
                  type="file"
                  multiple
                  className={inputCls}
                  onChange={e => setFiles(Array.from(e.target.files ?? []))}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
                {files.length > 0 && (
                  <ul className={`mt-1 space-y-0.5 text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {files.map((f, i) => <li key={i}>{f.name}</li>)}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className={`flex justify-end gap-2 pt-2 border-t ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
            <Button type="button" variant="outline" onClick={onClose}
              className={isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}>
              {t('systems.components.addSystem.buttons.cancel')}
            </Button>
            <Button type="submit" disabled={loading}
              className="bg-violet-600 hover:bg-violet-500 text-white">
              {loading ? t('systems.components.addSystem.buttons.adding') : t('systems.components.addSystem.buttons.addSystem')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
