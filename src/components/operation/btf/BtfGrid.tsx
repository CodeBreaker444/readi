'use client'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { FlightLimits, WindowSummary } from '@/lib/btf/scoring'
import { wmoKey } from '@/lib/btf/weather'
import { Droplet, Gauge, Star, Wind, X } from 'lucide-react'
import { Fragment, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { dayLabel, hhmm } from './btf-utils'
import { WeatherGlyph } from './WeatherGlyph'

export type MetricView = 'overall' | 'wind' | 'gust' | 'rain'

export interface GridCell {
  key: string
  startHour: number
  endHour: number
  summary: WindowSummary
  /** The window has already started, so it can't be recommended */
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
  /** The limits the cells were scored against (strictest of the selected drones) */
  limits: FlightLimits
  /** Plain-language list of the drone models behind those limits */
  scoredAgainst: string
  /** Short name of the timezone the times are shown in */
  tzLabel: string
}

type Tone = 'go' | 'marginal' | 'nogo' | 'night'

const TONES: Record<Tone, { light: string; dark: string; dot: string }> = {
  go: { light: 'bg-emerald-200 text-emerald-950', dark: 'bg-emerald-500/25 text-emerald-50', dot: 'bg-emerald-500' },
  marginal: { light: 'bg-amber-200 text-amber-950', dark: 'bg-amber-500/25 text-amber-50', dot: 'bg-amber-400' },
  nogo: { light: 'bg-rose-200 text-rose-950', dark: 'bg-rose-500/25 text-rose-50', dot: 'bg-rose-500' },
  night: { light: 'bg-slate-100 text-slate-600', dark: 'bg-slate-800/70 text-slate-400', dot: 'bg-slate-400' },
}

const toneOf = (s: WindowSummary): Tone => (s.night ? 'night' : s.status)

/**
 * Below this grid width (a phone, or a narrow column) one day is shown at a time with a day picker;
 * at or above it all days sit side by side and the grid scrolls sideways if it must.
 */
const NARROW = '@max-4xl:hidden'

export function BtfGrid({ days, starts, cells, bestKey, view, todayKey, isDark, locale, limits, scoredAgainst, tzLabel }: Props) {
  const { t } = useTranslation()
  const muted = isDark ? 'text-slate-400' : 'text-slate-500'
  const tomorrowKey = days[days.indexOf(todayKey) + 1]

  // Narrow screens show one day: the picked one, else today, else the first day.
  const [picked, setPicked] = useState<string | null>(null)
  const activeDay = picked && days.includes(picked) ? picked : days.includes(todayKey) ? todayKey : days[0]

  const dayTitle = (day: string) =>
    day === todayKey ? t('operations.calendar.btf.today') : day === tomorrowKey ? t('operations.calendar.btf.tomorrow') : dayLabel(day, locale, { weekday: 'short' })

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

  const factorLabel = (f: string) => t(`operations.calendar.btf.${f === 'gust' ? 'gusts' : f}`)

  return (
    <div className="@container">
      {/* Narrow screens: pick a day */}
      <div className="flex gap-2 overflow-x-auto px-4 pt-4 @4xl:hidden" role="tablist" aria-label={t('operations.calendar.btf.pickDay')}>
        {days.map((day) => {
          const on = day === activeDay
          return (
            <button
              key={day}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setPicked(day)}
              className={`flex min-w-[64px] shrink-0 cursor-pointer flex-col items-center rounded-xl border px-3 py-2 transition-colors ${
                on
                  ? 'border-violet-600 bg-violet-600 text-white shadow-sm'
                  : isDark
                    ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="text-xs font-semibold uppercase tracking-wide opacity-80">{dayLabel(day, locale, { weekday: 'short' })}</span>
              <span className="text-lg font-bold leading-tight tabular-nums">{Number(day.slice(8, 10))}</span>
            </button>
          )
        })}
      </div>

      <div className="p-4 @4xl:overflow-x-auto">
        <div
          className="grid grid-cols-[52px_minmax(0,1fr)] gap-2 @4xl:[grid-template-columns:52px_repeat(var(--btf-days),minmax(150px,1fr))]"
          style={{ '--btf-days': days.length } as CSSProperties}
        >
          {/* Day headers */}
          <div />
          {days.map((day) => {
            const isToday = day === todayKey
            return (
              <div
                key={day}
                className={`items-center justify-between rounded-xl border px-3 py-2.5 ${day === activeDay ? 'flex' : 'flex ' + NARROW} ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}
              >
                <div className="min-w-0">
                  <p className={`truncate text-sm font-semibold leading-tight ${isToday ? 'text-violet-600' : isDark ? 'text-slate-100' : 'text-slate-900'}`}>{dayTitle(day)}</p>
                  <p className={`mt-0.5 truncate text-xs ${muted}`}>{dayLabel(day, locale, { month: 'short', day: 'numeric' })}</p>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className={`text-xs font-medium ${muted}`}>{dayLabel(day, locale, { weekday: 'short' })}</span>
                  <span
                    className={`min-w-[28px] rounded-md px-1.5 py-0.5 text-center text-[13px] font-semibold tabular-nums ${
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
              <div className={`flex items-center justify-end pr-1 text-[13px] font-medium tabular-nums ${muted}`}>{hhmm(start)}</div>
              {days.map((day) => {
                const cell = cells.get(`${day}|${start}`)
                if (!cell) return <div key={day} className={day === activeDay ? '' : NARROW} />
                const s = cell.summary
                const tone = TONES[toneOf(s)]
                const big = bigValue(s)
                const best = cell.key === bestKey
                // Say why a window is not green, right in the cell
                const caption = s.night ? t('operations.calendar.btf.night') : s.status !== 'go' && s.limiting ? factorLabel(s.limiting) : null
                const range = `${hhmm(cell.startHour)}–${hhmm(cell.endHour)}`

                return (
                  <Popover key={day}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        aria-label={`${dayTitle(day)} ${range}: ${s.night ? t('operations.calendar.btf.night') : t(`operations.calendar.btf.${s.status}`)}`}
                        className={[
                          'relative w-full cursor-pointer rounded-xl px-3 py-2.5 text-left transition-[opacity,box-shadow] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
                          day === activeDay ? '' : NARROW,
                          isDark ? tone.dark : tone.light,
                          cell.past ? 'opacity-45' : '',
                          best ? `ring-2 ring-violet-500 ring-offset-2 ${isDark ? 'ring-offset-slate-800' : 'ring-offset-white'}` : '',
                        ].join(' ')}
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-[13px] font-semibold leading-tight tabular-nums">{range}</span>
                          <span className="text-xl font-bold leading-none tabular-nums">
                            {big === null ? <X size={20} strokeWidth={3} className={isDark ? 'text-rose-300' : 'text-rose-600'} /> : big}
                          </span>
                        </span>
                        <span className="mt-2 flex items-center gap-2.5">
                          <WeatherGlyph code={s.weatherCode} night={s.night} isDark={isDark} size="sm" />
                          <span className="block space-y-0.5 text-xs font-medium tabular-nums">
                            <span className="flex items-center gap-1.5">
                              <Wind size={12} className="shrink-0 text-sky-600" /> {s.avgWindMs.toFixed(1)} m/s
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Gauge size={12} className="shrink-0 text-violet-600" /> {s.maxGustMs.toFixed(1)} m/s
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Droplet size={12} className="shrink-0 text-blue-600" /> {s.rainMm.toFixed(1)} mm
                            </span>
                          </span>
                        </span>
                        {caption && <span className="mt-1.5 block text-xs font-semibold opacity-80">{caption}</span>}
                        {best && <Star size={14} className="absolute bottom-2 right-2 fill-violet-500 text-violet-500" />}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="center" className="w-72 p-0">
                      <CellDetail
                        title={`${dayLabel(day, locale, { weekday: 'long', month: 'short', day: 'numeric' })} · ${range} (${tzLabel})`}
                        summary={s}
                        limits={limits}
                        best={best}
                        scoredAgainst={scoredAgainst}
                        dot={tone.dot}
                      />
                    </PopoverContent>
                  </Popover>
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Everything behind one window, opened by click, tap or keyboard (never hover-only). */
function CellDetail({ title, summary: s, limits, best, scoredAgainst, dot }: { title: string; summary: WindowSummary; limits: FlightLimits; best: boolean; scoredAgainst: string; dot: string }) {
  const { t } = useTranslation()
  const status = s.night ? t('operations.calendar.btf.night') : t(`operations.calendar.btf.${s.status}`)
  const factor = s.limiting && s.limiting !== 'night' ? t(`operations.calendar.btf.${s.limiting === 'gust' ? 'gusts' : s.limiting}`).toLowerCase() : null

  const rows: Array<[string, string, string?]> = [
    [t('operations.calendar.btf.wind'), `${s.avgWindMs.toFixed(1)} m/s`, t('operations.calendar.btf.detailMax', { value: `${limits.maxWindMs} m/s` })],
    [t('operations.calendar.btf.gusts'), `${s.maxGustMs.toFixed(1)} m/s`, t('operations.calendar.btf.detailMax', { value: `${limits.maxGustMs} m/s` })],
    [
      t('operations.calendar.btf.rain'),
      `${s.rainMm.toFixed(1)} mm`,
      limits.maxPrecipMmH > 0 ? t('operations.calendar.btf.detailMax', { value: `${limits.maxPrecipMmH} mm/h` }) : t('operations.calendar.btf.noRainAllowed'),
    ],
    [t('operations.calendar.btf.rainChance'), s.maxPrecipProb !== null ? `${Math.round(s.maxPrecipProb)}%` : '—'],
    [t('operations.calendar.btf.cloudCover'), s.avgCloudPct !== null ? `${Math.round(s.avgCloudPct)}%` : '—'],
    [
      t('operations.calendar.btf.visibility'),
      s.minVisibilityM !== null ? `${(s.minVisibilityM / 1000).toFixed(1)} km` : '—',
      t('operations.calendar.btf.detailMin', { value: `${(limits.minVisibilityM / 1000).toFixed(1)} km` }),
    ],
    [t('operations.calendar.btf.temperature'), s.avgTempC !== null ? `${Math.round(s.avgTempC)} °C` : '—', `${limits.minTempC}…${limits.maxTempC} °C`],
  ]

  return (
    <div className="space-y-3 p-4">
      <div>
        <p className="text-[13px] font-semibold leading-snug">{title}</p>
        <p className="mt-1 text-sm">{t(`operations.calendar.btf.wmo.${wmoKey(s.weatherCode)}`)}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
          {status}
          {!s.night && s.status !== 'nogo' && <span className="tabular-nums"> · {s.score}/100</span>}
        </span>
        {best && (
          <span className="flex items-center gap-1 rounded-full bg-violet-600 px-2 py-0.5 text-xs font-semibold text-white">
            <Star size={11} className="fill-current" /> {t('operations.calendar.btf.legendBest')}
          </span>
        )}
      </div>
      {factor && <p className="text-sm text-muted-foreground">{t('operations.calendar.btf.limitedBy', { factor })}</p>}

      <dl className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-3 gap-y-1.5 text-sm tabular-nums">
        {rows.map(([k, v, limit]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="text-right font-semibold">{v}</dd>
            <dd className="min-w-[4.5rem] text-right text-xs text-muted-foreground">{limit ?? ''}</dd>
          </div>
        ))}
      </dl>

      <p className="border-t pt-2 text-xs text-muted-foreground">{scoredAgainst}</p>
    </div>
  )
}
