/**
 * Client-side image preparation, run before every product-photo upload.
 *
 * This is not an optimisation — it is what makes the feature usable. A phone camera shot is
 * 3–12MB, and uploadImage() rejects anything over 8MB, so a vendor photographing a taco at the
 * curb would hit "Image must be under 8MB" on their first try. Downscaling to ~1200px WebP turns
 * that into ~150KB that uploads in about a second on 4G.
 *
 * Also centre-crops to a square: mixed aspect ratios make a menu read like a classifieds page,
 * and every surface that shows these renders them in a square frame anyway.
 */

const TARGET_PX = 1200;
const QUALITY = 0.82;

/** Decode a File into a bitmap, preferring createImageBitmap (honours EXIF orientation). */
async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    // imageOrientation: 'from-image' stops portrait phone photos landing sideways.
    return createImageBitmap(file, { imageOrientation: 'from-image' });
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Could not read that image.'));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function dimensionsOf(src: ImageBitmap | HTMLImageElement): { w: number; h: number } {
  return src instanceof HTMLImageElement
    ? { w: src.naturalWidth, h: src.naturalHeight }
    : { w: src.width, h: src.height };
}

/**
 * Centre-crop to a square and downscale to at most TARGET_PX, encoded as WebP (falling back to
 * JPEG where WebP encoding isn't supported). Never upscales a small image.
 */
export async function prepareProductPhoto(file: File): Promise<File> {
  const src = await decode(file);
  const { w, h } = dimensionsOf(src);
  if (!w || !h) throw new Error('Could not read that image.');

  const side = Math.min(w, h);
  const sx = Math.round((w - side) / 2);
  const sy = Math.round((h - side) / 2);
  const out = Math.min(side, TARGET_PX); // never upscale — it only adds bytes

  const canvas = document.createElement('canvas');
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process that image.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, sx, sy, side, side, 0, 0, out, out);
  if ('close' in src) src.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/webp', QUALITY);
  });
  // Safari < 14 and some Android webviews silently ignore the webp request.
  const encoded =
    blob && blob.type === 'image/webp'
      ? blob
      : await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
  if (!encoded) throw new Error('Could not process that image.');

  const ext = encoded.type === 'image/webp' ? 'webp' : 'jpg';
  return new File([encoded], `photo.${ext}`, { type: encoded.type });
}
