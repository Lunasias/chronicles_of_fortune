// The world background: skies, celestial bodies and clouds.
//
// The background used to be canvas gradients and arcs - a createLinearGradient sky, radial
// gradient suns, shadowBlur on the mountain rim light, ellipse triples per cloud and arc per
// star. It is now painted from plain RGBA buffers like everything else, so this suite treats the
// exported PNGs in public/assets/sky as canonical art and re-paints them to compare byte-for-byte.
//
// The single most valuable assertion here is that the sky has exactly SKY_BANDS colours. A
// gradient has thousands; a banded pixel-art sky has exactly as many as it has bands. That one
// number is the whole difference between the two techniques.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import {
  CLOUD_SIZES,
  CLOUD_VARIANTS,
  SKY_BANDS,
  SKY_TIMES,
  SKY_TILE_W,
  paintCelestial,
  paintCloud,
  paintSky,
  resolveSkyTime
} from '../.test-build/engine/SkyPainter.js';
import png from '../scripts/lib/png.cjs';

const { encodePNG } = png;
const MODEL_DIR = path.join('public', 'assets', 'sky');

const SKY_EXPORT_H = 512;
const SOLID_ALPHA = 200;
const luminance = (r, g, b) => (r * 0.299 + g * 0.587 + b * 0.114) / 255;
const alphaAt = (s, x, y) => (x < 0 || y < 0 || x >= s.w || y >= s.h ? 0 : s.data[(y * s.w + x) * 4 + 3]);
const keyOf = (s, x, y) => {
  const i = (y * s.w + x) * 4;
  return `${s.data[i]},${s.data[i + 1]},${s.data[i + 2]}`;
};

/** Every exported model, paired with a fresh paint of the same thing. */
const models = [];
for (const t of SKY_TIMES) {
  models.push({ label: `sky_${t.toLowerCase()}`, surface: paintSky(t, SKY_EXPORT_H) });
  models.push({ label: `sun_${t.toLowerCase()}`, surface: paintCelestial(40, t, false) });
}
models.push({ label: 'moon', surface: paintCelestial(34, 'NIGHT', true) });

const clouds = [];
for (const t of SKY_TIMES) {
  for (const kind of ['sky', 'sea']) {
    for (let v = 0; v < CLOUD_VARIANTS; v++) {
      for (let sz = 0; sz < CLOUD_SIZES.length; sz++) {
        clouds.push({ label: `${kind}_${t}_v${v}_s${sz}`, kind, time: t, variant: v, size: sz, surface: paintCloud(kind, v, sz, t) });
      }
    }
  }
}

test('the sky is banded, not a gradient', () => {
  // A gradient would produce hundreds or thousands of distinct colours. A banded sky produces
  // exactly one per band, and that is the whole point of the rewrite.
  for (const t of SKY_TIMES) {
    const s = paintSky(t, SKY_EXPORT_H);
    const colours = new Set();
    for (let i = 0; i < s.w * s.h; i++) {
      colours.add(`${s.data[i * 4]},${s.data[i * 4 + 1]},${s.data[i * 4 + 2]}`);
    }
    assert.equal(colours.size, SKY_BANDS, `${t} sky has ${colours.size} colours, expected ${SKY_BANDS}`);
    assert.ok(SKY_BANDS >= 8 && SKY_BANDS <= 32, 'a sky ramp outside this range reads as either a gradient or a flag');
  }
});

test('each sky row is flat and its dither repeats, so the tile is seamless', () => {
  for (const t of SKY_TIMES) {
    const s = paintSky(t, SKY_EXPORT_H);
    for (let y = 0; y < s.h; y++) {
      const row = new Set();
      for (let x = 0; x < s.w; x++) row.add(keyOf(s, x, y));
      // At most the two bands this row sits between.
      assert.ok(row.size <= 2, `${t} row ${y} mixes ${row.size} colours`);
      // The 4x4 Bayer threshold has a period of 4, and the tile is 64 wide, so the dither wraps
      // exactly. If this failed the sky would show a seam every 64 pixels.
      for (let x = 0; x < s.w - 4; x++) {
        assert.equal(keyOf(s, x, y), keyOf(s, x + 4, y), `${t} dither does not repeat at x=${x}, y=${y}`);
      }
      assert.equal(SKY_TILE_W % 4, 0, 'the tile width must be a multiple of the dither period');
    }
  }
});

