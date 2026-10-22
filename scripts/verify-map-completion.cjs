// Browser evidence for the complete loading -> world -> UI artwork flow.
// Install Playwright or set NODE_PATH to the directory containing its package.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'docs/art-review/map-completion-v1');
const base = process.env.FORTUNA_REVIEW_URL || 'http://localhost:5173';
const themes = ['grass', 'forest', 'waterfall_forest', 'snow', 'desert', 'volcano', 'cavern', 'coral', 'abyss', 'castle', 'fairy_grove', 'crystal_cavern', 'celestial', 'steampunk', 'sakura_shrine', 'dungeon_catacombs', 'dungeon_volcano', 'dungeon_ice'];
const evidence = { date: '2026-10-22', base, browser: 'Chromium', views: [], pageErrors: [], failedRequests: [], httpErrors: [] };
fs.mkdirSync(out, { recursive: true });
for (const file of ['world-loading-v1.webp', 'fortune-ui-frame-v1.webp']) {
  if (!fs.existsSync(path.join(root, 'public/assets/generated', file))) {
    console.error(`Artwork pending: public/assets/generated/${file}`);
    process.exit(2);
  }
}

function observe(page, label) {
  page.on('pageerror', error => evidence.pageErrors.push({ label, message: error.message }));
  page.on('requestfailed', request => {
    if (!request.failure()?.errorText.includes('ERR_ABORTED')) evidence.failedRequests.push({ label, url: request.url(), error: request.failure()?.errorText });
  });
  page.on('response', response => {
    if (response.status() >= 400) evidence.httpErrors.push({ label, url: response.url(), status: response.status() });
  });
}

async function layout(page) {
  return page.evaluate(() => {
    const rect = element => { const r = element?.getBoundingClientRect(); return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null; };
    const modal = [...document.querySelectorAll('[role="dialog"]')].find(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).display !== 'none'; });
    return {
      viewport: { width: innerWidth, height: innerHeight },
      documentWidth: document.documentElement.scrollWidth,
      loadingVisible: getComputedStyle(document.querySelector('#artworkLoading')).display !== 'none',
      canvas: rect(document.querySelector('#gameCanvas')),
      modal: modal ? { id: modal.id, rect: rect(modal), panel: rect(modal.firstElementChild), frame: getComputedStyle(modal.firstElementChild).borderImageSource } : null,
    };
  });
}

