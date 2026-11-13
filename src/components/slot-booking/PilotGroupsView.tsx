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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { PilotGroup, PilotGroupCandidate } from '@/config/types/slot-booking';
import {
  PILOT_GROUP_DESC_MAX,
  PILOT_GROUP_MEMBERS_MAX,
  PILOT_GROUP_NAME_MAX,
  pilotGroupSchema,
} from '@/lib/pilot-group-validation';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { Check, Plus, Trash2, UsersRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { apiMsg, Btn, card, dialogSurface, EmptyBlock, ErrorBlock, heading, inputCls, LoadingBlock, muted, Pill, SearchBox } from './ui';

const BASE = '/api/operation/slot-booking/pilot-groups';
const EXAMPLES = ['Experts', 'Newbies', 'External'];

type FieldErrors = { name?: string; description?: string; members?: string };
const AVATAR_TONES = [
  'bg-violet-500/15 text-violet-600',
  'bg-sky-500/15 text-sky-600',
  'bg-emerald-500/15 text-emerald-600',
  'bg-amber-500/15 text-amber-600',
  'bg-rose-500/15 text-rose-600',
  'bg-indigo-500/15 text-indigo-600',
];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('') || '?';

function Avatar({ person, size = 28 }: { person: { userId: number; name: string; avatarUrl?: string | null }; size?: number }) {
  const [failed, setFailed] = useState(false);
  // A new URL (e.g. after a refresh) deserves a new attempt.
  useEffect(() => setFailed(false), [person.avatarUrl]);

  if (person.avatarUrl && !failed) {
    return (
      <img
        src={person.avatarUrl}
        alt={person.name}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full object-cover"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size }}
      className={cn('shrink-0 rounded-full inline-flex items-center justify-center text-[10px] font-semibold', AVATAR_TONES[person.userId % AVATAR_TONES.length])}
    >
      {initials(person.name)}
    </span>
  );
}

/** Fixed-height slot under a field so showing/hiding a message never changes the modal's height. */
function FieldError({ message }: { message?: string }) {
  return <p className="h-4 text-[11px] leading-4 font-light text-red-500 truncate">{message ?? ''}</p>;
}

function MemberPicker({
  isDark,
  candidates,
  selected,
  onToggle,
  onSetMany,
}: {
  isDark: boolean;
  candidates: PilotGroupCandidate[];
  selected: Set<number>;
  onToggle: (id: number) => void;
  onSetMany: (ids: number[], on: boolean) => void;
}) {
  const { t } = useTranslation();
  const [q, setQ] = useState('');

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return candidates;
    return candidates.filter((c) => [c.name, c.email ?? '', c.role ?? ''].some((v) => v.toLowerCase().includes(s)));
  }, [candidates, q]);

  const allVisibleOn = visible.length > 0 && visible.every((c) => selected.has(c.userId));
  const line = isDark ? 'border-white/[0.06]' : 'border-gray-100';

  // Always rendered inline (no floating panel) so every user can be reached by scrolling the list or the dialog.
  return (
    <div className={cn('rounded-lg border overflow-hidden', isDark ? 'border-white/[0.1]' : 'border-gray-200')}>
      <div className={cn('p-2 border-b', line)}>
        <SearchBox isDark={isDark} value={q} onChange={setQ} placeholder={t('slotBooking.pilotGroups.searchUsers')} />
      </div>
      <div className={cn('flex items-center justify-between px-3 py-1.5 text-[11px] border-b', muted(isDark), line)}>
        <span>
          {t('slotBooking.pilotGroups.selected', { count: selected.size })} · {t('slotBooking.pilotGroups.usersCount', { count: visible.length })}
        </span>
        {visible.length > 0 && (
          <button
            type="button"
            className="cursor-pointer text-violet-500 hover:text-violet-600 font-medium"
            onClick={() => onSetMany(visible.map((v) => v.userId), !allVisibleOn)}
          >
            {allVisibleOn ? t('slotBooking.pilotGroups.clearVisible') : t('slotBooking.pilotGroups.selectVisible')}
          </button>
        )}
      </div>
      <div className={cn('h-56 overflow-y-auto divide-y', isDark ? 'divide-white/[0.05]' : 'divide-gray-100')}>
        {visible.length === 0 ? (
          <p className={cn('h-full flex items-center justify-center text-xs', muted(isDark))}>{t('slotBooking.pilotGroups.noUsers')}</p>
        ) : (
          visible.map((c) => {
            const on = selected.has(c.userId);
            return (
              <button
                key={c.userId}
                type="button"
                aria-pressed={on}
                onClick={() => onToggle(c.userId)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-left cursor-pointer transition-colors',
                  on ? (isDark ? 'bg-violet-500/10' : 'bg-violet-50') : isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-gray-50',
                )}
              >
                <Avatar person={c} />
                <span className="min-w-0 flex-1">
                  <span className={cn('block text-xs font-medium truncate', heading(isDark))}>{c.name}</span>
                  <span className={cn('block text-[11px] font-light truncate', muted(isDark))}>{c.email ?? t('slotBooking.pilotGroups.noEmail')}</span>
                </span>
                {c.role && <Pill isDark={isDark} tone="violet">{c.role}</Pill>}
                <span
                  className={cn(
                    'shrink-0 w-4 h-4 rounded border inline-flex items-center justify-center',
                    on ? 'bg-violet-600 border-violet-600 text-white' : isDark ? 'border-white/[0.2]' : 'border-gray-300',
                  )}
                >
                  {on && <Check size={11} strokeWidth={3} />}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function GroupFormDialog({
  open,
  onOpenChange,
  isDark,
  editing,
  presetName,
  groups,
  candidates,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  isDark: boolean;
  editing: PilotGroup | null;
  presetName: string;
  groups: PilotGroup[];
  candidates: PilotGroupCandidate[];
  onSaved: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? presetName);
    setDescription(editing?.description ?? '');
    setSelected(new Set(editing?.members.map((m) => m.userId) ?? []));
    setErrors({});
  }, [open, editing, presetName]);

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const setMany = (ids: number[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
      return next;
    });

  const validate = (): boolean => {
    const out: FieldErrors = {};
    const parsed = pilotGroupSchema.safeParse({ name, description, memberIds: [...selected] });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      if (f.name?.[0]) {
        out.name = name.trim() ? t('slotBooking.pilotGroups.errors.nameInvalid', { max: PILOT_GROUP_NAME_MAX }) : t('slotBooking.pilotGroups.errors.nameRequired');
      }
      if (f.description?.[0]) out.description = t('slotBooking.pilotGroups.errors.descTooLong', { max: PILOT_GROUP_DESC_MAX });
      if (f.memberIds?.[0]) out.members = t('slotBooking.pilotGroups.errors.tooManyMembers', { max: PILOT_GROUP_MEMBERS_MAX });
    }
    setErrors(out);
    return Object.keys(out).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    const body = { name: name.trim(), description: description.trim(), memberIds: [...selected] };
    // Duplicate names are reported as a toast after the click, not by disabling the button.
    if (groups.some((g) => g.id !== editing?.id && g.name.trim().toLowerCase() === body.name.toLowerCase())) {
      toast.error(t('slotBooking.pilotGroups.errors.nameTaken'));
      return;
    }
    setBusy(true);
    try {
      if (editing) await axios.put(`${BASE}/${editing.id}`, body);
      else await axios.post(BASE, body);
      toast.success(t(editing ? 'slotBooking.pilotGroups.updated' : 'slotBooking.pilotGroups.created', { name: body.name }));
      onOpenChange(false);
      await onSaved();
    } catch (e) {
      toast.error(
        axios.isAxiosError(e) && e.response?.status === 409
          ? t('slotBooking.pilotGroups.errors.nameTaken')
          : apiMsg(e, t('slotBooking.pilotGroups.errors.save')),
      );
    } finally {
      setBusy(false);
    }
  };

  const label = cn('block text-xs font-medium mb-1', heading(isDark));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <DialogContent className={cn('sm:max-w-2xl max-h-[92vh] overflow-y-auto p-6 sm:p-8', dialogSurface(isDark))}>
        <DialogHeader>
          <DialogTitle>{t(editing ? 'slotBooking.pilotGroups.editTitle' : 'slotBooking.pilotGroups.createTitle')}</DialogTitle>
          <DialogDescription>{t('slotBooking.pilotGroups.formHint')}</DialogDescription>
        </DialogHeader>

        <div>
          <div>
            <label className={label} htmlFor="pg-name">{t('slotBooking.pilotGroups.name')} *</label>
            <input
              id="pg-name"
              className={cn(inputCls(isDark), errors.name && 'border-red-400')}
              value={name}
              maxLength={PILOT_GROUP_NAME_MAX}
              placeholder={t('slotBooking.pilotGroups.namePlaceholder')}
              onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((x) => ({ ...x, name: undefined })); }}
              aria-invalid={!!errors.name}
            />
            <FieldError message={errors.name} />
          </div>

          <div>
            <label className={label} htmlFor="pg-desc">{t('slotBooking.pilotGroups.description')}</label>
            <input
              id="pg-desc"
              className={cn(inputCls(isDark), errors.description && 'border-red-400')}
              value={description}
              maxLength={PILOT_GROUP_DESC_MAX}
              placeholder={t('slotBooking.pilotGroups.descPlaceholder')}
              onChange={(e) => { setDescription(e.target.value); if (errors.description) setErrors((x) => ({ ...x, description: undefined })); }}
            />
            <FieldError message={errors.description} />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className={label}>{t('slotBooking.pilotGroups.members')}</span>
              <span className={cn('text-[11px] mb-1', muted(isDark))}>{t('slotBooking.pilotGroups.companyUsers', { count: candidates.length })}</span>
            </div>
            <MemberPicker isDark={isDark} candidates={candidates} selected={selected} onToggle={toggle} onSetMany={setMany} />
            <FieldError message={errors.members} />
          </div>
        </div>

        <DialogFooter>
          <Btn isDark={isDark} onClick={() => onOpenChange(false)} disabled={busy}>{t('slotBooking.common.cancel')}</Btn>
          <Btn isDark={isDark} variant="primary" onClick={submit} loading={busy}>
            {t(editing ? 'slotBooking.pilotGroups.save' : 'slotBooking.pilotGroups.create')}
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({ isDark, onCreate }: { isDark: boolean; onCreate: (preset?: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className={cn('rounded-xl border border-dashed px-6 py-12 flex flex-col items-center text-center', isDark ? 'border-white/[0.1]' : 'border-gray-300')}>
      <span className={cn('w-12 h-12 rounded-full inline-flex items-center justify-center mb-4', isDark ? 'bg-violet-500/15 text-violet-300' : 'bg-violet-50 text-violet-600')}>
        <UsersRound size={22} />
      </span>
      <h3 className={cn('text-sm font-semibold', heading(isDark))}>{t('slotBooking.pilotGroups.emptyTitle')}</h3>
      <p className={cn('mt-1 max-w-md text-xs', muted(isDark))}>{t('slotBooking.pilotGroups.emptyBody')}</p>
      <Btn isDark={isDark} variant="primary" className="mt-4" onClick={() => onCreate()}>
        <Plus size={13} /> {t('slotBooking.pilotGroups.emptyCta')}
      </Btn>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
        <span className={cn('text-[11px] mr-1', muted(isDark))}>{t('slotBooking.pilotGroups.emptyTry')}</span>
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" onClick={() => onCreate(ex)} className="cursor-pointer">
            <Pill isDark={isDark} tone="violet">{ex}</Pill>
          </button>
        ))}
      </div>
    </div>
  );
}

