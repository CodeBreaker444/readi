/**
 * Downloads an image from a presigned URL sent by the AI model, so we can keep our own copy in our bucket.
 */

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 2;

const S3_HOST = /^(?:[a-z0-9.-]+\.)?s3(?:[.-][a-z0-9-]+)*\.amazonaws\.com$/;

export class ImageFetchError extends Error {}

/** Some senders append a stray quote to the URL (it arrives as %22 or "), which breaks the signature. */
export function cleanPresignedUrl(raw: string): string {
  return raw.trim().replace(/(?:%22|"|')+$/i, '');
}

function parseAllowed(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ImageFetchError('the presigned URL is not a valid URL');
  }
  if (url.protocol !== 'https:') throw new ImageFetchError('the presigned URL must use https');
  if (url.username || url.password || url.port) throw new ImageFetchError('the presigned URL has credentials or a port, which is not allowed');
  if (!S3_HOST.test(url.hostname.toLowerCase())) throw new ImageFetchError(`the presigned URL host "${url.hostname}" is not an Amazon S3 host`);
  return url;
}

function sniff(b: Buffer): { contentType: string } | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { contentType: 'image/jpeg' };
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { contentType: 'image/png' };
  if (b.length >= 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return { contentType: 'image/webp' };
  return null;
}

async function s3ErrorCode(res: Response): Promise<string | null> {
  try {
    const body = (await res.text()).slice(0, 2000);
    return /<Code>([A-Za-z]+)<\/Code>/.exec(body)?.[1] ?? null;
  } catch {
    return null;
  }
}

async function readLimited(res: Response): Promise<Buffer> {
  const declared = Number(res.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_IMAGE_BYTES) throw new ImageFetchError(`the file is larger than ${MAX_IMAGE_BYTES / 1024 / 1024} MB`);
  if (!res.body) throw new ImageFetchError('the response had no content');
  const reader = res.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_IMAGE_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw new ImageFetchError(`the file is larger than ${MAX_IMAGE_BYTES / 1024 / 1024} MB`);
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

export async function downloadImage(rawUrl: string): Promise<{ buffer: Buffer; contentType: string }> {
  let url = parseAllowed(cleanPresignedUrl(rawUrl));

  for (let hop = 0; ; hop++) {
    let res: Response;
    try {
      res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (err: any) {
      if (err?.name === 'TimeoutError' || err?.name === 'AbortError') throw new ImageFetchError(`the download took longer than ${TIMEOUT_MS / 1000}s`);
      throw new ImageFetchError(`the download failed (${err?.cause?.code ?? err?.message ?? 'network error'})`);
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      await res.body?.cancel().catch(() => undefined);
      if (!location || hop >= MAX_REDIRECTS) throw new ImageFetchError('the presigned URL redirected too many times');
      url = parseAllowed(new URL(location, url).toString());
      continue;
    }

    if (!res.ok) {
      const code = await s3ErrorCode(res);
      const meaning =
        res.status === 403 ? 'rejected: the URL has expired, its signature is invalid, or it has no permission' : res.status === 404 ? 'the file does not exist at that URL' : 'unexpected response';
      throw new ImageFetchError(`HTTP ${res.status}${code ? ` ${code}` : ''} – ${meaning}`);
    }

    const buffer = await readLimited(res);
    const type = sniff(buffer);
    if (!type) throw new ImageFetchError('the downloaded file is not a JPEG, PNG or WebP image');
    return { buffer, contentType: type.contentType };
  }
}
