'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { loadBtfFleet, loadBtfForecast } from '@/lib/btf/client'
import { GENERIC_LIMITS, mergeLimits, scoreForecast, summariseWindow, type FlightLimits } from '@/lib/btf/scoring'
import type { BtfDrone, BtfForecast } from '@/lib/btf/types'
import { wmoKey } from '@/lib/btf/weather'
import { MapPin } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { WeatherGlyph } from './WeatherGlyph'
import { hhmm, hourOf } from './btf-utils'

const FORECAST_DAYS = 16
const MAX_WINDOW_HOURS = 12

interface Props {
  /** Scheduled start, "YYYY-MM-DDTHH:mm" - read as local time at the site */
  start: string
  end?: string
  /** The operation's own location (strings straight from the form) */
  lat: string
  lng: string
  /** The selected system's location, used when the operation has none */
  fallback?: { latitude: number; longitude: number; name?: string | null } | null
  /** The selected system: its drones' limits decide the score */
  toolId?: number
  isDark: boolean
}

const TONES = {
  go: { light: 'border-emerald-200 bg-emerald-50 text-emerald-900', dark: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100', dot: 'bg-emerald-500' },
  marginal: { light: 'border-amber-200 bg-amber-50 text-amber-900', dark: 'border-amber-500/30 bg-amber-500/10 text-amber-100', dot: 'bg-amber-400' },
  nogo: { light: 'border-rose-200 bg-rose-50 text-rose-900', dark: 'border-rose-500/30 bg-rose-500/10 text-rose-100', dot: 'bg-rose-500' },
  night: { light: 'border-slate-200 bg-slate-100 text-slate-700', dark: 'border-slate-600 bg-slate-800 text-slate-300', dot: 'bg-slate-400' },
} as const

function validCoord(v: string, max: number): number | null {
  if (v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) && Math.abs(n) <= max ? n : null
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

/** Weather score for the chosen date and time, with the details on hover. */
export function OperationWeatherBadge({ start, end, lat, lng, fallback, toolId, isDark }: Props) {
  const { t } = useTranslation()
  const [fleet, setFleet] = useState<BtfDrone[]>([])
  const [forecast, setForecast] = useState<BtfForecast | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  // The operation's own location wins; otherwise the system's.
  const oLat = validCoord(lat, 90)
  const oLng = validCoord(lng, 180)
  const coords =
    oLat !== null && oLng !== null
      ? { latitude: oLat, longitude: oLng, name: null as string | null }
      : fallback
        ? { latitude: fallback.latitude, longitude: fallback.longitude, name: fallback.name ?? null }
        : null
  const cLat = coords?.latitude
  const cLng = coords?.longitude

  useEffect(() => {
    let cancelled = false
    loadBtfFleet()
      .then((f) => !cancelled && setFleet(f))
      .catch(() => undefined) // limits fall back to generic values
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (cLat === undefined || cLng === undefined) {
      setForecast(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setFailed(false)
    loadBtfForecast(cLat, cLng, FORECAST_DAYS)
      .then((f) => !cancelled && setForecast(f))
      .catch(() => !cancelled && setFailed(true))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [cLat, cLng])

  const drones = useMemo(() => (toolId ? fleet.filter((d) => d.toolId === toolId) : []), [fleet, toolId])
  const limits: FlightLimits = useMemo(() => (drones.length ? mergeLimits(drones.map((d) => d.limits)) : GENERIC_LIMITS), [drones])

  const result = useMemo(() => {
    if (!forecast || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(start)) return null
    const startKey = `${start.slice(0, 13)}:00`
    const idx = forecast.hours.findIndex((h) => h.time === startKey)
    if (idx < 0) return startKey < forecast.hours[0].time ? { kind: 'past' as const } : { kind: 'range' as const }

    let n = 1
    if (end && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(end)) {
      const ms = Date.parse(`${end.slice(0, 16)}:00Z`) - Date.parse(`${startKey}:00Z`)
      if (ms > 0) n = Math.min(MAX_WINDOW_HOURS, Math.max(1, Math.ceil(ms / 3_600_000)))
    }
    const hours = forecast.hours.slice(idx, idx + n)
    const summary = summariseWindow(hours, scoreForecast(hours, limits))
    return { kind: 'ok' as const, hours, summary }
  }, [forecast, start, end, limits])

  const muted = isDark ? 'text-slate-400' : 'text-slate-500'
  if (!start) return null

  const row = (children: React.ReactNode) => (
    <div className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs ${isDark ? 'border-slate-600 bg-slate-700/30' : 'border-slate-200 bg-slate-50/60'} ${muted}`}>{children}</div>
  )

  if (!coords) {
    return row(
      <>
        <MapPin size={13} className="shrink-0" /> {t('operations.calendar.btf.opNoLocation')}
      </>,
    )
  }
  if (loading) return <Skeleton className="h-[52px] w-full max-w-xs rounded-lg" />
  if (failed) return row(t('operations.calendar.btf.opUnavailable'))
  if (!result) return null
  if (result.kind === 'past') return row(t('operations.calendar.btf.opPast'))
  if (result.kind === 'range') return row(t('operations.calendar.btf.opOutOfRange', { days: FORECAST_DAYS }))

  const { hours, summary: s } = result
  const tone = TONES[s.night ? 'night' : s.status]
  const statusLabel = s.night ? t('operations.calendar.btf.night') : t(`operations.calendar.btf.${s.status}`)
  const first = hours[0]
  const range = `${hhmm(hourOf(first.time))} – ${hhmm((hourOf(hours[hours.length - 1].time) + 1) % 24)}`
  const place = coords.name ?? `${coords.latitude.toFixed(2)}, ${coords.longitude.toFixed(2)}`

  const clouds = hours.map((h) => h.cloudCoverPct).filter((v): v is number => v !== null)
  const vis = hours.map((h) => h.visibilityM).filter((v): v is number => v !== null)
  const temps = hours.map((h) => h.tempC).filter((v): v is number => v !== null)
  const lines: Array<[string, string]> = [
    [t('operations.calendar.btf.wind'), `${s.avgWindMs.toFixed(1)} m/s (max ${limits.maxWindMs})`],
    [t('operations.calendar.btf.gusts'), `${s.maxGustMs.toFixed(1)} m/s (max ${limits.maxGustMs})`],
    [t('operations.calendar.btf.rain'), `${s.rainMm.toFixed(1)} mm`],
    [t('operations.calendar.btf.cloudCover'), clouds.length ? `${Math.round(mean(clouds))}%` : '—'],
    [t('operations.calendar.btf.visibility'), vis.length ? `${(Math.min(...vis) / 1000).toFixed(1)} km` : '—'],
    [t('operations.calendar.btf.temperature'), temps.length ? `${Math.round(mean(temps))} °C` : '—'],
  ]

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className={`flex w-full max-w-xs cursor-help items-center gap-3 rounded-lg border px-3 py-2 text-left ${isDark ? tone.dark : tone.light}`}>
            <WeatherGlyph code={s.weatherCode} night={s.night} isDark={isDark} />
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-semibold uppercase tracking-wider opacity-70">{t('operations.calendar.btf.opWeather')}</span>
              <span className="flex items-center gap-1.5 text-xs font-semibold">
                <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
                {statusLabel}
                {s.limiting && s.limiting !== 'night' && (
                  <span className="font-normal opacity-70">
                    · {t('operations.calendar.btf.limitedBy', { factor: t(`operations.calendar.btf.${s.limiting === 'gust' ? 'gusts' : s.limiting}`).toLowerCase() })}
                  </span>
                )}
              </span>
            </span>
            <span className="text-xl font-bold leading-none tabular-nums">{s.night ? '--' : s.status === 'nogo' ? '✕' : s.score}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start" className="w-64 space-y-2 p-3">
          <div>
            <p className="text-xs font-semibold">
              {t(`operations.calendar.btf.wmo.${wmoKey(s.weatherCode)}`)} · {range}
            </p>
            <p className="text-[11px] opacity-70">{t('operations.calendar.btf.opSource', { place })}</p>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px] tabular-nums">
            {lines.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="opacity-70">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="border-t border-white/20 pt-1.5 text-[10px] opacity-70">
            {drones.length
              ? t('operations.calendar.btf.opLimitsFor', { models: [...new Set(drones.map((d) => d.modelName ?? t('operations.calendar.btf.noModel')))].join(', ') })
              : t('operations.calendar.btf.opLimitsGeneric')}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