test('the sky bands run from zenith to horizon and brighten downward', () => {
  // Sampling one column does not give one sample per band: inside a dithered transition the column
  // alternates between the two neighbouring bands, and at the end of a transition a row can be
  // entirely the upper band. What is checkable is that the ramp has exactly SKY_BANDS colours in
  // total, that a row's MEAN luminance - which is the dither's own estimate of the ramp - never
  // goes back up, and that the ramp spans a wide range. All four authored skies run dark at the
  // zenith to bright at the horizon.
  for (const t of SKY_TIMES) {
    const s = paintSky(t, SKY_EXPORT_H);
    const colours = new Set();
    for (let i = 0; i < s.w * s.h; i++) {
      colours.add(`${s.data[i * 4]},${s.data[i * 4 + 1]},${s.data[i * 4 + 2]}`);
    }
    assert.equal(colours.size, SKY_BANDS, `${t} has ${colours.size} distinct sky colours`);

    const means = [];
    for (let y = 0; y < s.h; y++) {
      let sum = 0;
      for (let x = 0; x < s.w; x++) {
        const i = (y * s.w + x) * 4;
        sum += luminance(s.data[i], s.data[i + 1], s.data[i + 2]);
      }
      means.push(sum / s.w);
    }
    // A single row's mean oscillates by up to half a band step, because the four Bayer rows have
    // different threshold distributions and so sample a constant ramp fraction at different
    // densities - that oscillation IS the dither. Averaging over a multiple of four rows cancels it
    // exactly, which then leaves the underlying ramp, and the ramp must be monotonic.
    const BUCKET = 16;
    const buckets = [];
    for (let y0 = 0; y0 + BUCKET <= means.length; y0 += BUCKET) {
      let sum = 0;
      for (let y = y0; y < y0 + BUCKET; y++) sum += means[y];
      buckets.push(sum / BUCKET);
    }
    for (let i = 1; i < buckets.length; i++) {
      assert.ok(
        buckets[i] >= buckets[i - 1] - 0.01,
        `${t} band bucket ${i} is darker than bucket ${i - 1} (${buckets[i - 1].toFixed(4)} -> ${buckets[i].toFixed(4)})`
      );
    }
    const span = buckets[buckets.length - 1] - buckets[0];
    // The night sky is deliberately dark end to end (#030712 zenith to #1e4b85 horizon measures
    // 0.23), so this only rules out a flat sky, it does not demand a bright one.
    assert.ok(span > 0.15, `${t} sky only spans ${span.toFixed(3)} of luminance`);
  }
});

test('the sky covers every pixel and honours the requested height', () => {
  for (const t of SKY_TIMES) {
    for (const h of [1, 90, 512, 1080]) {
      const s = paintSky(t, h);
      assert.equal(s.w, SKY_TILE_W);
      assert.equal(s.h, h, `${t} at height ${h}`);
      // A hole in the sky shows the page background through it.
      let holes = 0;
      for (let i = 0; i < s.w * s.h; i++) if (s.data[i * 4 + 3] < 255) holes++;
      assert.equal(holes, 0, `${t} at height ${h} has ${holes} non-opaque pixels`);
    }
  }
});

test('an unknown time of day falls back to the day sky', () => {
  for (const t of SKY_TIMES) assert.equal(resolveSkyTime(t), t);
  assert.equal(resolveSkyTime('MIDNIGHT'), 'DAY');
  assert.equal(resolveSkyTime(''), 'DAY');
  const a = Buffer.from(paintSky('not_a_time', 64).data.buffer);
  const b = Buffer.from(paintSky('DAY', 64).data.buffer);
  assert.ok(a.equals(b));
});

test('every celestial body is a shaded disc inside a dithered halo', () => {
  for (const t of SKY_TIMES) {
    for (const crescent of [false, true]) {
      const r = 24;
      const s = paintCelestial(r, t, crescent);
      const label = `${t} ${crescent ? 'moon' : 'sun'}`;
      const cx = s.w / 2;
      const cy = s.h / 2;

      // The disc itself must be solid, and the halo must extend well past it.
      let disc = 0;
      let halo = 0;
      for (let y = 0; y < s.h; y++) {
        for (let x = 0; x < s.w; x++) {
          if (alphaAt(s, x, y) <= SOLID_ALPHA) continue;
          if (Math.hypot(x - cx, y - cy) <= r) disc++;
          else halo++;
        }
      }
      assert.ok(
        disc > r * r * (crescent ? 1.1 : 2.4),
        `${label} disc has only ${disc} pixels`
      );
      assert.ok(halo > 200, `${label} has only ${halo} halo pixels`);
      assert.ok(halo > disc * 0.4, `${label} halo is too small to read as a glow`);

      // Shaded: a flat disc would be one colour.
      const colours = new Set();
      for (let y = 0; y < s.h; y++) {
        for (let x = 0; x < s.w; x++) if (alphaAt(s, x, y) > SOLID_ALPHA) colours.add(keyOf(s, x, y));
      }
      assert.ok(colours.size >= 3, `${label} uses only ${colours.size} colours`);
    }
  }
});

