
export const LOGO_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const LOGO_MAX_SIZE = 5 * 1024 * 1024;

/** Hard floor — below this a logo is unusable (blurry/illegible once placed in reports). */
export const LOGO_MIN_DIMENSION = 128;
/** Soft target we hint at in the UI for a crisp result in printed reports. */
export const LOGO_RECOMMENDED_DIMENSION = 300;
/** Long edge of the cropped output we upload — plenty for both the on-screen avatar and print. */
export const LOGO_EXPORT_MAX_DIMENSION = 1024;

/** Client-side pre-checks (type/size/pixel dimensions) run before the crop dialog opens. */
export async function validateLogoFile(file: File): Promise<string | null> {
    if (file.size > LOGO_MAX_SIZE) return 'Logo file must be under 5MB';
    if (!LOGO_ALLOWED_TYPES.includes(file.type)) return 'Logo must be JPEG, PNG, or WebP';

    const dimensions = await new Promise<{ width: number; height: number } | null>((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
        img.onerror = () => { resolve(null); URL.revokeObjectURL(url); };
        img.src = url;
    });

    if (dimensions && (dimensions.width < LOGO_MIN_DIMENSION || dimensions.height < LOGO_MIN_DIMENSION)) {
        return `Logo is too small (${dimensions.width}x${dimensions.height}px). Minimum ${LOGO_MIN_DIMENSION}x${LOGO_MIN_DIMENSION}px required.`;
    }
    return null;
}
