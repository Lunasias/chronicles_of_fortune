// The board's pixel-grid policy.
//
// This suite exists because of a real, reported problem: the board was "very dizzying, like the
// pixels". Two causes, and this file locks down the fix for one of them.
//
//   1. The floor carried a regular 4x4 ordered-dither mask. A regular micro-pattern drawn at a
//      non-integer scale produces MOIRE - large slow-moving interference bands. That is asserted
//      against in tests/terrain.test.mjs, which requires the ground grain NOT to be a 4x4 grid.
//
//   2. The camera zoom was an arbitrary fraction (a wheel notch multiplied it by 1.08), so world
//      pixels did not land on whole screen pixels. Some source pixels covered two screen pixels and
//      their neighbours covered one, and the grid the art was drawn on stopped existing - it
//      crawled whenever the camera moved. That is what this file asserts against.
import test from 'node:test';
import assert from 'node:assert/strict';

import { ZOOM_LADDER, defaultZoomFor, snapWorld, snapZoom } from '../.test-build/engine/PixelScale.js';

test('the zoom is always a whole number of screen pixels per world pixel', () => {
  // The property that matters: multiplying the snapped scale by a whole world coordinate gives a
  // whole screen position, for every zoom a player can reach.
  for (const requested of [0.2, 0.3, 0.45, 0.55, 0.6, 0.78, 0.88, 0.92, 1, 1.08, 1.17, 1.44, 1.8, 2.4, 3.7]) {
    const zoom = snapZoom(requested);
    assert.ok(Number.isFinite(zoom) && zoom > 0, `snapZoom(${requested}) returned ${zoom}`);

    const pixelsPerWorld = zoom >= 1 ? zoom : 1 / zoom;
    const rounded = Math.round(pixelsPerWorld);
    assert.ok(
      Math.abs(pixelsPerWorld - rounded) < 1e-9,
      `snapZoom(${requested}) = ${zoom} is ${pixelsPerWorld} pixels per world pixel, not a whole number`
    );

    // And it really is whole: a world coordinate maps to a whole screen pixel.
    for (const world of [0, 1, 7, 48, 96, 1000, -96]) {
      const screen = snapWorld(world, zoom) * zoom;
      assert.ok(
        Math.abs(screen - Math.round(screen)) < 1e-6,
        `world ${world} at zoom ${zoom} lands at ${screen}, not a whole pixel`
      );
    }
  }
});

test('an in-between scale is never reachable', () => {
  // 1.5 is the clearest example of the problem: two world pixels onto three screen pixels, which
  // alternates between one and two screen pixels per source pixel.
  const snapped = snapZoom(1.5);
  assert.notEqual(snapped, 1.5);
  assert.ok(Math.abs(snapped - 1) < 1e-9 || Math.abs(snapped - 2) < 1e-9, `1.5 snapped to ${snapped}`);

  // More generally, whatever a wheel notch produces lands on the ladder and nowhere else.
  let zoom = 1;
  for (let i = 0; i < 20; i++) {
    zoom = snapZoom(zoom * 1.08);
    assert.ok(
      ZOOM_LADDER.some(rung => Math.abs(rung - zoom) < 1e-9),
      `zooming in reached ${zoom}, which is not on the ladder`
    );
  }
  zoom = 1;
  for (let i = 0; i < 20; i++) {
    zoom = snapZoom(zoom * 0.92);
    assert.ok(
      ZOOM_LADDER.some(rung => Math.abs(rung - zoom) < 1e-9),
      `zooming out reached ${zoom}, which is not on the ladder`
    );
  }
});

test('the ladder is monotonic and reachable in both directions', () => {
  for (let i = 1; i < ZOOM_LADDER.length; i++) {
    assert.ok(ZOOM_LADDER[i] > ZOOM_LADDER[i - 1], 'the ladder must ascend');
  }
  assert.ok(ZOOM_LADDER.includes(1), 'the ladder must contain 1:1');
  // Zooming out must actually be possible: the board is large and the player needs to see it.
  assert.ok(ZOOM_LADDER[0] < 0.5, 'the ladder must allow zooming out well past 1:1');
  assert.ok(ZOOM_LADDER[ZOOM_LADDER.length - 1] >= 3, 'the ladder must allow zooming in');
});

test('degenerate input falls back instead of producing a broken transform', () => {
  for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    const zoom = snapZoom(bad);
    assert.ok(Number.isFinite(zoom) && zoom > 0, `snapZoom(${bad}) returned ${zoom}`);
  }
  // A zero or negative scale must not divide by zero when snapping a coordinate.
  for (const bad of [0, -1, Number.NaN]) {
    assert.ok(Number.isFinite(snapWorld(123, bad)), `snapWorld with ${bad} produced a non-finite value`);
  }
  assert.equal(snapWorld(123, 1), 123);
});

test('the default zoom is an even scale at every viewport width', () => {
  for (const w of [320, 400, 479, 480, 700, 767, 768, 1280, 1920, 3840]) {
    const zoom = defaultZoomFor(w);
    const pixelsPerWorld = zoom >= 1 ? zoom : 1 / zoom;
    assert.ok(
      Math.abs(pixelsPerWorld - Math.round(pixelsPerWorld)) < 1e-9,
      `viewport ${w} defaults to zoom ${zoom}, which is not an even scale`
    );
    assert.ok(zoom > 0 && zoom <= 2, `viewport ${w} defaults to an implausible zoom ${zoom}`);
  }
  // A null/garbage width must not crash the renderer on startup.
  for (const bad of [0, -1, Number.NaN]) {
    assert.ok(defaultZoomFor(bad) > 0);
  }
});
