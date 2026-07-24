import 'server-only';
import { Agent, fetch as undiciFetch } from 'undici';
import { createHash } from 'crypto';
import https from 'https';

const CONNECT_TIMEOUT_MS = 10_000;

// Create a native HTTPS agent for fallback
let _httpsAgent: https.Agent | null = null;
let _httpsPfxContent: string | null = null;
let _httpsPfxPassword: string | null = null;

function getHttpsAgent(pfxContent: string, pfxPassword: string): https.Agent {
  if (!_httpsAgent || _httpsPfxContent !== pfxContent || _httpsPfxPassword !== pfxPassword) {
    const pfx = Buffer.from(pfxContent, 'base64');
    _httpsAgent = new https.Agent({
      pfx,
      passphrase: pfxPassword,
      rejectUnauthorized: false,
      keepAlive: true,
      minVersion: 'TLSv1.2',
      maxVersion: 'TLSv1.3',
      ciphers: 'ALL',
    });
    _httpsPfxContent = pfxContent;
    _httpsPfxPassword = pfxPassword;
    console.log('D-Flight: Created new HTTPS Agent with TLS 1.2+ support');
  }
  return _httpsAgent;
}

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

function createUndiciAgent(pfxContent: string, pfxPassword: string, baseUrl: string): Agent {
  if (!pfxContent || !pfxPassword) {
    throw new Error(
      'D-Flight TLS configuration is missing. ' +
      'PFX content and password are required.'
    );
  }


  const pfx = Buffer.from(pfxContent, 'base64');

  const safeBaseUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
  const url = new URL(safeBaseUrl);
  const hostname = url.hostname;


  try {
    const httpsAgent = new https.Agent({
      pfx,
      passphrase: pfxPassword,
      rejectUnauthorized: false,
    });
    console.log('D-Flight: HTTPS Agent created successfully');
  } catch (err: any) {
    console.error('D-Flight: Failed to create HTTPS Agent:', err.message);
  }

  return new Agent({
    connect: {
      pfx,
      passphrase: pfxPassword,
      rejectUnauthorized: false,
      timeout: CONNECT_TIMEOUT_MS,
      servername: hostname,
    },
  });
}

// Cache for the process lifetime — TLS Agent creation is expensive
let _agent: Agent | null = null;
let _currentPfxContent: string | null = null;
let _currentPfxPassword: string | null = null;
let _currentBaseUrl: string | null = null;

function getAgent(pfxContent: string, pfxPassword: string, baseUrl: string): Agent {
  // Recreate agent if PFX credentials or baseUrl changed
  if (!_agent || _currentPfxContent !== pfxContent || _currentPfxPassword !== pfxPassword || _currentBaseUrl !== baseUrl) {
    _currentPfxContent = pfxContent;
    _currentPfxPassword = pfxPassword;
    _currentBaseUrl = baseUrl;
    _agent = createUndiciAgent(pfxContent, pfxPassword, baseUrl);
  }
  return _agent;
}

async function dFetch(
  url: string,
  init: Parameters<typeof undiciFetch>[1],
  pfxContent: string,
  pfxPassword: string,
  baseUrl: string,
): Promise<Awaited<ReturnType<typeof undiciFetch>>> {
  // Use native HTTPS fetch by default for better PFX certificate support
  const httpsAgent = getHttpsAgent(pfxContent, pfxPassword);
  const response = await fetch(url, {
    ...init,
    agent: httpsAgent as any,
  } as RequestInit);

  // Convert native fetch response to undici-compatible format
  const body = await response.text();
  const undiciResponse = {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    text: async () => body,
    json: async () => JSON.parse(body),
    arrayBuffer: async () => {
      const buffer = Buffer.from(body, 'utf-8');
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    },
  } as any;

  return undiciResponse;
}


export async function getDFlightToken(
  config: DFlightConfig,
  pfxContent: string,
  pfxPassword: string,
): Promise<DFlightTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id:  config.client_id,
    username:   config.username,
    password:   config.password,
    scope:      'openid email profile user-data personal-data pilot-license dflight-identification',
  });

  const baseUrl = config.base_url.startsWith('http') ? config.base_url : `https://${config.base_url}`;
  const url = `${baseUrl}/iam/token`;


  const res = await dFetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  }, pfxContent, pfxPassword, baseUrl);

  console.log(`D-Flight token status: ${res.status}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`D-Flight token request failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<DFlightTokenResponse>;
}

