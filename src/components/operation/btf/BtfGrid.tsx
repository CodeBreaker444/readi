'use client'

import type { WindowSummary } from '@/lib/btf/scoring'
import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Droplet, Gauge, Moon, Star, Sun, Wind, X, type LucideIcon } from 'lucide-react'
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { dayLabel, hhmm } from './btf-utils'

export type MetricView = 'overall' | 'wind' | 'gust' | 'rain'

export interface GridCell {
  key: string
  startHour: number
  endHour: number
  summary: WindowSummary
  /** The whole window is already behind us */
  past: boolean
}

interface Props {
  days: string[]
  starts: number[]
  cells: Map<string, GridCell>
  bestKey: string | null
  view: MetricView
  todayKey: string
  isDark: boolean
  locale: string
}

function weatherIcon(code: number, night: boolean): LucideIcon {
  if (night) return Moon
  if (code >= 95) return CloudLightning
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return CloudSnow
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return CloudRain
  if (code === 45 || code === 48) return CloudFog
  if (code === 3) return Cloud
  if (code >= 1) return CloudSun
  return Sun
}

type Tone = 'go' | 'marginal' | 'nogo' | 'night'

const TONES: Record<Tone, { light: string; dark: string; iconLight: string; iconDark: string }> = {
  go: { light: 'bg-emerald-200 text-emerald-950', dark: 'bg-emerald-500/25 text-emerald-50', iconLight: 'text-emerald-700', iconDark: 'text-emerald-300' },
  marginal: { light: 'bg-amber-200 text-amber-950', dark: 'bg-amber-500/25 text-amber-50', iconLight: 'text-amber-700', iconDark: 'text-amber-300' },
  nogo: { light: 'bg-rose-200 text-rose-950', dark: 'bg-rose-500/25 text-rose-50', iconLight: 'text-rose-600', iconDark: 'text-rose-300' },
  night: { light: 'bg-slate-100 text-slate-600', dark: 'bg-slate-800/70 text-slate-400', iconLight: 'text-slate-400', iconDark: 'text-slate-500' },
}

const toneOf = (s: WindowSummary): Tone => (s.night ? 'night' : s.status)

export function BtfGrid({ days, starts, cells, bestKey, view, todayKey, isDark, locale }: Props) {
  const { t } = useTranslation()
  const muted = isDark ? 'text-slate-500' : 'text-slate-400'
  const tomorrowKey = days[days.indexOf(todayKey) + 1]

  const bigValue = (s: WindowSummary) => {
    switch (view) {
      case 'wind':
        return s.avgWindMs.toFixed(1)
      case 'gust':
        return s.maxGustMs.toFixed(1)
      case 'rain':
        return s.rainMm.toFixed(1)
      default:
        return s.night ? '--' : s.status === 'nogo' ? null : String(s.score)
    }
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[1000px] p-4">
        <div className="grid gap-2" style={{ gridTemplateColumns: `52px repeat(${days.length}, minmax(0, 1fr))` }}>
          {/* Day headers */}
          <div />
          {days.map((day) => {
            const isToday = day === todayKey
            const title = isToday
              ? t('operations.calendar.btf.today')
              : day === tomorrowKey
                ? t('operations.calendar.btf.tomorrow')
                : dayLabel(day, locale, { weekday: 'short' })
            return (
              <div
                key={day}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}
              >
                <div className="min-w-0">
                  <p className={`truncate text-[13px] font-semibold leading-tight ${isToday ? 'text-violet-600' : isDark ? 'text-slate-100' : 'text-slate-900'}`}>{title}</p>
                  <p className={`mt-0.5 truncate text-[11px] ${muted}`}>{dayLabel(day, locale, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className={`text-[10px] font-medium ${muted}`}>{dayLabel(day, locale, { weekday: 'short' })}</span>
                  <span
                    className={`min-w-[26px] rounded-md px-1.5 py-0.5 text-center text-[12px] font-semibold tabular-nums ${
                      isToday ? 'bg-violet-600 text-white' : isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {Number(day.slice(8, 10))}
                  </span>
                </div>
              </div>
            )
          })}

          {/* Rows of windows */}
          {starts.map((start) => (
            <Fragment key={start}>
              <div className={`flex items-center justify-end pr-2 text-xs font-medium tabular-nums ${muted}`}>{hhmm(start)}</div>
              {days.map((day) => {
                const cell = cells.get(`${day}|${start}`)
                if (!cell) return <div key={day} />
                const s = cell.summary
                const tone = TONES[toneOf(s)]
                const Icon = weatherIcon(s.weatherCode, s.night)
                const big = bigValue(s)
                const best = cell.key === bestKey
                return (
                  <div
                    key={day}
                    title={`${hhmm(cell.startHour)} – ${hhmm(cell.endHour)} · ${s.night ? t('operations.calendar.btf.night') : t(`operations.calendar.btf.${s.status}`)}${
                      s.limiting && s.limiting !== 'night'
                        ? ` · ${t('operations.calendar.btf.limitedBy', { factor: t(`operations.calendar.btf.${s.limiting === 'gust' ? 'gusts' : s.limiting}`).toLowerCase() })}`
                        : ''
                    }`}
                    className={[
                      'relative flex min-h-[78px] items-center gap-2.5 rounded-xl px-3 py-2.5 transition-opacity',
                      isDark ? tone.dark : tone.light,
                      cell.past ? 'opacity-40' : '',
                      best ? `ring-2 ring-violet-500 ring-offset-2 ${isDark ? 'ring-offset-slate-800' : 'ring-offset-white'}` : '',
                    ].join(' ')}
                  >
                    <Icon size={24} strokeWidth={1.75} className={`shrink-0 ${isDark ? tone.iconDark : tone.iconLight}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold leading-tight tabular-nums">
                        {hhmm(cell.startHour)} – {hhmm(cell.endHour)}
                      </p>
                      <div className="mt-1 space-y-px text-[10.5px] font-medium tabular-nums opacity-85">
                        <p className="flex items-center gap-1.5">
                          <Wind size={11} className="shrink-0 text-sky-500" /> {s.avgWindMs.toFixed(1)} m/s
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Gauge size={11} className="shrink-0 text-violet-500" /> {s.maxGustMs.toFixed(1)} m/s
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Droplet size={11} className="shrink-0 text-blue-500" /> {s.rainMm.toFixed(1)} mm
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-xl font-bold leading-none tabular-nums">
                      {big === null ? <X size={22} strokeWidth={3} className={isDark ? 'text-rose-300' : 'text-rose-600'} /> : big}
                    </div>
                    {best && <Star size={13} className="absolute right-1.5 top-1.5 fill-violet-500 text-violet-500" />}
                  </div>
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}
