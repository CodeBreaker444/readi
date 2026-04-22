'use client';

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlToBuffer(b64u: string): ArrayBuffer {
  const base64  = b64u.replace(/-/g, '+').replace(/_/g, '/');
  const padded  = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
  const binary  = atob(padded);
  const bytes   = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function base64urlDecodeString(b64u: string): string {
  const base64 = b64u.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
  return atob(padded);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export interface TransactionPayload {
  actionType:  string;
  entityType:  string;
  entityId?:   string;
  userId:      number;
  details?:    Record<string, unknown>;
  iat:         number;
  jti:         string;
}

export async function signTransactionJWT(
  payload: Omit<TransactionPayload, 'iat' | 'jti'>,
  privateKeyB64: string
): Promise<string> {
  const cryptoKey = await window.crypto.subtle.importKey(
    'pkcs8',
    base64ToBuffer(privateKeyB64),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const fullPayload: TransactionPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    jti: crypto.randomUUID(),
  };

  const header     = { alg: 'RS256', typ: 'JWT' };
  const headerB64  = bufferToBase64url(new TextEncoder().encode(JSON.stringify(header)).buffer as ArrayBuffer);
  const payloadB64 = bufferToBase64url(new TextEncoder().encode(JSON.stringify(fullPayload)).buffer as ArrayBuffer);
  const message    = `${headerB64}.${payloadB64}`;

  const signature  = await window.crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(message)
  );

  return `${message}.${bufferToBase64url(signature)}`;
}

export async function verifyTransactionJWT(
  jwt: string,
  publicKeyB64: string
): Promise<{ valid: boolean; payload?: TransactionPayload }> {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return { valid: false };
    const [headerB64, payloadB64, sigB64] = parts;

    const cryptoKey = await window.crypto.subtle.importKey(
      'spki',
      base64ToBuffer(publicKeyB64),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const valid = await window.crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      base64urlToBuffer(sigB64),
      new TextEncoder().encode(`${headerB64}.${payloadB64}`)
    );

    if (!valid) return { valid: false };

    const payload = JSON.parse(base64urlDecodeString(payloadB64)) as TransactionPayload;
    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}
