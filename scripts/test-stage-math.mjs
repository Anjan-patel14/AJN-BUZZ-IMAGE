/**
 * AJN BUZZ IMAGE - Unit Tests for stage-math.ts
 * Verifies round-trip coordinate invariance, preview->export projection,
 * clamp boundaries, angle normalization, pivot zoom stability, and A4 sheet grid layout.
 */

import assert from 'node:assert/strict';
import {
  DEFAULT_TRANSFORM,
  clampTransform,
  normalizeAngle,
  calculateBaseScale,
  sourcePointToTarget,
  targetPointToSource,
  projectPreviewToExport,
  nudgeTransform,
  zoomTransform,
  getTransformedCorners,
  computeA4GridLayout,
} from '../src/lib/stage-math.ts';

console.log('🧪 Running stage-math unit tests...\n');

// Test 1: Angle normalization
console.log('1. Testing angle normalization...');
assert.equal(normalizeAngle(0), 0);
assert.equal(normalizeAngle(90), 90);
assert.equal(normalizeAngle(-90), -90);
assert.equal(normalizeAngle(180), 180);
assert.equal(normalizeAngle(-180), -180);
assert.equal(normalizeAngle(270), -90);
assert.equal(normalizeAngle(360), 0);
assert.equal(normalizeAngle(-270), 90);
assert.equal(normalizeAngle(720), 0);
assert.equal(normalizeAngle(45.555), 45.56);
console.log('   ✓ Angle normalization passed');

// Test 2: Clamp transforms
console.log('2. Testing transform clamping & bounds...');
const clamped = clampTransform({
  x: 10,
  y: -10,
  scale: 0.1, // below MIN (0.25)
  rotation: 200,
  flipX: true,
});
assert.equal(clamped.x, 3);
assert.equal(clamped.y, -3);
assert.equal(clamped.scale, 0.25);
assert.equal(clamped.rotation, -160);
assert.equal(clamped.flipX, true);

const clampedOverMax = clampTransform({ scale: 12.5 });
assert.equal(clampedOverMax.scale, 5.0);
console.log('   ✓ Transform clamping passed');

// Test 3: Base scale calculations
console.log('3. Testing calculateBaseScale (cover vs fit)...');
const src = { width: 1000, height: 500 }; // 2:1
const tgtCover = { width: 500, height: 500 }; // 1:1
assert.equal(calculateBaseScale(src, tgtCover, 'cover'), 1.0);
assert.equal(calculateBaseScale(src, tgtCover, 'fit'), 0.5);
console.log('   ✓ Base scale calculations passed');

// Test 4: Round-trip coordinate invariance: Source -> Target -> Source
console.log('4. Testing source -> target -> source round-trip precision...');
const testSources = [
  { width: 800, height: 600 },
  { width: 1920, height: 1080 },
  { width: 4000, height: 3000 },
  { width: 413, height: 531 }, // Passport size
];

const testTargets = [
  { width: 400, height: 300 },
  { width: 500, height: 500 },
  { width: 1200, height: 800 },
];

const testTransforms = [
  DEFAULT_TRANSFORM,
  { x: 0.15, y: -0.2, scale: 1.5, rotation: 25, flipX: false },
  { x: -0.3, y: 0.4, scale: 0.8, rotation: -45, flipX: true },
  { x: 0, y: 0, scale: 2.2, rotation: 180, flipX: true },
  { x: 0.05, y: 0.05, scale: 0.25, rotation: -90, flipX: false }, // min scale
  { x: -0.1, y: 0.2, scale: 5.0, rotation: 90, flipX: true }, // max scale
];

let roundTripCount = 0;
for (const source of testSources) {
  for (const target of testTargets) {
    for (const transform of testTransforms) {
      for (const mode of ['cover', 'fit']) {
        const samplePoints = [
          { x: 0, y: 0 },
          { x: source.width, y: 0 },
          { x: source.width, y: source.height },
          { x: 0, y: source.height },
          { x: source.width / 2, y: source.height / 2 },
          { x: source.width * 0.33, y: source.height * 0.67 },
        ];

        for (const pt of samplePoints) {
          const targetPt = sourcePointToTarget(pt, source, target, transform, mode);
          const recoveredPt = targetPointToSource(targetPt, source, target, transform, mode);

          const errX = Math.abs(recoveredPt.x - pt.x);
          const errY = Math.abs(recoveredPt.y - pt.y);

          assert(
            errX < 1e-4 && errY < 1e-4,
            `Round-trip error exceeded: (${pt.x}, ${pt.y}) -> (${recoveredPt.x}, ${recoveredPt.y}) | err: ${errX}, ${errY}`
          );
          roundTripCount++;
        }
      }
    }
  }
}
console.log(`   ✓ ${roundTripCount} round-trip coordinate checks passed with error < 1e-4 px`);

