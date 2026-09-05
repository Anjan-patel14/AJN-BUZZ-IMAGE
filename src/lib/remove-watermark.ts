export type RepairRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type RepairOptions = {
  strength?: number;
  feather?: number;
};

export function normalizeRepairRegion(
  imageWidth: number,
  imageHeight: number,
  region: RepairRegion,
): RepairRegion {
  if (
    !Number.isFinite(imageWidth) ||
    !Number.isFinite(imageHeight) ||
    imageWidth <= 1 ||
    imageHeight <= 1
  ) {
    throw new Error("The image has invalid dimensions.");
  }

  const x = Math.max(
    0,
    Math.min(imageWidth - 1, Math.round(Number(region.x) || 0)),
  );
  const y = Math.max(
    0,
    Math.min(imageHeight - 1, Math.round(Number(region.y) || 0)),
  );
  const width = Math.max(
    1,
    Math.min(imageWidth - x, Math.round(Number(region.width) || 0)),
  );
  const height = Math.max(
    1,
    Math.min(imageHeight - y, Math.round(Number(region.height) || 0)),
  );

  const areaRatio = (width * height) / (imageWidth * imageHeight);
  if (width < 2 || height < 2) {
    throw new Error("Choose a watermark area at least 2 × 2 pixels.");
  }
  if (areaRatio > 0.45) {
    throw new Error(
      "The selected area is too large for reliable local repair. Select only the watermark or logo area.",
    );
  }

  return { x, y, width, height };
}

function pixelOffset(x: number, y: number, width: number) {
  return (y * width + x) * 4;
}

function boundarySample(
  source: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  x: number,
  y: number,
) {
  const px = Math.max(0, Math.min(imageWidth - 1, x));
  const py = Math.max(0, Math.min(imageHeight - 1, y));
  const offset = pixelOffset(px, py, imageWidth);
  return [
    source[offset]!,
    source[offset + 1]!,
    source[offset + 2]!,
    source[offset + 3]!,
  ] as const;
}

export function repairWatermarkRegion(
  pixels: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  rawRegion: RepairRegion,
  options: RepairOptions = {},
): Uint8ClampedArray {
  if (pixels.length !== imageWidth * imageHeight * 4) {
    throw new Error("Image pixel buffer is invalid.");
  }

  const region = normalizeRepairRegion(imageWidth, imageHeight, rawRegion);
  const strength = Math.max(
    1,
    Math.min(8, Math.round(Number(options.strength) || 4)),
  );
  const feather = Math.max(
    0,
    Math.min(
      Math.floor(Math.min(region.width, region.height) / 3),
      Math.round(Number(options.feather) || 4),
    ),
  );

  const original = new Uint8ClampedArray(pixels);
  const work = new Uint8ClampedArray(pixels);

  const leftX = Math.max(0, region.x - 1);
  const rightX = Math.min(imageWidth - 1, region.x + region.width);
  const topY = Math.max(0, region.y - 1);
  const bottomY = Math.min(imageHeight - 1, region.y + region.height);

  for (let y = region.y; y < region.y + region.height; y++) {
    for (let x = region.x; x < region.x + region.width; x++) {
      const dl = x - region.x + 1;
      const dr = region.x + region.width - x;
      const dt = y - region.y + 1;
      const db = region.y + region.height - y;

      const left = boundarySample(original, imageWidth, imageHeight, leftX, y);
      const right = boundarySample(
        original,
        imageWidth,
        imageHeight,
        rightX,
        y,
      );
      const top = boundarySample(original, imageWidth, imageHeight, x, topY);
      const bottom = boundarySample(
        original,
        imageWidth,
        imageHeight,
        x,
        bottomY,
      );

      const wl = 1 / Math.max(1, dl);
      const wr = 1 / Math.max(1, dr);
      const wt = 1 / Math.max(1, dt);
      const wb = 1 / Math.max(1, db);
      const total = wl + wr + wt + wb;

      const out = pixelOffset(x, y, imageWidth);
      for (let channel = 0; channel < 4; channel++) {
        work[out + channel] = Math.round(
          (left[channel] * wl +
            right[channel] * wr +
            top[channel] * wt +
            bottom[channel] * wb) /
            total,
        );
      }
    }
  }

  for (let pass = 0; pass < strength; pass++) {
    const previous = new Uint8ClampedArray(work);
    for (let y = region.y; y < region.y + region.height; y++) {
      for (let x = region.x; x < region.x + region.width; x++) {
        const out = pixelOffset(x, y, imageWidth);
        const neighbours = [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1],
          [x - 1, y - 1],
          [x + 1, y - 1],
          [x - 1, y + 1],
          [x + 1, y + 1],
        ] as const;

        const sums = [0, 0, 0, 0];
        let count = 0;
        for (const [nxRaw, nyRaw] of neighbours) {
          const nx = Math.max(0, Math.min(imageWidth - 1, nxRaw));
          const ny = Math.max(0, Math.min(imageHeight - 1, nyRaw));
          const offset = pixelOffset(nx, ny, imageWidth);
          for (let channel = 0; channel < 4; channel++) {
            sums[channel] += previous[offset + channel]!;
          }
          count++;
        }

        for (let channel = 0; channel < 4; channel++) {
          const smoothed = sums[channel]! / Math.max(1, count);
          work[out + channel] = Math.round(
            previous[out + channel]! * 0.42 + smoothed * 0.58,
          );
        }
      }
    }
  }

  if (feather > 0) {
    for (let y = region.y; y < region.y + region.height; y++) {
      for (let x = region.x; x < region.x + region.width; x++) {
        const edgeDistance = Math.min(
          x - region.x,
          region.x + region.width - 1 - x,
          y - region.y,
          region.y + region.height - 1 - y,
        );
        if (edgeDistance >= feather) continue;

        const repairedWeight = Math.max(
          0.18,
          Math.min(1, (edgeDistance + 1) / (feather + 1)),
        );
        const out = pixelOffset(x, y, imageWidth);
        for (let channel = 0; channel < 4; channel++) {
          work[out + channel] = Math.round(
            original[out + channel]! * (1 - repairedWeight) +
              work[out + channel]! * repairedWeight,
          );
        }
      }
    }
  }

  return work;
}
