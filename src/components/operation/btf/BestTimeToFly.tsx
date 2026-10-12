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
import { windowHasStarted, windowStarts } from '@/lib/btf/windows'
import type { BtfDrone, BtfForecast, BtfPlace, BtfSystem } from '@/lib/btf/types'
import axios from 'axios'
import { Check, ChevronDown, Clock, Info, Lock, MapPin, Plane, Settings2, Star, TriangleAlert, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTimezone } from '@/components/TimezoneProvider'
import { BtfGrid, type GridCell, type MetricView } from './BtfGrid'
import { WeatherGlyph } from './WeatherGlyph'
import { BtfLocationSelect } from './BtfLocationSelect'
import { BtfLimitsDialog } from './BtfLimitsDialog'
import { dayOf, hourOf, relativeAge, timeZoneAbbr } from './btf-utils'
import { useNowHourKey } from './useNowHourKey'

const WINDOWS = [1, 2, 3, 4]
const VIEWS: MetricView[] = ['overall', 'wind', 'gust', 'rain']
const INLINE_CHIPS = 4
/** A forecast older than this is reloaded in the background */
const REFRESH_MS = 30 * 60_000
/** Minimum gap between background reload attempts */
const REFRESH_RETRY_MS = 5 * 60_000

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
  // Everything is shown in the user's timezone, wherever the location is.
  const { timezone } = useTimezone()
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
  const lastRefreshTry = useRef(0)

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
    loadBtfForecast(lat, lon, 7, timezone)
      .then((f) => {
        if (id !== requestId.current) return
        setForecast(f)
      })
      .catch(() => id === requestId.current && setFailed(true))
      .finally(() => id === requestId.current && setLoading(false))
  }
  useEffect(loadForecast, [lat, lon, timezone])

  // "Now" in the user's timezone, kept live so windows that start while the page is open drop out.
  const nowKey = useNowHourKey(forecast?.timezone)

  // A forecast left open goes stale: reload it quietly each hour change, and as soon as the day rolls over.
  useEffect(() => {
    if (!forecast || !nowKey || lat === undefined || lon === undefined) return
    const dayRolledOver = nowKey.slice(0, 10) !== dayOf(forecast.hours[0].time)
    const stale = Date.now() - forecast.retrievedAt >= REFRESH_MS
    if (!dayRolledOver && !stale) return
    // If the weather service keeps failing we get the same old forecast back; don't hammer it.
    if (Date.now() - lastRefreshTry.current < REFRESH_RETRY_MS) return
    lastRefreshTry.current = Date.now()
    const id = ++requestId.current
    loadBtfForecast(lat, lon, 7, timezone)
      .then((f) => id === requestId.current && setForecast(f))
      .catch(() => undefined) // keep showing the previous forecast
  }, [nowKey, forecast, lat, lon, timezone])

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
    const starts = windowStarts(forecast.hours, windowHours)

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
        // A window that has already started cannot be recommended (it is shown dimmed).
        const past = windowHasStarted(day, start, nowKey)
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
  const label = `mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`
  const muted = isDark ? 'text-slate-500' : 'text-slate-400'
  const divider = isDark ? 'border-slate-700' : 'border-slate-200'

  // The models behind the limits, so a cell's detail can say what it was scored against.
  const modelNames = [...new Set(activeDrones.map((d) => d.modelName).filter((n): n is string => n !== null))]
  const hasGeneric = activeDrones.some((d) => d.modelId === null)
  const scoredAgainst = modelNames.length
    ? t('operations.calendar.btf.opLimitsFor', { models: modelNames.join(', ') }) + (hasGeneric ? ' · ' + t('operations.calendar.btf.scoredAlsoGeneric') : '')
    : t('operations.calendar.btf.opLimitsGeneric')

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

          {/* When the forecast was retrieved */}
          {forecast && (
            <div className={`border-l px-6 ${divider}`}>
              <p className={label}>{t('operations.calendar.btf.retrieved')}</p>
              <RetrievedAt at={forecast.retrievedAt} isDark={isDark} />
            </div>
          )}

          {/* Legend */}
          <div className={`flex items-end border-l pl-6 ${divider}`}>
            <Legend isDark={isDark} />
          </div>
        </div>
        {limits && activeDrones.length > 1 && <p className={`px-4 pb-3 text-xs ${muted}`}>{t('operations.calendar.btf.mostRestrictive')}</p>}
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
              limits={limits!}
              scoredAgainst={scoredAgainst}
              tzLabel={timeZoneAbbr(forecast!.timezone, locale)}
            />
            <div className={`flex flex-wrap items-center gap-x-6 gap-y-1 border-t px-5 py-2.5 text-xs ${divider} ${muted}`}>
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

