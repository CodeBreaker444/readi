export interface ComponentExpiryFields {
  expiry_type?: string | null;
  expiration_date?: string | Date | null;
  expiration_flights?: number | null;
  expiration_flight_hours?: number | null;
  current_maintenance_flights?: number | null;
  current_usage_hours?: number | null;
}

export interface ComponentExpiryInfo {
  parts: string[];
  expired: boolean;
  expiryType: string;
}

export function getComponentExpiryInfo(comp: ComponentExpiryFields): ComponentExpiryInfo {
  const expiryType = comp.expiry_type || 'EXPIRATION_DATE';
  const today = new Date().toISOString().split('T')[0];
  const dateStr = comp.expiration_date
    ? new Date(comp.expiration_date).toISOString().split('T')[0]
    : null;

  const isDateExpired = !!dateStr && dateStr <= today;
  const isFlightExpired =
    comp.expiration_flights != null &&
    Number(comp.current_maintenance_flights ?? 0) >= comp.expiration_flights;
  const isFlightHoursExpired =
    comp.expiration_flight_hours != null &&
    Number(comp.current_usage_hours ?? 0) >= Number(comp.expiration_flight_hours);

  const expired =
    expiryType === 'FLIGHTS'
      ? isFlightExpired
      : expiryType === 'FLIGHT_HOURS'
        ? isFlightHoursExpired
        : expiryType === 'MIXED'
          ? isDateExpired || isFlightExpired || isFlightHoursExpired
          : isDateExpired;

  const parts: string[] = [];
  if ((expiryType === 'EXPIRATION_DATE' || expiryType === 'MIXED') && dateStr) {
    parts.push(new Date(dateStr).toLocaleDateString());
  }
  if ((expiryType === 'FLIGHTS' || expiryType === 'MIXED') && comp.expiration_flights != null) {
    parts.push(`${Number(comp.current_maintenance_flights ?? 0)}/${comp.expiration_flights} flights`);
  }
  if ((expiryType === 'FLIGHT_HOURS' || expiryType === 'MIXED') && comp.expiration_flight_hours != null) {
    parts.push(`${Number(comp.current_usage_hours ?? 0).toFixed(1)}/${Number(comp.expiration_flight_hours).toFixed(1)} hrs`);
  }

  return { parts, expired, expiryType };
}