async function settle(page) {
  await page.waitForFunction(() => document.querySelector('#artworkLoading')?.hidden, undefined, { timeout: 45000 });
  await page.waitForTimeout(700);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const [label, viewport] of [['desktop', { width: 1280, height: 720 }], ['phone', { width: 390, height: 844 }], ['landscape', { width: 844, height: 390 }]]) {
    const context = await browser.newContext({ viewport, serviceWorkers: 'block', reducedMotion: 'reduce' });
    await context.addInitScript(() => localStorage.setItem('fortune_mobile_display_pref', 'portrait'));
    const page = await context.newPage(); observe(page, `loading-${label}`);
    let release; const gate = new Promise(resolve => { release = resolve; }); let held = 0;
    await page.route('**/assets/art-v2/world-rebuild-v1/*.png', async route => { held++; await gate; await route.continue(); });
    await page.goto(`${base}/?art-scene=world&biome=forest`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('#artworkLoading .fortune-loading-card'));
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(['/assets/generated/world-loading-v1.webp', '/assets/generated/fortune-ui-frame-v1.webp'].map(src => new Promise((resolve, reject) => { const image = new Image(); image.onload = resolve; image.onerror = reject; image.src = src; })));
    });
    await page.screenshot({ path: path.join(out, `loading-${label}.png`) });
    evidence.views.push({ label: `loading-${label}`, heldAtlasRequests: held, ...(await layout(page)), loadingCard: await page.locator('.fortune-loading-card').boundingBox() });
    release(); await settle(page); await context.close();
  }

  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
  await context.addInitScript(() => localStorage.setItem('fortune_mobile_display_pref', 'portrait'));
  const page = await context.newPage(); observe(page, 'world-and-ui');
  for (const biome of ['forest', 'snow', 'volcano', 'sakura_shrine']) {
    await page.goto(`${base}/?art-scene=world&biome=${biome}`, { waitUntil: 'domcontentloaded' }); await settle(page);
    await page.screenshot({ path: path.join(out, `world-${biome}.png`) });
    evidence.views.push({ label: `world-${biome}`, ...(await layout(page)) });
  }
  await page.goto(`${base}/?art-scene=inventory&biome=forest`, { waitUntil: 'domcontentloaded' }); await settle(page);
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#floatingEventToast')).opacity === '0');
  await page.screenshot({ path: path.join(out, 'inventory-desktop.png') });
  evidence.views.push({ label: 'inventory-desktop', ...(await layout(page)) });
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(out, 'inventory-phone.png') });
  evidence.views.push({ label: 'inventory-phone', ...(await layout(page)) });
  await page.goto(`${base}/?art-scene=world&biome=forest`, { waitUntil: 'domcontentloaded' }); await settle(page);
  await page.screenshot({ path: path.join(out, 'world-phone.png') });
  evidence.views.push({ label: 'world-phone', ...(await layout(page)) });

  const normal = await context.newPage(); observe(normal, 'normal-new-game');
  await normal.goto(base, { waitUntil: 'domcontentloaded' }); await settle(normal);
  await normal.screenshot({ path: path.join(out, 'title-desktop.png') });
  evidence.views.push({ label: 'title-desktop', ...(await layout(normal)) });
  await normal.locator('#btnStartAdventure').click();
  await normal.locator('.player-count-btn[data-count="2"]').click();
  await normal.screenshot({ path: path.join(out, 'setup-desktop.png') });
  evidence.views.push({ label: 'setup-desktop', ...(await layout(normal)), panel: await normal.locator('#playerSetupBlock').boundingBox() });
  await normal.setViewportSize({ width: 390, height: 844 }); await normal.waitForTimeout(250);
  await normal.screenshot({ path: path.join(out, 'setup-phone.png') });
  evidence.views.push({ label: 'setup-phone', ...(await layout(normal)), panel: await normal.locator('#playerSetupBlock').boundingBox() });
  await normal.locator('#btnBeginGame').scrollIntoViewIfNeeded();
  await normal.screenshot({ path: path.join(out, 'setup-phone-controls.png') });
  evidence.views.push({ label: 'setup-phone-controls', ...(await layout(normal)), beginButton: await normal.locator('#btnBeginGame').boundingBox() });
  await normal.setViewportSize({ width: 1280, height: 720 });
  await normal.locator('#btnBeginGame').click(); await normal.waitForFunction(() => document.querySelector('#titleScreen').classList.contains('hidden')); await settle(normal);
  await normal.screenshot({ path: path.join(out, 'normal-initial-world.png') });
  evidence.views.push({ label: 'normal-initial-world', ...(await layout(normal)) });
  await normal.close();

  // Inspect actual runtime canvases for all432 objects, including replacements.
  const sprites = await page.evaluate(async themes => {
    const { regionalArt, REGIONAL_SLOTS } = await import('/src/engine/RegionalScenery.ts');
    const entries = themes.flatMap(theme => REGIONAL_SLOTS.map(slot => ({ theme, slot })));
    for (let attempt = 0; attempt < 120; attempt++) {
      if (entries.every(({ theme, slot }) => regionalArt.get(theme, slot))) break;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    return entries.map(({ theme, slot }) => {
      const canvas = regionalArt.get(theme, slot);
      if (!canvas) return { theme, slot, missing: true };
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let count = 0, left = canvas.width, top = canvas.height, right = -1, bottom = -1;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) if (pixels[(y * canvas.width + x) * 4 + 3] >= 80) { count++; left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); }
      return { theme, slot, pixels: count, bounds: [left, top, right, bottom], footY: Number(canvas.dataset.footY), clipped: left === 0 || top === 0 || right === canvas.width - 1 || bottom === canvas.height - 1 };
    });
  }, themes);
  evidence.spriteCoverage = { expected: themes.length * 24, rendered: sprites.filter(s => !s.missing).length, empty: sprites.filter(s => !s.missing && !s.pixels), missing: sprites.filter(s => s.missing), touchingCanvasEdge: sprites.filter(s => s.clipped) };
  const contact = await page.evaluate(async themes => {
    const { regionalArt } = await import('/src/engine/RegionalScenery.ts');
    const selected = [
      ...themes.map(theme => [theme, 'nature_large']),
      ['abyss', 'capital'], ['abyss', 'tavern'], ['dungeon_volcano', 'landmark'], ['dungeon_volcano', 'isekai_event'], ['volcano', 'capital'], ['volcano', 'bridge'],
      ['grass', 'bridge'], ['grass', 'capital'], ['forest', 'cliff'], ['desert', 'bridge'], ['crystal_cavern', 'capital'], ['steampunk', 'bridge'],
    ];
    const canvas = document.createElement('canvas'); canvas.width = 6 * 160; canvas.height = Math.ceil(selected.length / 6) * 168;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#14272e'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
    selected.forEach(([theme, slot], index) => { const x = index % 6 * 160, y = Math.floor(index / 6) * 168; const sprite = regionalArt.get(theme, slot); if (sprite) ctx.drawImage(sprite, x + 16, y + 4); ctx.fillStyle = '#e4d1a2'; ctx.fillText(theme, x + 80, y + 148); ctx.fillStyle = '#a2c4b4'; ctx.fillText(slot, x + 80, y + 162); });
    return canvas.toDataURL('image/png').split(',')[1];
  }, themes);
  fs.writeFileSync(path.join(out, 'runtime-sprite-contact.png'), Buffer.from(contact, 'base64'));
  fs.writeFileSync(path.join(out, 'runtime-sprites.json'), JSON.stringify(sprites, null, 2));
  await context.close(); await browser.close();
  evidence.passed = !evidence.pageErrors.length && !evidence.failedRequests.length && !evidence.httpErrors.length && !evidence.spriteCoverage.missing.length && !evidence.spriteCoverage.empty.length && !evidence.spriteCoverage.touchingCanvasEdge.length && evidence.views.every(v => v.documentWidth <= v.viewport.width) && evidence.views.filter(v => v.label.startsWith('inventory-')).every(v => v.modal?.id === 'inventoryModal');
  fs.writeFileSync(path.join(out, 'browser-qa.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
  if (!evidence.passed) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
