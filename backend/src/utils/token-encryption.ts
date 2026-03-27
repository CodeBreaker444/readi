import { env } from '@/backend/config/env';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import 'server-only';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM

function getKey(): Buffer {
  const raw = env.FLYTBASE_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('FLYTBASE_TOKEN_ENCRYPTION_KEY environment variable is not set');
  }
  const key = Buffer.from(raw, 'hex');
  if (key.length !== 32) {
    throw new Error('FLYTBASE_TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }
  return key;
}

/**
 * Encrypts a plaintext API token using AES-256-GCM.
 * Returns a string in the format: `<iv_hex>:<authTag_hex>:<ciphertext_hex>`
 */
export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts a token previously encrypted with `encryptToken`.
 * Throws if the ciphertext has been tampered with (GCM auth tag mismatch).
 */
export function decryptToken(stored: string): string {
  const parts = stored.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format');
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}
