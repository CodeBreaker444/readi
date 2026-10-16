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
import { Switch } from '@/components/ui/switch';
import {
  EVENT_TYPES,
  type EventWebhookConfigItem,
  type EventWebhookDeliveryItem,
} from '@/config/types/event-logbook';
import axios from 'axios';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, ChevronLeft, ChevronRight, Copy, History, KeyRound, Loader2, Pencil, Plus, Search, Send, Trash2, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ClientOption {
  client_id: number;
  client_name: string;
}

interface FormState {
  webhook_id: number | null;
  name: string;
  url: string;
  client_id: string;
  event_types: string[];
  is_active: boolean;
}

const PAGE_SIZE = 8;

const EMPTY_FORM: FormState = { webhook_id: null, name: '', url: '', client_id: '__all__', event_types: [], is_active: true };

export function EventWebhookSettings({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const w = (key: string, opts?: Record<string, unknown>) => t(`logbooks.eventLogbook.webhooks.${key}`, opts);

  const [loading, setLoading] = useState(false);
  const [webhooks, setWebhooks] = useState<EventWebhookConfigItem[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<EventWebhookConfigItem | null>(null);
  const [page, setPage] = useState(0);
  const [deliveries, setDeliveries] = useState<{ id: number; items: EventWebhookDeliveryItem[] } | null>(null);

  const errorOf = (e: any) => e?.response?.data?.error ?? w('error');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/logbooks/event/webhooks');
      setWebhooks(res.data.webhooks);
      setClients(res.data.clients);
    } catch (e) {
      toast.error(errorOf(e));
    } finally {
      setLoading(false);
    }
     
  }, []);

  useEffect(() => {
    if (open) load();
    else {
      setForm(null);
      setSecret(null);
      setDeliveries(null);
      setSearch('');
      setPage(0);
    }
  }, [open, load]);

  const edit = (hook: EventWebhookConfigItem) =>
    setForm({
      webhook_id: hook.webhook_id,
      name: hook.name,
      url: hook.url,
      client_id: hook.fk_client_id ? String(hook.fk_client_id) : '__all__',
      event_types: hook.event_types,
      is_active: hook.is_active,
    });

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const body = {
        name: form.name,
        url: form.url,
        client_id: form.client_id === '__all__' ? null : Number(form.client_id),
        event_types: form.event_types,
        is_active: form.is_active,
      };
      if (form.webhook_id) {
        await axios.patch(`/api/logbooks/event/webhooks/${form.webhook_id}`, body);
      } else {
        const res = await axios.post('/api/logbooks/event/webhooks', body);
        setSecret(res.data.secret);
      }
      toast.success(w('saved'));
      setForm(null);
      await load();
    } catch (e) {
      toast.error(errorOf(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (hook: EventWebhookConfigItem) => {
    setBusyId(hook.webhook_id);
    try {
      await axios.delete(`/api/logbooks/event/webhooks/${hook.webhook_id}`);
      toast.success(w('deleted'));
      await load();
    } catch (e) {
      toast.error(errorOf(e));
    } finally {
      setBusyId(null);
      setDeleteTarget(null);
    }
  };

  const test = async (hook: EventWebhookConfigItem) => {
    setBusyId(hook.webhook_id);
    try {
      const res = await axios.post(`/api/logbooks/event/webhooks/${hook.webhook_id}/test`);
      if (res.data.success) toast.success(w('testOk', { status: res.data.status }));
      else toast.error(w('testFail', { error: res.data.error ?? 'unknown' }));
      await load();
    } catch (e) {
      toast.error(errorOf(e));
    } finally {
      setBusyId(null);
    }
  };

  const rotate = async (hook: EventWebhookConfigItem) => {
    setBusyId(hook.webhook_id);
    try {
      const res = await axios.post(`/api/logbooks/event/webhooks/${hook.webhook_id}/rotate-secret`);
      setSecret(res.data.secret);
    } catch (e) {
      toast.error(errorOf(e));
    } finally {
      setBusyId(null);
    }
  };

  const showDeliveries = async (hook: EventWebhookConfigItem) => {
    if (deliveries?.id === hook.webhook_id) return setDeliveries(null);
    try {
      const res = await axios.get(`/api/logbooks/event/webhooks/${hook.webhook_id}/deliveries`);
      setDeliveries({ id: hook.webhook_id, items: res.data.data });
    } catch (e) {
      toast.error(errorOf(e));
    }
  };

  const filteredHooks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return webhooks;
    return webhooks.filter((h) =>
      [h.name, h.url, h.client_name ?? t('logbooks.eventLogbook.webhooks.allClients')].join(' ').toLowerCase().includes(q),
    );
  }, [webhooks, search, t]);
  const pageCount = Math.max(1, Math.ceil(filteredHooks.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pagedHooks = filteredHooks.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const toggleType = (type: string, checked: boolean) =>
    setForm((f) =>
      f ? { ...f, event_types: checked ? [...f.event_types, type] : f.event_types.filter((x) => x !== type) } : f,
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
        <DialogHeader>
          <DialogTitle>{w('title')}</DialogTitle>
          <DialogDescription>{w('description')}</DialogDescription>
        </DialogHeader>

        {secret && (
          <div className="space-y-2 rounded-lg border border-amber-400/60 bg-amber-50 p-3 dark:bg-amber-950/30">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <KeyRound className="h-4 w-4" />
              {w('secretTitle')}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{w('secretHint')}</p>
            <div className="flex gap-2">
              <code className="flex-1 break-all rounded bg-white dark:bg-slate-900 px-2 py-1.5 text-xs">{secret}</code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(secret).then(() => toast.success(w('copied')));
                }}
              >
                <Copy className="mr-1 h-3.5 w-3.5" />
                {w('copy')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSecret(null)}>
                {w('close')}
              </Button>
            </div>
          </div>
        )}

        {form ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{w('name')}</Label>
              <Input className="border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200" value={form.name} maxLength={100} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{w('url')}</Label>
              <Input className="border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
                value={form.url}
                placeholder="https://client.example.com/hooks/readi"
                onChange={(e) => setForm({ ...form, url: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{w('client')}</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                <SelectTrigger className="w-full border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  <SelectItem value="__all__">{w('allClients')}</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.client_id} value={String(c.client_id)}>
                      {c.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 dark:text-slate-400">{w('clientHint')}</p>
            </div>
            <div className="space-y-1.5">
              <Label>{w('eventTypes')}</Label>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {EVENT_TYPES.map((type) => (
                  <label key={type} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.event_types.includes(type)}
                      onCheckedChange={(v) => toggleType(type, v === true)}
                    />
                    {t(`logbooks.eventLogbook.types.${type}`)}
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{w('eventTypesHint')}</p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              {w('active')}
            </label>
            <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
              <Button variant="outline" onClick={() => setForm(null)} disabled={saving}>
                {w('cancel')}
              </Button>
              <Button
                className="bg-violet-600 text-white hover:bg-violet-700"
                disabled={saving || !form.name.trim() || !form.url.trim()}
                onClick={save}
              >
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                {w('save')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="relative max-w-xs flex-1">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  className="h-8 border-slate-200 bg-white pl-8 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
                  value={search}
                  placeholder={w('search')}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                />
              </div>
              <Button size="sm" className="bg-violet-600 text-white hover:bg-violet-700" onClick={() => setForm(EMPTY_FORM)}>
                <Plus className="mr-1 h-4 w-4" />
                {w('add')}
              </Button>
            </div>

            <div className="h-[34rem] overflow-y-auto pr-1">
            {loading ? (
              <ul className="space-y-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <li key={i} className="space-y-2 rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                  </li>
                ))}
              </ul>
            ) : filteredHooks.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">{webhooks.length === 0 ? w('none') : w('noMatches')}</p>
            ) : (
              <ul className="space-y-1.5">
                {pagedHooks.map((hook) => (
                  <li key={hook.webhook_id} className="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 text-left">
                        <p className="flex items-center gap-2 text-sm font-medium">
                          {hook.name}
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                              hook.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {hook.is_active ? w('active') : '—'}
                          </span>
                        </p>
                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <p className="min-w-0 flex-1 truncate" title={hook.url}>{hook.url}</p>
                          {hook.last_delivery && (
                            <p className="flex shrink-0 items-center gap-1">
                              {hook.last_delivery.success ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5 text-red-500" />
                              )}
                              {new Date(hook.last_delivery.created_at).toLocaleString()}
                              {hook.last_delivery.response_status ? ` (HTTP ${hook.last_delivery.response_status})` : ''}
                            </p>
                          )}
                        </div>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {hook.client_name ?? w('allClients')}
                          {hook.event_types.length > 0 &&
                            ` · ${hook.event_types.map((x) => t(`logbooks.eventLogbook.types.${x}`)).join(', ')}`}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" title={w('edit')} aria-label={w('edit')} onClick={() => edit(hook)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" title={w('test')} disabled={busyId === hook.webhook_id} onClick={() => test(hook)}>
                          {busyId === hook.webhook_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" title={w('deliveries')} onClick={() => showDeliveries(hook)}>
                          <History className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" title={w('rotate')} disabled={busyId === hook.webhook_id} onClick={() => rotate(hook)}>
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" title={w('delete')} disabled={busyId === hook.webhook_id} onClick={() => setDeleteTarget(hook)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    {deliveries?.id === hook.webhook_id && (
                      <div className="mt-2 border-t pt-2">
                        {deliveries.items.length === 0 ? (
                          <p className="text-xs text-slate-500 dark:text-slate-400">{w('noDeliveries')}</p>
                        ) : (
                          <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
                            {deliveries.items.map((d) => (
                              <li key={d.delivery_id} className="flex items-center gap-2">
                                {d.success ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                ) : (
                                  <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                                )}
                                <span>{new Date(d.created_at).toLocaleString()}</span>
                                <span className="text-slate-500 dark:text-slate-400">
                                  {d.is_test ? 'test' : d.fk_event_id ? `#${d.fk_event_id}` : ''}
                                  {d.response_status ? ` · HTTP ${d.response_status}` : ''}
                                  {d.error_message && !d.response_status ? ` · ${d.error_message}` : ''}
                                  {d.duration_ms != null ? ` · ${d.duration_ms} ms` : ''}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            </div>

            {!loading && filteredHooks.length > PAGE_SIZE && (
              <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <Button size="sm" variant="ghost" className="h-7 gap-1 px-2" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                  {t('operations.newOperation.drone.pagePrevious')}
                </Button>
                <span>{t('operations.newOperation.drone.pageIndicator', { current: safePage + 1, total: pageCount })}</span>
                <Button size="sm" variant="ghost" className="h-7 gap-1 px-2" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)}>
                  {t('operations.newOperation.drone.pageNext')}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        )}

        <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && busyId === null && setDeleteTarget(null)}>
          <AlertDialogContent className="border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
            <AlertDialogHeader>
              <AlertDialogTitle>{w('deleteTitle')}</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
                {w('deleteDescription', { name: deleteTarget?.name ?? '' })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={busyId !== null}
                className="border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {w('cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-500 text-white hover:bg-red-600"
                disabled={busyId !== null}
                onClick={(e) => {
                  // Keep the dialog open until the request finishes.
                  e.preventDefault();
                  if (deleteTarget) void remove(deleteTarget);
                }}
              >
                {busyId !== null && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                {w('delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
