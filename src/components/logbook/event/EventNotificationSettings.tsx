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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { EVENT_TYPES } from '@/config/types/event-logbook';
import axios from 'axios';
import { BookUser, ChevronLeft, ChevronRight, Loader2, Mail, Pencil, Plus, Search, Send, Trash2, X } from 'lucide-react';
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

interface Contact {
  contact_id: number;
  name: string;
  company: string | null;
  notes: string | null;
  email: string;
}

interface Rule {
  notification_id: number;
  name: string;
  fk_client_id: number | null;
  client_name: string | null;
  event_types: string[];
  recipient_emails: string[];
  is_active: boolean;
}

interface RuleForm {
  id: number | null;
  name: string;
  client_id: string;
  event_types: string[];
  recipient_emails: string[];
  is_active: boolean;
}

interface ContactForm {
  id: number | null;
  name: string;
  company: string;
  notes: string;
  email: string;
}

type DeleteTarget = { kind: 'rule'; id: number; name: string } | { kind: 'contact'; id: number; name: string };

const EMPTY_RULE: RuleForm = { id: null, name: '', client_id: '__all__', event_types: [], recipient_emails: [], is_active: true };
const EMPTY_CONTACT: ContactForm = { id: null, name: '', company: '', notes: '', email: '' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RECIPIENTS = 20;
const PAGE_SIZE = 8;
const LIST_CLS = 'h-[34rem] overflow-y-auto pr-1';

const inputCls = 'border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200';
const hintCls = 'text-xs text-slate-500 dark:text-slate-400';

export function EventNotificationSettings({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const n = (key: string, opts?: Record<string, unknown>) => t(`logbooks.eventLogbook.notifications.${key}`, opts);

  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState<Rule[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);

  const [ruleForm, setRuleForm] = useState<RuleForm | null>(null);
  const [contactForm, setContactForm] = useState<ContactForm | null>(null);
  const [emailDraft, setEmailDraft] = useState('');
  const [pickerSearch, setPickerSearch] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [ruleSearch, setRuleSearch] = useState('');
  const [rulePage, setRulePage] = useState(0);
  const [contactPage, setContactPage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);

  const errorOf = (e: any) => e?.response?.data?.error ?? n('error');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/logbooks/event/email-notifications');
      setRules(res.data.notifications);
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
      setRuleForm(null);
      setContactForm(null);
      setEmailDraft('');
      setPickerSearch('');
      setContactSearch('');
      setRuleSearch('');
      setRulePage(0);
      setContactPage(0);
    }
  }, [open, load]);

  // ── Rule form helpers ──────────────────────────────────────────────────────

  const addEmails = (raw: string) => {
    if (!ruleForm) return;
    const parts = raw.split(/[\s,;]+/).map((p) => p.trim().toLowerCase()).filter(Boolean);
    if (parts.length === 0) return;
    const invalid = parts.filter((p) => !EMAIL_RE.test(p));
    if (invalid.length) {
      toast.error(n('invalidEmail', { email: invalid[0] }));
      return;
    }
    const next = [...new Set([...ruleForm.recipient_emails, ...parts])];
    if (next.length > MAX_RECIPIENTS) {
      toast.error(n('tooManyRecipients', { max: MAX_RECIPIENTS }));
      return;
    }
    setRuleForm({ ...ruleForm, recipient_emails: next });
    setEmailDraft('');
  };

  const removeEmail = (email: string) =>
    setRuleForm((f) => (f ? { ...f, recipient_emails: f.recipient_emails.filter((x) => x !== email) } : f));

  const toggleContact = (email: string, checked: boolean) => {
    if (!ruleForm) return;
    const e = email.toLowerCase();
    if (checked && !ruleForm.recipient_emails.includes(e) && ruleForm.recipient_emails.length >= MAX_RECIPIENTS) {
      toast.error(n('tooManyRecipients', { max: MAX_RECIPIENTS }));
      return;
    }
    setRuleForm({
      ...ruleForm,
      recipient_emails: checked ? [...new Set([...ruleForm.recipient_emails, e])] : ruleForm.recipient_emails.filter((x) => x !== e),
    });
  };

  const toggleType = (type: string, checked: boolean) =>
    setRuleForm((f) =>
      f ? { ...f, event_types: checked ? [...f.event_types, type] : f.event_types.filter((x) => x !== type) } : f,
    );

  const editRule = (r: Rule) => {
    setEmailDraft('');
    setPickerSearch('');
    setRuleForm({
      id: r.notification_id,
      name: r.name,
      client_id: r.fk_client_id ? String(r.fk_client_id) : '__all__',
      event_types: r.event_types,
      recipient_emails: r.recipient_emails,
      is_active: r.is_active,
    });
  };

  const saveRule = async () => {
    if (!ruleForm) return;
    // Keep an address typed but not yet confirmed with Enter.
    const pending = emailDraft.trim();
    let recipients = ruleForm.recipient_emails;
    if (pending) {
      if (!EMAIL_RE.test(pending)) return void toast.error(n('invalidEmail', { email: pending }));
      recipients = [...new Set([...recipients, pending.toLowerCase()])];
    }
    if (recipients.length === 0) return void toast.error(n('noRecipients'));

    setSaving(true);
    try {
      const body = {
        name: ruleForm.name,
        client_id: ruleForm.client_id === '__all__' ? null : Number(ruleForm.client_id),
        event_types: ruleForm.event_types,
        recipient_emails: recipients,
        is_active: ruleForm.is_active,
      };
      if (ruleForm.id) await axios.patch(`/api/logbooks/event/email-notifications/${ruleForm.id}`, body);
      else await axios.post('/api/logbooks/event/email-notifications', body);
      toast.success(n('saved'));
      setRuleForm(null);
      setEmailDraft('');
      await load();
    } catch (e) {
      toast.error(errorOf(e));
    } finally {
      setSaving(false);
    }
  };

  const testRule = async (r: Rule) => {
    setBusyId(r.notification_id);
    try {
      const res = await axios.post(`/api/logbooks/event/email-notifications/${r.notification_id}/test`);
      toast.success(n('testSent', { count: res.data.sent_to }));
    } catch (e) {
      toast.error(errorOf(e));
    } finally {
      setBusyId(null);
    }
  };

  // ── Contact helpers ────────────────────────────────────────────────────────

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

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const url =
        deleteTarget.kind === 'rule'
          ? `/api/logbooks/event/email-notifications/${deleteTarget.id}`
          : `/api/logbooks/event/contacts/${deleteTarget.id}`;
      await axios.delete(url);
      toast.success(n('deleted'));
      await load();
    } catch (e) {
      toast.error(errorOf(e));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const filteredContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => [c.name, c.company ?? '', c.email, c.notes ?? ''].join(' ').toLowerCase().includes(q));
  }, [contacts, contactSearch]);

  const filteredRules = useMemo(() => {
    const q = ruleSearch.trim().toLowerCase();
    if (!q) return rules;
    return rules.filter((r) =>
      [r.name, r.client_name ?? t('logbooks.eventLogbook.notifications.allClients'), ...r.recipient_emails, ...r.event_types.map((x) => t(`logbooks.eventLogbook.types.${x}`))]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [rules, ruleSearch, t]);

  const rulePageCount = Math.max(1, Math.ceil(filteredRules.length / PAGE_SIZE));
  const safeRulePage = Math.min(rulePage, rulePageCount - 1);
  const pagedRules = filteredRules.slice(safeRulePage * PAGE_SIZE, (safeRulePage + 1) * PAGE_SIZE);
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

  const pickerContacts = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => [c.name, c.company ?? '', c.email].join(' ').toLowerCase().includes(q));
  }, [contacts, pickerSearch]);

  const spinner = (
    <div className="flex justify-center py-8">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
        <DialogHeader>
          <DialogTitle>{n('title')}</DialogTitle>
          <DialogDescription>{n('description')}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="rules" onValueChange={() => { setRuleForm(null); setContactForm(null); }}>
          <TabsList>
            <TabsTrigger value="rules" className="gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {n('tabRules')}
            </TabsTrigger>
            <TabsTrigger value="contacts" className="gap-1.5">
              <BookUser className="h-3.5 w-3.5" />
              {n('tabContacts')}
            </TabsTrigger>
          </TabsList>

          {/* ── Email notification rules ─────────────────────────────────── */}
          <TabsContent value="rules" className="mt-3">
            {ruleForm ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{n('name')}</Label>
                  <Input className={inputCls} value={ruleForm.name} maxLength={100} onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })} />
                </div>

                <div className="space-y-1.5">
                  <Label>{n('client')}</Label>
                  <Select value={ruleForm.client_id} onValueChange={(v) => setRuleForm({ ...ruleForm, client_id: v })}>
                    <SelectTrigger className={`w-full ${inputCls}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      <SelectItem value="__all__">{n('allClients')}</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.client_id} value={String(c.client_id)}>
                          {c.client_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className={hintCls}>{n('clientHint')}</p>
                </div>

                <div className="space-y-1.5">
                  <Label>{n('eventTypes')}</Label>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {EVENT_TYPES.map((type) => (
                      <label key={type} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={ruleForm.event_types.includes(type)} onCheckedChange={(v) => toggleType(type, v === true)} />
                        {t(`logbooks.eventLogbook.types.${type}`)}
                      </label>
                    ))}
                  </div>
                  <p className={hintCls}>{n('eventTypesHint')}</p>
                </div>

                <div className="space-y-2">
                  <Label>{n('recipients')}</Label>
                  {ruleForm.recipient_emails.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {ruleForm.recipient_emails.map((email) => (
                        <span key={email} className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-800 dark:bg-violet-900/40 dark:text-violet-200">
                          {email}
                          <button type="button" aria-label={n('remove')} onClick={() => removeEmail(email)}>
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      className={inputCls}
                      type="email"
                      value={emailDraft}
                      placeholder={n('emailPlaceholder')}
                      onChange={(e) => setEmailDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          addEmails(emailDraft);
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={() => addEmails(emailDraft)} disabled={!emailDraft.trim()}>
                      <Plus className="mr-1 h-4 w-4" />
                      {n('addEmail')}
                    </Button>
                  </div>

                  <div className="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium">
                      <BookUser className="h-3.5 w-3.5" />
                      {n('fromContacts')}
                    </p>
                    {contacts.length === 0 ? (
                      <p className={hintCls}>{n('noContactsYet')}</p>
                    ) : (
                      <>
                        <Input className={`mb-1.5 h-8 text-xs ${inputCls}`} value={pickerSearch} placeholder={n('searchContacts')} onChange={(e) => setPickerSearch(e.target.value)} />
                        <ul className="max-h-40 space-y-1 overflow-y-auto">
                          {pickerContacts.map((c) => (
                            <li key={c.contact_id}>
                              <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
                                <Checkbox
                                  checked={ruleForm.recipient_emails.includes(c.email.toLowerCase())}
                                  onCheckedChange={(v) => toggleContact(c.email, v === true)}
                                />
                                <span className="min-w-0 flex-1 truncate">
                                  {c.name}
                                  {c.company ? <span className={hintCls}> · {c.company}</span> : null}
                                  <span className={hintCls}> · {c.email}</span>
                                </span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={ruleForm.is_active} onCheckedChange={(v) => setRuleForm({ ...ruleForm, is_active: v })} />
                  {n('active')}
                </label>

                <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                  <Button variant="outline" onClick={() => setRuleForm(null)} disabled={saving}>
                    {n('cancel')}
                  </Button>
                  <Button
                    className="bg-violet-600 text-white hover:bg-violet-700"
                    disabled={saving || !ruleForm.name.trim() || (ruleForm.recipient_emails.length === 0 && !emailDraft.trim())}
                    onClick={saveRule}
                  >
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
                    <Input
                      className={`h-8 pl-8 text-xs ${inputCls}`}
                      value={ruleSearch}
                      placeholder={n('searchRules')}
                      onChange={(e) => {
                        setRuleSearch(e.target.value);
                        setRulePage(0);
                      }}
                    />
                  </div>
                  <Button size="sm" className="bg-violet-600 text-white hover:bg-violet-700" onClick={() => { setEmailDraft(''); setRuleForm(EMPTY_RULE); }}>
                    <Plus className="mr-1 h-4 w-4" />
                    {n('addRule')}
                  </Button>
                </div>
                <div className={LIST_CLS}>
                {loading ? (
                  spinner
                ) : filteredRules.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">{rules.length === 0 ? n('noRules') : n('noRuleMatches')}</p>
                ) : (
                  <ul className="space-y-1.5">
                    {pagedRules.map((r) => (
                      <li key={r.notification_id} className="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 flex-1 text-left">
                            <p className="flex items-center gap-2 text-sm font-medium">
                              {r.name}
                              <span
                                className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                                  r.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {r.is_active ? n('active') : n('inactive')}
                              </span>
                            </p>
                            <p className={`truncate ${hintCls}`}>
                              {r.client_name ?? n('allClients')}
                              {' · '}
                              {r.event_types.length > 0 ? r.event_types.map((x) => t(`logbooks.eventLogbook.types.${x}`)).join(', ') : n('allTypes')}
                            </p>
                            <p className={`truncate ${hintCls}`} title={r.recipient_emails.join(', ')}>
                              {r.recipient_emails.join(', ')}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" title={n('edit')} aria-label={n('edit')} onClick={() => editRule(r)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" title={n('sendTest')} aria-label={n('sendTest')} disabled={busyId === r.notification_id} onClick={() => testRule(r)}>
                              {busyId === r.notification_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                            <Button size="icon" variant="ghost" title={n('delete')} aria-label={n('delete')} onClick={() => setDeleteTarget({ kind: 'rule', id: r.notification_id, name: r.name })}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                </div>
                {pager(safeRulePage, rulePageCount, filteredRules.length, setRulePage)}
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
                  <div className="relative max-w-xs flex-1">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <Input className={`h-8 pl-8 text-xs ${inputCls}`} value={contactSearch} placeholder={n('searchContacts')} onChange={(e) => { setContactSearch(e.target.value); setContactPage(0); }} />
                  </div>
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
                          {c.notes && <p className={`truncate ${hintCls}`} title={c.notes}>{c.notes}</p>}
                        </div>
                        <div className="flex gap-1">
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
              <AlertDialogTitle>{deleteTarget?.kind === 'contact' ? n('deleteContactTitle') : n('deleteRuleTitle')}</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
                {deleteTarget?.kind === 'contact' ? n('deleteContactDescription', { name: deleteTarget.name }) : n('deleteRuleDescription', { name: deleteTarget?.name ?? '' })}
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
