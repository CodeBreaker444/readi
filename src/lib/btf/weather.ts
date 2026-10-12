/** Maps a WMO weather code to a translation key under operations.calendar.btf.wmo.* */
export type WmoKey = 'clear' | 'mostlyClear' | 'partlyCloudy' | 'overcast' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunderstorm'

export function wmoKey(code: number | null | undefined): WmoKey {
  const c = code ?? 0
  if (c >= 95) return 'thunderstorm'
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'snow'
  if ((c >= 61 && c <= 67) || (c >= 80 && c <= 82)) return 'rain'
  if (c >= 51 && c <= 57) return 'drizzle'
  if (c === 45 || c === 48) return 'fog'
  if (c === 3) return 'overcast'
  if (c === 2) return 'partlyCloudy'
  if (c === 1) return 'mostlyClear'
  return 'clear'
}
