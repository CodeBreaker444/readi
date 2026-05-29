'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import axios from 'axios';
import { Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export interface DroneClassRow { class_id: number; class_value: string; class_label: string }

interface Props {
  open: boolean;
  onClose: () => void;
  classes: DroneClassRow[];
  onReload: () => void;
  isDark?: boolean;
}

export function ManageDroneClassesModal({ open, onClose, classes, onReload, isDark }: Props) {
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

  const startEdit = (c: DroneClassRow) => { setEditingId(c.class_id); setEditLabel(c.class_label); };
  const cancelEdit = () => { setEditingId(null); setEditLabel(''); };

  const handleSave = async (classId: number) => {
    if (!editLabel.trim()) return;
    setSavingId(classId);
    try {
      const { data } = await axios.patch(`/api/system/drone-classes/${classId}`, { class_label: editLabel.trim() });
      if (data.code === 1) { toast.success('Class updated'); setEditingId(null); onReload(); }
      else toast.error(data.message ?? 'Update failed');
    } catch { toast.error('Update failed'); }
    finally { setSavingId(null); }
  };

  const handleDelete = async (classId: number) => {
    setDeletingId(classId);
    try {
      const { data } = await axios.delete(`/api/system/drone-classes/${classId}`);
      if (data.code === 1) { toast.success('Class deleted'); onReload(); }
      else toast.error(data.message ?? 'Delete failed');
    } catch { toast.error('Delete failed'); }
    finally { setDeletingId(null); }
  };

  const handleAdd = async () => {
    if (!newValue.trim() || !newLabel.trim()) { toast.error('Both value and label are required'); return; }
    setAdding(true);
    try {
      const { data } = await axios.post('/api/system/drone-classes', { class_value: newValue.trim(), class_label: newLabel.trim() });
      if (data.code === 1) { toast.success('Class added'); setNewValue(''); setNewLabel(''); onReload(); }
      else toast.error(data.message ?? 'Add failed');
    } catch { toast.error('Add failed'); }
    finally { setAdding(false); }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className={`!max-w-[480px] w-[95vw] max-h-[85vh] overflow-hidden flex flex-col p-0 ${bg}`}>
        <DialogHeader className={`px-5 pt-5 pb-4 border-b shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-200'}`}>
          <DialogTitle className={`text-sm font-semibold ${text}`}>Manage Drone Classes</DialogTitle>
          <p className={`text-xs mt-0.5 ${muted}`}>Add, rename or remove drone regulation classes</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {classes.length === 0 && (
            <p className={`text-sm text-center py-6 ${muted}`}>No classes defined yet.</p>
          )}
          {classes.map(c => (
            <div key={c.class_id} className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${rowBg}`}>
              <span className={`text-[10px] font-mono font-semibold w-12 shrink-0 ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>{c.class_value}</span>
              {editingId === c.class_id ? (
                <Input
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  className={`h-7 text-xs flex-1 ${inputCls}`}
                  onKeyDown={e => { if (e.key === 'Enter') handleSave(c.class_id); if (e.key === 'Escape') cancelEdit(); }}
                  autoFocus
                />
              ) : (
                <span className={`text-xs flex-1 ${text}`}>{c.class_label}</span>
              )}
              <div className="flex items-center gap-1 shrink-0">
                {editingId === c.class_id ? (
                  <>
                    <button
                      onClick={() => handleSave(c.class_id)}
                      disabled={savingId === c.class_id}
                      className="cursor-pointer p-1 rounded text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                    >
                      {savingId === c.class_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={cancelEdit} className={`cursor-pointer p-1 rounded ${muted} hover:text-slate-600`}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(c)} className={`cursor-pointer p-1 rounded ${muted} hover:text-violet-500`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.class_id)}
                      disabled={deletingId === c.class_id}
                      className={`cursor-pointer p-1 rounded ${muted} hover:text-red-500`}
                    >
                      {deletingId === c.class_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className={`px-5 py-3 border-t shrink-0 space-y-2 ${isDark ? 'border-white/[0.06] bg-slate-900/30' : 'border-slate-200 bg-slate-50'}`}>
          <p className={`text-[10px] uppercase tracking-wide font-semibold ${muted}`}>Add new class</p>
          <div className="flex gap-2">
            <Input value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="Value (e.g. C7)" className={`h-8 text-xs w-20 ${inputCls}`} />
            <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Label (e.g. Class C7)" className={`h-8 text-xs flex-1 ${inputCls}`} onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }} />
            <Button size="sm" onClick={handleAdd} disabled={adding} className="h-8 gap-1 bg-violet-600 hover:bg-violet-500 text-white">
              {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
