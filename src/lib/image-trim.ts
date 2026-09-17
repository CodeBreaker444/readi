
export interface ContentBBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TrimResult {
  dataUrl: string;
  width: number;
  height: number;
}

const ANALYSIS_MAX_DIM = 400;
const ALPHA_THRESHOLD = 10;
const COLOR_DISTANCE_THRESHOLD = 18;
const EDGE_PADDING_RATIO = 0.03;

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

/**
 * Detects the tight content bounding box of an image (in its own natural pixel
 * coordinates), ignoring transparent and flat-background-colored padding.
 * Runs the scan on a downscaled copy for speed, then maps the result back up.
 * Returns null if no distinguishable content was found (e.g. a solid-color image).
 */
export function detectContentBBox(img: HTMLImageElement): ContentBBox | null {
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  if (!srcW || !srcH) return null;

  const scale = Math.min(1, ANALYSIS_MAX_DIM / Math.max(srcW, srcH));
  const aw = Math.max(1, Math.round(srcW * scale));
  const ah = Math.max(1, Math.round(srcH * scale));

  const analysisCanvas = document.createElement('canvas');
  analysisCanvas.width = aw;
  analysisCanvas.height = ah;
  const actx = analysisCanvas.getContext('2d', { willReadFrequently: true });
  if (!actx) return null;
  actx.drawImage(img, 0, 0, aw, ah);

  let pixels: ImageData;
  try {
    pixels = actx.getImageData(0, 0, aw, ah);
  } catch {
    // Canvas is tainted (cross-origin source) — can't inspect pixels.
    return null;
  }

  const data = pixels.data;
  const cornerIdx = [0, (aw - 1) * 4, (ah - 1) * aw * 4, ((ah - 1) * aw + (aw - 1)) * 4];
  let bgR = 0, bgG = 0, bgB = 0, bgCount = 0;
  for (const idx of cornerIdx) {
    if (data[idx + 3] > ALPHA_THRESHOLD) {
      bgR += data[idx]; bgG += data[idx + 1]; bgB += data[idx + 2]; bgCount += 1;
    }
  }
  const hasOpaqueBg = bgCount > 0;
  if (hasOpaqueBg) { bgR /= bgCount; bgG /= bgCount; bgB /= bgCount; }

  let minX = aw, minY = ah, maxX = -1, maxY = -1;
  for (let y = 0; y < ah; y++) {
    for (let x = 0; x < aw; x++) {
      const i = (y * aw + x) * 4;
      const alpha = data[i + 3];
      let isContent: boolean;
      if (alpha <= ALPHA_THRESHOLD) {
        isContent = false;
      } else if (hasOpaqueBg) {
        const dr = data[i] - bgR, dg = data[i + 1] - bgG, db = data[i + 2] - bgB;
        isContent = Math.sqrt(dr * dr + dg * dg + db * db) > COLOR_DISTANCE_THRESHOLD;
      } else {
        isContent = true;
      }
      if (isContent) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;

  const padX = Math.round((maxX - minX + 1) * EDGE_PADDING_RATIO);
  const padY = Math.round((maxY - minY + 1) * EDGE_PADDING_RATIO);
  const bx0 = Math.max(0, minX - padX);
  const by0 = Math.max(0, minY - padY);
  const bx1 = Math.min(aw - 1, maxX + padX);
  const by1 = Math.min(ah - 1, maxY + padY);

  const x = Math.round(bx0 / scale);
  const y = Math.round(by0 / scale);
  const width = Math.min(srcW - x, Math.round((bx1 - bx0 + 1) / scale));
  const height = Math.min(srcH - y, Math.round((by1 - by0 + 1) / scale));
  if (width <= 0 || height <= 0) return null;

  return { x, y, width, height };
}

/**
 * Returns a copy of the image cropped to its tight content bounding box. If the
 * detected content already fills (almost) the whole image, or none could be
 * detected, the original data URL is returned unchanged.
 */
export async function trimImagePadding(dataUrl: string): Promise<TrimResult> {
  const img = await loadImage(dataUrl).catch(() => null);
  if (!img) return { dataUrl, width: 0, height: 0 };

  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  const bbox = detectContentBBox(img);

  if (!bbox || (bbox.x <= 1 && bbox.y <= 1 && bbox.width >= srcW - 2 && bbox.height >= srcH - 2)) {
    return { dataUrl, width: srcW, height: srcH };
  }

  const canvas = document.createElement('canvas');
  canvas.width = bbox.width;
  canvas.height = bbox.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { dataUrl, width: srcW, height: srcH };

  ctx.drawImage(img, bbox.x, bbox.y, bbox.width, bbox.height, 0, 0, bbox.width, bbox.height);
  return { dataUrl: canvas.toDataURL('image/png'), width: bbox.width, height: bbox.height };
}
