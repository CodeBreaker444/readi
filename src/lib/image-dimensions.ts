import 'server-only';

export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Best-effort pixel dimension reader for PNG/JPEG/WebP, parsed directly from the
 * file header (no image-processing dependency). Returns null if the format isn't
 * recognized or the header is malformed — callers should treat that as "unknown",
 * not "invalid", since this is a defense-in-depth check behind client-side validation.
 */
export function getImageDimensions(buffer: Buffer): ImageDimensions | null {
  return readPng(buffer) ?? readJpeg(buffer) ?? readWebp(buffer);
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function readPng(buf: Buffer): ImageDimensions | null {
  if (buf.length < 24 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return width > 0 && height > 0 ? { width, height } : null;
}

function readJpeg(buf: Buffer): ImageDimensions | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;

  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) { offset += 1; continue; }
    const marker = buf[offset + 1];

    // Markers with no payload to skip over.
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }

    const segmentLength = buf.readUInt16BE(offset + 2);
    const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;

    if (isStartOfFrame) {
      const height = buf.readUInt16BE(offset + 5);
      const width = buf.readUInt16BE(offset + 7);
      return width > 0 && height > 0 ? { width, height } : null;
    }

    if (segmentLength < 2) return null;
    offset += 2 + segmentLength;
  }
  return null;
}

function readWebp(buf: Buffer): ImageDimensions | null {
  if (buf.length < 30) return null;
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;

  const fourCc = buf.toString('ascii', 12, 16);
  try {
    if (fourCc === 'VP8X') {
      const width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
      const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
      return width > 0 && height > 0 ? { width, height } : null;
    }
    if (fourCc === 'VP8 ') {
      const width = buf.readUInt16LE(26) & 0x3fff;
      const height = buf.readUInt16LE(28) & 0x3fff;
      return width > 0 && height > 0 ? { width, height } : null;
    }
    if (fourCc === 'VP8L') {
      const bits = buf.readUInt32LE(21);
      const width = (bits & 0x3fff) + 1;
      const height = ((bits >>> 14) & 0x3fff) + 1;
      return { width, height };
    }
  } catch {
    return null;
  }
  return null;
}
