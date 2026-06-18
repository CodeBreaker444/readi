import 'server-only';

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

async function timedFetch(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONNECT_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function getDFlightToken(config: DFlightConfig): Promise<DFlightTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: config.client_id,
    username: config.username,
    password: config.password,
    scope: 'openid email profile user-data personal-data pilot-license dflight-identification',
  });

  const res = await timedFetch(`${config.base_url}/iam/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`D-Flight token request failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<DFlightTokenResponse>;
}

export async function getDFlightDrones(
  baseUrl: string,
  accessToken: string,
  owner: string,
  pageSize = 200,
): Promise<DFlightDroneResult[]> {
  const params = new URLSearchParams({
    owner,
    pageNumber: '0',
    pageSize: String(pageSize),
  });

  const res = await timedFetch(
    `${baseUrl}/drone-management/v2/api/drones?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`D-Flight drones request failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as DFlightDronePageResult;
  if (!Array.isArray(json.data)) return [];

  return json.data.map((item) => {
    const v = item.resultView ?? {};
    return {
      id: v['id'] ?? '',
      name: v['name'] ?? '',
      owner: v['owner'] ?? '',
      serialNumber: v['serialNumber'] ?? null,
      fcsSerialNumber: v['fcsSerialNumber'] ?? null,
      gcsSerialNumber: v['gcsSerialNumber'] ?? null,
      easaOperatorCode: v['easaOperatorCode'] ?? null,
      matriculationNumber: v['matriculationNumber'] ?? null,
      status: v['status'] ?? null,
      qrCodeActivationStatus: v['qrCodeActivationStatus'] ?? null,
      usage: v['usage'] ?? null,
      takeOffMass: v['takeOffMass'] ?? null,
      'model.modelName': v['model.modelName'] ?? null,
      'model.manufacturer.name': v['model.manufacturer.name'] ?? null,
    };
  });
}