/** "5 min ago": how old the forecast is, kept current without re-rendering the whole page. */
function RetrievedAt({ at, isDark }: { at: number; isDark: boolean }) {
  const { t } = useTranslation()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const { key, count } = relativeAge(now - at)
  return (
    <div className={`flex h-9 items-center gap-1.5 text-[13px] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
      <Clock size={14} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
      <span className="tabular-nums">{t(`operations.calendar.btf.${key}`, { count })}</span>
    </div>
  )
}

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
  const items = [
    { dot: 'bg-emerald-500', k: 'Go' },
    { dot: 'bg-amber-400', k: 'Marginal' },
    { dot: 'bg-rose-500', k: 'Nogo' },
    { dot: isDark ? 'bg-slate-600' : 'bg-slate-300', k: 'Night' },
  ]
  return (
    <div className="flex min-h-9 flex-wrap items-center gap-x-3.5 gap-y-1">
      {items.map((i) => (
        <span key={i.k} className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${i.dot}`} />
          <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{t(`operations.calendar.btf.legend${i.k}`)}</span>
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <Star size={12} className="fill-violet-500 text-violet-500" />
        <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{t('operations.calendar.btf.legendBest')}</span>
      </span>
      <LegendHelp isDark={isDark} />
    </div>
  )
}

