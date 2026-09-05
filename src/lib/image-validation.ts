const MAX_EDGE = 12000;
const MAX_PIXELS = 36_000_000;

export const IMAGE_LIMITS = {
  maxEdge: MAX_EDGE,
  maxPixels: MAX_PIXELS,
  maxRepairAreaRatio: 0.45,
} as const;

export function validateImageDimensions(width: number, height: number) {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error("The image has invalid dimensions.");
  }
  if (width > MAX_EDGE || height > MAX_EDGE || width * height > MAX_PIXELS) {
    throw new Error(
      "This image is too large for safe browser processing. Resize it first or choose a smaller image.",
    );
  }
}

export function validateRequestedDimensions(width: number, height: number) {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < 1 ||
    height < 1
  ) {
    throw new Error("Enter valid output dimensions greater than 0.");
  }
  validateImageDimensions(Math.round(width), Math.round(height));
}

export function isSupportedImageInput(file: File) {
  return (
    file.type.startsWith("image/") ||
    /\.(?:jpe?g|png|webp|gif|bmp|svg)$/i.test(file.name)
  );
}
