import 'server-only';
import { Agent, fetch as undiciFetch } from 'undici';

const CONNECT_TIMEOUT_MS = 10_000;

export interface DFlightConfig {
  base_url: string;
  username: string;
  password: string;
  client_id: string;
}

export interface DFlightTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface DFlightDroneResult {
  id: string;
  name: string;
  owner: string;
  serialNumber: string | null;
  fcsSerialNumber: string | null;
  gcsSerialNumber: string | null;
  easaOperatorCode: string | null;
  matriculationNumber: string | null;
  status: string | null;
  qrCodeActivationStatus: string | null;
  usage: string | null;
  takeOffMass: string | null;
  'model.modelName': string | null;
  'model.manufacturer.name': string | null;
  uasClassId: string | null;
  manufacturerId: string | null;
  timeOfDelete: string | null;
  insuranceCompany: string | null;
  insuranceExpiryDate: string | null;
  qrCodeImage: string | null;
  modelId: string | null;
}

export interface DFlightModelResult {
  id: string;
  modelCode: string | null;
  modelName: string | null;
  manufacturerId: string | null;
  uasClassId: string | null;
  mtom: string | null;
  tempMin: string | null;
  tempMax: string | null;
}

export interface DFlightManufacturerResult {
  id: string;
  name: string | null;
}

export interface DFlightUasClassResult {
  id: string;
  label: string | null;
}

export interface DFlightDronePageResult {
  result_kind: string;
  result_code: number;
  data: Array<{ resultView: Record<string, string | null> }>;
}

function createUndiciAgent(): Agent {
  const certContent = process.env.DFLIGHT_CERT_CONTENT;
  const keyContent  = process.env.DFLIGHT_KEY_CONTENT;

  if (!certContent || !keyContent) {
    throw new Error(
      'D-Flight TLS configuration is missing. ' +
      'Set DFLIGHT_CERT_CONTENT and DFLIGHT_KEY_CONTENT environment variables.'
    );
  }

  const cert = certContent.replace(/\\n/g, '\n');
  const key  = keyContent.replace(/\\n/g, '\n');

  console.log('D-Flight: creating undici Agent from environment variables');

  return new Agent({
    connect: {
      cert,
      key,
      rejectUnauthorized: false, 
      timeout: CONNECT_TIMEOUT_MS,
    },
  });
}

// Cache for the process lifetime — TLS Agent creation is expensive
let _agent: Agent | null = null;
function getAgent(): Agent {
  if (!_agent) _agent = createUndiciAgent();
  return _agent;
}

async function dFetch(
  url: string,
  init: Parameters<typeof undiciFetch>[1],
): Promise<Awaited<ReturnType<typeof undiciFetch>>> {
  return undiciFetch(url, { ...init, dispatcher: getAgent() });
}


export async function getDFlightToken(config: DFlightConfig): Promise<DFlightTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id:  config.client_id,
    username:   config.username,
    password:   config.password,
    scope:      'openid email profile user-data personal-data pilot-license dflight-identification',
  });

  const res = await dFetch(`${config.base_url}/iam/token`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  });

  console.log(`D-Flight token status: ${res.status}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`D-Flight token request failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<DFlightTokenResponse>;
}

function mapDroneResultView(v: Record<string, string | null>): DFlightDroneResult {
  return {
    id:                        v['id']                        ?? '',
    name:                      v['name']                      ?? '',
    owner:                     v['owner']                     ?? '',
    serialNumber:              v['serialNumber']              ?? null,
    fcsSerialNumber:           v['fcsSerialNumber']           ?? null,
    gcsSerialNumber:           v['gcsSerialNumber']           ?? null,
    easaOperatorCode:          v['easaOperatorCode']          ?? null,
    matriculationNumber:       v['matriculationNumber']       ?? null,
    status:                    v['status']                    ?? null,
    qrCodeActivationStatus:    v['qrCodeActivationStatus']    ?? null,
    qrCodeImage:               v['qrCode']                    ?? v['qrCodeImage'] ?? null,
    usage:                     v['usage']                     ?? null,
    takeOffMass:               v['takeOffMass']               ?? null,
    'model.modelName':         null,
    'model.manufacturer.name': null,
    timeOfDelete:              v['timeOfDelete']              ?? null,
    insuranceCompany:          v['companyName']               ?? null,
    insuranceExpiryDate:       v['insuranceExpireDate']       ?? null,
    uasClassId:                null,
    modelId:                   v['model.id']                  ?? null,
    manufacturerId:            null,
  };
}

