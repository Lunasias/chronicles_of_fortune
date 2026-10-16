const fs = require('fs');
const path = require('path');
const { decodePNG, encodePNG } = require('./lib/png.cjs');

// Color Utilities
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function clonePixels(srcBuf) {
  const dest = Buffer.alloc(srcBuf.length);
  srcBuf.copy(dest);
  return dest;
}

function setPixel(buf, w, h, x, y, r, g, b, a = 255) {
  if (x < 0 || x >= w || y < 0 || y >= h) return;
  const idx = (y * w + x) * 4;
  buf[idx] = r;
  buf[idx + 1] = g;
  buf[idx + 2] = b;
  buf[idx + 3] = a;
}

function pad48to64(pixels, srcW, srcH) {
  const TARGET = 64;
  const out = Buffer.alloc(TARGET * TARGET * 4);
  const offsetX = Math.floor((TARGET - srcW) / 2);
  const offsetY = Math.floor((TARGET - srcH) / 2);
  for (let y = 0; y < srcH; y++) {
    for (let x = 0; x < srcW; x++) {
      const srcIdx = (y * srcW + x) * 4;
      const destIdx = ((y + offsetY) * TARGET + (x + offsetX)) * 4;
      out[destIdx] = pixels[srcIdx];
      out[destIdx + 1] = pixels[srcIdx + 1];
      out[destIdx + 2] = pixels[srcIdx + 2];
      out[destIdx + 3] = pixels[srcIdx + 3];
    }
  }
  return out;
}

function getPixel(buf, w, h, x, y) {
  if (x < 0 || x >= w || y < 0 || y >= h) return [0, 0, 0, 0];
  const idx = (y * w + x) * 4;
  return [buf[idx], buf[idx + 1], buf[idx + 2], buf[idx + 3]];
}

// Detection filters for PixelLab base sprite elements
function isSpriteHair(r, g, b, a, x, y) {
  if (a < 15) return false;
  if (r > 190 && g > 130 && r > b + 25) return false; // skin
  if (b > r + 45 && b > g + 30 && a > 80) return false; // glowing weapon
  if (y >= 8 && y <= 28 && (x < 17 || x > 31) && r > 185 && g > 185 && b > 195) return false; // wings
  const isPale = (r > 90 && g > 85 && b > 95);
  const isDark = (r > 35 && g > 30 && b > 45 && b >= r - 15 && b >= g - 15);
  const isSheen = (r > 140 && g > 135 && b > 135 && Math.abs(r - g) < 25 && Math.abs(g - b) < 25);
  return isPale || isDark || isSheen;
}

function isSpriteWing(r, g, b, a, x, y) {
  if (a < 15) return false;
  return (y >= 8 && y <= 28 && (x < 17 || x > 31) && r > 185 && g > 185 && b > 195);
}

function isSpriteBlade(r, g, b, a, x, y) {
  if (a < 20) return false;
  return (b > r + 30 && b > g + 15);
}

function isSpriteSkin(r, g, b, a, x, y) {
  if (a < 20) return false;
  return (r > 190 && g > 130 && r > b + 20);
}

function isSpriteSuit(r, g, b, a, x, y) {
  if (a < 20) return false;
  return (y >= 18 && y <= 36 && r > 180 && g > 180 && b > 200 && !isSpriteHair(r, g, b, a, x, y));
}

