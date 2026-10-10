'use client'

import LocationPicker from '@/components/system/LocationPicker'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { compareWindows, MARGINAL_BELOW, mergeLimits, scoreForecast, summariseWindow, type FlightLimits, type WindowSummary } from '@/lib/btf/scoring'
import type { BtfDrone, BtfForecast, BtfPlace } from '@/lib/btf/types'
import axios from 'axios'
import { Check, ChevronDown, Crosshair, MapPin, Plane, Search, Settings2, Star, TriangleAlert, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BtfGrid, type GridCell, type MetricView } from './BtfGrid'
import { BtfLimitsDialog } from './BtfLimitsDialog'
import { currentHourKey, dayOf, hourOf, pad2, timeZoneAbbr } from './btf-utils'

const PLACE_KEY = 'btf-place'
const WINDOWS = [1, 2, 3, 4]
const VIEWS: MetricView[] = ['overall', 'wind', 'gust', 'rain']
/** The grid covers daylight working hours; the night is still scored but not shown. */
const DAY_START = 6
const DAY_END = 22
const INLINE_DRONES = 4

function loadPlace(): BtfPlace | null {
  try {
    const raw = localStorage.getItem(PLACE_KEY)
    return raw ? (JSON.parse(raw) as BtfPlace) : null
  } catch {
    return null
  }
}

