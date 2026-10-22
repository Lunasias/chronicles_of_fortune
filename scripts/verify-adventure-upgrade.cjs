// Run against Vite with Playwright installed or available through NODE_PATH.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const out = path.resolve(__dirname, '../docs/adventure-upgrade-v1');
const base = process.env.FORTUNA_REVIEW_URL || 'http://localhost:5173';
const report = { date: '2026-10-23', base, checks: [], errors: [], screenshots: [], dialogs: [] };
fs.mkdirSync(out, { recursive: true });
let browser;

function check(name, passed, detail) {
  report.checks.push({ name, passed: !!passed, detail });
  if (!passed) throw new Error(name + ': ' + JSON.stringify(detail));
}
function observe(page) {
  page.on('pageerror', error => report.errors.push({ type: 'page', message: error.message }));
  page.on('requestfailed', request => { if (!request.failure()?.errorText.includes('ERR_ABORTED')) report.errors.push({ type: 'request', url: request.url(), message: request.failure()?.errorText }); });
  page.on('response', response => { if (response.status() >= 400) report.errors.push({ type: 'http', url: response.url(), status: response.status() }); });
}
async function ready(page) {
  await page.waitForFunction(() => document.querySelector('#artworkLoading')?.hidden, undefined, { timeout: 45000 });
  await page.waitForTimeout(250);
}
async function shot(page, name) {
  await page.screenshot({ path: path.join(out, `${name}.png`) }); report.screenshots.push(name);
}
async function inViewport(page, selector) {
  return page.locator(selector).evaluate(element => { const r = element.getBoundingClientRect(); return { visible: r.width > 0 && r.height > 0 && r.x >= 0 && r.y >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1, rect: { x: r.x, y: r.y, width: r.width, height: r.height }, viewport: [innerWidth, innerHeight], documentWidth: document.documentElement.scrollWidth }; });
}
async function openSettings(page) {
  if (!await page.locator('#hudSystemMenu').evaluate(element => element.open)) await page.locator('#hudSystemMenu summary').click();
  await page.locator('#btnSettings').click(); await page.locator('#settingsModal').waitFor({ state: 'visible' });
}

