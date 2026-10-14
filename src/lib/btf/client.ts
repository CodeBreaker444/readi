import axios from 'axios'
import type { BtfDrone, BtfForecast } from './types'

const FLEET_TTL_MS = 60_000
const FORECAST_TTL_MS = 15 * 60_000

let fleetCache: { at: number; promise: Promise<BtfDrone[]> } | null = null
const forecastCache = new Map<string, { at: number; promise: Promise<BtfForecast> }>()

/** The owner's drones (with system location and limits). Shared between the planner tab and the operation form. */
export function loadBtfFleet(force = false): Promise<BtfDrone[]> {
  if (!force && fleetCache && Date.now() - fleetCache.at < FLEET_TTL_MS) return fleetCache.promise
  const promise = axios.get('/api/operation/btf/fleet').then((r) => r.data.data.fleet as BtfDrone[])
  fleetCache = { at: Date.now(), promise }
  promise.catch(() => {
    if (fleetCache?.promise === promise) fleetCache = null
  })
  return promise
}

/** Hourly forecast for a point, cached per ~1 km cell so retyping a date doesn't refetch. */
export function loadBtfForecast(lat: number, lon: number, days: number): Promise<BtfForecast> {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)},${days}`
  const hit = forecastCache.get(key)
  if (hit && Date.now() - hit.at < FORECAST_TTL_MS) return hit.promise
  const promise = axios.get('/api/operation/btf', { params: { lat, lon, days } }).then((r) => r.data.data.forecast as BtfForecast)
  forecastCache.set(key, { at: Date.now(), promise })
  promise.catch(() => forecastCache.delete(key))
  return promise
}
