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

export async function getDFlightDrones(
  baseUrl:     string,
  accessToken: string,
  owner:       string,
  pageSize = 200,
): Promise<DFlightDroneResult[]> {
  const params = new URLSearchParams({
    owner,
    pageNumber: '0',
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

  console.log(`D-Flight drones status: ${res.status}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`D-Flight drones request failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as DFlightDronePageResult;
  if (!Array.isArray(json.data)) return [];

  return json.data.map((item) => {
    const v = item.resultView ?? {};
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
      usage:                     v['usage']                     ?? null,
      takeOffMass:               v['takeOffMass']               ?? null,
      'model.modelName':         v['model.modelName']           ?? null,
      'model.manufacturer.name': v['model.manufacturer.name']  ?? null,
    };
  });
}