export async function refreshDFlightToken(
  config: DFlightConfig,
  refreshToken: string,
  pfxContent: string,
  pfxPassword: string,
): Promise<DFlightTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: config.client_id,
    refresh_token: refreshToken,
  });

  // Ensure base_url has https:// prefix
  const baseUrl = config.base_url.startsWith('http') ? config.base_url : `https://${config.base_url}`;
  const url = `${baseUrl}/iam/token/refresh`;

  console.log(`D-Flight token refresh URL: ${url}`);

  const res = await dFetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  }, pfxContent, pfxPassword, baseUrl);

  console.log(`D-Flight token refresh status: ${res.status}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`D-Flight token refresh request failed (${res.status}): ${text}`);
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
  pfxContent:  string,
  pfxPassword: string,
  pageSize = 50,
): Promise<DFlightDroneResult[]> {
  const drones: DFlightDroneResult[] = [];
  let pageNumber = 0;

  // Ensure baseUrl has https:// prefix
  const safeBaseUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;

  for (;;) {
    const params = new URLSearchParams({
      owner,
      pageNumber: String(pageNumber),
      pageSize:   String(pageSize),
    });

    const res = await dFetch(
      `${safeBaseUrl}/drone-management/v2/api/drones?${params.toString()}`,
      {
        method:  'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept:        'application/json',
        },
      },
      pfxContent,
      pfxPassword,
      safeBaseUrl,
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

export async function getDFlightDroneById(
  baseUrl:     string,
  accessToken: string,
  owner:       string,
  droneId:     string,
  pfxContent:  string,
  pfxPassword: string,
): Promise<DFlightDroneResult | null> {
  const safeBaseUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;

  const params = new URLSearchParams({
    owner,
    droneId,
  });

  const res = await dFetch(
    `${safeBaseUrl}/drone-management/v2/api/drones?${params.toString()}`,
    {
      method:  'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept:        'application/json',
      },
    },
    pfxContent,
    pfxPassword,
    safeBaseUrl,
  );

  console.log(`D-Flight drone by ID status: ${res.status}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`D-Flight drone by ID request failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as DFlightDronePageResult;
  const pageItems = Array.isArray(json.data) ? json.data : [];

  if (pageItems.length === 0) return null;

  return mapDroneResultView(pageItems[0].resultView ?? {});
}

export async function getDFlightUasClass(
  baseUrl:     string,
  accessToken: string,
  classId:     string,
  pfxContent:  string,
  pfxPassword: string,
): Promise<DFlightUasClassResult | null> {
  const safeBaseUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;

  const res = await dFetch(
    `${safeBaseUrl}/drone-management/v2/api/uas-class/${encodeURIComponent(classId)}`,
    {
      method:  'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept:        'application/json',
      },
    },
    pfxContent,
    pfxPassword,
    safeBaseUrl,
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
  pfxContent:  string,
  pfxPassword: string,
): Promise<DFlightModelResult | null> {
  const safeBaseUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;

  const res = await dFetch(
    `${safeBaseUrl}/drone-management/v2/api/models/search?id=${encodeURIComponent(modelId)}`,
    {
      method:  'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept:        'application/json',
      },
    },
    pfxContent,
    pfxPassword,
    safeBaseUrl,
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
  pfxContent:     string,
  pfxPassword:    string,
): Promise<DFlightManufacturerResult | null> {
  const safeBaseUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;

  const res = await dFetch(
    `${safeBaseUrl}/drone-management/v2/api/manufacturer/${encodeURIComponent(manufacturerId)}`,
    {
      method:  'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept:        'application/json',
      },
    },
    pfxContent,
    pfxPassword,
    safeBaseUrl,
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
  pfxContent:  string,
  pfxPassword: string,
): Promise<DFlightUserInfo> {
  const safeBaseUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;

  const res = await dFetch(
    `${safeBaseUrl}/iam/userinfo`,
    {
      method:  'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept:        'application/json',
      },
    },
    pfxContent,
    pfxPassword,
    safeBaseUrl,
  );

  if (!res.ok) {
    throw new Error(`D-Flight userinfo request failed (${res.status})`);
  }
  const json = (await res.json()) as Record<string, unknown>;
  console.log('userinfo dflight:',json)
  const userData = json['userData'] as Record<string, unknown> | undefined;
  return {
    operatorRegistrationNumber: (userData?.['OperatorRegistrationNumber'] as string | undefined) ?? null,
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
  pfxContent:                string,
  pfxPassword:               string,
): Promise<DFlightDroneDeclaration[]> {
  const params = new URLSearchParams({
    droneid: droneId,
    statusHistory: 'true',
  });

  const safeBaseUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;

  console.log(`Fetching drone declarations for operator: ${operatorRegistrationNumber}, drone: ${droneId}`);
  console.log(`URL: ${safeBaseUrl}/user-management/users/dronedeclarations/operators/${encodeURIComponent(operatorRegistrationNumber)}?${params.toString()}`);

  const res = await dFetch(
    `${safeBaseUrl}/user-management/users/dronedeclarations/operators/${encodeURIComponent(operatorRegistrationNumber)}?${params.toString()}`,
    {
      method:  'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept:        'application/json',
      },
    },
    pfxContent,
    pfxPassword,
    safeBaseUrl,
  );

  if (!res.ok) {
    const errorText = await res.text();
    console.error('D-Flight drone declarations error:', errorText);
    throw new Error(`D-Flight drone declarations request failed (${res.status}): ${errorText}`);
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
  baseUrl:       string,
  accessToken:   string,
  declarationId: string,
  pfxContent:    string,
  pfxPassword:   string,
): Promise<Uint8Array> {
  const safeBaseUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;

  const res = await dFetch(
    `${safeBaseUrl}/user-management/users/dronedeclarations/${encodeURIComponent(declarationId)}/pdf`,
    {
      method:  'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    pfxContent,
    pfxPassword,
    safeBaseUrl,
  );

  if (!res.ok) {
    throw new Error(`D-Flight declaration PDF request failed (${res.status})`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}