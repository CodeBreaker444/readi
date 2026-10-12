'use client'

import LocationPicker from '@/components/system/LocationPicker'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { compareWindows, MARGINAL_BELOW, mergeLimits, scoreForecast, summariseWindow, type FlightLimits, type WindowSummary } from '@/lib/btf/scoring'
import { loadBtfFleet, loadBtfForecast } from '@/lib/btf/client'
import { groupSystems } from '@/lib/btf/systems'
import type { BtfDrone, BtfForecast, BtfPlace, BtfSystem } from '@/lib/btf/types'
import axios from 'axios'
import { Check, ChevronDown, Lock, MapPin, Plane, Settings2, Star, TriangleAlert, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BtfGrid, type GridCell, type MetricView } from './BtfGrid'
import { BtfLocationSelect } from './BtfLocationSelect'
import { BtfLimitsDialog } from './BtfLimitsDialog'
import { currentHourKey, dayOf, hourOf, pad2, timeZoneAbbr } from './btf-utils'

const WINDOWS = [1, 2, 3, 4]
const VIEWS: MetricView[] = ['overall', 'wind', 'gust', 'rain']
/** The grid covers daylight working hours; the night is still scored but not shown. */
const DAY_START = 6
const DAY_END = 22
const INLINE_CHIPS = 4

/** Best-effort place name for a point; falls back to the coordinates. */
async function nameForPoint(lat: number, lon: number): Promise<string> {
  const coords = `${lat.toFixed(3)}, ${lon.toFixed(3)}`
  try {
    const res = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: { format: 'jsonv2', lat, lon, zoom: 10 },
      timeout: 4000,
    })
    const a = res.data?.address ?? {}
    return a.city || a.town || a.village || a.municipality || a.county || res.data?.name || coords
  } catch {
    return coords
  }
}

