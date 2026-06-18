export interface FleetRow {
  componentId: number;
  systemId: number;
  systemName: string;
  componentName: string;
  serialNumber: string | null;
  dFlightId: string | null;
  dFlightDroneName: string | null;
  dFlightStatus: string | null;
  dFlightMatriculation: string | null;
  dFlightModel: string | null;
  linked: boolean;
}
