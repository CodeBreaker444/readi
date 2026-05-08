'use client';

import { useAuthorization } from '@/components/authorization/AuthorizationProvider';
import EditComponentModal from '@/components/system/EditComponentModal';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/components/useTheme';
import { AlertTriangle, Loader2, Pencil, Unlink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Skeleton } from '../ui/skeleton';

interface EditSystemModalProps {
  open: boolean;
  toolId: number | null;
  onClose: () => void;
  onSuccess: () => void;
  clients: any[];
  models?: any[];
  tools?: any[];
}

const EMPTY_FORM = {
  tool_code: '', tool_desc: '',
  tool_status: 'OPERATIONAL', tool_active: 'Y',
  fk_client_id: '',
  tool_latitude: '', tool_longitude: '',
  date_activation: '', location: '',
  tool_maintenance_logbook: 'N',
};

const STATUS_STYLES: Record<string, string> = {
  OPERATIONAL: 'bg-green-100 text-green-800',
  MAINTENANCE: 'bg-yellow-100 text-yellow-800',
  NOT_OPERATIONAL: 'bg-red-100 text-red-800',
  DECOMMISSIONED: 'bg-gray-100 text-gray-600',
};
const STATUS_STYLES_DARK: Record<string, string> = {
  OPERATIONAL: 'bg-green-950 text-green-400 border border-green-800',
  MAINTENANCE: 'bg-yellow-950 text-yellow-400 border border-yellow-800',
  NOT_OPERATIONAL: 'bg-red-950 text-red-400 border border-red-800',
  DECOMMISSIONED: 'bg-gray-800 text-gray-400 border border-gray-700',
};