test('the sun is lit from the upper-left and the moon is a crescent', () => {
  const r = 24;
  const sun = paintCelestial(r, 'DAY', false);
  const moon = paintCelestial(r, 'NIGHT', true);

  // Alpha symmetry of the DISC only. The halo is an ordered dither, which is deliberately not
  // mirror-symmetric, so measuring the whole sprite would say a full sun is a crescent too.
  const alphaAsymmetry = s => {
    const cx = s.w / 2;
    const cy = s.h / 2;
    let diff = 0;
    let total = 0;
    for (let y = 0; y < s.h; y++) {
      for (let x = 0; x < s.w; x++) {
        if (Math.hypot(x - cx, y - cy) > r) continue;
        const mx = Math.round(2 * cx - x);
        diff += Math.abs((alphaAt(s, x, y) > SOLID_ALPHA ? 1 : 0) - (alphaAt(s, mx, y) > SOLID_ALPHA ? 1 : 0));
        total++;
      }
    }
    return total ? diff / total : 0;
  };
  assert.ok(alphaAsymmetry(sun) < 0.02, `a full sun must be symmetric (${alphaAsymmetry(sun).toFixed(3)})`);
  assert.ok(alphaAsymmetry(moon) > 0.04, `the moon must be a crescent (${alphaAsymmetry(moon).toFixed(3)})`);

  // Light direction on the disc: the upper-left must outrank the lower-right.
  let ul = 0;
  let uln = 0;
  let lr = 0;
  let lrn = 0;
  for (let y = 0; y < sun.h; y++) {
    for (let x = 0; x < sun.w; x++) {
      if (alphaAt(sun, x, y) <= SOLID_ALPHA) continue;
      const l = luminance(sun.data[(y * sun.w + x) * 4], sun.data[(y * sun.w + x) * 4 + 1], sun.data[(y * sun.w + x) * 4 + 2]);
      if (x < sun.w / 2 && y < sun.h / 2) {
        ul += l;
        uln++;
      } else if (x > sun.w / 2 && y > sun.h / 2) {
        lr += l;
        lrn++;
      }
    }
  }
  assert.ok(uln > 100 && lrn > 100, 'the sun needs both quadrants populated');
  assert.ok(ul / uln > lr / lrn + 0.02, `sun: upper-left ${(ul / uln).toFixed(3)} vs lower-right ${(lr / lrn).toFixed(3)}`);
});

test('the cloud size buckets are distinct and ordered', () => {
  for (let i = 1; i < CLOUD_SIZES.length; i++) {
    assert.ok(CLOUD_SIZES[i] > CLOUD_SIZES[i - 1], 'cloud size buckets must increase');
  }
  for (const kind of ['sky', 'sea']) {
    for (let sz = 0; sz < CLOUD_SIZES.length; sz++) {
      const s = paintCloud(kind, 0, sz, 'DAY');
      assert.equal(s.w, CLOUD_SIZES[sz], `${kind} size ${sz} width`);
      assert.ok(s.h > 4, `${kind} size ${sz} is only ${s.h}px tall`);
      // Every cloud must fit the tallest bucket's cell, which the review sheet relies on.
      assert.ok(s.w <= CLOUD_SIZES[CLOUD_SIZES.length - 1]);
    }
  }
});

test('a sea cloud is flatter than a sky cloud', () => {
  // This is what makes the under-map layer read as a cloud sea seen from above rather than as
  // more of the same clouds drifting past.
  for (let sz = 0; sz < CLOUD_SIZES.length; sz++) {
    const sky = paintCloud('sky', 0, sz, 'DAY');
    const sea = paintCloud('sea', 0, sz, 'DAY');
    assert.ok(
      sea.h < sky.h,
      `size ${sz}: sea cloud is ${sea.h}px tall, sky cloud ${sky.h}px`
    );
  }
});

