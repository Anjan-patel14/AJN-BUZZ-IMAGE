import type { OutputFormat } from "./image-engine";

export function validateEncodedBlob(blob: Blob, expected: OutputFormat) {
  if (!blob || blob.size <= 0) {
    throw new Error("The browser returned an empty image result.");
  }

  const type = blob.type || expected;
  if (!["image/jpeg", "image/png", "image/webp"].includes(type)) {
    throw new Error("The browser returned an unsupported image format.");
  }

  return blob;
}

export function outputExtension(type: OutputFormat) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/webp") return "webp";
  return "png";
}
