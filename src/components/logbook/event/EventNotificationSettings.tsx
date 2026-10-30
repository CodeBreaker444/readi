'use client';

import { ClientStatusTag, isClientInactive } from '@/components/client/ClientStatusTag';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import axios from 'axios';
import { Skeleton } from '@/components/ui/skeleton';
import { BookUser, ChevronLeft, ChevronRight, Loader2, Mail, Pencil, Plus, Search, Send, Trash2 } from 'lucide-react';
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
  client_active?: string | null;
  not_activated?: boolean;
}

interface Contact {
  contact_id: number;
  name: string;
  company: string | null;
  notes: string | null;
  email: string;
}

interface DefaultForm {
  client_id: string;
  contact_ids: number[];
}

interface ContactForm {
  id: number | null;
  name: string;
  company: string;
  notes: string;
  email: string;
}

type DeleteTarget = { kind: 'default'; clientId: number; name: string } | { kind: 'contact'; id: number; name: string };

const EMPTY_CONTACT: ContactForm = { id: null, name: '', company: '', notes: '', email: '' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RECIPIENTS = 20;
const PAGE_SIZE = 8;
// Fixed height (room for 8 rows) so the modal never resizes when paging; overflow scrolls inside the list only.
const LIST_CLS = 'h-[34rem] overflow-y-auto pr-1';

const inputCls = 'border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200';
const hintCls = 'text-xs text-slate-500 dark:text-slate-400';

export function EventNotificationSettings({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const n = (key: string, opts?: Record<string, unknown>) => t(`logbooks.eventLogbook.notifications.${key}`, opts);

  const [loading, setLoading] = useState(false);
  const [defaults, setDefaults] = useState<Record<number, number[]>>({});
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);

  const [defaultForm, setDefaultForm] = useState<DefaultForm | null>(null);
  const [contactForm, setContactForm] = useState<ContactForm | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [defaultSearch, setDefaultSearch] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [defaultPage, setDefaultPage] = useState(0);
  const [contactPage, setContactPage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);

  const errorOf = (e: any) => e?.response?.data?.error ?? n('error');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/logbooks/event/defaults');
      setDefaults(res.data.defaults);
      setContacts(res.data.contacts);
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
      setDefaultForm(null);
      setContactForm(null);
      setPickerSearch('');
      setDefaultSearch('');
      setContactSearch('');
      setDefaultPage(0);
      setContactPage(0);
    }
  }, [open, load]);

  const contactById = useMemo(() => new Map(contacts.map((c) => [c.contact_id, c])), [contacts]);
  const clientName = useCallback((id: number) => clients.find((c) => c.client_id === id)?.client_name ?? `#${id}`, [clients]);

  // ── Default notifications ──────────────────────────────────────────────────

  const startDefault = (clientId?: number) => {
    setPickerSearch('');
    setDefaultForm({
      client_id: clientId ? String(clientId) : '',
      contact_ids: clientId ? (defaults[clientId] ?? []).filter((id) => contactById.has(id)) : [],
    });
  };

  const pickClient = (value: string) =>
    setDefaultForm({ client_id: value, contact_ids: (defaults[Number(value)] ?? []).filter((id) => contactById.has(id)) });

  const toggleDefaultContact = (id: number, checked: boolean) => {
    if (!defaultForm) return;
    if (checked && defaultForm.contact_ids.length >= MAX_RECIPIENTS) return void toast.error(n('tooManyRecipients', { max: MAX_RECIPIENTS }));
    setDefaultForm({
      ...defaultForm,
      contact_ids: checked ? [...new Set([...defaultForm.contact_ids, id])] : defaultForm.contact_ids.filter((x) => x !== id),
    });
  };

  const saveDefault = async () => {
    if (!defaultForm?.client_id) return;
    setSaving(true);
    try {
      await axios.put(`/api/logbooks/event/defaults/${defaultForm.client_id}`, { contact_ids: defaultForm.contact_ids });
      toast.success(n('saved'));
      setDefaultForm(null);
      await load();
    } catch (e) {
      toast.error(errorOf(e));
    } finally {
      setSaving(false);
    }
  };

  // ── Contact book ───────────────────────────────────────────────────────────

  const saveContact = async () => {
    if (!contactForm) return;
    if (!EMAIL_RE.test(contactForm.email.trim())) return void toast.error(n('invalidEmail', { email: contactForm.email }));
    setSaving(true);
    try {
      const body = {
        name: contactForm.name,
        company: contactForm.company.trim() || null,
        notes: contactForm.notes.trim() || null,
        email: contactForm.email,
      };
      if (contactForm.id) await axios.patch(`/api/logbooks/event/contacts/${contactForm.id}`, body);
      else await axios.post('/api/logbooks/event/contacts', body);
      toast.success(n('contactSaved'));
      setContactForm(null);
      await load();
    } catch (e) {
      toast.error(errorOf(e));
    } finally {
      setSaving(false);
    }
  };

  const testContact = async (c: Contact) => {
    setBusyId(c.contact_id);
    try {
      await axios.post(`/api/logbooks/event/contacts/${c.contact_id}/test`);
      toast.success(n('testSent', { email: c.email }));
    } catch (e) {
      toast.error(errorOf(e));
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.kind === 'default') await axios.put(`/api/logbooks/event/defaults/${deleteTarget.clientId}`, { contact_ids: [] });
      else await axios.delete(`/api/logbooks/event/contacts/${deleteTarget.id}`);
      toast.success(n('deleted'));
      await load();
    } catch (e) {
      toast.error(errorOf(e));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // ── Derived lists ──────────────────────────────────────────────────────────

  const defaultRows = useMemo(
    () =>
      Object.entries(defaults)
        .map(([clientId, ids]) => ({
          clientId: Number(clientId),
          clientName: clientName(Number(clientId)),
          contacts: ids.map((id) => contactById.get(id)).filter((c): c is Contact => !!c),
        }))
        .filter((r) => r.contacts.length > 0)
        .sort((a, b) => a.clientName.localeCompare(b.clientName)),
    [defaults, contactById, clientName],
  );

  const filteredDefaults = useMemo(() => {
    const q = defaultSearch.trim().toLowerCase();
    if (!q) return defaultRows;
    return defaultRows.filter((r) => [r.clientName, ...r.contacts.flatMap((c) => [c.name, c.email, c.company ?? ''])].join(' ').toLowerCase().includes(q));
  }, [defaultRows, defaultSearch]);

  const filteredContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => [c.name, c.company ?? '', c.email, c.notes ?? ''].join(' ').toLowerCase().includes(q));
  }, [contacts, contactSearch]);

  const pickerContacts = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => [c.name, c.company ?? '', c.email].join(' ').toLowerCase().includes(q));
  }, [contacts, pickerSearch]);

  const defaultPageCount = Math.max(1, Math.ceil(filteredDefaults.length / PAGE_SIZE));
  const safeDefaultPage = Math.min(defaultPage, defaultPageCount - 1);
  const pagedDefaults = filteredDefaults.slice(safeDefaultPage * PAGE_SIZE, (safeDefaultPage + 1) * PAGE_SIZE);
  const contactPageCount = Math.max(1, Math.ceil(filteredContacts.length / PAGE_SIZE));
  const safeContactPage = Math.min(contactPage, contactPageCount - 1);
  const pagedContacts = filteredContacts.slice(safeContactPage * PAGE_SIZE, (safeContactPage + 1) * PAGE_SIZE);

  const pager = (page: number, count: number, total: number, onPage: (p: number) => void) =>
    total > PAGE_SIZE && (
      <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
        <Button size="sm" variant="ghost" className="h-7 gap-1 px-2" disabled={page === 0} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="h-3.5 w-3.5" />
          {t('operations.newOperation.drone.pagePrevious')}
        </Button>
        <span>{t('operations.newOperation.drone.pageIndicator', { current: page + 1, total: count })}</span>
        <Button size="sm" variant="ghost" className="h-7 gap-1 px-2" disabled={page >= count - 1} onClick={() => onPage(page + 1)}>
          {t('operations.newOperation.drone.pageNext')}
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    );

  const spinner = (
    <ul className="space-y-1.5">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="space-y-2 rounded-lg border border-slate-200 p-2 dark:border-slate-700">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
        </li>
      ))}
    </ul>
  );

  const searchBox = (value: string, placeholder: string, onChange: (v: string) => void) => (
    <div className="relative max-w-xs flex-1">
      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      <Input className={`h-8 pl-8 text-xs ${inputCls}`} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-4xl border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
        <DialogHeader>
          <DialogTitle>{n('title')}</DialogTitle>
          <DialogDescription>{n('description')}</DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue="defaults"
          onValueChange={() => {
            setDefaultForm(null);
            setContactForm(null);
          }}
        >
          <TabsList>
            <TabsTrigger value="defaults" className="gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {n('tabDefaults')}
            </TabsTrigger>
            <TabsTrigger value="contacts" className="gap-1.5">
              <BookUser className="h-3.5 w-3.5" />
              {n('tabContacts')}
            </TabsTrigger>
          </TabsList>

          {/* ── Default notifications per client ─────────────────────────── */}
          <TabsContent value="defaults" className="mt-3">
            {defaultForm ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{n('client')}</Label>
                  <Select value={defaultForm.client_id} onValueChange={pickClient}>
                    <SelectTrigger className={`w-full ${inputCls}`}>
                      <SelectValue placeholder={n('selectClient')} />
                    </SelectTrigger>
                    <SelectContent className="border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      {clients.map((c) => (
                        <SelectItem key={c.client_id} value={String(c.client_id)} disabled={isClientInactive(c.client_active)}>
                          {c.client_name}<ClientStatusTag clientActive={c.client_active} notActivated={c.not_activated} />
                          {(defaults[c.client_id]?.length ?? 0) > 0 && ` (${defaults[c.client_id].length})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className={hintCls}>{n('clientHint')}</p>
                </div>

                <div className="space-y-2">
                  <Label>{n('defaultContacts', { count: defaultForm.contact_ids.length })}</Label>
                  {contacts.length === 0 ? (
                    <p className={hintCls}>{n('noContactsYet')}</p>
                  ) : (
                    <div className="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                      <Input className={`mb-1.5 h-8 text-xs ${inputCls}`} value={pickerSearch} placeholder={n('searchContacts')} onChange={(e) => setPickerSearch(e.target.value)} />
                      <ul className="max-h-72 space-y-0.5 overflow-y-auto">
                        {pickerContacts.map((c) => (
                          <li key={c.contact_id}>
                            <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
                              <Checkbox checked={defaultForm.contact_ids.includes(c.contact_id)} onCheckedChange={(v) => toggleDefaultContact(c.contact_id, v === true)} />
                              <span className="min-w-0 flex-1 truncate">
                                {c.name}
                                {c.company ? <span className={hintCls}> · {c.company}</span> : null}
                                <span className={hintCls}> · {c.email}</span>
                              </span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                  <Button variant="outline" onClick={() => setDefaultForm(null)} disabled={saving}>
                    {n('cancel')}
                  </Button>
                  <Button className="bg-violet-600 text-white hover:bg-violet-700" disabled={saving || !defaultForm.client_id} onClick={saveDefault}>
                    {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                    {n('save')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  {searchBox(defaultSearch, n('searchDefaults'), (v) => {
                    setDefaultSearch(v);
                    setDefaultPage(0);
                  })}
                  <Button size="sm" className="bg-violet-600 text-white hover:bg-violet-700" onClick={() => startDefault()}>
                    <Plus className="mr-1 h-4 w-4" />
                    {n('addDefault')}
                  </Button>
                </div>
                <div className={LIST_CLS}>
                  {loading ? (
                    spinner
                  ) : filteredDefaults.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">{defaultRows.length === 0 ? n('noDefaults') : n('noDefaultMatches')}</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {pagedDefaults.map((r) => (
                        <li key={r.clientId} className="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0 flex-1 text-left">
                              <p className="text-sm font-medium">{r.clientName}</p>
                              <p className={`truncate ${hintCls}`} title={r.contacts.map((c) => `${c.name} <${c.email}>`).join(', ')}>
                                {r.contacts.map((c) => c.name).join(', ')}
                              </p>
                              <p className={`truncate ${hintCls}`}>{r.contacts.map((c) => c.email).join(', ')}</p>
                            </div>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" title={n('edit')} aria-label={n('edit')} onClick={() => startDefault(r.clientId)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" title={n('delete')} aria-label={n('delete')} onClick={() => setDeleteTarget({ kind: 'default', clientId: r.clientId, name: r.clientName })}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {pager(safeDefaultPage, defaultPageCount, filteredDefaults.length, setDefaultPage)}
              </div>
            )}
          </TabsContent>

          {/* ── Contact book ─────────────────────────────────────────────── */}
          <TabsContent value="contacts" className="mt-3">
            {contactForm ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{n('contactName')}</Label>
                  <Input className={inputCls} value={contactForm.name} maxLength={100} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>{n('contactEmail')}</Label>
                  <Input className={inputCls} type="email" value={contactForm.email} maxLength={255} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    {n('contactCompany')} <span className={hintCls}>({n('optional')})</span>
                  </Label>
                  <Input className={inputCls} value={contactForm.company} maxLength={150} onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    {n('contactNotes')} <span className={hintCls}>({n('optional')})</span>
                  </Label>
                  <Textarea className={inputCls} rows={3} value={contactForm.notes} maxLength={1000} onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })} />
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                  <Button variant="outline" onClick={() => setContactForm(null)} disabled={saving}>
                    {n('cancel')}
                  </Button>
                  <Button className="bg-violet-600 text-white hover:bg-violet-700" disabled={saving || !contactForm.name.trim() || !contactForm.email.trim()} onClick={saveContact}>
                    {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                    {n('save')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  {searchBox(contactSearch, n('searchContacts'), (v) => {
                    setContactSearch(v);
                    setContactPage(0);
                  })}
                  <Button size="sm" className="bg-violet-600 text-white hover:bg-violet-700" onClick={() => setContactForm(EMPTY_CONTACT)}>
                    <Plus className="mr-1 h-4 w-4" />
                    {n('addContact')}
                  </Button>
                </div>
                <div className={LIST_CLS}>
                  {loading ? (
                    spinner
                  ) : filteredContacts.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">{contacts.length === 0 ? n('noContacts') : n('noMatches')}</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {pagedContacts.map((c) => (
                        <li key={c.contact_id} className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                          <div className="min-w-0 flex-1 text-left">
                            <p className="text-sm font-medium">
                              {c.name}
                              {c.company && <span className="font-normal text-slate-500 dark:text-slate-400"> · {c.company}</span>}
                            </p>
                            <p className={`truncate ${hintCls}`}>{c.email}</p>
                            {c.notes && (
                              <p className={`truncate ${hintCls}`} title={c.notes}>
                                {c.notes}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" title={n('sendTest')} aria-label={n('sendTest')} disabled={busyId === c.contact_id} onClick={() => testContact(c)}>
                              {busyId === c.contact_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title={n('edit')}
                              aria-label={n('edit')}
                              onClick={() => setContactForm({ id: c.contact_id, name: c.name, company: c.company ?? '', notes: c.notes ?? '', email: c.email })}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" title={n('delete')} aria-label={n('delete')} onClick={() => setDeleteTarget({ kind: 'contact', id: c.contact_id, name: c.name })}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {pager(safeContactPage, contactPageCount, filteredContacts.length, setContactPage)}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && !deleting && setDeleteTarget(null)}>
          <AlertDialogContent className="border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
            <AlertDialogHeader>
              <AlertDialogTitle>{deleteTarget?.kind === 'contact' ? n('deleteContactTitle') : n('deleteDefaultTitle')}</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
                {deleteTarget?.kind === 'contact' ? n('deleteContactDescription', { name: deleteTarget.name }) : n('deleteDefaultDescription', { name: deleteTarget?.name ?? '' })}
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
