async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Company logo as a data URL; falls back to the platform logo when the company has none uploaded. */
export async function loadReportLogo(): Promise<string | null> {
  try {
    const res = await fetch('/api/company/logo');
    if (res.ok) {
      const { logoDataUrl } = await res.json();
      if (logoDataUrl) return logoDataUrl;
    }
  } catch { /* fall through to default logo */ }

  try {
    const res = await fetch('/logo-sm.png');
    if (res.ok) return await blobToDataUrl(await res.blob());
  } catch { /* no logo available */ }
  return null;
}

export function detectImageFormat(dataUrl: string): 'PNG' | 'JPEG' | 'WEBP' {
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'JPEG';
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
  return 'PNG';
}