(async () => {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, serviceWorkers: 'block', reducedMotion: 'reduce', permissions: ['clipboard-read', 'clipboard-write'] });
  await context.addInitScript(() => { localStorage.setItem('fortune_mobile_display_pref', 'portrait'); localStorage.setItem('fortuna_guide_v1', 'dismissed'); });
  const page = await context.newPage(); observe(page); page.setDefaultTimeout(20000);
  let importCode = '';
  page.on('dialog', async dialog => { report.dialogs.push({ type: dialog.type(), message: dialog.message().slice(0, 180) }); await dialog.accept(dialog.type() === 'prompt' ? importCode : undefined); });

  // A real new game, without development fixture autosave suppression.
  await page.goto(base, { waitUntil: 'domcontentloaded' }); await ready(page);
  await page.locator('#btnHowToPlay').click(); await page.locator('#adventureGuideModal').waitFor({ state: 'visible' });
  check('Title help opens before any campaign exists', await page.locator('#adventureGuideContent').innerText().then(text => text.includes('เริ่มตำนาน') || text.includes('สามก้าวแรก')));
  await shot(page, 'guide-title-desktop'); await page.locator('#btnCloseAdventureGuide').click();
  await page.locator('#btnStartAdventure').click(); await page.locator('.player-count-btn[data-count="2"]').click();
  for (const checkbox of await page.locator('.is-ai-check').all()) await checkbox.uncheck();
  await page.locator('.player-name-input').first().fill('ผู้กล้า 🌿');
  await page.locator('#btnBeginGame').click(); await page.waitForFunction(() => document.querySelector('#titleScreen').classList.contains('hidden')); await ready(page);
  check('New game creates the dedicated autosave', await page.evaluate(() => !!localStorage.getItem('chronicles_of_fortune_savegame_auto')));

  await page.locator('#btnRollDice').focus(); await page.keyboard.press('?'); await page.locator('#adventureGuideModal').waitFor({ state: 'visible' });
  check('Keyboard help opens despite hidden nested dialogs', await page.locator('#btnCloseAdventureGuide').evaluate(element => document.activeElement === element));
  await page.keyboard.press('Shift+Tab');
  check('Guide traps backward keyboard focus', await page.evaluate(() => document.querySelector('#adventureGuideModal').contains(document.activeElement)));
  await page.keyboard.press('Tab');
  check('Guide traps forward keyboard focus', await page.locator('#btnCloseAdventureGuide').evaluate(element => document.activeElement === element));
  await page.locator('[data-guide-tab="combat"]').focus(); await page.keyboard.press('Space'); await page.waitForTimeout(150);
  check('Space in a guide activates its control without rolling dice', await page.evaluate(() => !document.querySelector('#adventureGuideModal').hidden && document.querySelector('#diceRollModal').classList.contains('hidden') && document.querySelector('#movementNavigator').hidden));
  await shot(page, 'guide-combat-desktop'); await page.locator('[data-guide-tab="controls"]').click(); await shot(page, 'guide-controls-desktop');
  await page.keyboard.press('Escape');
  check('Escape closes the guide and restores focus', await page.evaluate(() => document.querySelector('#adventureGuideModal').hidden && document.activeElement === document.querySelector('#btnRollDice')));

  // Save through settings, export through the clipboard and import into another slot.
  await openSettings(page); await page.locator('#selectSaveSlot').selectOption('1'); await page.locator('#btnSettingsSave').click();
  const manual = await page.evaluate(() => localStorage.getItem('chronicles_of_fortune_savegame'));
  check('Manual slot1 is written through Settings', !!manual && JSON.parse(manual).players[0].name === 'ผู้กล้า 🌿');
  await page.locator('#btnSettingsExport').click(); await page.locator('dialog.game-dialog[open]').waitFor();
  await page.locator('[data-dialog-copy]').click(); await page.waitForTimeout(100); importCode = await page.evaluate(() => navigator.clipboard.readText());
  check('Export produces a usable Unicode save code', importCode.length > 100, { codeCharacters: importCode.length });
  await page.locator('[data-dialog-confirm]').click();
  await page.locator('#selectSaveSlot').selectOption('2'); await page.locator('#btnSettingsImport').click();
  await page.locator('dialog.game-dialog textarea').fill(importCode); await page.locator('[data-dialog-confirm]').click();
  await page.locator('dialog.game-dialog[open] h2').filter({ hasText: 'กลับสู่การผจญภัย' }).waitFor();
  await page.locator('[data-dialog-confirm]').click(); await page.locator('#settingsModal').waitFor({ state: 'hidden' });
  const imported = await page.evaluate(() => JSON.parse(localStorage.getItem('chronicles_of_fortune_savegame_slot_2') || 'null'));
  check('Save import restores Unicode player names into the selected slot', imported?.players?.[0]?.name === 'ผู้กล้า 🌿');
  check('Autosaving after import preserves the manual slot', await page.evaluate(() => localStorage.getItem('chronicles_of_fortune_savegame')) === manual);
  await openSettings(page); await page.locator('#selectSaveSlot').selectOption('2'); await shot(page, 'save-settings-desktop'); await page.locator('#btnCloseSettings').click();
  await page.reload({ waitUntil: 'domcontentloaded' }); await ready(page);
  const latest = await page.evaluate(async () => { const { SaveManager } = await import('/src/game/SaveManager.ts'); return SaveManager.getSlotMetas().filter(entry => entry.meta?.saveVersion === 2).sort((a, b) => b.meta.savedAt - a.meta.savedAt)[0]?.slot; });
  check('Continue selects the newest compatible save', Number(await page.locator('#btnTitleLoadGame').getAttribute('data-save-slot')) === latest, { latest });
  await page.locator('#btnTitleLoadGame').click(); await page.waitForFunction(() => document.querySelector('#titleScreen').classList.contains('hidden')); await ready(page);
  check('Continue returns to the saved campaign', await page.locator('#hudHeroCard').innerText().then(text => text.includes('ผู้กล้า')));

  // Actual dice -> route preview -> explicit confirmation -> arrival.
  await page.locator('#btnRollDice').click(); await page.locator('#movementNavigator').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelectorAll('[data-route-node]').length > 0);
  const cards = page.locator('[data-route-node]'); const firstId = await cards.first().getAttribute('data-route-node');
  check('Rolled destinations start unconfirmed', await page.locator('#btnMoveConfirm').isDisabled());
  await cards.first().click(); await page.waitForFunction(id => document.querySelector(`[data-route-node="${id}"]`)?.getAttribute('aria-pressed') === 'true', firstId);
  check('Selecting a destination previews without starting movement', await page.locator('#movementNavigator').isVisible() && await page.locator('#btnMoveConfirm').isEnabled());
  await page.keyboard.press('Enter'); await page.waitForTimeout(200);
  check('Enter on the focused destination card does not also confirm movement', await page.locator('#movementNavigator').isVisible());
  await page.locator('#movementSort').selectOption('risk');
  await shot(page, 'route-decision-desktop');
  const selectedName = (await page.locator('[data-route-node][aria-pressed="true"] strong').innerText()).replace(/^\d+\.\s*/, '');
  await page.locator('#btnMoveConfirm').click();
  await page.waitForFunction(name => document.querySelector('#gameEventFeedList')?.innerText.includes(`เหยียบ ${name}`), selectedName, { timeout: 20000 });
  check('Explicit confirmation walks the selected legal route and reaches its named destination', true, { selectedName });
  await shot(page, 'route-arrival-desktop');
  await context.close();

  // Deterministic rich route fixtures for filtering, keyboard scope and small screens.
  for (const [label, viewport] of [['desktop', { width: 1280, height: 720 }], ['phone', { width: 390, height: 844 }], ['landscape', { width: 844, height: 390 }]]) {
    const context = await browser.newContext({ viewport, serviceWorkers: 'block', reducedMotion: 'reduce' });
    await context.addInitScript(() => { localStorage.setItem('fortune_mobile_display_pref', 'portrait'); localStorage.setItem('fortuna_guide_v1', 'dismissed'); });
    const page = await context.newPage(); observe(page); page.setDefaultTimeout(20000);
    await page.goto(`${base}/?art-scene=world&biome=grass&roll=6`, { waitUntil: 'domcontentloaded' }); await ready(page);
    const chip = page.locator('[data-route-filter="services"]');
    if (await chip.isEnabled()) {
      await chip.click(); const ids = await page.locator('[data-route-node]').evaluateAll(buttons => buttons.map(button => button.dataset.routeNode));
      check(`Service filter has reachable choices (${label})`, ids.length > 0);
      await page.locator('[data-route-node]').first().click(); await page.waitForTimeout(100);
      await page.keyboard.press('ArrowRight'); await page.waitForTimeout(100);
      const selected = await page.locator('[data-route-node][aria-pressed="true"]').getAttribute('data-route-node');
      check(`Keyboard cycling stays inside the active filter (${label})`, ids.includes(selected), { ids, selected });
    } else await page.locator('#movementListStatus').click();
    await page.locator('#btnMoveConfirm').scrollIntoViewIfNeeded();
    const box = await inViewport(page, '#btnMoveConfirm'); check(`Movement confirmation remains reachable (${label})`, box.visible && box.documentWidth <= viewport.width, box);
    await shot(page, `route-filter-${label}`);
    await page.keyboard.press('?'); await page.locator('#adventureGuideModal').waitFor({ state: 'visible' });
    await page.locator('[data-guide-tab="journey"]').click(); await shot(page, `guide-journey-${label}`);
    const guide = await inViewport(page, '.adventure-guide-dialog'); check(`Journal fits the viewport (${label})`, guide.visible && guide.documentWidth <= viewport.width, guide);
    await page.keyboard.press('Escape'); await page.locator('#movementNavigator').waitFor({ state: 'visible' });
    check(`Journal closes without confirming a route (${label})`, await page.locator('#movementNavigator').isVisible());
    await context.close();
  }
  check('No browser runtime or asset errors', report.errors.length === 0, report.errors);
  report.passed = true;
})().catch(error => { report.passed = false; report.failure = error.message; console.error(error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  fs.writeFileSync(path.join(out, 'browser-qa.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, errors: report.errors.length, failure: report.failure, screenshots: report.screenshots }, null, 2));
});
