export interface SiteLocation {
  latitude: number
  longitude: number
  /** Friendly name: the system's pseudo name, or its free-text location */
  name: string | null
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * Reads a system's coordinates from tool_metadata (latitude / longitude / pseudo_name).
 * Returns null when they are missing or unusable - 0,0 is treated as "not set" because
 * that is what an untouched form saves.
 */
export function readToolLocation(meta: unknown, locationText?: string | null): SiteLocation | null {
  const m = (meta ?? {}) as Record<string, unknown>
  const latitude = toNumber(m.latitude)
  const longitude = toNumber(m.longitude)
  if (latitude === null || longitude === null) return null
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null
  if (latitude === 0 && longitude === 0) return null

  const pseudo = typeof m.pseudo_name === 'string' ? m.pseudo_name.trim() : ''
  return { latitude, longitude, name: pseudo || locationText?.trim() || null }
}