export async function getDFlightDrones(
  baseUrl:     string,
  accessToken: string,
  owner:       string,
  pageSize = 200,
): Promise<DFlightDroneResult[]> {
  const drones: DFlightDroneResult[] = [];
  let pageNumber = 0;

  for (;;) {
    const params = new URLSearchParams({
      owner,
      pageNumber: String(pageNumber),
      pageSize:   String(pageSize),
    });

    const res = await dFetch(
      `${baseUrl}/drone-management/v2/api/drones?${params.toString()}`,
      {
        method:  'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept:        'application/json',
        },
      },
    );

    console.log(`D-Flight drones status (page ${pageNumber}): ${res.status}`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`D-Flight drones request failed (${res.status}): ${text}`);
    }

    const json = (await res.json()) as DFlightDronePageResult;
    const pageItems = Array.isArray(json.data) ? json.data : [];

    if (pageNumber === 0 && pageItems[0]) {
      console.log('D-Flight raw drone resultView keys:', Object.keys(pageItems[0].resultView ?? {}));
      console.log('D-Flight raw drone resultView (first item):', JSON.stringify(pageItems[0].resultView, null, 2));
    }

    drones.push(...pageItems.map((item) => mapDroneResultView(item.resultView ?? {})));

    if (pageItems.length < pageSize) break;
    pageNumber += 1;
  }

  return drones;
}

export async function getDFlightUasClass(
  baseUrl:     string,
  accessToken: string,
  classId:     string,
): Promise<DFlightUasClassResult | null> {
  const res = await dFetch(
    `${baseUrl}/drone-management/v2/api/uas-class/${encodeURIComponent(classId)}`,
    {
      method:  'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept:        'application/json',
      },
    },
  );

  if (!res.ok) return null;

  const json = (await res.json()) as { data?: Record<string, unknown> };
  const record = json.data;
  if (!record) return null;

  const label = record['name'] as string | undefined;
  return { id: classId, label: label ?? null };
}

export async function getDFlightModel(
  baseUrl:     string,
  accessToken: string,
  modelId:     string,
): Promise<DFlightModelResult | null> {
  const res = await dFetch(
    `${baseUrl}/drone-management/v2/api/models/search?id=${encodeURIComponent(modelId)}`,
    {
      method:  'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept:        'application/json',
      },
    },
  );

  if (!res.ok) return null;

  const json = (await res.json()) as { data?: unknown[] };
  const record = Array.isArray(json.data) ? (json.data[0] as Record<string, unknown> | undefined) : undefined;
  if (!record) return null;

  const modelCode      = record['code']           as string | undefined;
  const modelName      = record['model']          as string | undefined;
  const manufacturerId = record['manufacturerId'] as string | number | undefined;
  const uasClassId     = record['id_uas_class']   as string | number | undefined;
  const mtom           = record['mtow']           as string | number | undefined;
  const tempMin        = record['minTemp']        as string | number | undefined;
  const tempMax        = record['maxTemp']        as string | number | undefined;

  return {
    id:             modelId,
    modelCode:      modelCode ?? null,
    modelName:      modelName ?? null,
    manufacturerId: manufacturerId != null ? String(manufacturerId) : null,
    uasClassId:     uasClassId     != null ? String(uasClassId)     : null,
    mtom:           mtom          != null ? String(mtom)           : null,
    tempMin:        tempMin       != null ? String(tempMin)        : null,
    tempMax:        tempMax       != null ? String(tempMax)        : null,
  };
}

