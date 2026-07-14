'use client';

import AddModelModal from '@/components/system/AddModelModal';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import axios from 'axios';
import { ChevronDown, ChevronRight, PlusCircle, Shield, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import type { DFlightDroneRow } from '@/types/dflight';

interface ImportDroneModalProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  drone: DFlightDroneRow | null;
  models: any[];
  clients: any[];
  onModelsRefresh: () => Promise<void>;
}

function sanitizeCode(name: string): string {
  const cleaned = name.trim().toUpperCase().replace(/[^A-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return cleaned.slice(0, 50) || 'DFLIGHT-DRONE';
}

const EMPTY_FORM = {
  tool_code: '',
  tool_description: '',
  component_code: '',
  component_sn: '',
  fk_tool_model_id: '',
  fk_client_id: '',
  drone_classes: [] as string[],
  insurance_company: '',
  insurance_expiry_date: '',
};

export default function ImportDroneModal({ open, onClose, onImported, drone, models, clients, onModelsRefresh }: ImportDroneModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [showAddModel, setShowAddModel] = useState(false);
  const [insuranceExpanded, setInsuranceExpanded] = useState(false);
  const [classesExpanded, setClassesExpanded] = useState(false);
  const [droneClasses, setDroneClasses] = useState<{ class_id: number; class_value: string }[]>([]);
  const [customClassInput, setCustomClassInput] = useState('');

  const matchModel = useCallback((list: any[]) => {
    if (!drone) return null;
    const manufacturer = drone.manufacturerName?.trim().toLowerCase();
    const modelName = drone.modelName?.trim().toLowerCase();
    if (!manufacturer && !modelName) return null;
    return list.find((m) =>
      (m.factory_type ?? '').trim().toLowerCase() === manufacturer &&
      (m.factory_model ?? '').trim().toLowerCase() === modelName,
    ) ?? null;
  }, [drone]);

  useEffect(() => {
    if (!open || !drone) return;

    const matched = matchModel(models);
    setFormData({
      tool_code: sanitizeCode(drone.dFlightName || drone.dFlightId),
      tool_description: '',
      component_code: drone.dFlightName || '',
      component_sn: drone.serialNumber || '',
      fk_tool_model_id: matched ? String(matched.tool_model_id) : '',
      fk_client_id: '',
      drone_classes: [],
      insurance_company: drone.insuranceCompany || '',
      insurance_expiry_date: drone.insuranceExpiryDate || '',
    });
    setInsuranceExpanded(!!(drone.insuranceCompany || drone.insuranceExpiryDate));
    setClassesExpanded(false);

    axios.get('/api/system/drone-classes')
      .then(({ data }) => { if (data.code === 1) setDroneClasses(data.data ?? []); })
      .catch(() => setDroneClasses([]));

    if (drone.uasClassId) {
      axios.get(`/api/dflight/uas-class?id=${encodeURIComponent(drone.uasClassId)}`)
        .then(({ data }) => {
          const label = data?.data?.label;
          if (label) {
            setFormData((prev) => prev.drone_classes.includes(label) ? prev : { ...prev, drone_classes: [...prev.drone_classes, label] });
            setClassesExpanded(true);
          }
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, drone]);

  const selectedModel = useMemo(
    () => models.find((m) => String(m.tool_model_id) === formData.fk_tool_model_id) ?? null,
    [models, formData.fk_tool_model_id],
  );

  const noModelMatch = !!drone && (drone.manufacturerName || drone.modelName) && !selectedModel;

  const handleChange = (field: keyof typeof EMPTY_FORM, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleModelCreated = async () => {
    setShowAddModel(false);
    await onModelsRefresh();
  };

  // Re-run matching once a fresh `models` list arrives after creating one.
  useEffect(() => {
    if (!open || formData.fk_tool_model_id) return;
    const matched = matchModel(models);
    if (matched) handleChange('fk_tool_model_id', String(matched.tool_model_id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drone) return;
    if (!formData.tool_code.trim()) { toast.error(t('dflight.import.toasts.systemCodeRequired')); return; }
    if (!formData.component_sn.trim()) { toast.error(t('dflight.import.toasts.serialRequired')); return; }
    if (!formData.fk_tool_model_id) { toast.error(t('dflight.import.toasts.modelRequired')); return; }
    if (!formData.fk_client_id) { toast.error(t('dflight.import.toasts.clientRequired')); return; }

    setLoading(true);
    try {
      const payload = {
        dFlightId: drone.dFlightId,
        fk_client_id: Number(formData.fk_client_id),
        tool_code: formData.tool_code.trim(),
        tool_description: formData.tool_description || null,
        component_code: formData.component_code.trim() || formData.tool_code.trim(),
        component_sn: formData.component_sn.trim(),
        fk_tool_model_id: Number(formData.fk_tool_model_id),
        drone_classes: formData.drone_classes.length ? formData.drone_classes : null,
        insurance_company: formData.insurance_company || null,
        insurance_expiry_date: formData.insurance_expiry_date || null,
        qr_code_image: drone.qrCodeImage || null,
      };

      const { data } = await axios.post('/api/dflight/import', payload);
      if (data.code === 1) {
        toast.success(t('dflight.import.toasts.success'));
        onImported();
      } else {
        toast.error(data.message || t('dflight.import.toasts.failed'));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('dflight.import.toasts.error'));
    } finally {
      setLoading(false);
    }
  };

  if (!drone) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="!max-w-[760px] w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('dflight.import.title')}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">{t('dflight.import.sections.system')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="col-span-1 sm:col-span-4">
                  <Label className="pb-2">{t('dflight.import.fields.systemCode')}</Label>
                  <Input value={formData.tool_code} onChange={(e) => handleChange('tool_code', e.target.value)} required />
                </div>
                <div className="col-span-1 sm:col-span-4">
                  <Label className="pb-2">{t('dflight.import.fields.systemDescription')} <span className="text-muted-foreground font-normal">{t('systems.components.common.optional')}</span></Label>
                  <Input value={formData.tool_description} onChange={(e) => handleChange('tool_description', e.target.value)} />
                </div>
                <div className="col-span-1 sm:col-span-4">
                  <Label className="pb-2">{t('dflight.import.fields.client')}</Label>
                  <Select value={formData.fk_client_id} onValueChange={(v) => handleChange('fk_client_id', v)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder={t('systems.components.common.select')} /></SelectTrigger>
                    <SelectContent>
                      {clients.map((c: any) => (
                        <SelectItem key={c.client_id} value={c.client_id.toString()}>{c.client_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">{t('dflight.import.sections.component')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="col-span-1 sm:col-span-4">
                  <Label className="pb-2">{t('dflight.import.fields.componentName')}</Label>
                  <Input value={formData.component_code} onChange={(e) => handleChange('component_code', e.target.value)} required />
                </div>
                <div className="col-span-1 sm:col-span-4">
                  <Label className="pb-2">{t('dflight.import.fields.serialNumber')}</Label>
                  <Input value={formData.component_sn} onChange={(e) => handleChange('component_sn', e.target.value)} required />
                </div>
                <div className="col-span-1 sm:col-span-4">
                  <Label className="pb-2">{t('dflight.import.fields.drc')}</Label>
                  <Input value={drone.dFlightId} disabled className="opacity-70" />
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">{t('dflight.import.sections.model')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="col-span-1 sm:col-span-8 min-w-0">
                  <Select value={formData.fk_tool_model_id} onValueChange={(v) => handleChange('fk_tool_model_id', v)}>
                    <SelectTrigger className="w-full min-w-0">
                      <SelectValue placeholder={t('systems.components.common.select')}>
                        {selectedModel ? (
                          <span className="block w-full truncate text-left">
                            {selectedModel.factory_type} / {selectedModel.factory_model} / {selectedModel.factory_serie}
                          </span>
                        ) : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((m: any) => (
                        <SelectItem key={m.tool_model_id} value={m.tool_model_id.toString()} disabled={m.model_active !== 'Y'}>
                          {m.factory_type} / {m.factory_model} / {m.factory_serie}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1 sm:col-span-4">
                  <Button type="button" variant="outline" onClick={() => setShowAddModel(true)} className="w-full gap-1.5">
                    <PlusCircle className="h-3.5 w-3.5" />
                    {t('dflight.import.buttons.newModel')}
                  </Button>
                </div>
              </div>
              {noModelMatch && (
                <p className="text-xs text-amber-600 mt-2">
                  {t('dflight.import.noModelMatch', { manufacturer: drone.manufacturerName ?? '—', model: drone.modelName ?? '—' })}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50">
              <button type="button" onClick={() => setClassesExpanded((v) => !v)} className="cursor-pointer w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700">
                <span className="flex items-center gap-2">
                  {t('systems.components.common.droneClasses')}
                  <span className="text-xs font-normal text-muted-foreground">{t('systems.components.common.optional')}</span>
                </span>
                {classesExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              </button>
              {classesExpanded && (
                <div className="px-4 pb-4 space-y-2 border-t border-slate-200 pt-3">
                  {formData.drone_classes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {formData.drone_classes.map((cls) => (
                        <span key={cls} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-600 text-white border border-violet-600">
                          {cls}
                          <button type="button" onClick={() => handleChange('drone_classes', formData.drone_classes.filter((v) => v !== cls))} className="ml-0.5 hover:bg-violet-700 rounded-full p-0.5 transition-colors">
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {droneClasses.filter((dc) => !formData.drone_classes.includes(dc.class_value)).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] font-semibold uppercase text-slate-400 mr-1">{t('dflight.import.addClass')}</span>
                      {droneClasses.filter((dc) => !formData.drone_classes.includes(dc.class_value)).map((dc) => (
                        <button key={dc.class_id} type="button" onClick={() => handleChange('drone_classes', [...formData.drone_classes, dc.class_value])} className="px-2.5 py-1 rounded-full text-xs font-medium border border-dashed border-slate-300 text-slate-500 hover:border-violet-400 hover:text-violet-600 transition-colors">
                          + {dc.class_value}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={customClassInput}
                      onChange={(e) => setCustomClassInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = customClassInput.trim();
                          if (val && !formData.drone_classes.includes(val)) handleChange('drone_classes', [...formData.drone_classes, val]);
                          setCustomClassInput('');
                        }
                      }}
                      placeholder="Custom class (e.g. C2)…"
                      className="h-7 rounded-md border border-slate-300 px-2.5 text-xs outline-none focus:ring-1 focus:ring-violet-500/30 bg-background w-44"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50">
              <button type="button" onClick={() => setInsuranceExpanded((v) => !v)} className="cursor-pointer w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700">
                <span className="flex items-center gap-2">
                  <Shield size={15} className="text-slate-400" />
                  {t('systems.components.common.insurance.label')}
                  <span className="text-xs font-normal text-muted-foreground">{t('systems.components.common.optional')}</span>
                </span>
                {insuranceExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              </button>
              {insuranceExpanded && (
                <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-12 gap-3 border-t border-slate-200 pt-3">
                  <div className="col-span-1 sm:col-span-6">
                    <Label className="pb-2">{t('systems.components.common.insurance.company')}</Label>
                    <Input value={formData.insurance_company} onChange={(e) => handleChange('insurance_company', e.target.value)} placeholder={t('systems.components.common.insurance.companyPlaceholder')} />
                  </div>
                  <div className="col-span-1 sm:col-span-6">
                    <Label className="pb-2">{t('systems.components.common.insurance.expiryDate')}</Label>
                    <Input type="date" value={formData.insurance_expiry_date} onChange={(e) => handleChange('insurance_expiry_date', e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>{t('systems.components.addComponent.buttons.cancel')}</Button>
              <Button type="submit" className="bg-violet-600 hover:bg-violet-700" disabled={loading}>
                {loading ? t('dflight.import.buttons.importing') : t('dflight.import.buttons.import')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AddModelModal
        open={showAddModel}
        onClose={() => setShowAddModel(false)}
        onSuccess={handleModelCreated}
        initialValues={{
          model_category: 'AIRCRAFT',
          model_subtype: 'MULTIROTOR',
          manufacturer: drone.manufacturerName ?? '',
          model_name: drone.modelName ?? '',
          model_code: drone.modelName ?? '',
        }}
      />
    </>
  );
}
