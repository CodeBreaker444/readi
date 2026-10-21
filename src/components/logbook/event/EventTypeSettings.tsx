'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { EVENT_TYPE_NAME_MAX, type EventTypeItem } from '@/config/types/event-logbook';
import axios from 'axios';
import { Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { PagedSelect, type PagedSelectItem } from './PagedSelect';
import { EVENT_TYPE_PAGE_SIZE as PAGE_SIZE, Pager } from './Pager';
import { refreshEventTypes, useEventTypes } from './useEventTypes';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDark?: boolean;
}

interface FormState {
  id: number | null;
  name: string;
  /** Client id as a string; '' = default type (available for every client). */
  clientId: string;
}

const inputCls = 'border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200';
const hintCls = 'text-xs text-slate-500 dark:text-slate-400';

export function EventTypeSettings({ open, onOpenChange, isDark = false }: Props) {
  const { t } = useTranslation();
  const n = (key: string, opts?: Record<string, unknown>) => t(`logbooks.eventLogbook.typeSettings.${key}`, opts);
  const { types, clients, loading } = useEventTypes();
  const clientItems = useMemo<PagedSelectItem[]>(() => clients.map((c) => ({ value: String(c.client_id), label: c.client_name })), [clients]);

  const [form, setForm] = useState<FormState | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EventTypeItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const errorOf = (e: any) => e?.response?.data?.error ?? n('error');

  useEffect(() => {
    if (open) void refreshEventTypes();
    else {
      setForm(null);
      setSearch('');
      setPage(0);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? types.filter((x) => `${x.type_name} ${x.client_name ?? ''}`.toLowerCase().includes(q)) : types;
  }, [types, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const save = async () => {
    if (!form || !form.name.trim()) return;
    setSaving(true);
    try {
      const body = { type_name: form.name, client_id: form.clientId ? Number(form.clientId) : null };
      if (form.id) await axios.patch(`/api/logbooks/event/types/${form.id}`, body);
      else await axios.post('/api/logbooks/event/types', body);
      toast.success(n('saved'));
      setForm(null);
      await refreshEventTypes();
    } catch (e) {
      toast.error(errorOf(e));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axios.delete(`/api/logbooks/event/types/${deleteTarget.event_type_id}`);
      toast.success(n('deleted'));
      await refreshEventTypes();
    } catch (e) {
      toast.error(errorOf(e));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xlborder-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
        <DialogHeader>
          <DialogTitle>{n('title')}</DialogTitle>
          <DialogDescription>{n('description')}</DialogDescription>
        </DialogHeader>

        {form ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{n('name')}</Label>
              <Input
                className={inputCls}
                autoFocus
                value={form.name}
                maxLength={EVENT_TYPE_NAME_MAX}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && void save()}
              />
              {form.id && <p className={hintCls}>{n('renameHint')}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{n('client')}</Label>
              <PagedSelect
                isDark={isDark}
                items={clientItems}
                value={form.clientId}
                placeholder={n('defaultOption')}
                clearLabel={n('defaultOption')}
                clearValue=""
                onChange={(v) => setForm({ ...form, clientId: v })}
              />
              <p className={hintCls}>{n('clientHint')}</p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
              <Button variant="outline" disabled={saving} onClick={() => setForm(null)}>
                {n('cancel')}
              </Button>
              <Button className="bg-violet-600 text-white hover:bg-violet-700" disabled={saving || !form.name.trim()} onClick={save}>
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                {n('save')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="relative max-w-xs flex-1">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input className={`h-8 pl-8 text-xs ${inputCls}`} value={search} placeholder={n('search')} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
              </div>
              <Button size="sm" className="bg-violet-600 text-white hover:bg-violet-700" onClick={() => setForm({ id: null, name: '', clientId: '' })}>
                <Plus className="mr-1 h-4 w-4" />
                {n('add')}
              </Button>
            </div>

            {/* Reserve room for a full page (8 rows) so the modal does not resize when paging or searching. */}
            <div className={types.length > PAGE_SIZE ? 'min-h-[29.5rem]' : undefined}>
              {loading && types.length === 0 ? (
                <ul className="space-y-1.5">
                  {[0, 1, 2, 3].map((i) => (
                    <li key={i} className="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                      <Skeleton className="h-4 w-1/2" />
                    </li>
                  ))}
                </ul>
              ) : filtered.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">{types.length === 0 ? n('empty') : n('noMatches')}</p>
              ) : (
                <ul className="space-y-1.5">
                  {paged.map((x) => (
                    <li key={x.event_type_id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                      <div className="min-w-0 flex-1 text-left">
                        <p className="truncate text-sm font-medium">{x.type_name}</p>
                        <p className={hintCls}>
                          {x.client_name ?? n('defaultBadge')} · {n('usedBy', { count: x.event_count })}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" title={n('edit')} aria-label={n('edit')} onClick={() => setForm({ id: x.event_type_id, name: x.type_name, clientId: x.client_id ? String(x.client_id) : '' })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" title={n('delete')} aria-label={n('delete')} disabled={types.length <= 1} onClick={() => setDeleteTarget(x)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Pager page={safePage} count={pageCount} total={filtered.length} onPage={setPage} />
          </div>
        )}

        <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && !deleting && setDeleteTarget(null)}>
          <AlertDialogContent className="border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
            <AlertDialogHeader>
              <AlertDialogTitle>{n('deleteTitle')}</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
                {n('deleteDescription', { name: deleteTarget?.type_name ?? '' })}
                {deleteTarget && deleteTarget.event_count > 0 && ` ${n('deleteInUse', { count: deleteTarget.event_count })}`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting} className="border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {n('cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-500 text-white hover:bg-red-600"
                disabled={deleting}
                onClick={(e) => {
                  // Keep the dialog open until the request finishes.
                  e.preventDefault();
                  void confirmDelete();
                }}
              >
                {deleting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                {n('delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