/** Everything the grid shows, explained - opened by click, tap or keyboard. */
function LegendHelp({ isDark }: { isDark: boolean }) {
  const { t } = useTranslation()
  const pct = Math.round(MARGINAL_BELOW * 100)
  const colors = [
    { dot: 'bg-emerald-500', k: 'Go', params: {} },
    { dot: 'bg-amber-400', k: 'Marginal', params: { pct } },
    { dot: 'bg-rose-500', k: 'Nogo', params: {} },
    { dot: isDark ? 'bg-slate-600' : 'bg-slate-300', k: 'Night', params: {} },
  ]
  const icons: Array<{ code: number; night: boolean; label: string }> = [
    { code: 0, night: false, label: t('operations.calendar.btf.wmo.clear') },
    { code: 2, night: false, label: t('operations.calendar.btf.wmo.partlyCloudy') },
    { code: 3, night: false, label: t('operations.calendar.btf.wmo.overcast') },
    { code: 45, night: false, label: t('operations.calendar.btf.wmo.fog') },
    { code: 53, night: false, label: t('operations.calendar.btf.wmo.drizzle') },
    { code: 63, night: false, label: t('operations.calendar.btf.wmo.rain') },
    { code: 73, night: false, label: t('operations.calendar.btf.wmo.snow') },
    { code: 95, night: false, label: t('operations.calendar.btf.wmo.thunderstorm') },
    { code: 0, night: true, label: t('operations.calendar.btf.night') },
  ]
  const heading = 'mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground'

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
            isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Info size={14} /> {t('operations.calendar.btf.helpButton')}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[75vh] w-[min(380px,calc(100vw-2rem))] space-y-4 overflow-y-auto p-4">
        <section>
          <p className={heading}>{t('operations.calendar.btf.helpColors')}</p>
          <ul className="space-y-2">
            {colors.map((c) => (
              <li key={c.k} className="flex items-start gap-2.5">
                <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${c.dot}`} />
                <p className="text-sm leading-snug">
                  <span className="font-semibold">{t(`operations.calendar.btf.legend${c.k}`)}</span> – {t(`operations.calendar.btf.legend${c.k}Desc`, c.params)}
                </p>
              </li>
            ))}
            <li className="flex items-start gap-2.5">
              <Star size={14} className="mt-0.5 shrink-0 fill-violet-500 text-violet-500" />
              <p className="text-sm leading-snug">
                <span className="font-semibold">{t('operations.calendar.btf.legendBest')}</span> – {t('operations.calendar.btf.legendBestDesc')}
              </p>
            </li>
          </ul>
        </section>

        <section>
          <p className={heading}>{t('operations.calendar.btf.helpNumbers')}</p>
          <ul className="space-y-1.5 text-sm leading-snug">
            <li>{t('operations.calendar.btf.helpWind')}</li>
            <li>{t('operations.calendar.btf.helpGust')}</li>
            <li>{t('operations.calendar.btf.helpRain')}</li>
            <li>{t('operations.calendar.btf.helpScore')}</li>
          </ul>
        </section>

        <section>
          <p className={heading}>{t('operations.calendar.btf.helpIcons')}</p>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-2">
            {icons.map((i) => (
              <li key={i.label} className="flex items-center gap-2 text-sm">
                <WeatherGlyph code={i.code} night={i.night} isDark={isDark} size="sm" />
                {i.label}
              </li>
            ))}
          </ul>
        </section>
      </PopoverContent>
    </Popover>
  )
}

// ── Drone selector: one chip per system; a few inline, the rest in a searchable list ──

interface SystemGroup {
  sys: BtfSystem
  drones: BtfDrone[]
}

/** A distinct drone model within a system, with how many of its drones use it. */
interface ModelRef {
  drone: BtfDrone
  count: number
}

/** The distinct models of a system. Limits belong to the model, so each one needs its own editor. */
function modelsOf(g: SystemGroup): ModelRef[] {
  const byModel = new Map<number, ModelRef>()
  for (const d of g.drones) {
    if (d.modelId === null) continue
    const ref = byModel.get(d.modelId)
    if (ref) ref.count += 1
    else byModel.set(d.modelId, { drone: d, count: 1 })
  }
  return [...byModel.values()]
}

const missingModelNames = (g: SystemGroup) => g.drones.filter((d) => d.modelId === null).map((d) => d.droneName)

/** Opens the limits editor: straight away for one model, a small list when the system has several. */
function LimitsMenu({ models, onEdit, className = '' }: { models: ModelRef[]; onEdit: (d: BtfDrone) => void; className?: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  if (models.length === 0) return null

  const label = models.length === 1 ? `${t('operations.calendar.btf.editLimits')}: ${models[0].drone.modelName}` : t('operations.calendar.btf.editLimits')
  const trigger = (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation()
        if (models.length === 1) onEdit(models[0].drone)
      }}
      className={`flex cursor-pointer items-center justify-center opacity-70 hover:bg-black/10 hover:opacity-100 ${className}`}
    >
      <Settings2 size={14} />
    </button>
  )
  if (models.length === 1) return trigger

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-1" onClick={(e) => e.stopPropagation()}>
        <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('operations.calendar.btf.editLimitsFor')}</p>
        {models.map((m) => (
          <button
            key={m.drone.modelId}
            type="button"
            onClick={() => {
              setOpen(false)
              onEdit(m.drone)
            }}
            className="flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
          >
            <span className="truncate font-medium">{m.drone.modelName}</span>
            <span className="ml-2 shrink-0 text-xs text-muted-foreground">×{m.count}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
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

  // The first few stay inline; chosen systems further down are pulled in so the choice is always visible.
  const inline = useMemo(() => groups.filter((g, i) => i < INLINE_CHIPS || g.sys.droneIds.some((id) => selectedIds.includes(id))), [groups, selectedIds])
  const hidden = groups.length - inline.length
  const showPicker = groups.length > INLINE_CHIPS

  // Drones without a model, among those that can be chosen: said out loud, not only as an icon.
  const missing = groups.filter((g) => !isLocked(g)).flatMap(missingModelNames)
  const missingText = missing.length > 3 ? `${missing.slice(0, 3).join(', ')} +${missing.length - 3}` : missing.join(', ')

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip active={selectedIds.length === 0} onClick={onClear} isDark={isDark}>
        {t('operations.calendar.btf.allDrones')}
      </Chip>

      {inline.map((g) => {
        const missingHere = missingModelNames(g)
        return (
          <Chip
            key={g.sys.toolId}
            active={isOn(g)}
            disabled={isLocked(g)}
            onClick={() => onToggleSystem(g.sys.toolId)}
            isDark={isDark}
            title={isLocked(g) ? t('operations.calendar.btf.droneLockedHint') : droneNames(g)}
            trailing={
              <>
                {missingHere.length > 0 && (
                  <span
                    role="img"
                    aria-label={t('operations.calendar.btf.noModelHintDrones', { names: missingHere.join(', ') })}
                    title={t('operations.calendar.btf.noModelHintDrones', { names: missingHere.join(', ') })}
                    className="flex items-center px-1.5 text-amber-500"
                  >
                    <TriangleAlert size={14} />
                  </span>
                )}
                {!isLocked(g) && <LimitsMenu models={modelsOf(g)} onEdit={onEdit} className="h-full rounded-r-lg px-2" />}
              </>
            }
          >
            {g.sys.name}
            {g.drones.length > 1 && <span className="ml-1.5 opacity-70">×{g.drones.length}</span>}
          </Chip>
        )
      })}

      {showPicker && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`flex h-9 cursor-pointer items-center gap-1 rounded-lg border px-3 text-[13px] font-semibold transition-colors ${
                isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {hidden > 0 ? `+${hidden}` : t('operations.calendar.btf.selectDrones')}
              <ChevronDown size={14} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[min(360px,calc(100vw-2rem))] p-0">
            <Command>
              <CommandInput placeholder={t('operations.calendar.btf.searchDrones')} />
              <CommandList className="max-h-72">
                <CommandEmpty>{t('operations.calendar.btf.noDronesMatch')}</CommandEmpty>
                {groups.map((g) => {
                  const on = isOn(g)
                  const locked = isLocked(g)
                  const missingHere = missingModelNames(g)
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
                        <span className="block truncate text-[13px] font-semibold">
                          {g.sys.name}
                          {g.drones.length > 1 && <span className="ml-1.5 font-normal opacity-60">×{g.drones.length}</span>}
                        </span>
                        <span className="block truncate text-xs opacity-70">
                          {droneNames(g)}
                          {modelsOf(g).length > 0 ? ` · ${modelsOf(g).map((m) => m.drone.modelName).join(', ')}` : ''}
                        </span>
                        {missingHere.length > 0 && (
                          <span className="mt-0.5 flex items-center gap-1 text-xs text-amber-600">
                            <TriangleAlert size={12} /> {t('operations.calendar.btf.noModelHintDrones', { names: missingHere.join(', ') })}
                          </span>
                        )}
                      </span>
                      {!locked && (
                        <span onClick={(e) => e.stopPropagation()}>
                          <LimitsMenu models={modelsOf(g)} onEdit={(d) => (setOpen(false), onEdit(d))} className="rounded p-1.5" />
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
                  className="flex w-full cursor-pointer items-center justify-center gap-1.5 border-t py-2.5 text-[13px] font-semibold text-violet-500 hover:bg-violet-500/10"
                >
                  <X size={14} /> {t('operations.calendar.btf.clearSelection')}
                </button>
              )}
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {missing.length > 0 && (
        <p className={`flex basis-full items-start gap-1.5 text-xs leading-snug ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
          <TriangleAlert size={13} className="mt-0.5 shrink-0" />
          {t('operations.calendar.btf.noModelNote', { names: missingText })}
        </p>
      )}

      {lockedToolId !== null && (
        <p className={`flex basis-full items-start gap-1.5 text-xs leading-snug ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          <Lock size={12} className="mt-0.5 shrink-0" />
          {t('operations.calendar.btf.droneLockNote', { name: groups.find((g) => g.sys.toolId === lockedToolId)?.sys.name ?? '' })}
        </p>
      )}
    </div>
  )
}

/** A selectable chip. Extra controls (warning, limits) sit beside the toggle as siblings, never nested inside it. */
function Chip({
  active,
  disabled = false,
  onClick,
  isDark,
  title,
  trailing,
  children,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  isDark: boolean
  title?: string
  trailing?: React.ReactNode
  children: React.ReactNode
}) {
  const tone = disabled
    ? isDark
      ? 'border-dashed border-slate-700 bg-slate-800/40 text-slate-500'
      : 'border-dashed border-slate-200 bg-slate-100 text-slate-500'
    : active
      ? 'border-violet-600 bg-violet-600 text-white shadow-sm'
      : isDark
        ? 'border-slate-600 bg-slate-700/40 text-slate-200 hover:bg-slate-700'
        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
  return (
    <div className={`flex h-9 items-stretch rounded-lg border text-[13px] font-semibold transition-colors ${tone}`}>
      <button
        type="button"
        onClick={disabled ? undefined : onClick}
        aria-pressed={active}
        aria-disabled={disabled}
        title={title}
        className={`flex items-center rounded-lg px-3 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {children}
      </button>
      {trailing}
    </div>
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
