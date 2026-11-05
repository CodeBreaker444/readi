/**
 * Downloading an image from a presigned URL sent by the AI model: host/redirect/size/content safeguards
 * and the readable reasons returned to the sender. fetch is mocked.
 *
 * Run:  npm test -- ai-event-image
 */

import { cleanPresignedUrl, downloadImage, ImageFetchError, MAX_IMAGE_BYTES } from '@/backend/services/logbook/ai-event-image';

const GOOD = 'https://projectx-logs-new.s3.amazonaws.com/ai_alerts/a/b.jpg?X-Amz-Signature=abc';
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);

const respond = (body: Buffer | string, init: ResponseInit = {}) => new Response(body as any, { status: 200, ...init });
const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
});

describe('cleanPresignedUrl', () => {
  it('removes the stray quote some senders append (it breaks the signature)', () => {
    expect(cleanPresignedUrl(`${GOOD}%22`)).toBe(GOOD);
    expect(cleanPresignedUrl(`${GOOD}"`)).toBe(GOOD);
    expect(cleanPresignedUrl(`  ${GOOD}  `)).toBe(GOOD);
  });
  it('leaves a clean URL untouched', () => {
    expect(cleanPresignedUrl(GOOD)).toBe(GOOD);
  });
});

describe('downloadImage', () => {
  it('downloads a JPEG, trusting the bytes rather than the content-type header', async () => {
    fetchMock.mockResolvedValue(respond(JPEG, { headers: { 'content-type': 'binary/octet-stream' } }));
    const r = await downloadImage(`${GOOD}%22`);
    expect(r.contentType).toBe('image/jpeg');
    expect(r.buffer.equals(JPEG)).toBe(true);
    expect(fetchMock.mock.calls[0][0].toString()).toBe(GOOD); // the stray quote was removed before fetching
  });

  it('recognises PNG', async () => {
    fetchMock.mockResolvedValue(respond(PNG));
    expect((await downloadImage(GOOD)).contentType).toBe('image/png');
  });

  it.each([
    ['plain http', 'http://b.s3.amazonaws.com/x.jpg'],
    ['a host that is not S3', 'https://example.com/x.jpg'],
    ['an S3 look-alike host', 'https://s3.amazonaws.com.evil.com/x.jpg'],
    ['an internal address', 'https://169.254.169.254/latest/meta-data'],
    ['a custom port', 'https://b.s3.amazonaws.com:8443/x.jpg'],
    ['credentials in the URL', 'https://user:pw@b.s3.amazonaws.com/x.jpg'],
    ['text that is not a URL', 'not a url'],
  ])('refuses %s without making any request', async (_n, url) => {
    await expect(downloadImage(url)).rejects.toBeInstanceOf(ImageFetchError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('accepts regional S3 hosts', async () => {
    fetchMock.mockImplementation(async () => respond(JPEG));
    await expect(downloadImage('https://b.s3.ap-south-1.amazonaws.com/x.jpg?s=1')).resolves.toBeDefined();
    await expect(downloadImage('https://b.s3-ap-south-1.amazonaws.com/x.jpg?s=1')).resolves.toBeDefined();
  });

  it('explains a 403 with the S3 error code and no URL', async () => {
    fetchMock.mockResolvedValue(respond('<Error><Code>SignatureDoesNotMatch</Code></Error>', { status: 403 }));
    const err = await downloadImage(GOOD).catch((e) => e);
    expect(err).toBeInstanceOf(ImageFetchError);
    expect(err.message).toMatch(/HTTP 403 SignatureDoesNotMatch/);
    expect(err.message).toMatch(/expired|signature/);
    expect(err.message).not.toContain('abc');
  });

  it('explains a 404', async () => {
    fetchMock.mockResolvedValue(respond('<Error><Code>NoSuchKey</Code></Error>', { status: 404 }));
    await expect(downloadImage(GOOD)).rejects.toThrow(/HTTP 404 NoSuchKey/);
  });

  it('rejects a file that is not an image', async () => {
    fetchMock.mockResolvedValue(respond('<html>login</html>', { headers: { 'content-type': 'image/jpeg' } }));
    await expect(downloadImage(GOOD)).rejects.toThrow(/not a JPEG, PNG or WebP/);
  });

  it('rejects a file larger than the limit, by its declared size', async () => {
    fetchMock.mockResolvedValue(respond(JPEG, { headers: { 'content-length': String(MAX_IMAGE_BYTES + 1) } }));
    await expect(downloadImage(GOOD)).rejects.toThrow(/larger than/);
  });

  it('rejects a file larger than the limit even when the size was not declared', async () => {
    fetchMock.mockResolvedValue(respond(Buffer.concat([JPEG, Buffer.alloc(MAX_IMAGE_BYTES)])));
    await expect(downloadImage(GOOD)).rejects.toThrow(/larger than/);
  });

  it('follows a redirect to another S3 host', async () => {
    fetchMock
      .mockResolvedValueOnce(respond('', { status: 307, headers: { location: 'https://b.s3.ap-south-1.amazonaws.com/x.jpg?s=1' } }))
      .mockResolvedValueOnce(respond(JPEG));
    await expect(downloadImage(GOOD)).resolves.toMatchObject({ contentType: 'image/jpeg' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('refuses a redirect to a host that is not S3', async () => {
    fetchMock.mockResolvedValueOnce(respond('', { status: 302, headers: { location: 'http://169.254.169.254/' } }));
    await expect(downloadImage(GOOD)).rejects.toBeInstanceOf(ImageFetchError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('gives up after too many redirects', async () => {
    fetchMock.mockImplementation(async () => respond('', { status: 307, headers: { location: GOOD } }));
    await expect(downloadImage(GOOD)).rejects.toThrow(/redirected too many times/);
  });

  it('reports a timeout', async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error('timed out'), { name: 'TimeoutError' }));
    await expect(downloadImage(GOOD)).rejects.toThrow(/took longer than/);
  });

  it('reports a network failure', async () => {
    fetchMock.mockRejectedValue(Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } }));
    await expect(downloadImage(GOOD)).rejects.toThrow(/ENOTFOUND/);
  });
});
