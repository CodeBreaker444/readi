'use client';

import '@/lib/i18n/config';
import { FeatureGate } from '@/components/permissions/FeatureGate';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import axios from 'axios';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Copy, Globe, KeyRound, Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useTheme } from '../useTheme';

const ENDPOINTS = [
  {
    method: 'POST',
    path: '/dcc/missions',
    trigger: 'PMVD creates a scheduled or on-demand mission',
    body: [
      { field: 'type',      type: 'string',  required: true,  description: '"SCHEDULED" or "ON-DEMAND"' },
      { field: 'missions',  type: 'array',   required: true,  description: 'Array of { missionId: string, startDateTime: ISO-UTC }' },
      { field: 'target',    type: 'string',  required: false, description: 'Human-readable mission target' },
      { field: 'localization', type: 'object', required: false, description: 'Highway / range / waypoint info' },
      { field: 'priority',  type: 'string',  required: false, description: 'Mission priority (e.g. HIGH)' },
      { field: 'notes',     type: 'string',  required: false, description: 'Free-text notes' },
      { field: 'operator',  type: 'string',  required: false, description: 'Operator identifier' },
    ],
    responses: [
      '200 — DCC saved all missions',
      '4xx/5xx — DCC rejected; PMVD will roll back created missions',
    ],
  },
  {
    method: 'POST',
    path: '/dcc/missions/cancel',
    trigger: 'PMVD cancels a scheduled program',
    body: [
      { field: 'missionIds', type: 'string[]', required: true, description: 'Complete list of mission IDs belonging to the cancelled program' },
    ],
    responses: [
      '200 — DCC cancelled the missions',
      '4xx — One or more IDs not found on DCC side',
    ],
  },
  {
    method: 'POST',
    path: '/dcc/missions/{missionId}/acceptance',
    trigger: 'OPM assigns request to a planning mission',
    body: [
      { field: 'droneId', type: 'uuid', required: true, description: 'Drone chosen for the mission' },
    ],
    responses: ['200 — Mission accepted (returns MissionEventDto[])', '400 — Missing droneId', '404 — Mission not found', '422 — Status does not allow acceptance'],
  },
  {
    method: 'POST',
    path: '/dcc/missions/{missionId}/denial',
    trigger: 'OPM denies a flight request',
    body: [
      { field: 'note', type: 'string', required: false, description: 'Reason for denial' },
    ],
    responses: ['200 — Mission denied (returns MissionEventDto[])', '404 — Mission not found', '422 — Status does not allow denial'],
  },
  {
    method: 'POST',
    path: '/dcc/missions/{missionId}/execution',
    trigger: 'Pilot moves mission to In Progress on the board',
    body: [],
    responses: ['200 — Mission started (returns MissionEventDto[])', '404 — Mission not found', '422 — Status does not allow execution'],
  },
  {
    method: 'POST',
    path: '/dcc/missions/{missionId}/termination',
    trigger: 'Pilot moves mission to Done on the board',
    body: [
      { field: 'result', type: 'integer (1=success, 0=failure)', required: false, description: 'Flight result code' },
      { field: 'note', type: 'string', required: false, description: 'Final notes about mission result' },
    ],
    responses: ['200 — Mission terminated (returns MissionEventDto[])', '404 — Mission not found', '422 — Status does not allow termination'],
  },
  {
    method: 'POST',
    path: '/dcc/missions/{missionId}/logging',
    trigger: 'OPM clicks Push Log on the Flight Requests page',
    body: [
      { field: 'uri', type: 'string', required: true, description: 'Remote logging source URI (FlytBase report URL)' },
    ],
    responses: ['201 — Log saved', '404 — Mission not found'],
  },
];

const METHOD_COLOR: Record<string, string> = {
  POST:  'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  PATCH: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  GET:   'bg-violet-500/10 text-violet-500 border-violet-500/30',
};

type MissionScope = 'EXTERNAL' | 'INTERNAL' | 'ALL';
const SCOPES: MissionScope[] = ['ALL', 'EXTERNAL', 'INTERNAL'];
const PAGE_SIZE = 8;

