import type { FlightLimits, HourWeather, LimitsSource } from './scoring'

/** One drone (a DRONE component on a system) the owner can fly. */
export interface BtfDrone {
  /** tool_component id - unique per drone */
  componentId: number
  toolId: number
  /** System code, e.g. SYS-001 */
  systemCode: string
  systemName: string | null
  /** The drone component's own name */
  droneName: string
  serialNumber: string | null
  /** Null when the component has no drone model set */
  modelId: number | null
  modelName: string | null
  manufacturer: string | null
  /** Limits come from the drone's model, or generic defaults without one */
  limits: FlightLimits
  limitsSource: LimitsSource
  /** The system's coordinates (null when the system has no location set) */
  latitude: number | null
  longitude: number | null
  locationName: string | null
}

/** A system and its drones, with the location the weather is fetched for. */
export interface BtfSystem {
  toolId: number
  code: string
  name: string
  location: { latitude: number; longitude: number; name: string | null } | null
  /** componentIds of its drones */
  droneIds: number[]
}

export interface BtfForecast {
  latitude: number
  longitude: number
  timezone: string
  hours: HourWeather[]
  /** When the data was fetched from the weather service (epoch ms) - cached copies keep their original time */
  retrievedAt: number
}

export interface BtfPlace {
  name: string
  region: string | null
  country: string | null
  latitude: number
  longitude: number
}