function savePlace(p: BtfPlace) {
  try {
    localStorage.setItem(PLACE_KEY, JSON.stringify(p))
  } catch {
    /* storage unavailable - the choice just isn't remembered */
  }
}

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

  const [place, setPlace] = useState<BtfPlace | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [fleet, setFleet] = useState<BtfDrone[]>([])
  const [forecast, setForecast] = useState<BtfForecast | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  const [selectedIds, setSelectedIds] = useState<number[]>([]) // drone component ids; empty = whole fleet
  const [windowHours, setWindowHours] = useState(2)
  const [view, setView] = useState<MetricView>('overall')
  const [editing, setEditing] = useState<BtfDrone | null>(null)

  useEffect(() => {
    setPlace(loadPlace())
  }, [])

  const load = useCallback(async (p: BtfPlace) => {
    setLoading(true)
    setFailed(false)
    try {
      const res = await axios.get('/api/operation/btf', { params: { lat: p.latitude, lon: p.longitude, days: 7 } })
      setFleet(res.data.data.fleet)
      setForecast(res.data.data.forecast)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (place) load(place)
  }, [place, load])

  const choosePlace = (p: BtfPlace) => {
    savePlace(p)
    setPlace(p)
  }

  const locate = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const latitude = Number(pos.coords.latitude.toFixed(4))
      const longitude = Number(pos.coords.longitude.toFixed(4))
      choosePlace({ name: await nameForPoint(latitude, longitude), region: null, country: null, latitude, longitude })
    })
  }

  // ── Scoring (client side so filters respond instantly) ─────────────────────
  const activeDrones = useMemo(
    () => (selectedIds.length ? fleet.filter((d) => selectedIds.includes(d.componentId)) : fleet),
    [fleet, selectedIds],
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

  const toggleDrone = (id: number) => setSelectedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  const onLimitsSaved = (modelId: number, next: FlightLimits) =>
    setFleet((cur) => cur.map((d) => (d.modelId === modelId ? { ...d, limits: next, limitsSource: 'custom' } : d)))

  const card = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
  const label = `mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`
  const muted = isDark ? 'text-slate-500' : 'text-slate-400'
  const divider = isDark ? 'border-slate-700' : 'border-slate-200'

  const ready = !!(place && forecast && limits && grid && !loading && !failed)

  return (
    <div className="space-y-4">
      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <div className={`rounded-2xl border shadow-sm ${card}`}>
        <div className="flex flex-wrap items-stretch gap-y-4 p-4">
          {/* Location */}
          <div className="pr-6">
            <p className={label}>
              <MapPin size={12} /> {t('operations.calendar.btf.location')}
            </p>
            <div className={`flex h-9 w-[250px] items-center rounded-lg border ${isDark ? 'border-slate-600 bg-slate-700/40' : 'border-slate-200 bg-white'}`}>
              <button type="button" onClick={() => setPickerOpen(true)} className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-2 px-2.5 text-left">
                <Search size={14} className={`shrink-0 ${muted}`} />
                <span className={`truncate text-[13px] ${place ? (isDark ? 'text-slate-100' : 'text-slate-800') : muted}`}>
                  {place ? `${place.name} - ${place.latitude.toFixed(2)}, ${place.longitude.toFixed(2)}` : t('operations.calendar.btf.pickLocationTitle')}
                </span>
              </button>
              <button
                type="button"
                onClick={locate}
                title={t('operations.calendar.btf.useMyLocation')}
                aria-label={t('operations.calendar.btf.useMyLocation')}
                className={`flex h-full w-9 cursor-pointer items-center justify-center rounded-r-lg border-l text-violet-500 transition-colors hover:bg-violet-500/10 ${divider}`}
              >
                <Crosshair size={15} />
              </button>
            </div>
          </div>

          {/* Drones */}
          <div className={`min-w-[280px] flex-1 border-l px-6 ${divider}`}>
            <p className={label}>
              <Plane size={12} /> {t('operations.calendar.btf.drones')}
            </p>
            {fleet.length === 0 ? (
              <p className={`text-xs ${muted}`}>{place && !loading ? t('operations.calendar.btf.fleetEmpty') : '—'}</p>
            ) : (
              <DroneSelector fleet={fleet} selectedIds={selectedIds} onToggle={toggleDrone} onClear={() => setSelectedIds([])} onEdit={setEditing} isDark={isDark} />
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
        {!place && (
          <div className="flex flex-col items-center gap-3 p-14 text-center">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isDark ? 'bg-violet-500/10' : 'bg-violet-50'}`}>
              <MapPin className="h-6 w-6 text-violet-500" />
            </div>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('operations.calendar.btf.noLocation')}</p>
            <Button size="sm" onClick={() => setPickerOpen(true)} className="bg-violet-600 text-white hover:bg-violet-700">
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
            <Button size="sm" variant="outline" className="ml-auto" onClick={() => load(place)}>
              {t('operations.calendar.btf.retry')}
            </Button>
          </div>
        )}

        {place && !loading && !failed && forecast && !limits && <p className={`p-8 text-center text-sm ${muted}`}>{t('operations.calendar.btf.fleetEmpty')}</p>}

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

      <LocationDialog
        open={pickerOpen}
        place={place}
        isDark={isDark}
        onClose={() => setPickerOpen(false)}
        onApply={(p) => {
          choosePlace(p)
          setPickerOpen(false)
        }}
      />
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

// ── Drone selector: a few chips inline, the rest in a searchable list ────────

function DroneSelector({
  fleet,
  selectedIds,
  onToggle,
  onClear,
  onEdit,
  isDark,
}: {
  fleet: BtfDrone[]
  selectedIds: number[]
  onToggle: (id: number) => void
  onClear: () => void
  onEdit: (d: BtfDrone) => void
  isDark: boolean
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  // The first few stay inline; chosen drones further down are pulled in so the choice is always visible.
  const inline = useMemo(
    () => fleet.filter((d, i) => i < INLINE_DRONES || selectedIds.includes(d.componentId)),
    [fleet, selectedIds],
  )
  const hidden = fleet.length - inline.length
  const showPicker = fleet.length > INLINE_DRONES

  const name = (d: BtfDrone) => d.systemName || d.systemCode

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Chip active={selectedIds.length === 0} onClick={onClear} isDark={isDark}>
        {t('operations.calendar.btf.allDrones')}
      </Chip>

      {inline.map((d) => (
        <Chip key={d.componentId} active={selectedIds.includes(d.componentId)} onClick={() => onToggle(d.componentId)} isDark={isDark} title={d.droneName}>
          {name(d)}
          {d.modelId === null ? (
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
                onEdit(d)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation()
                  onEdit(d)
                }
              }}
              className="ml-1.5 rounded p-0.5 opacity-60 hover:bg-black/10 hover:opacity-100"
            >
              <Settings2 size={11} />
            </span>
          )}
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
                {fleet.map((d) => {
                  const on = selectedIds.includes(d.componentId)
                  return (
                    <CommandItem
                      key={d.componentId}
                      value={`${d.systemName ?? ''} ${d.systemCode} ${d.droneName} ${d.modelName ?? ''} ${d.serialNumber ?? ''}`}
                      onSelect={() => onToggle(d.componentId)}
                      className="flex items-center gap-2"
                    >
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${on ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-400'}`}>
                        {on && <Check size={11} strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold">{name(d)}</span>
                        <span className="block truncate text-[11px] opacity-60">
                          {d.droneName}
                          {d.modelName ? ` · ${d.modelName}` : ''}
                        </span>
                      </span>
                      {d.modelId === null ? (
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
                            onEdit(d)
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
    </div>
  )
}

function Chip({ active, onClick, isDark, title, children }: { active: boolean; onClick: () => void; isDark: boolean; title?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={`flex h-8 cursor-pointer items-center rounded-lg border px-3 text-xs font-semibold transition-colors ${
        active
          ? 'border-violet-600 bg-violet-600 text-white shadow-sm'
          : isDark
            ? 'border-slate-600 bg-slate-700/40 text-slate-300 hover:bg-slate-700'
            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
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
