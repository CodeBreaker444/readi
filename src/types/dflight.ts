export interface DFlightDroneRow {
  dFlightId: string;
  dFlightName: string;
  serialNumber: string | null;
  gcsSerialNumber: string | null;
  matriculationNumber: string | null;
  status: string | null;
  modelName: string | null;
  manufacturerName: string | null;
  insuranceCompany: string | null;
  insuranceExpiryDate: string | null;
  uasClassId: string | null;
  qrCodeImage: string | null;
  linked: boolean;
  componentId: number | null;
  systemId: number | null;
  systemName: string | null;
  componentName: string | null;
  storedDrc: string | null;
}
