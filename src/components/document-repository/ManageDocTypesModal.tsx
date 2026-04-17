'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DocType } from '@/config/types/repository';
import axios from 'axios';
import { Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const AREA_OPTIONS = [
  'BOARD', 'COMPLIANCE', 'DATACONTROLLER', 'MAINTENANCE',
  'OPERATION', 'SAFETY', 'SECURITY', 'TRAINING', 'VENDOR',
];

interface Props {
  open: boolean;
  onClose: () => void;
  types: DocType[];
  onReload: () => void;
  isDark: boolean;
}

export function ManageDocTypesModal({ open, onClose, types, onReload, isDark }: Props) {
  const [localTypes, setLocalTypes] = useState<DocType[]>(types);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [newName, setNewName] = useState('');
  const [newArea, setNewArea] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setLocalTypes(types);
  }, [types, open]);

  const bg = isDark ? 'bg-[#0f1419] border-white/[0.08]' : 'bg-white';
  const rowBg = isDark ? 'bg-slate-900/40 border-white/[0.06]' : 'bg-white border-slate-200';
  const inputCls = isDark ? 'bg-slate-800 border-slate-600 text-white placeholder:text-slate-500' : '';
  const text = isDark ? 'text-slate-200' : 'text-slate-800';
  const muted = isDark ? 'text-slate-500' : 'text-slate-400';

  const startEdit = (t: DocType) => {
    setEditingId(t.doc_type_id);
    setEditLabel(t.doc_type_name ?? t.doc_name ?? '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditLabel('');
  };

  const handleSave = async (typeId: number) => {
    if (!editLabel.trim()) return;
    setSavingId(typeId);
    try {
      const { data } = await axios.patch(`/api/document/types/${typeId}`, { doc_type_name: editLabel.trim() });
      if (data.code === 1) {
        setLocalTypes((prev) =>
          prev.map((item) =>
            item.doc_type_id === typeId
              ? { ...item, doc_type_name: editLabel.trim(), doc_name: editLabel.trim() }
              : item,
          ),
        );
        toast.success('Type updated');
        setEditingId(null);
        onReload();
      } else {
        toast.error(data.error ?? 'Update failed');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to update type');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (typeId: number) => {
    setDeletingId(typeId);
    try {
      const { data } = await axios.delete(`/api/document/types/${typeId}`);
      if (data.code === 1) {
        setLocalTypes((prev) => prev.filter((item) => item.doc_type_id !== typeId));
        toast.success('Type removed');
        onReload();
      } else {
        toast.error(data.error ?? 'Delete failed');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to delete type');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) { toast.error('Name is required'); return; }
    if (!newArea) { toast.error('Area is required'); return; }
    setAdding(true);
    try {
      const { data } = await axios.post('/api/document/types', {
        doc_type_name: newName.trim(),
        doc_type_category: newArea,
      });
      if (data.code === 1) {
        if (data.data) {
          setLocalTypes((prev) => [...prev, data.data as DocType]);
        }
        toast.success('Type added');
        setNewName('');
        setNewArea('');
        onReload();
      } else {
        toast.error(data.error ?? 'Failed to add type');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? 'Failed to add type');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className={`!max-w-[480px] w-[95vw] max-h-[80vh] overflow-hidden flex flex-col p-0 ${bg}`}>
        <DialogHeader className={`px-5 pt-5 pb-4 border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-200'}`}>
          <DialogTitle className={`text-sm font-semibold ${text}`}>Manage Document Types</DialogTitle>
          <p className={`text-xs mt-0.5 ${muted}`}>Add, rename, or remove document type options.</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5">
          {localTypes.map((t) => (
            <div key={t.doc_type_id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${rowBg}`}>
              {editingId === t.doc_type_id ? (
                <>
                  <Input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSave(t.doc_type_id); if (e.key === 'Escape') cancelEdit(); }}
                    autoFocus
                    className={`h-7 text-xs flex-1 ${inputCls}`}
                  />
                  <button
                    onClick={() => handleSave(t.doc_type_id)}
                    disabled={savingId === t.doc_type_id}
                    className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${isDark ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-emerald-600 hover:bg-emerald-50'}`}
                  >
                    {savingId === t.doc_type_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
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
                    <p className={`text-xs font-medium ${text}`}>{t.doc_type_name ?? t.doc_name}</p>
                    {t.doc_area && (
                      <p className={`text-[10px] font-mono ${muted}`}>{t.doc_area}</p>
                    )}
                  </div>
                  <button
                    onClick={() => startEdit(t)}
                    className={`h-6 w-6 cursor-pointer flex items-center justify-center rounded transition-colors ${isDark ? 'text-slate-500 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(t.doc_type_id)}
                    disabled={deletingId === t.doc_type_id}
                    className={`h-6 w-6 cursor-pointer flex items-center justify-center rounded transition-colors ${isDark ? 'text-slate-600 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-300 hover:text-rose-500 hover:bg-rose-50'}`}
                  >
                    {deletingId === t.doc_type_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  </button>
                </>
              )}
            </div>
          ))}
          {localTypes.length === 0 && (
            <p className={`text-xs text-center py-6 ${muted}`}>No types defined yet.</p>
          )}
        </div>

        <div className={`px-5 py-4 border-t ${isDark ? 'border-white/[0.06] bg-slate-900/30' : 'border-slate-200 bg-slate-50'}`}>
          <p className={`text-[10px] uppercase tracking-wider font-medium mb-2 ${muted}`}>Add new type</p>
          <div className="flex gap-2">
            <Input
              placeholder="Name (e.g. Safety Manual)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              className={`h-8 text-xs flex-1 ${inputCls}`}
            />
            <Select value={newArea} onValueChange={setNewArea}>
              <SelectTrigger className={`h-8 text-xs w-36 ${inputCls}`}>
                <SelectValue placeholder="Area" />
              </SelectTrigger>
              <SelectContent className={isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : ''}>
                {AREA_OPTIONS.map((a) => (
                  <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleAdd} disabled={adding} className="h-8 px-3 bg-violet-600 hover:bg-violet-500 text-white">
              {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