export function BestTimeToFly({ isDark }: { isDark: boolean }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language || 'en'

  // Where the forecast comes from: a system's own location, or a point picked by the user.
  const [systemId, setSystemId] = useState<number | null>(null)
  const [custom, setCustom] = useState<BtfPlace | null>(null)
  const [picker, setPicker] = useState<{ open: boolean; systemId: number | null }>({ open: false, systemId: null })

  const [fleet, setFleet] = useState<BtfDrone[]>([])
  const [fleetLoading, setFleetLoading] = useState(true)
  const [forecast, setForecast] = useState<BtfForecast | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  const [selectedIds, setSelectedIds] = useState<number[]>([]) // drone component ids; empty = whole fleet
  const [windowHours, setWindowHours] = useState(2)
  const [view, setView] = useState<MetricView>('overall')
  const [editing, setEditing] = useState<BtfDrone | null>(null)
  const requestId = useRef(0)

  const systems = useMemo(() => groupSystems(fleet), [fleet])

  // Fleet first. Nothing is located by default (the user chooses a system or a point) and
  // "All fleet types" starts selected, so every drone counts until the user narrows it down.
  useEffect(() => {
    let cancelled = false
    loadBtfFleet(true)
      .then((f) => {
        if (cancelled) return
        setFleet(f)
      })
      .catch(() => !cancelled && setFleet([]))
      .finally(() => !cancelled && setFleetLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  // A picked point wins; otherwise the selected system's own location.
  const place = useMemo<BtfPlace | null>(() => {
    if (custom) return custom
    const sys = systems.find((x) => x.toolId === systemId)
    return sys?.location
      ? { name: sys.location.name ?? sys.name, region: null, country: null, latitude: sys.location.latitude, longitude: sys.location.longitude }
      : null
  }, [custom, systems, systemId])

  const lat = place?.latitude
  const lon = place?.longitude
  const loadForecast = () => {
    const id = ++requestId.current
    if (lat === undefined || lon === undefined) {
      setForecast(null)
      return
    }
    setLoading(true)
    setFailed(false)
    loadBtfForecast(lat, lon, 7)
      .then((f) => id === requestId.current && setForecast(f))
      .catch(() => id === requestId.current && setFailed(true))
      .finally(() => id === requestId.current && setLoading(false))
  }
  useEffect(loadForecast, [lat, lon])

  const selectSystem = (sys: BtfSystem) => {
    setSystemId(sys.toolId)
    setSelectedIds(sys.droneIds)
    setCustom(null)
    // No location on the system: the user has to pick one.
    if (!sys.location) setPicker({ open: true, systemId: sys.toolId })
  }

  const applyPlace = (p: BtfPlace) => {
    setCustom(p)
    setSystemId(picker.systemId)
    setPicker({ open: false, systemId: null })
  }

  // Back to "no location": the user can then pick a single system's location again.
  const clearLocation = () => {
    setCustom(null)
    setSystemId(null)
  }

  const locate = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const latitude = Number(pos.coords.latitude.toFixed(4))
      const longitude = Number(pos.coords.longitude.toFixed(4))
      setCustom({ name: await nameForPoint(latitude, longitude), region: null, country: null, latitude, longitude })
      setSystemId(null)
    })
  }

  // ── Scoring (client side so filters respond instantly) ─────────────────────
  // A system that supplies its own location locks the drone choice to that system. Only a point
  // picked on the map is a neutral place where drones of several systems can be compared.
  const lockedSystem = useMemo(
    () => (systemId !== null && !custom ? (systems.find((x) => x.toolId === systemId && x.location) ?? null) : null),
    [systems, systemId, custom],
  )
  const scopeFleet = useMemo(() => (lockedSystem ? fleet.filter((d) => d.toolId === lockedSystem.toolId) : fleet), [fleet, lockedSystem])
  const activeDrones = useMemo(
    () => (selectedIds.length ? scopeFleet.filter((d) => selectedIds.includes(d.componentId)) : scopeFleet),
    [scopeFleet, selectedIds],
  )
  const limits: FlightLimits | null = useMemo(
    () => (activeDrones.length ? mergeLimits(activeDrones.map((d) => d.limits)) : null),
    [activeDrones],
  )
  const scores = useMemo(() => (forecast && limits ? scoreForecast(forecast.hours, limits) : []), [forecast, limits])
  const nowKey = useMemo(() => (forecast ? currentHourKey(forecast.timezone) : ''), [forecast])

  // ── Grid: days x windows, each window rolled up from its hours ─────────────
  const grid = useMemo(() => {
    if (!forecast || !scores.length) return null

    const hourIndex = new Map<string, number[]>() // day -> hour -> index into forecast.hours
    forecast.hours.forEach((h, i) => {
      const day = dayOf(h.time)
      let arr = hourIndex.get(day)
      if (!arr) hourIndex.set(day, (arr = []))
      arr[hourOf(h.time)] = i
    })

    const days = [...hourIndex.keys()]
    const starts: number[] = []
    for (let h = DAY_START; h + windowHours <= DAY_END; h += windowHours) starts.push(h)

    const cells = new Map<string, GridCell>()
    let bestKey: string | null = null
    let bestSummary: WindowSummary | null = null

    for (const day of days) {
      const byHour = hourIndex.get(day)!
      for (const start of starts) {
        const idx: number[] = []
        for (let k = 0; k < windowHours; k++) {
          const i = byHour[start + k]
          if (i === undefined) break
          idx.push(i)
        }
        if (idx.length !== windowHours) continue

        const summary = summariseWindow(idx.map((i) => forecast.hours[i]), idx.map((i) => scores[i]))
        const endHour = start + windowHours
        const past = nowKey !== '' && `${day}T${pad2(endHour)}:00` <= nowKey
        const key = `${day}|${start}`
        cells.set(key, { key, startHour: start, endHour, summary, past })

        if (!past && summary.status !== 'nogo' && (!bestSummary || compareWindows(summary, bestSummary) < 0)) {
          bestKey = key
          bestSummary = summary
        }
      }
    }
    return { days, starts, cells, bestKey }
  }, [forecast, scores, windowHours, nowKey])

  // One chip per system: choosing it selects all of its drones.
  const toggleSystem = (toolId: number) => {
    const sys = systems.find((x) => x.toolId === toolId)
    if (!sys) return
    if (lockedSystem && sys.toolId !== lockedSystem.toolId) return

    const allOn = sys.droneIds.every((id) => selectedIds.includes(id))

    // Clicking the chosen system again deselects it. If it was supplying the location, that
    // location goes with it, which unlocks the other systems.
    if (allOn) {
      if (systemId === sys.toolId && !custom) setSystemId(null)
      setSelectedIds((cur) => cur.filter((x) => !sys.droneIds.includes(x)))
      return
    }

    // Nothing is located yet: the system you pick decides the location (or you are asked for one),
    // and drones of other systems drop out of the choice.
    if (!place && !custom) {
      setSystemId(sys.toolId)
      setSelectedIds([...sys.droneIds])
      return
    }
    setSelectedIds((cur) => [...new Set([...cur, ...sys.droneIds])])
  }

  const onLimitsSaved = (modelId: number, next: FlightLimits) =>
    setFleet((cur) => cur.map((d) => (d.modelId === modelId ? { ...d, limits: next, limitsSource: 'custom' } : d)))

  const card = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
  const label = `mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`
  const muted = isDark ? 'text-slate-500' : 'text-slate-400'
  const divider = isDark ? 'border-slate-700' : 'border-slate-200'

  const ready = !!(place && forecast && limits && grid && !loading && !failed && !fleetLoading)

  return (
    <div className="space-y-4">
      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <div className={`rounded-2xl border shadow-sm ${card}`}>
        <div className="flex flex-wrap items-stretch gap-y-4 p-4">
          {/* Location: a system (its own location) or a point on the map */}
          <div className="pr-6">
            <p className={label}>
              <MapPin size={12} /> {t('operations.calendar.btf.location')}
            </p>
            <BtfLocationSelect
              systems={systems}
              systemId={systemId}
              place={place}
              onSelectSystem={selectSystem}
              onChooseMap={() => setPicker({ open: true, systemId: null })}
              onLocate={locate}
              onClear={clearLocation}
              isDark={isDark}
            />
          </div>

          {/* Drones */}
          <div className={`min-w-[280px] flex-1 border-l px-6 ${divider}`}>
            <p className={label}>
              <Plane size={12} /> {t('operations.calendar.btf.drones')}
            </p>
            {fleet.length === 0 ? (
              <p className={`text-xs ${muted}`}>{fleetLoading ? '—' : t('operations.calendar.btf.noDrones')}</p>
            ) : (
              <DroneSelector
                systems={systems}
                fleet={fleet}
                selectedIds={selectedIds}
                lockedToolId={lockedSystem?.toolId ?? null}
                onToggleSystem={toggleSystem}
                onClear={() => setSelectedIds([])}
                onEdit={setEditing}
                isDark={isDark}
              />
            )}
          </div>

          {/* Slot length */}
          <div className={`border-l px-6 ${divider}`}>
            <p className={label}>{t('operations.calendar.btf.slotLength')}</p>
            <Segmented
              options={WINDOWS.map((w) => ({ value: w, text: t('operations.calendar.btf.hours', { count: w }) }))}
              value={windowHours}
              onChange={setWindowHours}
              isDark={isDark}
            />
          </div>

          {/* Show */}
          <div className={`border-l px-6 ${divider}`}>
            <p className={label}>{t('operations.calendar.btf.show')}</p>
            <Segmented
              options={VIEWS.map((v) => ({
                value: v,
                text: v === 'overall' ? t('operations.calendar.btf.overall') : t(`operations.calendar.btf.${v === 'gust' ? 'gusts' : v}`),
              }))}
              value={view}
              onChange={setView}
              isDark={isDark}
            />
          </div>

          {/* Legend */}
          <div className={`flex items-end border-l pl-6 ${divider}`}>
            <Legend isDark={isDark} />
          </div>
        </div>
        {limits && activeDrones.length > 1 && <p className={`px-4 pb-3 text-[11px] ${muted}`}>{t('operations.calendar.btf.mostRestrictive')}</p>}
      </div>

      {/* ── Weather grid ─────────────────────────────────────────────────── */}
      <div className={`overflow-hidden rounded-2xl border shadow-sm ${card}`}>
        {fleetLoading && (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        )}

        {!fleetLoading && fleet.length === 0 && <p className={`p-10 text-center text-sm ${muted}`}>{t('operations.calendar.btf.fleetEmpty')}</p>}

        {!fleetLoading && fleet.length > 0 && !place && (
          <div className="flex flex-col items-center gap-3 p-14 text-center">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isDark ? 'bg-violet-500/10' : 'bg-violet-50'}`}>
              <MapPin className="h-6 w-6 text-violet-500" />
            </div>
            <p className={`max-w-sm text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {systemId !== null
                ? t('operations.calendar.btf.systemNoLocation', { name: systems.find((x) => x.toolId === systemId)?.name ?? '' })
                : t('operations.calendar.btf.noLocation')}
            </p>
            <Button size="sm" onClick={() => setPicker({ open: true, systemId })} className="bg-violet-600 text-white hover:bg-violet-700">
              {t('operations.calendar.btf.pickLocationTitle')}
            </Button>
          </div>
        )}

        {place && loading && (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        )}

        {place && failed && !loading && (
          <div className={`m-4 flex items-center gap-3 rounded-xl border p-4 ${isDark ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
            <TriangleAlert size={18} />
            <span className="text-sm font-medium">{t('operations.calendar.btf.loadError')}</span>
            <Button size="sm" variant="outline" className="ml-auto" onClick={loadForecast}>
              {t('operations.calendar.btf.retry')}
            </Button>
          </div>
        )}

        {ready && (
          <>
            <BtfGrid
              days={grid!.days}
              starts={grid!.starts}
              cells={grid!.cells}
              bestKey={grid!.bestKey}
              view={view}
              todayKey={nowKey.slice(0, 10)}
              isDark={isDark}
              locale={locale}
            />
            <div className={`flex flex-wrap items-center gap-x-6 gap-y-1 border-t px-5 py-2.5 text-[11px] ${divider} ${muted}`}>
              {!grid!.bestKey && <span className="font-medium text-amber-500">{t('operations.calendar.btf.noBestSlot')}</span>}
              <span>{t('operations.calendar.btf.forecastBy')}</span>
              <span className="ml-auto">{t('operations.calendar.btf.footerNote', { tz: timeZoneAbbr(forecast!.timezone, locale) })}</span>
            </div>
          </>
        )}
      </div>

      <LocationDialog open={picker.open} place={place} isDark={isDark} onClose={() => setPicker({ open: false, systemId: null })} onApply={applyPlace} />
      <BtfLimitsDialog drone={editing} onClose={() => setEditing(null)} onSaved={onLimitsSaved} />
    </div>
  )
}

// ── Controls ─────────────────────────────────────────────────────────────────

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  isDark,
}: {
  options: Array<{ value: T; text: string }>
  value: T
  onChange: (v: T) => void
  isDark: boolean
}) {
  return (
    <div className={`inline-flex h-9 items-center rounded-lg border p-0.5 ${isDark ? 'border-slate-600 bg-slate-700/40' : 'border-slate-200 bg-slate-50'}`}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={on}
            className={`h-full cursor-pointer rounded-md px-3 text-xs font-semibold transition-colors ${
              on
                ? isDark ? 'bg-slate-900 text-violet-300 shadow-sm ring-1 ring-violet-500/60' : 'bg-white text-violet-700 shadow-sm ring-1 ring-violet-300'
                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {o.text}
          </button>
        )
      })}
    </div>
  )
}

