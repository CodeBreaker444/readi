'use client'

import { wmoKey, type WmoKey } from '@/lib/btf/weather'
import {
  WiCloudy,
  WiDayCloudy,
  WiDaySunny,
  WiFog,
  WiNightAltCloudy,
  WiNightAltRain,
  WiNightAltSnow,
  WiNightAltThunderstorm,
  WiNightClear,
  WiRain,
  WiSnow,
  WiSprinkle,
  WiThunderstorm,
} from 'react-icons/wi'

type Tint = { light: string; dark: string }

const TINTS: Record<WmoKey | 'night', Tint> = {
  clear: { light: 'bg-amber-100 text-amber-500', dark: 'bg-amber-400/15 text-amber-300' },
  mostlyClear: { light: 'bg-amber-100 text-amber-500', dark: 'bg-amber-400/15 text-amber-300' },
  partlyCloudy: { light: 'bg-sky-100 text-amber-500', dark: 'bg-sky-400/15 text-amber-300' },
  overcast: { light: 'bg-slate-200 text-slate-500', dark: 'bg-slate-400/15 text-slate-300' },
  fog: { light: 'bg-slate-200 text-slate-500', dark: 'bg-slate-400/15 text-slate-300' },
  drizzle: { light: 'bg-sky-100 text-sky-500', dark: 'bg-sky-400/15 text-sky-300' },
  rain: { light: 'bg-blue-100 text-blue-600', dark: 'bg-blue-400/15 text-blue-300' },
  snow: { light: 'bg-cyan-100 text-cyan-500', dark: 'bg-cyan-400/15 text-cyan-300' },
  thunderstorm: { light: 'bg-violet-100 text-violet-600', dark: 'bg-violet-400/15 text-violet-300' },
  night: { light: 'bg-indigo-100 text-indigo-500', dark: 'bg-indigo-400/15 text-indigo-300' },
}

function glyph(key: WmoKey, night: boolean, size: number) {
  if (night) {
    switch (key) {
      case 'thunderstorm':
        return <WiNightAltThunderstorm size={size} />
      case 'snow':
        return <WiNightAltSnow size={size} />
      case 'rain':
      case 'drizzle':
        return <WiNightAltRain size={size} />
      case 'partlyCloudy':
        return <WiNightAltCloudy size={size} />
      case 'overcast':
        return <WiCloudy size={size} />
      case 'fog':
        return <WiFog size={size} />
      default:
        return <WiNightClear size={size} />
    }
  }
  switch (key) {
    case 'thunderstorm':
      return <WiThunderstorm size={size} />
    case 'snow':
      return <WiSnow size={size} />
    case 'rain':
      return <WiRain size={size} />
    case 'drizzle':
      return <WiSprinkle size={size} />
    case 'fog':
      return <WiFog size={size} />
    case 'overcast':
      return <WiCloudy size={size} />
    case 'partlyCloudy':
      return <WiDayCloudy size={size} />
    default:
      return <WiDaySunny size={size} />
  }
}

interface Props {
  /** WMO weather code */
  code: number
  night: boolean
  isDark: boolean
  /** md = 40px badge, sm = 32px */
  size?: 'sm' | 'md'
  className?: string
}

/** Weather condition as a tinted round badge: sun, clouds, rain, snow, storm - with night variants. */
export function WeatherGlyph({ code, night, isDark, size = 'md', className = '' }: Props) {
  const key = wmoKey(code)
  const tint = TINTS[night ? 'night' : key]
  const box = size === 'md' ? 'h-10 w-10' : 'h-8 w-8'
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full shadow-sm ring-1 ${isDark ? 'ring-white/10' : 'ring-black/5'} ${box} ${isDark ? tint.dark : tint.light} ${className}`}>
      {glyph(key, night, size === 'md' ? 28 : 22)}
    </span>
  )
}
