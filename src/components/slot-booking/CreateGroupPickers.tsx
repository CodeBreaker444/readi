'use client';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { PilotGroup, SlotClient } from '@/config/types/slot-booking';
import { cn } from '@/lib/utils';
import { Check, Search, Star, Users, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Avatar } from './Avatar';
import { heading, inputCls, muted, useSlotI18n } from './ui';

const rowTone = (isDark: boolean, on: boolean) =>
  on
    ? 'border-violet-500 bg-violet-500/10'
    : isDark
      ? 'border-white/[0.1] hover:bg-white/[0.05]'
      : 'border-gray-200 hover:bg-gray-50';

function SearchBox({ isDark, value, onChange, placeholder }: { isDark: boolean; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search size={14} className={cn('absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none', muted(isDark))} />
      <input className={cn(inputCls(isDark), 'pl-8 pr-8')} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {value && (
        <button type="button" onClick={() => onChange('')} className={cn('absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer', muted(isDark))}>
          <X size={14} />
        </button>
      )}
    </div>
  );
}

/** Required single choice: searchable, scrollable list of clients. */
export function ClientPicker({
  isDark,
  clients,
  value,
  onChange,
  showError,
}: {
  isDark: boolean;
  clients: SlotClient[];
  value: string;
  onChange: (id: string) => void;
  showError?: boolean;
}) {
  const { t } = useSlotI18n();
  const [q, setQ] = useState('');
  const shown = useMemo(() => clients.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase())), [clients, q]);

  return (
    <div className="space-y-2">
      <SearchBox isDark={isDark} value={q} onChange={setQ} placeholder={t('slotBooking.create.searchClient')} />
      <div
        className={cn(
          'max-h-40 overflow-y-auto rounded-lg border p-1.5 space-y-1',
          showError && !value ? 'border-red-400' : isDark ? 'border-white/[0.1]' : 'border-gray-200',
        )}
      >
        {shown.length === 0 ? (
          <p className={cn('text-xs text-center py-3', muted(isDark))}>{t('slotBooking.create.noClientMatch')}</p>
        ) : (
          shown.map((c) => {
            const on = String(c.id) === value;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onChange(String(c.id))}
                className={cn('cursor-pointer w-full flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-xs text-left transition-colors', rowTone(isDark, on), heading(isDark))}
              >
                <span className="truncate">{c.name}</span>
                {on && <Check size={14} className="text-violet-500 shrink-0" />}
              </button>
            );
          })
        )}
      </div>
      {showError && !value && <p className="text-[11px] text-red-500">{t('slotBooking.create.clientRequired')}</p>}
    </div>
  );
}

function MembersCard({ g, isDark }: { g: PilotGroup; isDark: boolean }) {
  const { t } = useSlotI18n();
  return (
    <div className="w-64 text-left">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-xs font-semibold truncate">{g.name}</span>
        <span className="text-[10px] opacity-70 shrink-0">{t('slotBooking.create.memberCount', { count: g.memberCount })}</span>
      </div>
      {g.description && <p className="text-[11px] opacity-70 mb-1.5 line-clamp-2">{g.description}</p>}
      {g.members.length === 0 ? (
        <p className="text-[11px] opacity-70">{t('slotBooking.create.noMembers')}</p>
      ) : (
        <ul className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
          {g.members.map((m) => (
            <li key={m.userId} className="flex items-center gap-2">
              <Avatar person={m} size={24} />
              <div className="min-w-0">
                <p className="text-[11px] font-medium truncate">{m.name}</p>
                {(m.email || m.role) && <p className="text-[10px] opacity-70 truncate">{[m.role, m.email].filter(Boolean).join(' · ')}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Multi choice of pilot groups: searchable, scrollable cards that reveal their members on hover. */
export function AudiencePicker({
  isDark,
  groups,
  value,
  onChange,
}: {
  isDark: boolean;
  groups: PilotGroup[];
  value: number[];
  onChange: (ids: number[]) => void;
}) {
  const { t } = useSlotI18n();
  const [q, setQ] = useState('');
  const shown = useMemo(() => groups.filter((g) => g.name.toLowerCase().includes(q.trim().toLowerCase())), [groups, q]);
  const toggle = (id: number) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SearchBox isDark={isDark} value={q} onChange={setQ} placeholder={t('slotBooking.create.searchGroups')} />
          </div>
          {value.length > 0 && (
            <button type="button" onClick={() => onChange([])} className="cursor-pointer text-xs text-violet-500 hover:underline shrink-0">
              {t('slotBooking.create.clearSelection', { count: value.length })}
            </button>
          )}
        </div>
        <div className={cn('max-h-56 overflow-y-auto rounded-lg border p-1.5', isDark ? 'border-white/[0.1]' : 'border-gray-200')}>
          {shown.length === 0 ? (
            <p className={cn('text-xs text-center py-3', muted(isDark))}>{t('slotBooking.create.noGroupMatch')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {shown.map((g) => {
                const on = value.includes(g.id);
                return (
                  <Tooltip key={g.id}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => toggle(g.id)}
                        className={cn('cursor-pointer flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors', rowTone(isDark, on))}
                      >
                        <span
                          className={cn(
                            'h-4 w-4 shrink-0 rounded border flex items-center justify-center',
                            on ? 'bg-violet-600 border-violet-600 text-white' : isDark ? 'border-white/30' : 'border-gray-300',
                          )}
                        >
                          {on && <Check size={11} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn('flex items-center gap-1 text-xs font-medium', heading(isDark))}>
                            <span className="truncate">{g.name}</span>
                            {g.isExpert && <Star size={11} className="text-amber-500 fill-amber-500 shrink-0" />}
                          </span>
                          <span className={cn('flex items-center gap-1 text-[11px]', muted(isDark))}>
                            <Users size={11} /> {t('slotBooking.create.memberCount', { count: g.memberCount })}
                          </span>
                        </span>
                        <span className="flex -space-x-1.5 shrink-0">
                          {g.members.slice(0, 3).map((m) => (
                            <span key={m.userId} className={cn('rounded-full ring-2', isDark ? 'ring-[#16161d]' : 'ring-white')}>
                              <Avatar person={m} size={20} />
                            </span>
                          ))}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="p-3">
                      <MembersCard g={g} isDark={isDark} />
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
