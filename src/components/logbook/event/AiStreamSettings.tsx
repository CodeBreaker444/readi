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
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import type { AiStreamMappingItem } from '@/config/types/ai-event';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { eventUi } from './event-ui';
import { Pager } from './Pager';

const PAGE_SIZE = 5;

interface Props {
  open: boolean;
  isDark: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ClientOption {
  client_id: number;
  client_name: string;
}

interface ContactOption {
  contact_id: number;
  name: string;
  company: string | null;
  email: string;
}

interface FormState {
  mapping_id: number | null;
  stream_id: string;
  client_id: string;
  contact_ids: number[];
  notify_client: boolean;
  is_active: boolean;
}

const NO_CLIENT = '__none__';

const EMPTY_FORM: FormState = { mapping_id: null, stream_id: '', client_id: '', contact_ids: [], notify_client: true, is_active: true };

export function AiStreamSettings({ open, isDark, onOpenChange }: Props) {
  const { t } = useTranslation();
  const s = (key: string, opts?: Record<string, unknown>) => t(`logbooks.eventLogbook.ai.settings.${key}`, opts);
  const ui = eventUi(isDark);

  const [loading, setLoading] = useState(false);
  const [mappings, setMappings] = useState<AiStreamMappingItem[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [clientEmails, setClientEmails] = useState<Record<string, string | null>>({});
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AiStreamMappingItem | null>(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');

  const errorOf = (e: any) => e?.response?.data?.error ?? s('error');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/logbooks/event/ai/streams');
      setMappings(res.data.mappings ?? []);
      setClients(res.data.clients ?? []);
      setContacts(res.data.contacts ?? []);
      setClientEmails(res.data.client_emails ?? {});
    } catch (e: any) {
      toast.error(errorOf(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setForm(null);
      setPage(0);
      setSearch('');
      load();
    }
  }, [open, load]);

  const save = async () => {
    if (!form) return;
    const stream_id = form.stream_id.trim();
    if (!stream_id) {
      toast.error(s('required'));
      return;
    }
    setSaving(true);
    try {
      const body = { stream_id, client_id: form.client_id ? Number(form.client_id) : null, contact_ids: form.contact_ids, notify_client: form.notify_client, is_active: form.is_active };
      if (form.mapping_id) await axios.patch(`/api/logbooks/event/ai/streams/${form.mapping_id}`, body);
      else await axios.post('/api/logbooks/event/ai/streams', body);
      toast.success(s('saved'));
      setForm(null);
      await load();
    } catch (e: any) {
      toast.error(errorOf(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await axios.delete(`/api/logbooks/event/ai/streams/${deleteTarget.mapping_id}`);
      toast.success(s('deleted'));
      setDeleteTarget(null);
      await load();
    } catch (e: any) {
      toast.error(errorOf(e));
    }
  };

  const toggleContact = (id: number) =>
    setForm((f) => (f ? { ...f, contact_ids: f.contact_ids.includes(id) ? f.contact_ids.filter((c) => c !== id) : [...f.contact_ids, id] } : f));

  const query = search.trim().toLowerCase();
  const filteredMappings = query ? mappings.filter((m) => m.stream_id.toLowerCase().includes(query)) : mappings;
  const pageCount = Math.max(1, Math.ceil(filteredMappings.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pagedMappings = filteredMappings.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const contactName = (id: number) => contacts.find((c) => c.contact_id === id)?.name ?? `#${id}`;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn('max-h-[90vh] max-w-2xl overflow-y-auto', ui.dialog)}>
          <DialogHeader>
            <DialogTitle>{s('title')}</DialogTitle>
            <DialogDescription>{s('description')}</DialogDescription>
          </DialogHeader>

          {form ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">{s('streamId')}</Label>
                <Input value={form.stream_id} onChange={(e) => setForm({ ...form, stream_id: e.target.value })} placeholder={s('streamIdPlaceholder')} maxLength={200} className={cn('h-8 text-xs', ui.input)} />
              </div>
              <div className={cn('border-t pt-3', ui.divider)}>
                <div className={cn('text-xs font-semibold', ui.text)}>{s('notificationsTitle')}</div>
                <p className={cn('text-[11px]', ui.faint)}>{s('notificationsHint')}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{s('client')}</Label>
                <Select value={form.client_id || NO_CLIENT} onValueChange={(v) => setForm({ ...form, client_id: v === NO_CLIENT ? '' : v })}>
                  <SelectTrigger className={cn('h-8 text-xs', ui.input)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={ui.selectContent}>
                    <SelectItem value={NO_CLIENT}>{s('noClient')}</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.client_id} value={String(c.client_id)}>
                        {c.client_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.client_id && (
                  <label className="flex cursor-pointer items-center gap-2 pt-1 text-xs">
                    <Checkbox checked={form.notify_client} onCheckedChange={(v) => setForm({ ...form, notify_client: v === true })} />
                    <span className={ui.text}>{s('notifyClient')}</span>
                    <span className={ui.faint}>{clientEmails[form.client_id] ?? s('noClientEmail')}</span>
                  </label>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{s('contacts')}</Label>
                {contacts.length === 0 ? (
                  <p className={cn('text-xs', ui.faint)}>{s('noContacts')}</p>
                ) : (
                  <div className={cn('max-h-44 space-y-1 overflow-y-auto rounded-md border p-2', ui.panel)}>
                    {contacts.map((c) => (
                      <label key={c.contact_id} className="flex cursor-pointer items-center gap-2 text-xs">
                        <Checkbox checked={form.contact_ids.includes(c.contact_id)} onCheckedChange={() => toggleContact(c.contact_id)} />
                        <span className={ui.text}>{c.name}</span>
                        <span className={ui.faint}>{c.email}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <label className="flex items-center gap-2 text-xs">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                {s('active')}
              </label>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" className={cn('h-8 text-xs', ui.outlineBtn)} onClick={() => setForm(null)} disabled={saving}>
                  {s('cancel')}
                </Button>
                <Button size="sm" className="h-8 bg-violet-600 text-xs text-white hover:bg-violet-700" onClick={save} disabled={saving}>
                  {saving && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                  {s('save')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="relative max-w-xs flex-1">
                  <Search className={cn('pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2', ui.faint)} />
                  <Input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(0);
                    }}
                    placeholder={s('search')}
                    className={cn('h-8 pl-7 text-xs', ui.input)}
                  />
                </div>
                <Button size="sm" className="h-8 gap-1.5 bg-violet-600 text-xs text-white hover:bg-violet-700" onClick={() => setForm({ ...EMPTY_FORM })}>
                  <Plus className="h-3.5 w-3.5" />
                  {s('add')}
                </Button>
              </div>
              {loading ? (
                <ul className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <li key={i} className={cn('flex items-start justify-between gap-3 rounded-lg border p-3', ui.panel)}>
                      <div className="w-full space-y-2">
                        <Skeleton className={cn('h-4 w-40', isDark ? 'bg-slate-700' : 'bg-slate-200')} />
                        <Skeleton className={cn('h-3 w-56', isDark ? 'bg-slate-700' : 'bg-slate-200')} />
                        <Skeleton className={cn('h-3 w-48', isDark ? 'bg-slate-700' : 'bg-slate-200')} />
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Skeleton className={cn('h-7 w-7', isDark ? 'bg-slate-700' : 'bg-slate-200')} />
                        <Skeleton className={cn('h-7 w-7', isDark ? 'bg-slate-700' : 'bg-slate-200')} />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : mappings.length === 0 ? (
                <p className={cn('py-8 text-center text-xs', ui.muted)}>{s('empty')}</p>
              ) : filteredMappings.length === 0 ? (
                <p className={cn('py-8 text-center text-xs', ui.muted)}>{s('noResults')}</p>
              ) : (
                <ul className={cn('space-y-2', filteredMappings.length > PAGE_SIZE && 'h-[31rem] overflow-y-auto')}>
                  {pagedMappings.map((m) => (
                    <li key={m.mapping_id} className={cn('flex items-start justify-between gap-3 rounded-lg border p-3 text-xs', ui.panel)}>
                      <div className="min-w-0 space-y-0.5">
                        <div className={cn('font-semibold', ui.text)}>
                          {m.stream_id}
                          {!m.is_active && <span className={cn('ml-2 font-normal', ui.faint)}>({s('paused')})</span>}
                        </div>
                        {m.fk_client_id == null && m.contact_ids.length === 0 && <div className={ui.faint}>{s('noNotifications')}</div>}
                        {m.fk_client_id != null && (
                          <>
                            <div className={ui.muted}>
                              {s('client')}: {m.client_name ?? '—'}
                            </div>
                            <div className={ui.muted}>
                              {s('clientEmail')}: {m.notify_client ? (clientEmails[m.fk_client_id] ?? s('noClientEmail')) : s('off')}
                            </div>
                          </>
                        )}
                        {m.contact_ids.length > 0 && (
                          <div className={ui.muted}>
                            {s('contacts')}: {m.contact_ids.map(contactName).join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className={cn('h-7 w-7', ui.outlineBtn)}
                          onClick={() => setForm({ mapping_id: m.mapping_id, stream_id: m.stream_id, client_id: m.fk_client_id != null ? String(m.fk_client_id) : '', contact_ids: m.contact_ids, notify_client: m.notify_client, is_active: m.is_active })}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" size="icon" className={cn('h-7 w-7', ui.outlineBtn)} onClick={() => setDeleteTarget(m)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {!loading && <Pager page={safePage} count={pageCount} total={filteredMappings.length} onPage={setPage} pageSize={PAGE_SIZE} />}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent className={ui.dialog}>
          <AlertDialogHeader>
            <AlertDialogTitle>{s('deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{s('deleteBody', { stream: deleteTarget?.stream_id })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{s('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>{s('delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
