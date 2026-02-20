 export function colorByStatusCode(
  code?: string | null,
  dbColor?: string | null
): string {
  if (dbColor) return dbColor;
  return colorByStatus(code);
}

export function colorByStatus(status?: string | null): string {
  const s = (status ?? "").toUpperCase();
  if (s === "OPERATIONAL" || s === "AVAILABLE" || s === "IN_SERVICE")
    return "#2e7d32";
  if (
    s === "NOT_OPERATIONAL" ||
    s === "UNAVAILABLE" ||
    s === "OFFLINE"
  )
    return "#b71c1c";
  if (s === "MAINTENANCE" || s === "IN_MAINTENANCE") return "#f57c00";
  if (s === "DECOMMISSIONED" || s === "RETIRED") return "#616161";
  return "#616161";
}


export function statusLabel(status?: string | null): string {
  const s = (status ?? "").toUpperCase();
  const map: Record<string, string> = {
    OPERATIONAL: "Operational",
    NOT_OPERATIONAL: "Not Operational",
    MAINTENANCE: "Maintenance",
    DECOMMISSIONED: "Decommissioned",
    AVAILABLE: "Available",
    IN_SERVICE: "In Service",
    OFFLINE: "Offline",
  };
  return map[s] ?? status ?? "Unknown";
}


export function isValidCoord(
  lat: number | undefined | null,
  lon: number | undefined | null
): boolean {
  if (typeof lat !== "number" || typeof lon !== "number") return false;
  return (
    lat !== 0 && lon !== 0 && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
  );
}

 

export function isDock(row: Record<string, any>): boolean {
  const fields = [
    row.tool_type_code,
    row.tool_type_name,
    row.tool_type_category,
    row.tool_code,
    row.tool_name,
    row.tool_description,
    row.tool_desc,
    row.model_name,
    row.factory_type,
    row.factory_serie,
    row.factory_model,
    row.tool_gcs_type,
  ];
  return fields.some((f) => (f ?? "").toString().toUpperCase().includes("DOCK"));
}


export function matchSearch(row: Record<string, any>, query: string): boolean {
  if (!query) return true;
  const q = query.trim().toUpperCase();
  const haystack = [
    row.tool_code,
    row.tool_name,
    row.tool_serial_number,
    row.tool_serialnumber,
    row.client_name,
    row.tool_description,
    row.tool_desc,
    row.model_name,
    row.factory_model,
    row.manufacturer,
    row.factory_type,
    row.tool_type_name,
    row.location,
  ]
    .map((x) => (x ?? "").toString().toUpperCase())
    .join(" | ");
  return haystack.includes(q);
}


export function makeArcPoints(
  p0: [number, number],
  p1: [number, number],
  curvature = 0.25,
  segments = 60
): [number, number][] {
  const [lat0, lon0] = p0;
  const [lat1, lon1] = p1;
  const mx = (lat0 + lat1) / 2;
  const my = (lon0 + lon1) / 2;
  const vx = lat1 - lat0;
  const vy = lon1 - lon0;
  const len = Math.sqrt(vx * vx + vy * vy) || 1;
  const nx = -vy / len;
  const ny = vx / len;
  const k = curvature * len;
  const cx = mx + nx * k;
  const cy = my + ny * k;

  const pts: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = (1 - t) * (1 - t);
    const b = 2 * (1 - t) * t;
    const c = t * t;
    pts.push([
      a * lat0 + b * cx + c * lat1,
      a * lon0 + b * cy + c * lon1,
    ]);
  }
  return pts;
}


export const DEFAULT_CONTROL_CENTER = {
  lat: 41.9136,
  lon: 12.5,
  label: "Control Center — Via Nizza 53, Roma",
};