// Prompt Parser
function parsePrompt(prompt, customName = null) {
  const p = prompt.toLowerCase();
  const spec = {
    name: customName || 'custom_heroine',
    skin_tone: 'warm', // warm, pale, tan, dark, demon
    hair_hue: 0.72, // 0..1
    hair_sat: 0.25,
    hair_style: 'flowing', // flowing, twintails, bob
    ears: 'none', // cat, fox, bunny, horns, none
    wings: 'none', // angel, dragon, none
    tail: 'none', // cat, fox, dragon, none
    outfit_style: 'micro_bikini', // micro_bikini, plate_kini, assassin_harness, sorceress_silk, corset
    outfit_color: [255, 255, 255],
    outfit_trim: [56, 189, 248],
    weapon_type: 'sword', // sword, daggers, staff, gun
    weapon_color: [56, 189, 248], // cyan default
  };

  if (!customName) {
    const words = p.replace(/[^a-zA-Z0-9 ]/g, '').split(/\s+/).filter(w => w.length > 2);
    spec.name = words.slice(0, 3).join('_') || 'custom_heroine';
  }

  // Skin
  if (p.includes('pale') || p.includes('porcelain') || p.includes('white skin')) spec.skin_tone = 'pale';
  else if (p.includes('tan') || p.includes('gyaru') || p.includes('sun-kissed')) spec.skin_tone = 'tan';
  else if (p.includes('dark skin')) spec.skin_tone = 'dark';
  else if (p.includes('demon') || p.includes('succubus')) spec.skin_tone = 'demon';

  // Hair
  if (p.includes('black hair') || p.includes('raven') || p.includes('dark hair')) {
    spec.hair_hue = 0.65; spec.hair_sat = 0.15; spec.hair_lum_scale = 0.25;
  } else if (p.includes('silver') || p.includes('white hair') || p.includes('platinum')) {
    spec.hair_hue = 0.72; spec.hair_sat = 0.15; spec.hair_lum_scale = 1.0;
  } else if (p.includes('blonde') || p.includes('gold hair') || p.includes('yellow hair')) {
    spec.hair_hue = 0.12; spec.hair_sat = 0.85; spec.hair_lum_scale = 0.9;
  } else if (p.includes('red hair') || p.includes('crimson') || p.includes('scarlet')) {
    spec.hair_hue = 0.0; spec.hair_sat = 0.85; spec.hair_lum_scale = 0.65;
  } else if (p.includes('pink hair') || p.includes('sakura')) {
    spec.hair_hue = 0.92; spec.hair_sat = 0.75; spec.hair_lum_scale = 0.85;
  } else if (p.includes('purple hair') || p.includes('violet') || p.includes('amethyst')) {
    spec.hair_hue = 0.78; spec.hair_sat = 0.80; spec.hair_lum_scale = 0.7;
  } else if (p.includes('blue hair') || p.includes('cyan hair')) {
    spec.hair_hue = 0.55; spec.hair_sat = 0.85; spec.hair_lum_scale = 0.75;
  } else if (p.includes('green hair') || p.includes('emerald hair')) {
    spec.hair_hue = 0.38; spec.hair_sat = 0.80; spec.hair_lum_scale = 0.65;
  }

  // Beast traits
  if (p.includes('cat') || p.includes('neko') || p.includes('catgirl')) {
    spec.ears = 'cat'; spec.tail = 'cat';
  } else if (p.includes('fox') || p.includes('kitsune')) {
    spec.ears = 'fox'; spec.tail = 'fox';
  } else if (p.includes('dragon')) {
    spec.ears = 'horns'; spec.wings = 'dragon'; spec.tail = 'dragon';
  } else if (p.includes('angel') || p.includes('valkyrie')) {
    spec.wings = 'angel';
  }

  // Outfit
  if (p.includes('armor') || p.includes('knight') || p.includes('paladin') || p.includes('plate')) {
    spec.outfit_style = 'plate_kini';
    spec.outfit_color = [225, 230, 240];
    spec.outfit_trim = [245, 195, 45];
  } else if (p.includes('assassin') || p.includes('harness') || p.includes('ninja') || p.includes('leather')) {
    spec.outfit_style = 'assassin_harness';
    spec.outfit_color = [30, 32, 40];
    spec.outfit_trim = [52, 211, 153];
  } else if (p.includes('sorceress') || p.includes('mage') || p.includes('witch') || p.includes('silk')) {
    spec.outfit_style = 'sorceress_silk';
    spec.outfit_color = [168, 85, 247];
    spec.outfit_trim = [244, 114, 182];
  }

  // Weapon
  if (p.includes('dagger') || p.includes('dual') || p.includes('knives')) {
    spec.weapon_type = 'daggers';
    spec.weapon_color = [52, 211, 153]; // emerald
  } else if (p.includes('staff') || p.includes('scepter') || p.includes('wand')) {
    spec.weapon_type = 'staff';
    spec.weapon_color = [192, 132, 252]; // purple
  } else if (p.includes('fire') || p.includes('flame')) {
    spec.weapon_type = 'sword';
    spec.weapon_color = [239, 68, 68]; // flame red
  } else if (p.includes('holy') || p.includes('light')) {
    spec.weapon_type = 'staff';
    spec.weapon_color = [250, 204, 21]; // golden holy
  }

  return spec;
}

