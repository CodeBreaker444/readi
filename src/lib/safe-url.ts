import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * SSRF guard for tenant-configured callback URLs.
 *
 * Production rules: https only, no embedded credentials, and the host must not
 * be (or resolve to) a loopback / private / link-local / reserved address.
 * Outside production, http and private hosts are allowed so a local mock DCC works.
 */

const isProd = () => process.env.NODE_ENV === 'production';

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, o) => (acc << 8) + Number(o), 0) >>> 0;
}

const V4_BLOCKS: Array<[string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16], // link-local incl. cloud metadata 169.254.169.254
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 3], // multicast + reserved
];

export function isPrivateIp(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) {
    const n = ipv4ToInt(ip);
    return V4_BLOCKS.some(([base, bits]) => {
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      return (n & mask) === (ipv4ToInt(base) & mask);
    });
  }
  if (family === 6) {
    const v = ip.toLowerCase();
    if (v === '::' || v === '::1') return true;
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    if (/^f[cd]/.test(v)) return true; // fc00::/7 unique local
    if (/^fe[89ab]/.test(v)) return true; // fe80::/10 link-local
    if (v.startsWith('ff')) return true; // multicast
    return false;
  }
  return true; // not an IP -> caller must have resolved it
}

/** Cheap, synchronous format check (usable in zod). Returns an error message or null. */
export function callbackUrlFormatError(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return 'Must be a valid URL';
  }
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && !isProd())) {
    return isProd() ? 'Callback URL must use https://' : 'Must start with http:// or https://';
  }
  if (u.username || u.password) return 'Callback URL must not contain credentials';
  if (!isProd()) return null;

  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    return 'Callback URL must be a public address';
  }
  if (isIP(host) && isPrivateIp(host)) return 'Callback URL must be a public address';
  return null;
}

/**
 * Full check including DNS: every address the host resolves to must be public.
 * Run at save time AND immediately before each send, so a hostname that is
 * later re-pointed at an internal address is still blocked.
 * Throws Error(message) when unsafe.
 */
export async function assertSafeCallbackUrl(raw: string): Promise<void> {
  const formatError = callbackUrlFormatError(raw);
  if (formatError) throw new Error(formatError);
  if (!isProd()) return;

  const host = new URL(raw).hostname.replace(/^\[|\]$/g, '');
  if (isIP(host)) return; // literal already vetted above

  let addrs: { address: string }[];
  try {
    addrs = await lookup(host, { all: true });
  } catch {
    throw new Error('Callback URL host could not be resolved');
  }
  if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) {
    throw new Error('Callback URL must be a public address');
  }
}
