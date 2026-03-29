'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import axios from 'axios';
import { Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');
  const [adding, setAdding] = useState(false);

  const bg = isDark ? 'bg-[#0f1419] border-white/[0.08]' : 'bg-white';
  const rowBg = isDark ? 'bg-slate-900/40 border-white/[0.06]' : 'bg-white border-slate-200';
  const inputCls = isDark ? 'bg-slate-800 border-slate-600 text-white placeholder:text-slate-500' : '';
  const text = isDark ? 'text-slate-200' : 'text-slate-800';
  const muted = isDark ? 'text-slate-500' : 'text-slate-400';

  const startEdit = (t: ComponentType) => {
    setEditingId(t.type_id);
    setEditLabel(t.type_label);
  };

  const cancelEdit = () => { setEditingId(null); setEditLabel(''); };

  const handleSave = async (typeId: number) => {
    if (!editLabel.trim()) return;
    setSavingId(typeId);
    try {
      const { data } = await axios.patch(`/api/system/component-types/${typeId}`, { type_label: editLabel.trim() });
      if (data.code === 1) {
        toast.success('Type updated');
        setEditingId(null);
        onReload();
      } else {
        toast.error(data.message ?? 'Update failed');
      }
    } catch {
      toast.error('Failed to update type');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (typeId: number) => {
    setDeletingId(typeId);
    try {
      const { data } = await axios.delete(`/api/system/component-types/${typeId}`);
      if (data.code === 1) {
        toast.success('Type removed');
        onReload();
      } else {
        toast.error(data.message ?? 'Delete failed');
      }
    } catch {
      toast.error('Failed to delete type');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAdd = async () => {
    if (!newLabel.trim() || !newValue.trim()) { toast.error('Both label and value are required'); return; }
    setAdding(true);
    try {
      const { data } = await axios.post('/api/system/component-types', { type_value: newValue.trim(), type_label: newLabel.trim() });
      if (data.code === 1) {
        toast.success('Type added');
        setNewLabel('');
        setNewValue('');
        onReload();
      } else {
        toast.error(data.message ?? 'Failed to add type');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Failed to add type');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className={`!max-w-[480px] w-[95vw] max-h-[80vh] overflow-hidden flex flex-col p-0 ${bg}`}>
        <DialogHeader className={`px-5 pt-5 pb-4 border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-200'}`}>
          <DialogTitle className={`text-sm font-semibold ${text}`}>Manage Component Types</DialogTitle>
          <p className={`text-xs mt-0.5 ${muted}`}>Add, rename, or remove component type options.</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5">
          {types.map((t) => (
            <div key={t.type_id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${rowBg}`}>
              {editingId === t.type_id ? (
                <>
                  <Input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSave(t.type_id); if (e.key === 'Escape') cancelEdit(); }}
                    autoFocus
                    className={`h-7 text-xs flex-1 ${inputCls}`}
                  />
                  <button
                    onClick={() => handleSave(t.type_id)}
                    disabled={savingId === t.type_id}
                    className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${isDark ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-emerald-600 hover:bg-emerald-50'}`}
                  >
                    {savingId === t.type_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-100'}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${text}`}>{t.type_label}</p>
                    <p className={`text-[10px] font-mono ${muted}`}>{t.type_value}</p>
                  </div>
                  <button
                    onClick={() => startEdit(t)}
                    className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${isDark ? 'text-slate-500 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(t.type_id)}
                    disabled={deletingId === t.type_id}
                    className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${isDark ? 'text-slate-600 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-300 hover:text-rose-500 hover:bg-rose-50'}`}
                  >
                    {deletingId === t.type_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add new */}
        <div className={`px-5 py-4 border-t ${isDark ? 'border-white/[0.06] bg-slate-900/30' : 'border-slate-200 bg-slate-50'}`}>
          <p className={`text-[10px] uppercase tracking-wider font-medium mb-2 ${muted}`}>Add new type</p>
          <div className="flex gap-2">
            <Input
              placeholder="Label (e.g. Propeller)"
              value={newLabel}
              onChange={(e) => { setNewLabel(e.target.value); setNewValue(e.target.value.toUpperCase().replace(/\s+/g, '_')); }}
              className={`h-8 text-xs flex-1 ${inputCls}`}
            />
            <Input
              placeholder="Value (e.g. PROPELLER)"
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
