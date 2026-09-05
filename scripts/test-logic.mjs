import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ajn-buzz-v53-logic-"));

function compile(sourceRelative, outputName) {
  const sourcePath = path.join(root, sourceRelative);
  const source = fs.readFileSync(sourcePath, "utf8");
  const result = ts.transpileModule(source, {
    fileName: sourcePath,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ES2020,
      strict: true,
    },
  });
  const errors = (result.diagnostics || []).filter(
    (item) => item.category === ts.DiagnosticCategory.Error,
  );
  if (errors.length) {
    for (const error of errors) {
      console.error(ts.flattenDiagnosticMessageText(error.messageText, "\n"));
    }
    process.exit(1);
  }
  const outputPath = path.join(temp, outputName);
  fs.writeFileSync(outputPath, result.outputText, "utf8");
  return outputPath;
}

const repairPath = compile(
  "src/lib/remove-watermark.ts",
  "remove-watermark.mjs",
);
const validationPath = compile(
  "src/lib/image-validation.ts",
  "image-validation.mjs",
);

const { normalizeRepairRegion, repairWatermarkRegion } = await import(
  pathToFileURL(repairPath).href
);
const { validateImageDimensions, validateRequestedDimensions } = await import(
  pathToFileURL(validationPath).href
);

function makeGradient(width, height) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      data[i] = 40 + x * 3;
      data[i + 1] = 70 + y * 2;
      data[i + 2] = 110 + Math.round((x + y) / 2);
      data[i + 3] = 255;
    }
  }
  return data;
}

const width = 40;
const height = 30;
const source = makeGradient(width, height);
const marked = new Uint8ClampedArray(source);

for (let y = 20; y < 25; y++) {
  for (let x = 25; x < 35; x++) {
    const i = (y * width + x) * 4;
    marked[i] = 250;
    marked[i + 1] = 250;
    marked[i + 2] = 250;
    marked[i + 3] = 255;
  }
}

const repaired = repairWatermarkRegion(
  marked,
  width,
  height,
  { x: 25, y: 20, width: 10, height: 5 },
  { strength: 5, feather: 2 },
);

assert.equal(repaired.length, marked.length);
assert.deepEqual(
  Array.from(repaired.slice(0, 4)),
  Array.from(marked.slice(0, 4)),
  "pixels outside the selected repair area must remain unchanged",
);

let changedInside = 0;
for (let y = 20; y < 25; y++) {
  for (let x = 25; x < 35; x++) {
    const i = (y * width + x) * 4;
    if (
      repaired[i] !== marked[i] ||
      repaired[i + 1] !== marked[i + 1] ||
      repaired[i + 2] !== marked[i + 2]
    ) {
      changedInside++;
    }
  }
}
assert.ok(changedInside > 35, "most marked pixels should be repaired");

assert.deepEqual(
  normalizeRepairRegion(100, 80, {
    x: 95,
    y: 75,
    width: 20,
    height: 20,
  }),
  { x: 95, y: 75, width: 5, height: 5 },
);

assert.throws(
  () =>
    normalizeRepairRegion(100, 100, {
      x: 0,
      y: 0,
      width: 90,
      height: 90,
    }),
  /too large/i,
);

validateImageDimensions(1200, 800);
validateRequestedDimensions(1920, 1080);
assert.throws(() => validateImageDimensions(13000, 100), /too large/i);
assert.throws(() => validateRequestedDimensions(0, 100), /greater than 0/i);

fs.rmSync(temp, { recursive: true, force: true });

console.log(
  "PASS: Remove Watermark local inpainting changes the selected region only",
);
console.log("PASS: repair region clamping and oversized-area protection");
console.log("PASS: shared image dimension safety");
console.log("AJN BUZZ V5.3 LOGIC TESTS: PASS");