test('every cloud is shaded, lit from above and carries a rim', () => {
  for (const c of clouds) {
    const s = c.surface;
    let brightest = 0;
    let darkest = 1;
    const colours = new Set();
    for (let i = 0; i < s.w * s.h; i++) {
      if (s.data[i * 4 + 3] <= SOLID_ALPHA) continue;
      colours.add(`${s.data[i * 4]},${s.data[i * 4 + 1]},${s.data[i * 4 + 2]}`);
      const l = luminance(s.data[i * 4], s.data[i * 4 + 1], s.data[i * 4 + 2]);
      if (l > brightest) brightest = l;
      if (l < darkest) darkest = l;
    }
    assert.ok(colours.size >= 4, `${c.label} uses only ${colours.size} colours`);
    assert.ok(brightest - darkest > 0.15, `${c.label} only spans ${(brightest - darkest).toFixed(3)}`);

    // Light from above: the top half must measure brighter than the bottom half. A cloud lit from
    // below reads as a hole in the sky.
    let top = 0;
    let topN = 0;
    let bottom = 0;
    let bottomN = 0;
    for (let y = 0; y < s.h; y++) {
      for (let x = 0; x < s.w; x++) {
        if (alphaAt(s, x, y) <= SOLID_ALPHA) continue;
        const i = (y * s.w + x) * 4;
        const l = luminance(s.data[i], s.data[i + 1], s.data[i + 2]);
        if (y < s.h / 2) {
          top += l;
          topN++;
        } else {
          bottom += l;
          bottomN++;
        }
      }
    }
    assert.ok(topN > 50 && bottomN > 50, `${c.label} is missing a half`);
    assert.ok(
      top / topN > bottom / bottomN + 0.02,
      `${c.label}: top half ${(top / topN).toFixed(3)} vs bottom half ${(bottom / bottomN).toFixed(3)}`
    );

    // Every column that has any cloud in it must carry a rim pixel, and the rim must be one
    // uniform colour: it is a single line painted along the silhouette, and that is what gives a
    // cloud its lit top edge. (Comparing its luminance to the brightest body pixel instead would
    // fail at dusk, where the rim is an orange sunset glow that is darker than the white cloud.)
    let columns = 0;
    const rimColours = new Set();
    for (let x = 0; x < s.w; x++) {
      let top = -1;
      for (let y = 0; y < s.h; y++) {
        if (alphaAt(s, x, y) > SOLID_ALPHA) {
          top = y;
          break;
        }
      }
      if (top < 0) continue;
      columns++;
      rimColours.add(keyOf(s, x, top));
    }
    assert.ok(columns > 0, `${c.label} is empty`);
    assert.equal(rimColours.size, 1, `${c.label} has ${rimColours.size} different rim colours`);
  }
});

test('cloud shapes, sizes and times of day all differ', () => {
  const seen = new Map();
  const duplicates = [];
  for (const c of clouds) {
    const bytes = Buffer.from(c.surface.data.buffer).toString('base64');
    if (seen.has(bytes)) duplicates.push(`${c.label} == ${seen.get(bytes)}`);
    else seen.set(bytes, c.label);
  }
  assert.deepEqual(duplicates, []);

  // And the same cloud at the same shape/size must differ between day and night.
  for (const kind of ['sky', 'sea']) {
    for (let v = 0; v < CLOUD_VARIANTS; v++) {
      for (let sz = 0; sz < CLOUD_SIZES.length; sz++) {
        const day = Buffer.from(paintCloud(kind, v, sz, 'DAY').data.buffer);
        const night = Buffer.from(paintCloud(kind, v, sz, 'NIGHT').data.buffer);
        assert.ok(!day.equals(night), `${kind} v${v} s${sz} looks identical day and night`);
      }
    }
  }
});

test('the exported sky models match what the painter draws', () => {
  for (const m of models) {
    const expected = encodePNG(m.surface.w, m.surface.h, Buffer.from(m.surface.data.buffer));
    const actual = readFileSync(path.join(MODEL_DIR, `${m.label}.png`));
    assert.ok(expected.equals(actual), `${m.label}.png is stale - re-run \`npm run gen:sky\``);
  }
});

test('no orphaned sky models are left behind', () => {
  const known = new Set(models.map(m => `${m.label}.png`));
  const orphans = readdirSync(MODEL_DIR).filter(f => f.endsWith('.png') && !known.has(f));
  assert.deepEqual(orphans, []);
});