export function PilotGroupsView({ isDark }: { isDark: boolean }) {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<PilotGroup[] | null>(null);
  const [candidates, setCandidates] = useState<PilotGroupCandidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PilotGroup | null>(null);
  const [preset, setPreset] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<PilotGroup | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [g, c] = await Promise.all([axios.get(BASE), axios.get(`${BASE}/candidates`)]);
      setGroups(g.data.data);
      setCandidates(c.data.data);
      setError(null);
    } catch (e) {
      setError(apiMsg(e, t('slotBooking.pilotGroups.errors.load')));
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = (presetName = '') => {
    setEditing(null);
    setPreset(presetName);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axios.delete(`${BASE}/${deleteTarget.id}`);
      toast.success(t('slotBooking.pilotGroups.deleted', { name: deleteTarget.name }));
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error(apiMsg(e, t('slotBooking.pilotGroups.errors.delete')));
    } finally {
      setDeleting(false);
    }
  };

  if (error) return <ErrorBlock isDark={isDark} message={error} onRetry={load} />;
  if (!groups) return <LoadingBlock isDark={isDark} />;

  const q = search.trim().toLowerCase();
  const filtered = q
    ? groups.filter((g) => g.name.toLowerCase().includes(q) || g.members.some((m) => m.name.toLowerCase().includes(q) || (m.email ?? '').toLowerCase().includes(q)))
    : groups;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <SearchBox isDark={isDark} value={search} onChange={setSearch} placeholder={t('slotBooking.pilotGroups.search')} className="w-full max-w-sm" />
        <Btn isDark={isDark} variant="primary" onClick={() => openCreate()}>
          <Plus size={13} /> {t('slotBooking.pilotGroups.new')}
        </Btn>
      </div>

      {groups.length === 0 ? (
        <EmptyState isDark={isDark} onCreate={openCreate} />
      ) : filtered.length === 0 ? (
        <EmptyBlock isDark={isDark}>{t('slotBooking.pilotGroups.noMatch')}</EmptyBlock>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((g) => {
            const roles = [...g.members.reduce((m, x) => m.set(x.role ?? '-', (m.get(x.role ?? '-') ?? 0) + 1), new Map<string, number>())];
            return (
              <div key={g.id} className={cn('rounded-xl border p-4 flex flex-col gap-3', card(isDark))}>
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={cn('text-sm font-semibold truncate', heading(isDark))}>{g.name}</h3>
                    <button
                      type="button"
                      title={t('slotBooking.pilotGroups.delete')}
                      className="cursor-pointer text-gray-400 hover:text-red-500"
                      onClick={() => setDeleteTarget(g)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className={cn('text-xs mt-0.5 line-clamp-2 min-h-8', muted(isDark))}>{g.description || t('slotBooking.pilotGroups.noDescription')}</p>
                </div>

                <div className="flex flex-wrap gap-1.5 min-h-5">
                  {roles.length === 0 ? (
                    <Pill isDark={isDark}>{t('slotBooking.pilotGroups.noMembers')}</Pill>
                  ) : (
                    roles.map(([role, n]) => <Pill key={role} isDark={isDark} tone="violet">{role} · {n}</Pill>)
                  )}
                </div>

                <div className="flex items-center min-h-8">
                  <div className="flex -space-x-2">
                    {g.members.slice(0, 6).map((m) => (
                      <span key={m.userId} title={m.name} className={cn('rounded-full ring-2', isDark ? 'ring-[#0f1320]' : 'ring-white')}>
                        <Avatar person={m} size={28} />
                      </span>
                    ))}
                  </div>
                  {g.members.length > 6 && <span className={cn('ml-2 text-[11px]', muted(isDark))}>+{g.members.length - 6}</span>}
                </div>

                <div className={cn('text-[11px] min-h-4', muted(isDark))}>
                  {g.createdByName ? t('slotBooking.pilotGroups.createdBy', { name: g.createdByName }) : ''}
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  {[
                    [t('slotBooking.pilotGroups.members'), g.memberCount],
                    [t('slotBooking.pilotGroups.rolesLabel'), roles.length],
                  ].map(([l, v]) => (
                    <div key={l} className={cn('rounded-lg py-2', isDark ? 'bg-white/[0.04]' : 'bg-gray-50')}>
                      <div className={cn('text-base font-semibold', heading(isDark))}>{v}</div>
                      <div className={cn('text-[10px]', muted(isDark))}>{l}</div>
                    </div>
                  ))}
                </div>

                <Btn isDark={isDark} variant="primary" className="mt-auto" onClick={() => { setEditing(g); setPreset(''); setFormOpen(true); }}>
                  {t('slotBooking.pilotGroups.edit')}
                </Btn>
              </div>
            );
          })}
        </div>
      )}

      <GroupFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        isDark={isDark}
        editing={editing}
        presetName={preset}
        groups={groups}
        candidates={candidates}
        onSaved={load}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o && !deleting) setDeleteTarget(null); }}>
        <AlertDialogContent className={isDark ? 'bg-[#0f1320] border-white/[0.08] text-white' : ''}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('slotBooking.pilotGroups.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('slotBooking.pilotGroups.deleteBody', { name: deleteTarget?.name })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('slotBooking.common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleting}
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
            >
              {deleting ? t('slotBooking.pilotGroups.deleting') : t('slotBooking.pilotGroups.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
