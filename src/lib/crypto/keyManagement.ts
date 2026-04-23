'use client';

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function generateKeyPair(): Promise<{
  publicKey: string;
  privateKey: string;
  fingerprint: string;
}> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name:            'RSASSA-PKCS1-v1_5',
      modulusLength:   2048,
      publicExponent:  new Uint8Array([1, 0, 1]),
      hash:            'SHA-256',
    },
    true,
    ['sign', 'verify']
  );

  const [publicKeyBuffer, privateKeyBuffer] = await Promise.all([
    window.crypto.subtle.exportKey('spki',  keyPair.publicKey),
    window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey),
  ]);

  const hashBuffer  = await window.crypto.subtle.digest('SHA-256', publicKeyBuffer);
  const hashHex     = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  const fingerprint = (hashHex.slice(0, 32).match(/.{1,4}/g) ?? []).join(':');

  return {
    publicKey:   bufferToBase64(publicKeyBuffer),
    privateKey:  bufferToBase64(privateKeyBuffer),
    fingerprint,
  };
}

async function deriveAESKey(pin: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const pinBuffer = new TextEncoder().encode(pin);
  const baseKey   = await window.crypto.subtle.importKey('raw', pinBuffer, 'PBKDF2', false, ['deriveKey']);
  return window.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 128 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptPrivateKey(
  privateKey: string,
  pin: string
): Promise<{ encrypted: string; salt: string; iv: string }> {
  const salt   = window.crypto.getRandomValues(new Uint8Array(16));
  const iv     = window.crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await deriveAESKey(pin, salt.buffer as ArrayBuffer);

  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    new TextEncoder().encode(privateKey)
  );

  return {
    encrypted: bufferToBase64(encrypted),
    salt:      bufferToBase64(salt.buffer as ArrayBuffer),
    iv:        bufferToBase64(iv.buffer as ArrayBuffer),
  };
}

// Throws DOMException if PIN is wrong (AES-GCM authentication fails)
export async function decryptPrivateKey(
  encrypted: string,
  salt: string,
  iv: string,
  pin: string
): Promise<string> {
  const aesKey   = await deriveAESKey(pin, base64ToBuffer(salt));
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBuffer(iv) },
    aesKey,
    base64ToBuffer(encrypted)
  );
  return new TextDecoder().decode(decrypted);
}