export async function getDFlightManufacturer(
  baseUrl:        string,
  accessToken:    string,
  manufacturerId: string,
): Promise<DFlightManufacturerResult | null> {
  const res = await dFetch(
    `${baseUrl}/drone-management/v2/api/manufacturer/${encodeURIComponent(manufacturerId)}`,
    {
      method:  'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept:        'application/json',
      },
    },
  );

  if (!res.ok) return null;

  const json = (await res.json()) as { data?: Record<string, unknown> };
  const record = json.data;
  if (!record) return null;

  const name = record['name'] as string | undefined;
  return { id: manufacturerId, name: name ?? null };
}

export interface DFlightUserInfo {
  operatorRegistrationNumber: string | null;
}

export async function getDFlightUserInfo(
  baseUrl:     string,
  accessToken: string,
): Promise<DFlightUserInfo> {
  const res = await dFetch(
    `${baseUrl}/iam/userinfo`,
    {
      method:  'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept:        'application/json',
      },
    },
  );

  if (!res.ok) {
    throw new Error(`D-Flight userinfo request failed (${res.status})`);
  }

  const json = (await res.json()) as Record<string, unknown>;
  return {
    operatorRegistrationNumber: (json['OperatorRegistrationNumber'] as string | undefined) ?? null,
  };
}

export interface DFlightStatusHistory {
  ltu: string;
  status: string;
}

export interface DFlightDroneDeclaration {
  declarationId: string;
  droneId: string;
  authorizedScenarios: string[];
  statusHistory: DFlightStatusHistory[];
}

export async function getDFlightDroneDeclarations(
  baseUrl:                   string,
  accessToken:               string,
  operatorRegistrationNumber: string,
  droneId:                   string,
): Promise<DFlightDroneDeclaration[]> {
  const params = new URLSearchParams({
    droneid: droneId,
    statusHistory: 'true',
  });

  const res = await dFetch(
    `${baseUrl}/user-management/users/dronedeclarations/operators/${encodeURIComponent(operatorRegistrationNumber)}?${params.toString()}`,
    {
      method:  'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept:        'application/json',
      },
    },
  );

  if (!res.ok) {
    throw new Error(`D-Flight drone declarations request failed (${res.status})`);
  }

  const json = (await res.json()) as { data?: unknown[] };
  const records = Array.isArray(json.data) ? json.data : [];

  return records.map((record: unknown) => {
    const r = record as Record<string, unknown>;
    return {
      declarationId: (r['declarationId'] as string | undefined) ?? '',
      droneId: (r['droneId'] as string | undefined) ?? '',
      authorizedScenarios: Array.isArray(r['authorizedScenarios'])
        ? (r['authorizedScenarios'] as string[]).map(String)
        : [],
      statusHistory: Array.isArray(r['statusHistory'])
        ? (r['statusHistory'] as unknown[]).map((h: unknown) => ({
            ltu: String((h as Record<string, unknown>)['ltu'] ?? ''),
            status: String((h as Record<string, unknown>)['status'] ?? ''),
          }))
        : [],
    };
  });
}

export async function getDFlightDeclarationPdf(
  baseUrl:        string,
  accessToken:    string,
  declarationId:  string,
): Promise<Uint8Array> {
  const res = await dFetch(
    `${baseUrl}/user-management/users/dronedeclarations/${encodeURIComponent(declarationId)}/pdf`,
    {
      method:  'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!res.ok) {
    throw new Error(`D-Flight declaration PDF request failed (${res.status})`);
  }

  const buffer = await res.body?.bytes();
  if (!buffer) {
    throw new Error('Failed to read PDF response body');
  }

  return buffer;
}