'use client';

import { useAuthorization } from '@/components/authorization/AuthorizationProvider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import axios from 'axios';
import { AlertTriangle, Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export interface DepartmentRow {
  department_id: number;
  department_name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  departments: DepartmentRow[];
  onReload: () => void;
  isDark: boolean;
}

export function ManageDepartmentsModal({ open, onClose, departments, onReload, isDark }: Props) {
  const { requireAuthorization } = useAuthorization();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const [impactData, setImpactData] = useState<any[] | null>(null);

  const bg = isDark ? 'bg-[#0f1419] border-white/[0.08]' : 'bg-white';
  const rowBg = isDark ? 'bg-slate-900/40 border-white/[0.06]' : 'bg-white border-slate-200';
  const inputCls = isDark ? 'bg-slate-800 border-slate-600 text-white placeholder:text-slate-500' : '';
  const text = isDark ? 'text-slate-200' : 'text-slate-800';
  const muted = isDark ? 'text-slate-500' : 'text-slate-400';

  const startEdit = (dept: DepartmentRow) => {
    setEditingId(dept.department_id);
    setEditName(dept.department_name);
    setImpactData(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setImpactData(null);
  };

  const handleSave = async (departmentId: number, confirmed = false) => {
    if (!editName.trim()) return;
    setSavingId(departmentId);
    try {
      const { data } = await axios.patch(`/api/team/department/${departmentId}`, {
        department_name: editName.trim(),
        confirm_impact: confirmed,
      });

      if (data.code === 2) {
        setImpactData(data.usage);
        return;
      }

      if (data.code === 1) {
        toast.success('Department updated');
        setEditingId(null);
        setImpactData(null);
        onReload();
      } else {
        toast.error(data.message ?? 'Failed to update department');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update department');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (departmentId: number) => {
    const dept = departments.find((d) => d.department_id === departmentId);
    try {
      await requireAuthorization({
        actionType: 'delete',
        entityType: 'department',
        entityId: String(departmentId),
        label: `Delete Department: ${dept?.department_name ?? `#${departmentId}`}`,
      });
    } catch {
      return;
    }

    setDeletingId(departmentId);
    try {
      const { data } = await axios.delete(`/api/team/department/${departmentId}`);
      if (data.code === 1) {
        toast.success('Department removed');
        onReload();
      } else {
        toast.error(data.message ?? 'Failed to delete department');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to delete department');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) { toast.error('Department name is required'); return; }
    setAdding(true);
    try {
      const { data } = await axios.post('/api/team/department', { department_name: newName.trim() });
      if (data.code === 1) {
        toast.success('Department added');
        setNewName('');
        onReload();
      } else {
        toast.error(data.message ?? 'Failed to add department');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Failed to add department');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setImpactData(null); } }}>
      <DialogContent className={`!max-w-[420px] w-[95vw] max-h-[80vh] overflow-hidden flex flex-col p-0 ${bg}`}>
        <DialogHeader className={`px-5 pt-5 pb-4 border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-200'}`}>
          <DialogTitle className={`text-sm font-semibold ${text}`}>Manage Departments</DialogTitle>
          <p className={`text-xs mt-0.5 ${muted}`}>Add, rename, or remove departments used across your organization.</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5">
          {departments.length === 0 && (
            <p className={`text-xs text-center py-4 ${muted}`}>No departments yet.</p>
          )}
          {departments.map((dept) => (
            <div key={dept.department_id} className="space-y-2">
              <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${rowBg}`}>
                {editingId === dept.department_id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSave(dept.department_id); if (e.key === 'Escape') cancelEdit(); }}
                      autoFocus
                      className={`h-7 text-xs flex-1 ${inputCls}`}
                    />
                    <button
                      onClick={() => handleSave(dept.department_id)}
                      disabled={savingId === dept.department_id}
                      className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${isDark ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-emerald-600 hover:bg-emerald-50'}`}
                    >
                      {savingId === dept.department_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
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
                      <p className={`text-xs font-medium ${text}`}>{dept.department_name}</p>
                    </div>
                    <button
                      onClick={() => startEdit(dept)}
                      className={`h-6 w-6 cursor-pointer flex items-center justify-center rounded transition-colors ${isDark ? 'text-slate-500 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(dept.department_id)}
                      disabled={deletingId === dept.department_id}
                      className={`h-6 w-6 cursor-pointer flex items-center justify-center rounded transition-colors ${isDark ? 'text-slate-600 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-300 hover:text-rose-500 hover:bg-rose-50'}`}
                    >
                      {deletingId === dept.department_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </button>
                  </>
                )}
              </div>

              {editingId === dept.department_id && impactData && (
                <div className={`p-3 rounded-lg border text-[11px] animate-in fade-in slide-in-from-top-1 ${isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                  <div className="flex gap-2 mb-2">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <p className="font-semibold">This department is in use</p>
                  </div>
                  <p className="mb-2">Renaming will update this department for {impactData.length} user{impactData.length > 1 ? 's' : ''}.</p>
                  <div className={`max-h-24 overflow-y-auto rounded p-2 mb-3 space-y-1 ${isDark ? 'bg-black/20' : 'bg-white/50'}`}>
                    {impactData.map((u) => (
                      <div key={u.user_id} className="font-mono text-[10px]">
                        {u.fullname}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setImpactData(null)}>Back</Button>
                    <Button
                      size="sm"
                      className="h-7 cursor-pointer text-[10px] bg-amber-600 hover:bg-amber-500 text-white"
                      onClick={() => handleSave(dept.department_id, true)}
                    >
                      Yes, rename for all
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className={`px-5 py-4 border-t ${isDark ? 'border-white/[0.06] bg-slate-900/30' : 'border-slate-200 bg-slate-50'}`}>
          <p className={`text-[10px] uppercase tracking-wider font-medium mb-2 ${muted}`}>Add New Department</p>
          <div className="flex gap-2">
            <Input
              placeholder="Department name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              className={`h-8 text-xs flex-1 ${inputCls}`}
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
