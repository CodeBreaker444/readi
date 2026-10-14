'use client'

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { BtfPlace, BtfSystem } from '@/lib/btf/types'
import { Check, ChevronDown, Crosshair, MapPin, Server, TriangleAlert, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  systems: BtfSystem[]
  systemId: number | null
  place: BtfPlace | null
  onSelectSystem: (s: BtfSystem) => void
  onChooseMap: () => void
  onLocate: () => void
  onClear: () => void
  isDark: boolean
}

/** Picks where the forecast is fetched: a system (its own location) or any point on the map. */
export function BtfLocationSelect({ systems, systemId, place, onSelectSystem, onChooseMap, onLocate, onClear, isDark }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const system = systems.find((s) => s.toolId === systemId) ?? null

  const muted = isDark ? 'text-slate-500' : 'text-slate-400'
  const coords = place ? `${place.latitude.toFixed(2)}, ${place.longitude.toFixed(2)}` : ''

  return (
    <div className={`flex h-9 w-[290px] items-center rounded-lg border ${isDark ? 'border-slate-600 bg-slate-700/40' : 'border-slate-200 bg-white'}`}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-2 px-2.5 text-left">
            {system ? <Server size={14} className="shrink-0 text-violet-500" /> : <MapPin size={14} className={`shrink-0 ${muted}`} />}
            <span className={`min-w-0 flex-1 truncate text-[13px] ${place || system ? (isDark ? 'text-slate-100' : 'text-slate-800') : muted}`}>
              {system && <span className="font-semibold">{system.name} · </span>}
              {place ? `${place.name} - ${coords}` : system ? t('operations.calendar.btf.noLocationShort') : t('operations.calendar.btf.pickLocationTitle')}
            </span>
            <ChevronDown size={13} className={`shrink-0 ${muted}`} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[340px] p-0">
          <Command>
            <CommandInput placeholder={t('operations.calendar.btf.searchSystems')} />
            <CommandList className="max-h-72">
              <CommandEmpty>{t('operations.calendar.btf.noSystemsMatch')}</CommandEmpty>
              <CommandGroup heading={t('operations.calendar.btf.systems')}>
                {systems.map((s) => (
                  <CommandItem
                    key={s.toolId}
                    value={`${s.name} ${s.code} ${s.location?.name ?? ''}`}
                    onSelect={() => {
                      setOpen(false)
                      onSelectSystem(s)
                    }}
                    className="flex items-center gap-2"
                  >
                    <Server size={14} className="shrink-0 opacity-60" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold">{s.name}</span>
                      {s.location ? (
                        <span className="block truncate text-[11px] opacity-60">
                          {s.location.name ? `${s.location.name} · ` : ''}
                          {s.location.latitude.toFixed(2)}, {s.location.longitude.toFixed(2)}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] text-amber-500">
                          <TriangleAlert size={11} /> {t('operations.calendar.btf.systemNoLocationHint')}
                        </span>
                      )}
                    </span>
                    {s.toolId === systemId && <Check size={14} className="shrink-0 text-violet-500" />}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  value="__map__ choose location on map"
                  onSelect={() => {
                    setOpen(false)
                    onChooseMap()
                  }}
                  className="flex items-center gap-2"
                >
                  <MapPin size={14} className="shrink-0 text-violet-500" />
                  <span className="text-xs font-semibold">{t('operations.calendar.btf.chooseOnMap')}</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {(place || system) && (
        <button
          type="button"
          onClick={onClear}
          title={t('operations.calendar.btf.clearLocation')}
          aria-label={t('operations.calendar.btf.clearLocation')}
          className={`flex h-full w-8 shrink-0 cursor-pointer items-center justify-center border-l transition-colors ${
            isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-100' : 'border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-700'
          }`}
        >
          <X size={14} />
        </button>
      )}
      <button
        type="button"
        onClick={onLocate}
        title={t('operations.calendar.btf.useMyLocation')}
        aria-label={t('operations.calendar.btf.useMyLocation')}
        className={`flex h-full w-9 shrink-0 cursor-pointer items-center justify-center rounded-r-lg border-l text-violet-500 transition-colors hover:bg-violet-500/10 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
      >
        <Crosshair size={15} />
      </button>
    </div>
  )
}
