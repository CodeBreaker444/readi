export interface DFlightDroneRow {
  dFlightId: string | null;
  dFlightName: string;
  serialNumber: string | null;
  uasSerialNumber?: string | null;
  gcsSerialNumber: string | null;
  matriculationNumber: string | null;
  status: string | null;
  modelName: string | null;
  manufacturerName: string | null;
  insuranceCompany: string | null;
  insuranceExpiryDate: string | null;
  uasClassId: string | null;
  qrCodeImage: string | null;
  modelId: string | null;
  manufacturerId: string | null;
  linked: boolean;
  componentId: number | null;
  systemId: number | null;
  systemName: string | null;
  componentName: string | null;
  storedDrc: string | null;
  /** Present when the row was already matched — the values currently stored on the ReADI component. */
  storedLicensePlate?: string | null;
  storedUasSerial?: string | null;
  storedGcsSerial?: string | null;
  /** 'DFLIGHT' rows come from the d-flight fleet; 'READI_ONLY' rows are ReADI drone components with no d-flight counterpart. */
  origin?: 'DFLIGHT' | 'READI_ONLY';
}