function Legend({ isDark }: { isDark: boolean }) {
  const { t } = useTranslation()
  const pct = Math.round(MARGINAL_BELOW * 100)
  const items = [
    { dot: 'bg-emerald-500', k: 'Go', params: {} },
    { dot: 'bg-amber-400', k: 'Marginal', params: { pct } },
    { dot: 'bg-rose-500', k: 'Nogo', params: {} },
    { dot: isDark ? 'bg-slate-600' : 'bg-slate-300', k: 'Night', params: {} },
  ]
  return (
    <div className="flex h-9 flex-wrap items-center gap-x-3.5">
      {items.map((i) => (
        <span key={i.k} title={t(`operations.calendar.btf.legend${i.k}Desc`, i.params)} className="flex cursor-help items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${i.dot}`} />
          <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t(`operations.calendar.btf.legend${i.k}`)}</span>
        </span>
      ))}
      <span title={t('operations.calendar.btf.legendBestDesc')} className="flex cursor-help items-center gap-1.5">
        <Star size={11} className="fill-violet-500 text-violet-500" />
        <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('operations.calendar.btf.legendBest')}</span>
      </span>
    </div>
  )
}

// ── Drone selector: one chip per system; a few inline, the rest in a searchable list ──

interface SystemGroup {
  sys: BtfSystem
  drones: BtfDrone[]
}