// Generate the 72 frames
function generateCharacterPackage(prompt, customName = null, baseDir = 'reference/spellblade', exportDir = 'public/assets') {
  const spec = parsePrompt(prompt, customName);
  const name = spec.name;
  console.log(`\n[PixelLab Engine] Generating 8-Direction Sprite Suite for: "${name}"`);
  console.log(`Prompt: "${prompt}"`);
  console.log(`Spec: Hair(h=${spec.hair_hue.toFixed(2)}), Ears=${spec.ears}, Wings=${spec.wings}, Outfit=${spec.outfit_style}, Weapon=${spec.weapon_type}`);

  const DIRECTIONS = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west'];
  const targetDir = path.join(exportDir, name);

  // Load base frames
  const baseFrames = { Idle: {}, Run: {}, Attack: {} };
  for (const d of DIRECTIONS) {
    baseFrames.Idle[d] = [decodePNG(path.join(baseDir, 'Idle/rotations', `${d}.png`))];
    baseFrames.Run[d] = [];
    baseFrames.Attack[d] = [];
    for (let f = 0; f < 4; f++) {
      baseFrames.Run[d].push(decodePNG(path.join(baseDir, 'Run/rotations', `${d}_${f}.png`)));
      baseFrames.Attack[d].push(decodePNG(path.join(baseDir, 'Attack/rotations', `${d}_${f}.png`)));
    }
  }

  function transformFrame(srcPng, dir, animState, frameIdx) {
    const w = srcPng.width, h = srcPng.height;
    const out = clonePixels(srcPng.pixels);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        let r = out[idx], g = out[idx + 1], b = out[idx + 2], a = out[idx + 3];
        if (a < 15) continue;

        // 1. Wings
        if (isSpriteWing(r, g, b, a, x, y)) {
          if (spec.wings === 'none') {
            out[idx + 3] = 0; // remove wings
            continue;
          } else if (spec.wings === 'dragon') {
            out[idx] = 180; out[idx+1] = 30; out[idx+2] = 40; // dragon red
            continue;
          }
        }

        // 2. Hair Recoloring
        if (isSpriteHair(r, g, b, a, x, y)) {
          const [hVal, sVal, lVal] = rgbToHsl(r, g, b);
          let targetLum = lVal;
          if (spec.hair_lum_scale !== undefined) {
            targetLum = Math.max(0.15, Math.min(0.9, lVal * spec.hair_lum_scale));
          }
          const [nr, ng, nb] = hslToRgb(spec.hair_hue, spec.hair_sat, targetLum);
          out[idx] = nr; out[idx + 1] = ng; out[idx + 2] = nb;
          continue;
        }

        // 3. Weapon Blade / Aura Recoloring
        if (isSpriteBlade(r, g, b, a, x, y)) {
          const intensity = Math.max(r, g, b) / 255.0;
          out[idx] = Math.min(255, Math.round(spec.weapon_color[0] * intensity + 30));
          out[idx + 1] = Math.min(255, Math.round(spec.weapon_color[1] * intensity + 30));
          out[idx + 2] = Math.min(255, Math.round(spec.weapon_color[2] * intensity + 30));
          continue;
        }

        // 4. Skin Tone Adjustment
        if (isSpriteSkin(r, g, b, a, x, y)) {
          if (spec.skin_tone === 'pale') {
            out[idx] = Math.min(255, Math.round(r * 1.05 + 5));
            out[idx + 1] = Math.min(255, Math.round(g * 1.05 + 5));
            out[idx + 2] = Math.min(255, Math.round(b * 1.1 + 8));
          } else if (spec.skin_tone === 'tan') {
            out[idx] = Math.round(r * 0.95);
            out[idx + 1] = Math.round(g * 0.78);
            out[idx + 2] = Math.round(b * 0.62);
          } else if (spec.skin_tone === 'demon') {
            out[idx] = Math.round(r * 0.85 + 25);
            out[idx + 1] = Math.round(g * 0.70 + 10);
            out[idx + 2] = Math.round(b * 0.95 + 40);
          }
          continue;
        }

        // 5. Outfit Recoloring
        if (isSpriteSuit(r, g, b, a, x, y)) {
          out[idx] = spec.outfit_color[0];
          out[idx + 1] = spec.outfit_color[1];
          out[idx + 2] = spec.outfit_color[2];
          continue;
        }
      }
    }

    // Attach Cat / Fox Ears (Procedurally onto head top at proper 8 angles)
    if (spec.ears === 'cat' || spec.ears === 'fox') {
      const earH = spec.ears === 'cat' ? 3 : 5;
      const [earR, earG, earB] = hslToRgb(spec.hair_hue, spec.hair_sat, 0.4);
      if (dir.includes('south') || dir === 'north') {
        // Both ears left & right
        setPixel(out, w, h, 21, 10, earR, earG, earB);
        setPixel(out, w, h, 21, 9, earR, earG, earB);
        setPixel(out, w, h, 27, 10, earR, earG, earB);
        setPixel(out, w, h, 27, 9, earR, earG, earB);
        // Pink inner fluff
        if (!dir.includes('north')) {
          setPixel(out, w, h, 22, 10, 255, 190, 210);
          setPixel(out, w, h, 26, 10, 255, 190, 210);
        }
      } else if (dir === 'east' || dir.includes('east')) {
        // Ear angled right in profile
        setPixel(out, w, h, 25, 9, earR, earG, earB);
        setPixel(out, w, h, 26, 8, earR, earG, earB);
        setPixel(out, w, h, 24, 10, 255, 190, 210);
      } else if (dir === 'west' || dir.includes('west')) {
        // Ear angled left in profile
        setPixel(out, w, h, 23, 9, earR, earG, earB);
        setPixel(out, w, h, 22, 8, earR, earG, earB);
        setPixel(out, w, h, 24, 10, 255, 190, 210);
      }
    }

    // Attach Cat Tail (at sacrum: frame dynamics)
    if (spec.tail === 'cat') {
      const [tailR, tailG, tailB] = hslToRgb(spec.hair_hue, spec.hair_sat, 0.35);
      const wave = (frameIdx % 2 === 0) ? 1 : -1;
      if (dir.includes('east') || dir === 'east') {
        // Tail trails back to West (left)
        setPixel(out, w, h, 18, 30 + wave, tailR, tailG, tailB);
        setPixel(out, w, h, 17, 29 + wave, tailR, tailG, tailB);
        setPixel(out, w, h, 16, 27 + wave, tailR, tailG, tailB);
        setPixel(out, w, h, 17, 26 + wave, spec.weapon_color[0], spec.weapon_color[1], spec.weapon_color[2]);
      } else if (dir.includes('west') || dir === 'west') {
        // Tail trails back to East (right)
        setPixel(out, w, h, 30, 30 + wave, tailR, tailG, tailB);
        setPixel(out, w, h, 31, 29 + wave, tailR, tailG, tailB);
        setPixel(out, w, h, 32, 27 + wave, tailR, tailG, tailB);
        setPixel(out, w, h, 31, 26 + wave, spec.weapon_color[0], spec.weapon_color[1], spec.weapon_color[2]);
      } else if (dir.includes('north')) {
        // Visible curled tail on back
        setPixel(out, w, h, 27, 31 + wave, tailR, tailG, tailB);
        setPixel(out, w, h, 28, 29 + wave, tailR, tailG, tailB);
        setPixel(out, w, h, 27, 27 + wave, spec.weapon_color[0], spec.weapon_color[1], spec.weapon_color[2]);
      }
    }

    return { width: 64, height: 64, pixels: pad48to64(out, w, h) };
  }

  // Save all 72 frames into targetDir
  let totalSaved = 0;
  for (const animState of ['Idle', 'Run', 'Attack']) {
    const rotDir = path.join(targetDir, animState, 'rotations');
    fs.mkdirSync(rotDir, { recursive: true });

    for (const d of DIRECTIONS) {
      if (animState === 'Idle') {
        const base = baseFrames.Idle[d][0];
        const res = transformFrame(base, d, animState, 0);
        const pngBuf = encodePNG(64, 64, res.pixels);
        fs.writeFileSync(path.join(rotDir, `${d}.png`), pngBuf);
        totalSaved++;
      } else {
        const frames = baseFrames[animState][d];
        for (let f = 0; f < frames.length; f++) {
          const res = transformFrame(frames[f], d, animState, f);
          const pngBuf = encodePNG(64, 64, res.pixels);
          fs.writeFileSync(path.join(rotDir, `${d}_${f}.png`), pngBuf);
          totalSaved++;
        }
        // Main direction file
        const mainRes = transformFrame(frames[0], d, animState, 0);
        const mainPngBuf = encodePNG(64, 64, mainRes.pixels);
        fs.writeFileSync(path.join(rotDir, `${d}.png`), mainPngBuf);
      }
    }
  }

  // Create unified Master Spritesheet (8 columns x 9 rows of 64x64)
  const SHEET_W = 64 * 8;
  const SHEET_H = 64 * 9;
  const sheetPixels = Buffer.alloc(SHEET_W * SHEET_H * 4);

  function blit(srcPixels, dstX, dstY) {
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const sIdx = (y * 64 + x) * 4;
        const dIdx = ((dstY + y) * SHEET_W + (dstX + x)) * 4;
        sheetPixels[dIdx] = srcPixels[sIdx];
        sheetPixels[dIdx + 1] = srcPixels[sIdx + 1];
        sheetPixels[dIdx + 2] = srcPixels[sIdx + 2];
        sheetPixels[dIdx + 3] = srcPixels[sIdx + 3];
      }
    }
  }

  DIRECTIONS.forEach((d, col) => {
    // Row 0: Idle
    const idlePng = decodePNG(path.join(targetDir, 'Idle/rotations', `${d}.png`));
    blit(idlePng.pixels, col * 64, 0);

    // Rows 1..4: Run
    for (let f = 0; f < 4; f++) {
      const runPng = decodePNG(path.join(targetDir, 'Run/rotations', `${d}_${f}.png`));
      blit(runPng.pixels, col * 64, (1 + f) * 64);
    }

    // Rows 5..8: Attack
    for (let f = 0; f < 4; f++) {
      const atkPng = decodePNG(path.join(targetDir, 'Attack/rotations', `${d}_${f}.png`));
      blit(atkPng.pixels, col * 64, (5 + f) * 64);
    }
  });

  const sheetPngBuf = encodePNG(SHEET_W, SHEET_H, sheetPixels);
  fs.writeFileSync(path.join(targetDir, 'spritesheet.png'), sheetPngBuf);

  // Save metadata spec
  fs.writeFileSync(path.join(targetDir, 'metadata.json'), JSON.stringify({
    name,
    prompt,
    spec,
    directions: DIRECTIONS,
    states: ['Idle', 'Run', 'Attack'],
    frameCount: totalSaved,
    spritesheet: 'spritesheet.png'
  }, null, 2));

  console.log(`[SUCCESS] Generated all ${totalSaved} frames directly into: ${targetDir}`);
  console.log(`Master Spritesheet created: ${path.join(targetDir, 'spritesheet.png')}`);
  return { name, targetDir, totalSaved, spec };
}

module.exports = { parsePrompt, generateCharacterPackage };

// CLI test if run directly
if (require.main === module) {
  const prompt = process.argv[2] || "gorgeous catgirl assassin with raven black hair, emerald glowing daggers, micro bikini, cat ears and cat tail";
  const name = process.argv[3] || "catgirl_rogue";
  generateCharacterPackage(prompt, name);
}
