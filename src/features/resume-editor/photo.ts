/** Largest image file accepted before compression. */
export const MAX_PHOTO_FILE_BYTES = 10 * 1024 * 1024;
/** Output is a square JPEG of at most this many pixels per side. */
const OUTPUT_SIZE = 480;
const JPEG_QUALITY = 0.85;

/**
 * Crop an uploaded image to a square (biased toward the top, where faces
 * usually are), downscale it, and return a compact JPEG data URL. Runs
 * entirely in the browser; the original file is never stored or uploaded.
 */
export async function preparePhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/"))
    throw new Error("Choose an image file, such as a JPG, PNG, or WebP.");
  if (file.size > MAX_PHOTO_FILE_BYTES)
    throw new Error("This image is larger than 10 MB. Choose a smaller one.");

  let bitmap: ImageBitmap;
  try {
    // Applies EXIF orientation, so phone photos aren't sideways.
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("This image could not be read. Try a JPG or PNG.");
  }

  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = Math.max(0, (bitmap.height - side) * 0.3);
  const size = Math.min(OUTPUT_SIZE, side);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Your browser could not process this image.");
  }
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}