// Test 5: Preview to Export projection invariance
console.log('5. Testing Preview -> Export projection proportional consistency...');
const sourceImg = { width: 3000, height: 2000 };
const previewStage = { width: 450, height: 300 }; // 1.5 ratio preview
const exportStage = { width: 1800, height: 1200 }; // 4x larger export stage

const activeTransform = { x: 0.1, y: -0.05, scale: 1.4, rotation: 15, flipX: false };

const previewPoints = [
  { x: 0, y: 0 },
  { x: 450, y: 0 },
  { x: 225, y: 150 },
  { x: 100, y: 200 },
];

for (const pPt of previewPoints) {
  const projectedExportPt = projectPreviewToExport(
    pPt,
    previewStage,
    exportStage,
    sourceImg,
    activeTransform,
    'cover'
  );

  const expectedX = pPt.x * (exportStage.width / previewStage.width);
  const expectedY = pPt.y * (exportStage.height / previewStage.height);

  const diffX = Math.abs(projectedExportPt.x - expectedX);
  const diffY = Math.abs(projectedExportPt.y - expectedY);

  assert(
    diffX < 1e-4 && diffY < 1e-4,
    `Preview->Export scaling mismatch: expected (${expectedX}, ${expectedY}) got (${projectedExportPt.x}, ${projectedExportPt.y})`
  );
}
console.log('   ✓ Preview to Export proportional projection passed');

// Test 6: Nudge & Zoom math
console.log('6. Testing nudge and zoom transformations...');
const t0 = { ...DEFAULT_TRANSFORM };
const nudged = nudgeTransform(t0, 0.05, -0.02);
assert.equal(nudged.x, 0.05);
assert.equal(nudged.y, -0.02);

const pivotTarget = { x: 250, y: 250 };
const zoomTarget = { width: 500, height: 500 };
const zoomSource = { width: 1000, height: 1000 };

const zoomed = zoomTransform(t0, 1.5, pivotTarget, zoomTarget, zoomSource, 'cover');
assert.equal(zoomed.scale, 1.5);
const beforeSrc = targetPointToSource(pivotTarget, zoomSource, zoomTarget, t0, 'cover');
const afterSrc = targetPointToSource(pivotTarget, zoomSource, zoomTarget, zoomed, 'cover');
const pivotErrX = Math.abs(beforeSrc.x - afterSrc.x);
const pivotErrY = Math.abs(beforeSrc.y - afterSrc.y);
assert(pivotErrX < 1e-3 && pivotErrY < 1e-3, `Pivot invariant failed: errX=${pivotErrX}, errY=${pivotErrY}`);
console.log('   ✓ Nudge and Zoom with pivot invariance passed');

// Test 7: Corners & rotate handle
console.log('7. Testing transformed corner coordinates and rotate handle...');
const corners = getTransformedCorners({ width: 200, height: 200 }, { width: 200, height: 200 }, DEFAULT_TRANSFORM, 'fit');
assert.equal(Math.round(corners.topLeft.x), 0);
assert.equal(Math.round(corners.topLeft.y), 0);
assert.equal(Math.round(corners.bottomRight.x), 200);
assert.equal(Math.round(corners.bottomRight.y), 200);
assert.equal(Math.round(corners.rotateHandle.x), 100);
assert.equal(Math.round(corners.rotateHandle.y), -32);
console.log('   ✓ Transformed corners & rotate handle verified');

// Test 8: A4 Grid Layout No-Overlap & Bounds Across Multiple Photo Sizes
console.log('8. Testing computeA4GridLayout no-overlap across multiple photo sizes...');
const a4PhotoSizes = [
  { name: '35x45 mm @ 300 DPI', w: 413, h: 531, dpi: 300 },
  { name: '2x2 in @ 300 DPI', w: 600, h: 600, dpi: 300 },
  { name: '25x35 mm @ 300 DPI', w: 295, h: 413, dpi: 300 },
  { name: '3.5x4.5 cm @ 600 DPI (auto-scaled DPI)', w: 827, h: 1063, dpi: 600 },
  { name: '50x70 mm @ 300 DPI', w: 591, h: 827, dpi: 300 },
];

for (const sz of a4PhotoSizes) {
  for (const count of [4, 8, 12, 0]) {
    const layout = computeA4GridLayout(sz.w, sz.h, sz.dpi, count, 10, 4);
    assert.equal(layout.hasOverlap, false, `Overlap detected for ${sz.name} count=${count}`);
    assert.equal(layout.withinBounds, true, `Out of bounds for ${sz.name} count=${count}`);
    assert(layout.placed >= 1 && layout.placed <= layout.maxFit);
  }
}
console.log('   ✓ All A4 grid layouts verified: 0 overlaps, 100% within printable bounds');

console.log('\n✅ All stage-math unit tests passed cleanly!\n');