export default function EditSystemModal({ open, toolId, onClose, onSuccess, clients, models = [], tools = [] }: EditSystemModalProps) {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const { requireAuthorization } = useAuthorization();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [originalStatus, setOriginalStatus] = useState<string>('OPERATIONAL');
  const [components, setComponents] = useState<any[]>([]);
  const [detachingId, setDetachingId] = useState<number | null>(null);
  const [detachConfirm, setDetachConfirm] = useState<{ id: number; name: string } | null>(null);
  const [editComponentId, setEditComponentId] = useState<number | null>(null);

  useEffect(() => {
    if (open && toolId) {
      fetchTool();
      fetchComponents();
    }
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
          const status = tool.tool_status || 'OPERATIONAL';
          setOriginalStatus(status);
          setFormData({
            tool_code: tool.tool_code || '',
            tool_desc: tool.tool_desc || '',
            tool_status: status,
            tool_active: tool.active || 'Y',
            fk_client_id: tool.fk_client_id ? String(tool.fk_client_id) : '',
            tool_latitude: tool.tool_latitude != null ? String(tool.tool_latitude) : '',
            tool_longitude: tool.tool_longitude != null ? String(tool.tool_longitude) : '',
            date_activation: tool.date_activation || '',
            location: tool.location || '',
            tool_maintenance_logbook: tool.tool_maintenance_logbook || 'N',
          });
        }
      }
    } catch {
      toast.error(t('systems.components.editSystem.toasts.loadError'));
    } finally {
      setFetching(false);
    }
  };

  const fetchComponents = async () => {
    try {
      const res = await fetch('/api/system/component/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_id: toolId }),
      });
      const result = await res.json();
      if (result.code === 1) setComponents(result.data || []);
    } catch {
      // silently ignore
    }
  };

  const handleDetach = async (componentId: number) => {
    const comp = components.find(c => c.tool_component_id === componentId);
    try {
      await requireAuthorization({
        actionType: 'component_detach',
        entityType: 'component',
        entityId:   String(componentId),
        label:      `Remove Component: ${comp?.component_code ?? comp?.component_sn ?? `#${componentId}`}`,
        details: {
          component_id:   componentId,
          component_type: comp?.component_type,
          tool_id:        toolId,
        },
      });
    } catch {
      setDetachConfirm(null);
      return;
    }

    setDetachingId(componentId);
    try {
      const res = await fetch(`/api/system/component/${componentId}/detach`, { method: 'POST' });
      const result = await res.json();
      if (result.code === 1) {
        toast.success(t('systems.components.editSystem.toasts.componentRemoved'));
        setComponents(prev => prev.filter(c => c.tool_component_id !== componentId));
      } else {
        toast.error(result.message || t('systems.components.editSystem.toasts.removeFailed'));
      }
    } catch {
      toast.error(t('systems.components.editSystem.toasts.removeError'));
    } finally {
      setDetachingId(null);
      setDetachConfirm(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (formData.tool_status === 'OPERATIONAL' && originalStatus !== 'OPERATIONAL') {
      try {
        await requireAuthorization({
          actionType: 'drone_put_in_operation',
          entityType: 'system',
          entityId:   String(toolId),
          label:      `Put System in Operation: ${formData.tool_code}`,
          details: {
            tool_id:  toolId,
            from:     originalStatus,
            to:       'OPERATIONAL',
            tool_code: formData.tool_code,
          },
        });
      } catch {
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        tool_code: formData.tool_code,
        tool_desc: formData.tool_desc,
        tool_status: formData.tool_status,
        tool_active: formData.tool_active,
        fk_client_id: formData.fk_client_id ? Number(formData.fk_client_id) : null,
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
        toast.success(t('systems.components.editSystem.toasts.updateSuccess'));
        onSuccess();
      } else {
        toast.error(result.message || t('systems.components.editSystem.toasts.updateFailed'));
      }
    } catch {
      toast.error(t('systems.components.editSystem.toasts.updateError'));
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
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className={`max-w-225! w-[90vw] h-[90vh] overflow-y-auto ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}>
          <DialogHeader className={`border-b pb-3 ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
            <DialogTitle className={isDark ? 'text-white' : ''}>{t('systems.components.editSystem.title')}</DialogTitle>
          </DialogHeader>

          {fetching ? (
            <div className="space-y-8 py-4">
              <div className="space-y-3">
                <Skeleton className={`h-4 w-32 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="col-span-1 sm:col-span-2 space-y-2">
                    <Skeleton className={`h-3 w-10 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                    <Skeleton className={`h-10 w-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                  </div>
                  <div className="col-span-1 sm:col-span-3 space-y-2">
                    <Skeleton className={`h-3 w-16 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                    <Skeleton className={`h-10 w-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <Skeleton className={`h-4 w-40 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="col-span-1 sm:col-span-3 space-y-2">
                      <Skeleton className={`h-3 w-14 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                      <Skeleton className={`h-10 w-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <Skeleton className={`h-4 w-44 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="col-span-1 sm:col-span-3 space-y-2">
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
                <p className={sectionLabelCls}>{t('systems.components.editSystem.sections.basicInfo')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="col-span-1 sm:col-span-2">
                    <Label className={labelCls}>{t('systems.components.editSystem.fields.code')}</Label>
                    <Input className={inputCls} value={formData.tool_code} onChange={e => handleChange('tool_code', e.target.value)} required />
                  </div>
                  <div className="col-span-1 sm:col-span-3">
                    <Label className={labelCls}>{t('systems.components.editSystem.fields.description')}</Label>
                    <Input className={inputCls} value={formData.tool_desc} onChange={e => handleChange('tool_desc', e.target.value)} />
                  </div>
                </div>
              </div>

              <div>
                <p className={sectionLabelCls}>{t('systems.components.editSystem.sections.location')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="col-span-1 sm:col-span-3">
                    <Label className={labelCls}>{t('systems.components.editSystem.fields.latitude')}</Label>
                    <Input className={inputCls} value={formData.tool_latitude} onChange={e => handleChange('tool_latitude', e.target.value)} />
                  </div>
                  <div className="col-span-1 sm:col-span-3">
                    <Label className={labelCls}>{t('systems.components.editSystem.fields.longitude')}</Label>
                    <Input className={inputCls} value={formData.tool_longitude} onChange={e => handleChange('tool_longitude', e.target.value)} />
                  </div>
                </div>
              </div>

              <div>
                <p className={sectionLabelCls}>{t('systems.components.editSystem.sections.statusAssignment')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="col-span-1 sm:col-span-3">
                    <Label className={labelCls}>{t('systems.components.editSystem.fields.status')}</Label>
                    <Select value={formData.tool_status} onValueChange={v => handleChange('tool_status', v)}>
                      <SelectTrigger className={selectTriggerCls}><SelectValue /></SelectTrigger>
                      <SelectContent className={selectContentCls}>
                        <SelectItem value="OPERATIONAL">{t('systems.components.common.statusOptions.operational')}</SelectItem>
                        <SelectItem value="NOT_OPERATIONAL">{t('systems.components.common.statusOptions.notOperational')}</SelectItem>
                        <SelectItem value="MAINTENANCE">{t('systems.components.common.statusOptions.maintenance')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 sm:col-span-3">
                    <Label className={labelCls}>{t('systems.components.editSystem.fields.active')}</Label>
                    <Select value={formData.tool_active} onValueChange={v => handleChange('tool_active', v)}>
                      <SelectTrigger className={selectTriggerCls}><SelectValue /></SelectTrigger>
                      <SelectContent className={selectContentCls}>
                        <SelectItem value="Y">{t('systems.components.common.activeOptions.active')}</SelectItem>
                        <SelectItem value="N">{t('systems.components.common.activeOptions.notActive')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 sm:col-span-3">
                    <Label className={labelCls}>{t('systems.components.editSystem.fields.client')}</Label>
                    <Select value={formData.fk_client_id} onValueChange={v => handleChange('fk_client_id', v)}>
                      <SelectTrigger className={selectTriggerCls}><SelectValue placeholder={t('systems.components.common.select')} /></SelectTrigger>
                      <SelectContent className={selectContentCls}>
                        <SelectItem value="0">None</SelectItem>
                        {clients.map((c: any) => (
                          <SelectItem key={c.client_id} value={c.client_id.toString()}>{c.client_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 sm:col-span-3">
                    <Label className={labelCls}>{t('systems.components.editSystem.fields.location')}</Label>
                    <Input className={inputCls} value={formData.location} onChange={e => handleChange('location', e.target.value)} />
                  </div>
                </div>
              </div>

              <div>
                <p className={sectionLabelCls}>{t('systems.components.editSystem.sections.datesSettings')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="col-span-1 sm:col-span-3">
                    <Label className={labelCls}>{t('systems.components.editSystem.fields.activationDate')}</Label>
                    <Input type="date" className={inputCls} value={formData.date_activation} onChange={e => handleChange('date_activation', e.target.value)} />
                  </div>
                  <div className="col-span-1 sm:col-span-3">
                    <Label className={labelCls}>{t('systems.components.editSystem.fields.maintenanceLogbook')}</Label>
                    <Select value={formData.tool_maintenance_logbook} onValueChange={v => handleChange('tool_maintenance_logbook', v)}>
                      <SelectTrigger className={selectTriggerCls}><SelectValue /></SelectTrigger>
                      <SelectContent className={selectContentCls}>
                        <SelectItem value="Y">{t('systems.components.editSystem.fields.logbookEnabled')}</SelectItem>
                        <SelectItem value="N">{t('systems.components.editSystem.fields.logbookDisabled')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className={`border-t pt-4 ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
                <p className={sectionLabelCls}>{t('systems.components.editSystem.sections.attachedComponents', { count: components.length })}</p>
                {components.length === 0 ? (
                  <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{t('systems.components.editSystem.noComponents')}</p>
                ) : (
                  <div className={`rounded-lg border overflow-hidden ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className={isDark ? 'bg-slate-700/50' : 'bg-gray-50'}>
                          <th className={`text-left px-3 py-2 font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{t('systems.components.editSystem.componentTable.type')}</th>
                          <th className={`text-left px-3 py-2 font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{t('systems.components.editSystem.componentTable.code')}</th>
                          <th className={`text-left px-3 py-2 font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{t('systems.components.editSystem.componentTable.serialNo')}</th>
                          <th className={`text-left px-3 py-2 font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{t('systems.components.editSystem.componentTable.status')}</th>
                          <th className={`text-right px-3 py-2 font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{t('systems.components.editSystem.componentTable.actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {components.map((comp, idx) => (
                          <tr
                            key={comp.tool_component_id}
                            className={`border-t ${
                              isDark
                                ? 'border-slate-700 hover:bg-slate-700/30'
                                : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-100/50'
                            }`}
                          >
                            <td className="px-3 py-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                {comp.component_type}
                              </span>
                            </td>
                            <td className={`px-3 py-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                              {comp.component_code || '—'}
                            </td>
                            <td className={`px-3 py-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                              {comp.component_sn || '—'}
                            </td>
                            <td className="px-3 py-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                isDark
                                  ? STATUS_STYLES_DARK[comp.component_status] || ''
                                  : STATUS_STYLES[comp.component_status] || 'bg-gray-100 text-gray-600'
                              }`}>
                                {comp.component_status}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex gap-1.5 justify-end">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className={`h-6 px-2 text-[10px] gap-1 ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}`}
                                  onClick={() => setEditComponentId(comp.tool_component_id)}
                                >
                                  <Pencil className="w-2.5 h-2.5" /> {t('systems.components.editSystem.buttons.edit')}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className={`h-6 px-2 text-[10px] gap-1 ${
                                    isDark
                                      ? 'border-red-800 text-red-400 hover:bg-red-950'
                                      : 'border-red-200 text-red-600 hover:bg-red-50'
                                  }`}
                                  disabled={detachingId === comp.tool_component_id}
                                  onClick={() => setDetachConfirm({ id: comp.tool_component_id, name: comp.component_code || comp.component_type })}
                                >
                                  {detachingId === comp.tool_component_id
                                    ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                    : <Unlink className="w-2.5 h-2.5" />}
                                  {t('systems.components.editSystem.buttons.remove')}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className={`flex justify-end gap-2 pt-2 border-t ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
                <Button type="button" variant="outline" onClick={onClose}
                  className={isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}>
                  {t('systems.components.editSystem.buttons.cancel')}
                </Button>
                <Button type="submit" disabled={loading} className="bg-violet-600 hover:bg-violet-500 text-white">
                  {loading ? t('systems.components.editSystem.buttons.saving') : t('systems.components.editSystem.buttons.saveChanges')}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!detachConfirm} onOpenChange={() => setDetachConfirm(null)}>
        <DialogContent className={`max-w-sm ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              {t('systems.components.editSystem.removeDialog.title')}
            </DialogTitle>
          </DialogHeader>
          <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            {t('systems.components.editSystem.removeDialog.description', { name: detachConfirm?.name })}
          </p>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {t('systems.components.editSystem.removeDialog.note')}
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setDetachConfirm(null)}
              className={isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}>
              {t('systems.components.editSystem.buttons.cancel')}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={detachingId !== null}
              onClick={() => detachConfirm && handleDetach(detachConfirm.id)}
            >
              {detachingId !== null ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              {t('systems.components.editSystem.buttons.remove')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {editComponentId && (
        <EditComponentModal
          open={!!editComponentId}
          toolId={toolId}
          initialComponentId={editComponentId}
          onClose={() => setEditComponentId(null)}
          onSuccess={() => { setEditComponentId(null); fetchComponents(); }}
          models={models}
          clients={clients}
          tools={tools}
        />
      )}
    </>
  );
}
