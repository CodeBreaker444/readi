'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import axios from 'axios';
import { AlertTriangle, Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ComponentType } from './AddComponentModal';

interface Props {
  open: boolean;
  onClose: () => void;
  types: ComponentType[];
  onReload: () => void;
  isDark: boolean;
}

export function ManageComponentTypesModal({ open, onClose, types, onReload, isDark }: Props) {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');
  const [adding, setAdding] = useState(false);

  const [impactData, setImpactData] = useState<any[] | null>(null);

  const bg = isDark ? 'bg-[#0f1419] border-white/[0.08]' : 'bg-white';
  const rowBg = isDark ? 'bg-slate-900/40 border-white/[0.06]' : 'bg-white border-slate-200';
  const inputCls = isDark ? 'bg-slate-800 border-slate-600 text-white placeholder:text-slate-500' : '';
  const text = isDark ? 'text-slate-200' : 'text-slate-800';
  const muted = isDark ? 'text-slate-500' : 'text-slate-400';

  const startEdit = (tp: ComponentType) => {
    setEditingId(tp.type_id);
    setEditLabel(tp.type_label);
    setImpactData(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditLabel('');
    setImpactData(null);
  };

  const handleSave = async (typeId: number, confirmed = false) => {
    if (!editLabel.trim()) return;
    setSavingId(typeId);
    try {
      const { data } = await axios.patch(`/api/system/component-types/${typeId}`, {
        type_label: editLabel.trim(),
        confirm_impact: confirmed
      });

      if (data.code === 2) {
        setImpactData(data.usage);
        return;
      }

      if (data.code === 1) {
        toast.success(t('systems.components.manageTypes.toasts.typeUpdated'));
        setEditingId(null);
        setImpactData(null);
        onReload();
      } else {
        toast.error(data.message ?? t('systems.components.manageTypes.toasts.updateFailed'));
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || t('systems.components.manageTypes.toasts.updateFailed'));
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (typeId: number) => {
    setDeletingId(typeId);
    try {
      const { data } = await axios.delete(`/api/system/component-types/${typeId}`);
      if (data.code === 1) {
        toast.success(t('systems.components.manageTypes.toasts.typeRemoved'));
        onReload();
      } else {
        toast.error(data.message ?? t('systems.components.manageTypes.toasts.deleteFailed'));
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || t('systems.components.manageTypes.toasts.deleteFailed'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleAdd = async () => {
    if (!newLabel.trim() || !newValue.trim()) { toast.error(t('systems.components.manageTypes.toasts.bothRequired')); return; }
    setAdding(true);
    try {
      const { data } = await axios.post('/api/system/component-types', { type_value: newValue.trim(), type_label: newLabel.trim() });
      if (data.code === 1) {
        toast.success(t('systems.components.manageTypes.toasts.typeAdded'));
        setNewLabel('');
        setNewValue('');
        onReload();
      } else {
        toast.error(data.message ?? t('systems.components.manageTypes.toasts.addFailed'));
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? t('systems.components.manageTypes.toasts.addFailed'));
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setImpactData(null); } }}>
      <DialogContent className={`!max-w-[480px] w-[95vw] max-h-[80vh] overflow-hidden flex flex-col p-0 ${bg}`}>
        <DialogHeader className={`px-5 pt-5 pb-4 border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-200'}`}>
          <DialogTitle className={`text-sm font-semibold ${text}`}>{t('systems.components.manageTypes.title')}</DialogTitle>
          <p className={`text-xs mt-0.5 ${muted}`}>{t('systems.components.manageTypes.subtitle')}</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5">
          {types.map((tp) => (
            <div key={tp.type_id} className="space-y-2">
              <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${rowBg}`}>
                {editingId === tp.type_id ? (
                  <>
                    <Input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSave(tp.type_id); if (e.key === 'Escape') cancelEdit(); }}
                      autoFocus
                      className={`h-7 text-xs flex-1 ${inputCls}`}
                    />
                    <button
                      onClick={() => handleSave(tp.type_id)}
                      disabled={savingId === tp.type_id}
                      className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${isDark ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-emerald-600 hover:bg-emerald-50'}`}
                    >
                      {savingId === tp.type_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className={`h-6 w-6 cursor-pointer flex items-center justify-center rounded transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-100'}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium ${text}`}>{tp.type_label}</p>
                      <p className={`text-[10px] font-mono ${muted}`}>{tp.type_value}</p>
                    </div>
                    <button
                      onClick={() => startEdit(tp)}
                      className={`h-6 w-6 cursor-pointer flex items-center justify-center rounded transition-colors ${isDark ? 'text-slate-500 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(tp.type_id)}
                      disabled={deletingId === tp.type_id}
                      className={`h-6 w-6 cursor-pointer flex items-center justify-center rounded transition-colors ${isDark ? 'text-slate-600 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-300 hover:text-rose-500 hover:bg-rose-50'}`}
                    >
                      {deletingId === tp.type_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </button>
                  </>
                )}
              </div>

              {editingId === tp.type_id && impactData && (
                <div className={`p-3 rounded-lg border text-[11px] animate-in fade-in slide-in-from-top-1 ${isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                  <div className="flex gap-2 mb-2">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <p className="font-semibold">{t('systems.components.manageTypes.renameConfirmTitle')}</p>
                  </div>
                  <p className="mb-2">{t('systems.components.manageTypes.renameConfirmMessage', { count: impactData.length })}</p>
                  <div className={`max-h-24 overflow-y-auto rounded p-2 mb-3 space-y-1 ${isDark ? 'bg-black/20' : 'bg-white/50'}`}>
                    {impactData.map(c => (
                      <div key={c.component_id} className="flex justify-between font-mono text-[10px]">
                        <span>{c.component_code || `#${c.component_id}`}</span>
                        <span className={muted}>{c.tool_code}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setImpactData(null)}>{t('systems.components.manageTypes.back')}</Button>
                    <Button
                      size="sm"
                      className="h-7 cursor-pointer text-[10px] bg-amber-600 hover:bg-amber-500 text-white"
                      onClick={() => handleSave(tp.type_id, true)}
                    >
                      {t('systems.components.manageTypes.yesRenameAll')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className={`px-5 py-4 border-t ${isDark ? 'border-white/[0.06] bg-slate-900/30' : 'border-slate-200 bg-slate-50'}`}>
          <p className={`text-[10px] uppercase tracking-wider font-medium mb-2 ${muted}`}>{t('systems.components.manageTypes.addNewType')}</p>
          <div className="flex gap-2">
            <Input
              placeholder={t('systems.components.manageTypes.placeholders.label')}
              value={newLabel}
              onChange={(e) => { setNewLabel(e.target.value); setNewValue(e.target.value.toUpperCase().replace(/\s+/g, '_')); }}
              className={`h-8 text-xs flex-1 ${inputCls}`}
            />
            <Input
              placeholder={t('systems.components.manageTypes.placeholders.value')}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
              className={`h-8 text-xs w-36 font-mono ${inputCls}`}
            />
            <Button size="sm" onClick={handleAdd} disabled={adding} className="h-8 px-3 bg-violet-600 hover:bg-violet-500 text-white">
              {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
