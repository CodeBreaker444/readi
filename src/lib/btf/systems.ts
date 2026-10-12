 import type { BtfDrone, BtfSystem } from './types'

/** Groups the drone list by system, keeping each system's location and its drones. */
export function groupSystems(fleet: BtfDrone[]): BtfSystem[] {
  const byTool = new Map<number, BtfSystem>()
  for (const d of fleet) {
    const existing = byTool.get(d.toolId)
    if (existing) {
      existing.droneIds.push(d.componentId)
      continue
    }
    byTool.set(d.toolId, {
      toolId: d.toolId,
      code: d.systemCode,
      name: d.systemName || d.systemCode,
      location: d.latitude !== null && d.longitude !== null ? { latitude: d.latitude, longitude: d.longitude, name: d.locationName } : null,
      droneIds: [d.componentId],
    })
  }
  return [...byTool.values()]
}