function DroneSelector({
  systems,
  fleet,
  selectedIds,
  lockedToolId,
  onToggleSystem,
  onClear,
  onEdit,
  isDark,
}: {
  systems: BtfSystem[]
  fleet: BtfDrone[]
  selectedIds: number[]
  /** Set when the location comes from a system: other systems are disabled */
  lockedToolId: number | null
  onToggleSystem: (toolId: number) => void
  onClear: () => void
  onEdit: (d: BtfDrone) => void
  isDark: boolean
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const groups = useMemo<SystemGroup[]>(() => {
    const byTool = new Map<number, BtfDrone[]>()
    for (const d of fleet) {
      const list = byTool.get(d.toolId)
      if (list) list.push(d)
      else byTool.set(d.toolId, [d])
    }
    const all = systems.map((sys) => ({ sys, drones: byTool.get(sys.toolId) ?? [] }))
    // The system that can be chosen comes first when the choice is locked.
    return lockedToolId === null ? all : [...all].sort((a, b) => Number(b.sys.toolId === lockedToolId) - Number(a.sys.toolId === lockedToolId))
  }, [systems, fleet, lockedToolId])

  const isLocked = (g: SystemGroup) => lockedToolId !== null && g.sys.toolId !== lockedToolId
  const isOn = (g: SystemGroup) => g.sys.droneIds.length > 0 && g.sys.droneIds.every((id) => selectedIds.includes(id))
  const hasSelection = (g: SystemGroup) => g.sys.droneIds.some((id) => selectedIds.includes(id))
  const droneNames = (g: SystemGroup) => g.drones.map((d) => d.droneName).join(', ')
  // Limits live on the drone model; edit the first drone of the system that has one.
  const editTarget = (g: SystemGroup) => g.drones.find((d) => d.modelId !== null) ?? null

  // The first few stay inline; chosen systems further down are pulled in so the choice is always visible.
  const inline = useMemo(() => groups.filter((g, i) => i < INLINE_CHIPS || g.sys.droneIds.some((id) => selectedIds.includes(id))), [groups, selectedIds])
  const hidden = groups.length - inline.length
  const showPicker = groups.length > INLINE_CHIPS

  const gear = (g: SystemGroup) => {
    const target = editTarget(g)
    return target === null ? (
      <span title={t('operations.calendar.btf.noModelHint')} className="ml-1.5 text-amber-400">
        <TriangleAlert size={12} />
      </span>
    ) : (
      <span
        role="button"
        tabIndex={0}
        aria-label={t('operations.calendar.btf.editLimits')}
        title={t('operations.calendar.btf.editLimits')}
        onClick={(e) => {
          e.stopPropagation()
          onEdit(target)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation()
            onEdit(target)
          }
        }}
        className="ml-1.5 rounded p-0.5 opacity-60 hover:bg-black/10 hover:opacity-100"
      >
        <Settings2 size={11} />
      </span>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Chip active={selectedIds.length === 0} onClick={onClear} isDark={isDark}>
        {t('operations.calendar.btf.allDrones')}
      </Chip>

      {inline.map((g) => (
        <Chip
          key={g.sys.toolId}
          active={isOn(g)}
          disabled={isLocked(g)}
          onClick={() => onToggleSystem(g.sys.toolId)}
          isDark={isDark}
          title={isLocked(g) ? t('operations.calendar.btf.droneLockedHint') : droneNames(g)}
        >
          {g.sys.name}
          {g.drones.length > 1 && <span className="ml-1.5 opacity-70">×{g.drones.length}</span>}
          {gear(g)}
        </Chip>
      ))}

      {showPicker && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`flex h-8 cursor-pointer items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
                isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {hidden > 0 ? `+${hidden}` : t('operations.calendar.btf.selectDrones')}
              <ChevronDown size={12} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[340px] p-0">
            <Command>
              <CommandInput placeholder={t('operations.calendar.btf.searchDrones')} />
              <CommandList className="max-h-72">
                <CommandEmpty>{t('operations.calendar.btf.noDronesMatch')}</CommandEmpty>
                {groups.map((g) => {
                  const on = isOn(g)
                  const locked = isLocked(g)
                  const target = editTarget(g)
                  return (
                    <CommandItem
                      key={g.sys.toolId}
                      value={`${g.sys.name} ${g.sys.code} ${g.drones.map((d) => `${d.droneName} ${d.modelName ?? ''} ${d.serialNumber ?? ''}`).join(' ')}`}
                      disabled={locked}
                      onSelect={() => !locked && onToggleSystem(g.sys.toolId)}
                      className="flex items-center gap-2"
                    >
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${on ? 'border-violet-600 bg-violet-600 text-white' : hasSelection(g) ? 'border-violet-600' : 'border-slate-400'}`}>
                        {on && <Check size={11} strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold">
                          {g.sys.name}
                          {g.drones.length > 1 && <span className="ml-1.5 font-normal opacity-60">×{g.drones.length}</span>}
                        </span>
                        <span className="block truncate text-[11px] opacity-60">
                          {droneNames(g)}
                          {g.drones[0]?.modelName ? ` · ${g.drones[0].modelName}` : ''}
                        </span>
                      </span>
                      {target === null ? (
                        <span title={t('operations.calendar.btf.noModelHint')}>
                          <TriangleAlert size={12} className="text-amber-400" />
                        </span>
                      ) : (
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label={t('operations.calendar.btf.editLimits')}
                          title={t('operations.calendar.btf.editLimits')}
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpen(false)
                            onEdit(target)
                          }}
                          className="rounded p-1 opacity-60 hover:bg-black/10 hover:opacity-100"
                        >
                          <Settings2 size={12} />
                        </span>
                      )}
                    </CommandItem>
                  )
                })}
              </CommandList>
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onClear()
                    setOpen(false)
                  }}
                  className="flex w-full cursor-pointer items-center justify-center gap-1.5 border-t py-2 text-xs font-semibold text-violet-500 hover:bg-violet-500/10"
                >
                  <X size={12} /> {t('operations.calendar.btf.clearSelection')}
                </button>
              )}
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {lockedToolId !== null && (
        <p className={`flex basis-full items-start gap-1.5 text-[11px] leading-snug ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          <Lock size={11} className="mt-0.5 shrink-0" />
          {t('operations.calendar.btf.droneLockNote', { name: groups.find((g) => g.sys.toolId === lockedToolId)?.sys.name ?? '' })}
        </p>
      )}
    </div>
  )
}

function Chip({
  active,
  disabled = false,
  onClick,
  isDark,
  title,
  children,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  isDark: boolean
  title?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      aria-pressed={active}
      aria-disabled={disabled}
      title={title}
      className={`flex h-8 items-center rounded-lg border px-3 text-xs font-semibold transition-colors ${
        disabled
          ? isDark
            ? 'cursor-not-allowed border-dashed border-slate-700 bg-slate-800/40 text-slate-600'
            : 'cursor-not-allowed border-dashed border-slate-200 bg-slate-100 text-slate-400'
          : active
            ? 'cursor-pointer border-violet-600 bg-violet-600 text-white shadow-sm'
            : isDark
              ? 'cursor-pointer border-slate-600 bg-slate-700/40 text-slate-300 hover:bg-slate-700'
              : 'cursor-pointer border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  )
}

// ── Location picker (map + search, same picker used when planning missions) ──

function LocationDialog({
  open,
  place,
  isDark,
  onClose,
  onApply,
}: {
  open: boolean
  place: BtfPlace | null
  isDark: boolean
  onClose: () => void
  onApply: (p: BtfPlace) => void
}) {
  const { t } = useTranslation()
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    if (!open) return
    setLat(place ? String(place.latitude) : '')
    setLng(place ? String(place.longitude) : '')
  }, [open, place])

  const nLat = Number(lat)
  const nLng = Number(lng)
  const valid = lat !== '' && lng !== '' && Number.isFinite(nLat) && Number.isFinite(nLng) && Math.abs(nLat) <= 90 && Math.abs(nLng) <= 180

  const apply = async () => {
    if (!valid) return
    setApplying(true)
    const unchanged = place && place.latitude === nLat && place.longitude === nLng
    const name = unchanged ? place.name : await nameForPoint(nLat, nLng)
    setApplying(false)
    onApply({ name, region: null, country: null, latitude: nLat, longitude: nLng })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('operations.calendar.btf.pickLocationTitle')}</DialogTitle>
          <DialogDescription>{t('operations.calendar.btf.pickLocationDesc')}</DialogDescription>
        </DialogHeader>
        <LocationPicker
          lat={lat}
          lng={lng}
          isDark={isDark}
          onChange={(a, b) => {
            setLat(a)
            setLng(b)
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('operations.calendar.btf.cancel')}
          </Button>
          <Button onClick={apply} disabled={!valid || applying} className="bg-violet-600 text-white hover:bg-violet-700">
            {t('operations.calendar.btf.applyLocation')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