interface ClientIntegration {
  fk_client_id: number;
  client_name: string;
  status_url: string | null;
  callback_url: string | null;
  mission_scope: MissionScope;
  api_key_last6: string | null;
}

export default function DccIntegrationSettings() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const [integrations, setIntegrations] = useState<ClientIntegration[]>([]);
  const [clients, setClients]         = useState<{ client_id: number; client_name: string; client_code?: string | null }[]>([]);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [clientId, setClientId]       = useState('');
  const [scope, setScope]             = useState<MissionScope>('ALL');
  const [callbackUrl, setCallbackUrl] = useState('');
  const [statusUrl, setStatusUrl]     = useState('');
  const [saving, setSaving]           = useState(false);
  const [revealedKey, setRevealedKey] = useState<{ client: string; key: string } | null>(null);
  const [rotatingId, setRotatingId]   = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<{ type: 'delete' | 'rotate'; item: ClientIntegration } | null>(null);
  const [page, setPage] = useState(1);
  const [endpointsOpen, setEndpointsOpen] = useState(false);
  const [outbox, setOutbox] = useState<{
    id: number; client_name: string | null; path: string; status: string; attempts: number;
    next_attempt_at: string | null; last_http_status: number | null; last_error: string | null; created_at: string;
  }[]>([]);
  const [resendingId, setResendingId] = useState<number | null>(null);

  const loadOutbox = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/settings/dcc/callbacks');
      setOutbox(data.data ?? []);
    } catch {
      /* non-critical panel */
    }
  }, []);

  useEffect(() => { loadOutbox(); }, [loadOutbox]);

  async function resendCallback(id: number) {
    setResendingId(id);
    try {
      const { data } = await axios.post('/api/settings/dcc/callbacks', { id });
      if (data.dcc?.outcome === 'success') toast.success(t('settings.integrations.dcc.callbacks.resent'));
      else toast.error(data.dcc?.message ?? t('settings.integrations.dcc.callbacks.resendFailed'));
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? t('settings.integrations.dcc.callbacks.resendFailed'));
    } finally {
      setResendingId(null);
      loadOutbox();
    }
  }

  const pageCount = Math.max(1, Math.ceil(integrations.length / PAGE_SIZE));
  const pagedIntegrations = integrations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  // Removing the last item on a page must not leave us on an empty page.
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  const selectedClient = clients.find((c) => String(c.client_id) === clientId) ?? null;

  const card  = isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-gray-200';
  const input = isDark ? 'bg-slate-900 border-slate-600 text-slate-200 placeholder:text-slate-500' : '';
  const label = isDark ? 'text-slate-400' : 'text-gray-500';
  const th    = `px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-400'}`;
  const td    = `px-4 py-3 text-xs align-top ${isDark ? 'text-slate-300' : 'text-gray-700'}`;

  const loadIntegrations = useCallback(async () => {
    try {
      const [eps, cl] = await Promise.all([
        axios.get('/api/settings/dcc/clients'),
        axios.get('/api/client/list'),
      ]);
      setIntegrations(eps.data.data ?? []);
      setClients(cl.data.data ?? []);
    } catch {
      toast.error(t('settings.integrations.dcc.integrations.toastLoadFailed'));
    }
  }, [t]);

  useEffect(() => { loadIntegrations(); }, [loadIntegrations]);

  function resetForm() {
    setClientId('');
    setScope('ALL');
    setCallbackUrl('');
    setStatusUrl('');
  }

  function editIntegration(i: ClientIntegration) {
    setClientId(String(i.fk_client_id));
    setScope(i.mission_scope ?? 'ALL');
    setCallbackUrl(i.callback_url ?? '');
    setStatusUrl(i.status_url ?? '');
  }

  async function saveIntegration() {
    if (!clientId || (!callbackUrl.trim() && !statusUrl.trim())) {
      toast.error(t('settings.integrations.dcc.integrations.toastValidation'));
      return;
    }
    setSaving(true);
    try {
      // Empty string clears a URL on the server; both fields are always sent so the form is the source of truth.
      const { data } = await axios.post('/api/settings/dcc/clients', {
        client_id: Number(clientId),
        callback_url: callbackUrl.trim(),
        status_url: statusUrl.trim(),
        mission_scope: scope,
        active: true,
      });
      if (data.api_key) setRevealedKey({ client: selectedClient?.client_name ?? '', key: data.api_key });
      resetForm();
      toast.success(t('settings.integrations.dcc.integrations.toastSaved'));
      loadIntegrations();
    } catch (err: any) {
      const fields = err?.response?.data?.errors as Record<string, string[] | undefined> | undefined;
      toast.error(fields?.callback_url?.[0] ?? fields?.status_url?.[0] ?? err?.response?.data?.error ?? t('settings.integrations.dcc.integrations.toastSaveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function removeIntegration(i: ClientIntegration) {
    try {
      await axios.delete('/api/settings/dcc/clients', { data: { client_id: i.fk_client_id } });
      loadIntegrations();
    } catch {
      toast.error(t('settings.integrations.dcc.integrations.toastRemoveFailed'));
    }
  }

  async function rotateKey(i: ClientIntegration) {
    setRotatingId(i.fk_client_id);
    try {
      const { data } = await axios.post('/api/settings/dcc/clients/rotate-key', { client_id: i.fk_client_id });
      setRevealedKey({ client: i.client_name, key: data.api_key });
      toast.success(t('settings.integrations.dcc.integrations.toastRotated'));
      loadIntegrations();
    } catch {
      toast.error(t('settings.integrations.dcc.integrations.toastRotateFailed'));
    } finally {
      setRotatingId(null);
    }
  }

  const tableHeaders = [
    t('settings.integrations.dcc.tableHeaders.method'),
    t('settings.integrations.dcc.tableHeaders.path'),
    t('settings.integrations.dcc.tableHeaders.triggeredWhen'),
    t('settings.integrations.dcc.tableHeaders.requestBody'),
    t('settings.integrations.dcc.tableHeaders.responses'),
  ];

  const SCOPE_BADGE: Record<MissionScope, string> = {
    ALL:      'bg-violet-500/10 text-violet-500 border-violet-500/30',
    EXTERNAL: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    INTERNAL: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  };
  const urlCode = `block text-[11px] break-all ${isDark ? 'text-violet-400' : 'text-violet-600'}`;

  return (
    <div className="space-y-8">
      {/* Client integrations: one per client — URLs, which missions, API key */}
      <div className={`rounded-xl border p-6 space-y-4 ${card}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isDark ? 'bg-violet-500/10' : 'bg-violet-50'}`}>
            <Globe className="h-4 w-4 text-violet-500" />
          </div>
          <div>
            <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('settings.integrations.dcc.integrations.title')}</h2>
            <p className={`text-xs ${label}`}>{t('settings.integrations.dcc.integrations.subtitle')}</p>
          </div>
        </div>

        {revealedKey && (
          <div className={`rounded-lg border p-3 space-y-2 ${isDark ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50'}`}>
            <p className={`text-xs font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
              {t('settings.integrations.dcc.integrations.keyRevealTitle', { client: revealedKey.client })}
            </p>
            <p className={`text-xs ${label}`}>{t('settings.integrations.dcc.integrations.keyRevealHint')}</p>
            <div className="flex items-center gap-2">
              <code className={`flex-1 break-all rounded px-2 py-1.5 text-xs ${isDark ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'}`}>{revealedKey.key}</code>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs"
                onClick={() => navigator.clipboard.writeText(revealedKey.key).then(() => toast.success(t('settings.integrations.dcc.integrations.copied')))}
              >
                <Copy className="h-3.5 w-3.5" /> {t('settings.integrations.dcc.integrations.copy')}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setRevealedKey(null)}>
                {t('settings.integrations.dcc.integrations.dismiss')}
              </Button>
            </div>
          </div>
        )}

        <FeatureGate feature="settings_integrations" require="edit">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[200px_170px_1fr_1fr_auto] items-end">
            <div className="space-y-1.5">
              <Label className={`text-xs ${label}`}>{t('settings.integrations.dcc.integrations.client')}</Label>
              <Popover open={clientPickerOpen} onOpenChange={setClientPickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={`flex h-9 w-full items-center justify-between gap-2 rounded-md border px-2.5 text-xs ${isDark ? 'bg-slate-900 border-slate-600 text-slate-200' : 'bg-white border-gray-200'}`}
                  >
                    <span className={`truncate ${selectedClient ? '' : isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                      {selectedClient ? selectedClient.client_name : t('settings.integrations.dcc.integrations.selectClient')}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[280px] p-0">
                  <Command>
                    <CommandInput placeholder={t('settings.integrations.dcc.integrations.searchClients')} />
                    <CommandList className="max-h-64">
                      <CommandEmpty>{t('settings.integrations.dcc.integrations.noClients')}</CommandEmpty>
                      <CommandGroup>
                        {clients.map((c) => {
                          const existing = integrations.find((e) => e.fk_client_id === c.client_id);
                          return (
                            <CommandItem
                              key={c.client_id}
                              value={`${c.client_name} ${c.client_code ?? ''}`}
                              onSelect={() => {
                                if (existing) editIntegration(existing);
                                else { setClientId(String(c.client_id)); setScope('ALL'); setCallbackUrl(''); setStatusUrl(''); }
                                setClientPickerOpen(false);
                              }}
                              className="flex items-center gap-2"
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-xs font-semibold">{c.client_name}</span>
                                {c.client_code && <span className="block truncate text-[11px] opacity-60">{c.client_code}</span>}
                              </span>
                              {existing && <span className="text-[10px] font-semibold text-emerald-500">{t('settings.integrations.dcc.integrations.configured')}</span>}
                              {String(c.client_id) === clientId && <Check className="h-3.5 w-3.5 shrink-0 text-violet-500" />}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label className={`text-xs ${label}`}>{t('settings.integrations.dcc.integrations.missionScope')}</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as MissionScope)}>
                <SelectTrigger className={`h-9 w-full text-xs ${input}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCOPES.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">{t(`settings.integrations.dcc.integrations.scope.${s}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={`text-xs ${label}`}>{t('settings.integrations.dcc.integrations.callbackUrl')}</Label>
              <Input
                value={callbackUrl}
                onChange={(e) => setCallbackUrl(e.target.value)}
                placeholder={t('settings.integrations.dcc.integrations.callbackUrlPlaceholder')}
                className={`h-9 text-xs font-mono ${input}`}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={`text-xs ${label}`}>{t('settings.integrations.dcc.integrations.statusUrl')}</Label>
              <Input
                value={statusUrl}
                onChange={(e) => setStatusUrl(e.target.value)}
                placeholder={t('settings.integrations.dcc.integrations.statusUrlPlaceholder')}
                className={`h-9 text-xs font-mono ${input}`}
              />
            </div>
            <Button size="sm" onClick={saveIntegration} disabled={saving} className="h-9 text-xs bg-violet-600 hover:bg-violet-500 text-white gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} {t('settings.integrations.dcc.integrations.addUpdate')}
            </Button>
          </div>
        </FeatureGate>

        <div className={`text-[11px] ${label}`}>
          <p className="mb-1">{t('settings.integrations.dcc.integrations.scopeHelp')}</p>
          <p className="mb-1">{t('settings.integrations.dcc.integrations.bodySent')}</p>
          <code className="block whitespace-pre-wrap">{`{ missionId, missionCode, missionName, status: "IN_PROGRESS" | "COMPLETED" | "ABORTED" | "PLANNED" | "CANCELLED", note, scheduledStart, actualStart, actualEnd, sentAt }`}</code>
        </div>

        {integrations.length === 0 ? (
          <p className={`rounded-lg border border-dashed px-3 py-4 text-center text-xs ${isDark ? 'border-slate-700' : 'border-gray-200'} ${label}`}>
            {t('settings.integrations.dcc.integrations.empty')}
          </p>
        ) : (
          <div className="space-y-2">
            {pagedIntegrations.map((i) => (
              <div key={i.fk_client_id} className={`flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <div className="w-40 shrink-0 space-y-1">
                  <span className={`block text-xs font-medium truncate ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>{i.client_name}</span>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${SCOPE_BADGE[i.mission_scope ?? 'ALL']}`}>
                    {t(`settings.integrations.dcc.integrations.scope.${i.mission_scope ?? 'ALL'}`)}
                  </span>
                </div>
                <div className="flex-1 min-w-[200px] space-y-0.5">
                  {i.callback_url && (
                    <code className={urlCode}><span className={label}>{t('settings.integrations.dcc.integrations.callbackShort')}: </span>{i.callback_url}</code>
                  )}
                  {i.status_url && (
                    <code className={urlCode}><span className={label}>{t('settings.integrations.dcc.integrations.statusShort')}: </span>{i.status_url}</code>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <KeyRound className={`h-3.5 w-3.5 ${label}`} />
                  {i.api_key_last6 ? (
                    <code className={isDark ? 'text-slate-300' : 'text-gray-700'}>••••{i.api_key_last6}</code>
                  ) : (
                    <span className={label}>{t('settings.integrations.dcc.integrations.keyNone')}</span>
                  )}
                </div>
                <FeatureGate feature="settings_integrations" require="edit">
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title={t('settings.integrations.dcc.integrations.edit')} onClick={() => editIntegration(i)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title={t('settings.integrations.dcc.integrations.rotate')} disabled={rotatingId === i.fk_client_id} onClick={() => setPendingAction({ type: 'rotate', item: i })}>
                      {rotatingId === i.fk_client_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" title={t('settings.integrations.dcc.integrations.delete')} onClick={() => setPendingAction({ type: 'delete', item: i })}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </FeatureGate>
              </div>
            ))}
          </div>
        )}

        {integrations.length > PAGE_SIZE && (
          <div className="flex items-center justify-between pt-1">
            <p className={`text-[11px] ${label}`}>
              {t('settings.integrations.dcc.integrations.pageInfo', { from: (page - 1) * PAGE_SIZE + 1, to: Math.min(page * PAGE_SIZE, integrations.length), total: integrations.length })}
            </p>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label={t('settings.integrations.dcc.integrations.prevPage')}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className={`px-2 text-xs ${label}`}>{page} / {pageCount}</span>
              <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)} aria-label={t('settings.integrations.dcc.integrations.nextPage')}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Callbacks that failed or are waiting for an automatic retry */}
      <div className={`rounded-xl border p-6 space-y-3 ${card}`}>
        <div>
          <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('settings.integrations.dcc.callbacks.title')}</h2>
          <p className={`text-xs ${label}`}>{t('settings.integrations.dcc.callbacks.subtitle')}</p>
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {outbox.length === 0 && (
            <p className={`rounded-lg border border-dashed px-3 py-4 text-center text-xs ${isDark ? 'border-slate-700' : 'border-gray-200'} ${label}`}>
              {t('settings.integrations.dcc.callbacks.empty')}
            </p>
          )}
          {outbox.map((o) => (
            <div key={o.id} className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="flex-1 min-w-0 space-y-0.5">
                <code className={`block text-[11px] break-all ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>{o.path}</code>
                <p className={`text-[11px] ${label}`}>
                  {o.client_name ? `${o.client_name} · ` : ''}
                  {o.status === 'PENDING'
                    ? t('settings.integrations.dcc.callbacks.retrying', { attempts: o.attempts })
                    : t('settings.integrations.dcc.callbacks.failed', { attempts: o.attempts })}
                  {o.last_http_status ? ` · HTTP ${o.last_http_status}` : ''}
                  {o.last_error ? ` · ${o.last_error}` : ''}
                </p>
              </div>
              <FeatureGate feature="settings_integrations" require="edit">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 text-xs"
                  disabled={resendingId === o.id}
                  onClick={() => resendCallback(o.id)}
                >
                  {resendingId === o.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  {t('settings.integrations.dcc.callbacks.resend')}
                </Button>
              </FeatureGate>
            </div>
          ))}
        </div>
      </div>

      {/* Status endpoints reference — collapsed by default */}
      <div className={`rounded-xl border overflow-hidden ${card}`}>
        <button
          type="button"
          aria-expanded={endpointsOpen}
          onClick={() => setEndpointsOpen((o) => !o)}
          className={`flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left ${endpointsOpen ? 'border-b' : ''} ${isDark ? 'border-slate-700/60 bg-slate-800/60' : 'border-gray-100 bg-gray-50/80'}`}
        >
          <div>
            <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {t('settings.integrations.dcc.statusEndpoints')}
            </h2>
            <p className={`text-xs mt-0.5 ${label}`}>
              {t('settings.integrations.dcc.statusEndpointsSubtitle')}
            </p>
          </div>
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${endpointsOpen ? 'rotate-180' : ''} ${label}`} />
        </button>

        {endpointsOpen && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={isDark ? 'bg-slate-700/40' : 'bg-gray-50/80'}>
              <tr>
                {tableHeaders.map((h) => (
                  <th key={h} className={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-700/40' : 'divide-gray-100'}`}>
              {ENDPOINTS.map((ep) => (
                <tr key={ep.path} className={isDark ? 'hover:bg-slate-700/20' : 'hover:bg-gray-50/60'}>
                  <td className={td}>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${METHOD_COLOR[ep.method] ?? ''}`}>
                      {ep.method}
                    </span>
                  </td>
                  <td className={td}>
                    <code className={`text-[11px] break-all ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
                      {ep.path}
                    </code>
                  </td>
                  <td className={`${td} whitespace-nowrap`}>
                    {ep.trigger}
                  </td>
                  <td className={td}>
                    {ep.body.length === 0 ? (
                      <span className={isDark ? 'text-slate-500' : 'text-gray-400'}>{t('settings.integrations.dcc.noBody')}</span>
                    ) : (
                      <div className="space-y-1.5">
                        {ep.body.map((f) => (
                          <div key={f.field} className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <code className={`text-[11px] font-semibold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                                {f.field}
                              </code>
                              <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                                {f.type}
                              </span>
                              {f.required && (
                                <span className="text-[9px] font-bold text-red-500 uppercase">{t('settings.integrations.dcc.required')}</span>
                              )}
                            </div>
                            <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                              {f.description}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className={td}>
                    <div className="space-y-0.5">
                      {ep.responses.map((r) => (
                        <div key={r} className={`text-[11px] ${
                          r.startsWith('2') ? isDark ? 'text-emerald-400' : 'text-emerald-600'
                          : r.startsWith('4') ? isDark ? 'text-red-400' : 'text-red-500'
                          : isDark ? 'text-slate-400' : 'text-gray-500'
                        }`}>
                          {r}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
      <AlertDialog open={pendingAction !== null} onOpenChange={(open) => { if (!open) setPendingAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(pendingAction?.type === 'delete' ? 'settings.integrations.dcc.integrations.deleteTitle' : 'settings.integrations.dcc.integrations.rotateTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(pendingAction?.type === 'delete' ? 'settings.integrations.dcc.integrations.deleteConfirm' : 'settings.integrations.dcc.integrations.rotateConfirm', { client: pendingAction?.item.client_name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('settings.integrations.dcc.integrations.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className={pendingAction?.type === 'delete' ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-violet-600 hover:bg-violet-500 text-white'}
              onClick={() => {
                const action = pendingAction;
                setPendingAction(null);
                if (!action) return;
                if (action.type === 'delete') removeIntegration(action.item);
                else rotateKey(action.item);
              }}
            >
              {t(pendingAction?.type === 'delete' ? 'settings.integrations.dcc.integrations.delete' : 'settings.integrations.dcc.integrations.rotate')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
