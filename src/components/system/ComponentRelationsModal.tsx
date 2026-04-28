'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/components/useTheme';
import { GitBranch, Loader2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pass a toolId to scope to one system, or omit to let user pick */
  toolId?: number | null;
  toolCode?: string;
  /** All tools, for optional system picker */
  tools: any[];
  onSuccess?: () => void;
}

interface ComponentRow {
  tool_component_id: number;
  component_code: string;
  component_name: string;
  component_type: string;
  fk_parent_component_id: number | null;
  fk_tool_id: number;
}

/** One-level-only parent-child organiser */
export default function ComponentRelationsModal({ open, onClose, toolId, toolCode, tools, onSuccess }: Props) {
  const { isDark } = useTheme();
  const [components, setComponents] = useState<ComponentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // Map: componentId → assigned parentId (null = top-level), tracks unsaved changes
  const [relations, setRelations] = useState<Record<number, number | null>>({});

  const bg = isDark ? 'bg-[#0f1419] border-white/[0.08]' : 'bg-white';
  const text = isDark ? 'text-slate-200' : 'text-slate-800';
  const muted = isDark ? 'text-slate-500' : 'text-slate-400';
  const rowBg = isDark ? 'bg-slate-900/40 border-white/[0.06]' : 'bg-slate-50 border-slate-200';
  const selectCls = isDark ? 'bg-slate-800 border-slate-600 text-slate-200' : '';
  const selectContentCls = isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : '';

  const [selectedTid, setSelectedTid] = useState<number | null>(toolId ?? null);
  const [selectedTCode, setSelectedTCode] = useState<string>(toolCode ?? '');

  useEffect(() => {
    if (open && toolId) {
      setSelectedTid(toolId);
      setSelectedTCode(toolCode ?? '');
      loadComponents(toolId);
    } else if (!open) {
      setComponents([]);
      setRelations({});
      setSelectedTid(null);
      setSelectedTCode('');
    }
  }, [open, toolId]);

  const loadComponents = async (tid: number) => {
    setLoading(true);
    try {
      const res = await fetch('/api/system/component/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_id: tid }),
      });
      const result = await res.json();
      if (result.code === 1) {
        const comps: ComponentRow[] = result.data ?? [];
        setComponents(comps);
        // Seed relations from current data
        const initial: Record<number, number | null> = {};
        comps.forEach(c => { initial[c.tool_component_id] = c.fk_parent_component_id ?? null; });
        setRelations(initial);
      } else {
        toast.error('Failed to load components');
      }
    } catch {
      toast.error('Error loading components');
    } finally {
      setLoading(false);
    }
  };

  /** Label for a component */
  const label = (c: ComponentRow) =>
    c.component_code || c.component_name || `#${c.tool_component_id}`;

  /**
   * Guard: a component that currently HAS children (in the relations map) cannot be moved
   * under another parent — that would create 2 levels.
   */
  const hasChildren = (id: number): boolean =>
    Object.entries(relations).some(([cid, pid]) => pid === id && Number(cid) !== id);

  /**
   * Guard: the chosen parent must itself have no parent (top-level only).
   * If the prospective parent is already a child, refuse.
   */
  const isAChild = (id: number): boolean =>
    relations[id] !== null && relations[id] !== undefined;

  const handleSetParent = (componentId: number, parentId: number | null) => {
    // Rule 1: cannot self-parent
    if (parentId === componentId) { toast.error("A component cannot be its own parent."); return; }

    // Rule 2: this component already has children — it cannot become a child
    if (parentId !== null && hasChildren(componentId)) {
      toast.error("This component already has children. Remove them first before nesting it under a parent.");
      return;
    }

    // Rule 3: prospective parent must be top-level (not already a child)
    if (parentId !== null && isAChild(parentId)) {
      toast.error("The selected parent is itself a child component. Only one level of nesting is allowed.");
      return;
    }

    setRelations(prev => ({ ...prev, [componentId]: parentId }));
  };

  const handleSave = async () => {
    if (!selectedTid) return;
    setSaving(true);
    const dirtyComponents = components.filter(c => {
      const original = c.fk_parent_component_id ?? null;
      const updated = relations[c.tool_component_id] ?? null;
      return original !== updated;
    });

    if (dirtyComponents.length === 0) {
      toast.info('No changes to save.');
      setSaving(false);
      return;
    }

    try {
      const results = await Promise.allSettled(
        dirtyComponents.map(c =>
          fetch(`/api/system/component/${c.tool_component_id}/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fk_tool_id: c.fk_tool_id,
              component_type: c.component_type,
              fk_parent_component_id: relations[c.tool_component_id] ?? null,
            }),
          }).then(r => r.json())
        )
      );

      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value?.code !== 1));
      if (failed.length > 0) {
        toast.error(`${failed.length} component(s) failed to update.`);
      } else {
        toast.success(`${dirtyComponents.length} relation(s) saved.`);
        onSuccess?.();
        // Refresh local state to reflect new saved relations
        await loadComponents(selectedTid!);
      }
    } catch {
      toast.error('Error saving relations.');
    } finally {
      setSaving(false);
    }
  };

  // --- Build tree for preview ---
  const topLevel = components.filter(c => !relations[c.tool_component_id]);
  const childrenOf = (pid: number) =>
    components.filter(c => relations[c.tool_component_id] === pid);

  const dirtyCount = components.filter(c => {
    const orig = c.fk_parent_component_id ?? null;
    const curr = relations[c.tool_component_id] ?? null;
    return orig !== curr;
  }).length;

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent
        className={`!max-w-[820px] w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0 ${bg}`}
      >
        <DialogHeader
          className={`px-5 pt-5 pb-4 border-b shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-200'}`}
        >
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${isDark ? 'bg-violet-500/10 text-violet-400' : 'bg-violet-50 text-violet-600'}`}>
              <GitBranch className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className={`text-sm font-semibold ${text}`}>
                Organise Component Relations
                {selectedTCode && <span className={`ml-2 font-mono text-xs px-2 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{selectedTCode}</span>}
              </DialogTitle>
              <p className={`text-xs mt-0.5 ${muted}`}>
                Assign each component a parent to create a one-level hierarchy. Only top-level components can be parents.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* System picker — shown only when no toolId is pre-wired */}
        {!toolId && (
          <div className={`px-5 py-3 border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-200'}`}>
            <p className={`text-[10px] uppercase tracking-widest font-semibold mb-2 ${muted}`}>Select System</p>
            <Select
              value={selectedTid ? String(selectedTid) : ''}
              onValueChange={v => {
                const tid = Number(v);
                const t = tools.find((x: any) => x.tool_id === tid);
                setSelectedTid(tid);
                setSelectedTCode(t?.tool_code ?? '');
                setComponents([]);
                setRelations({});
                loadComponents(tid);
              }}
            >
              <SelectTrigger className={`h-9 text-sm ${selectCls}`}>
                <SelectValue placeholder="Choose a system…" />
              </SelectTrigger>
              <SelectContent className={selectContentCls}>
                {tools.map((t: any) => (
                  <SelectItem key={t.tool_id} value={String(t.tool_id)}>
                    {t.tool_code}{t.tool_desc ? ` — ${t.tool_desc}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left: relation editor */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2 border-r border-dashed border-slate-200 dark:border-slate-700">
            <p className={`text-[10px] uppercase tracking-widest font-semibold mb-3 ${muted}`}>
              Component Assignments ({components.length})
            </p>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
              </div>
            ) : components.length === 0 ? (
              <p className={`text-sm text-center py-10 ${muted}`}>No components found in this system.</p>
            ) : (
              components.map(c => {
                const currentParentId = relations[c.tool_component_id] ?? null;
                const cHasChildren = hasChildren(c.tool_component_id);
                const cIsChild = currentParentId !== null;

                // Valid parents: top-level components that are not self and not currently children
                const validParents = components.filter(p =>
                  p.tool_component_id !== c.tool_component_id &&
                  !isAChild(p.tool_component_id)
                );

                return (
                  <div
                    key={c.tool_component_id}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${rowBg}`}
                  >
                    {/* Component info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold truncate ${text}`}>
                          {label(c)}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                          {c.component_type}
                        </span>
                        {cHasChildren && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isDark ? 'bg-violet-900/40 text-violet-400' : 'bg-violet-50 text-violet-600'}`}>
                            parent
                          </span>
                        )}
                        {cIsChild && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isDark ? 'bg-sky-900/40 text-sky-400' : 'bg-sky-50 text-sky-600'}`}>
                            ↳ child
                          </span>
                        )}
                        {/* Dirty indicator */}
                        {(relations[c.tool_component_id] ?? null) !== (c.fk_parent_component_id ?? null) && (
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" title="Unsaved change" />
                        )}
                      </div>
                    </div>

                    {/* Parent selector */}
                    <div className="w-44 shrink-0">
                      <Select
                        value={currentParentId ? String(currentParentId) : '_none'}
                        onValueChange={v => handleSetParent(c.tool_component_id, v === '_none' ? null : Number(v))}
                        disabled={cHasChildren}
                      >
                        <SelectTrigger
                          className={`h-8 text-xs w-full truncate ${selectCls} ${cHasChildren ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={cHasChildren ? 'Remove children first to nest this component' : undefined}
                        >
                          <SelectValue placeholder="Top-level">
                            {currentParentId
                              ? (() => {
                                  const p = components.find(x => x.tool_component_id === currentParentId);
                                  return p ? <span className="truncate">{label(p)}</span> : null;
                                })()
                              : <span className={`italic ${muted}`}>Top-level</span>}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className={`${selectContentCls} text-xs`}>
                          <SelectItem value="_none">
                            <span className={`italic ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              None (top-level)
                            </span>
                          </SelectItem>
                          {validParents.map(p => (
                            <SelectItem key={p.tool_component_id} value={String(p.tool_component_id)}>
                              <div className="flex flex-col leading-tight">
                                <span className="font-medium">{label(p)}</span>
                                <span className={`text-[10px] ${muted}`}>{p.component_type}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: live tree preview */}
          <div className={`w-64 shrink-0 overflow-y-auto px-4 py-4 ${isDark ? 'bg-slate-900/30' : 'bg-slate-50/60'}`}>
            <p className={`text-[10px] uppercase tracking-widest font-semibold mb-3 ${muted}`}>
              Live Preview
            </p>
            {loading ? null : topLevel.length === 0 ? (
              <p className={`text-xs ${muted}`}>All components are children.</p>
            ) : (
              <div className="space-y-2">
                {topLevel.map(c => {
                  const kids = childrenOf(c.tool_component_id);
                  return (
                    <div key={c.tool_component_id}>
                      {/* Parent row */}
                      <div className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${kids.length > 0 ? 'bg-violet-500' : 'bg-slate-300'}`} />
                        <span className={`text-[11px] font-medium truncate ${text}`}>{label(c)}</span>
                      </div>
                      {/* Children */}
                      {kids.map(kid => (
                        <div key={kid.tool_component_id} className="ml-4 mt-1">
                          <div className={`flex items-center gap-2 rounded-md px-2 py-1.5 border-l-2 border-violet-400 ${isDark ? 'bg-slate-800/60 border border-slate-700' : 'bg-violet-50/60 border border-violet-100'}`}>
                            <span className="text-violet-400 text-[10px] shrink-0">↳</span>
                            <span className={`text-[11px] truncate ${text}`}>{label(kid)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between gap-3 px-5 py-3 border-t shrink-0 ${isDark ? 'border-white/[0.06] bg-slate-900/30' : 'border-slate-200 bg-white'}`}>
          <p className={`text-xs ${muted}`}>
            {dirtyCount > 0
              ? <span className="text-amber-500 font-medium">{dirtyCount} unsaved change{dirtyCount !== 1 ? 's' : ''}</span>
              : 'No changes'}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className={isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || loading || dirtyCount === 0}
              className="bg-violet-600 hover:bg-violet-500 text-white gap-1.5"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saving ? 'Saving…' : `Save${dirtyCount > 0 ? ` (${dirtyCount})` : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
