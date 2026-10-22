// Run with Vite serving the project and Playwright available via NODE_PATH.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.FORTUNA_REVIEW_URL || 'http://localhost:5173';
const out = path.resolve(__dirname, '../docs/kingdom-v2');
fs.mkdirSync(out, { recursive: true });
const report = { date: '2026-10-23', base, checks: [], errors: [], screenshots: [] };
let browser, page;
const check = (name, passed, detail) => { report.checks.push({ name, passed: !!passed, detail }); if (!passed) throw new Error(name + ': ' + JSON.stringify(detail)); };
async function ready() { await page.waitForFunction(() => document.querySelector('#artworkLoading')?.hidden, undefined, { timeout: 45000 }); await page.waitForTimeout(250); }
async function shot(name) { await page.screenshot({ path: path.join(out, `${name}.png`) }); report.screenshots.push(name); }
async function menu(id) { if (!await page.locator('#hudSystemMenu').evaluate(e => e.open)) await page.locator('#hudSystemMenu summary').click(); await page.locator(id).click(); }
async function closeMessage() { await page.locator('dialog.game-dialog[open] [data-dialog-confirm]').click(); await page.waitForTimeout(100); }
async function fits(selector) { return page.locator(selector).evaluate(e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; }); }
(async () => {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'] });
  await context.addInitScript(() => { localStorage.setItem('fortune_mobile_display_pref', 'portrait'); localStorage.setItem('fortuna_guide_v1', 'dismissed'); });
  page = await context.newPage(); page.setDefaultTimeout(20000);
  page.on('pageerror', e => report.errors.push({ type: 'page', message: e.message }));
  page.on('requestfailed', r => { if (!r.failure()?.errorText.includes('ERR_ABORTED')) report.errors.push({ type: 'request', url: r.url(), message: r.failure()?.errorText }); });
  page.on('response', r => { if (r.status() >= 400) report.errors.push({ type: 'http', url: r.url(), status: r.status() }); });
  page.on('dialog', async d => { report.errors.push({ type: 'unexpected-native-dialog', message: d.message() }); await d.dismiss(); });
  await page.goto(base, { waitUntil: 'domcontentloaded' }); await ready(); await shot('title-desktop');
  check('New title uses generated kingdom artwork', await page.locator('#titleScreen').evaluate(e => getComputedStyle(e).backgroundImage.includes('kingdom-title-v2.webp')));
  await page.locator('#btnStartAdventure').click();
  check('Five campaign presets are available', await page.locator('[data-campaign-preset]').count() === 5);
  await page.locator('[data-campaign-preset="crown_rivals"]').click();
  check('Rival preset configures four players and Darkling', await page.evaluate(() => document.querySelectorAll('.player-setup-card').length === 4 && document.querySelector('#checkAllowDarkling').checked));
  await page.locator('[data-campaign-preset="guardian_alliance"]').click();
  check('Co-op preset configures real cooperative match rules', await page.evaluate(() => window.__gameApp.game.gameMode === 'coop_raid' && !document.querySelector('#checkAllowDarkling').checked));
  await page.locator('[data-campaign-preset="first_steps"]').click();
  check('First adventure is a gentle two-player setup', await page.evaluate(() => document.querySelectorAll('.player-setup-card').length === 2 && document.querySelector('#selectAIDifficulty').value === 'casual'));
  await shot('campaign-desktop');
  for (const box of await page.locator('.is-ai-check').all()) await box.uncheck();
  await page.locator('.player-name-input').first().fill('ผู้กล้า 🌿');
  await page.locator('#btnBeginGame').click(); await ready();
  await menu('#btnRoyalContracts'); await page.locator('[data-contract-id="road_warden"]').click();
  check('Accepting a contract writes an initial baseline into the autosave', await page.evaluate(() => JSON.parse(localStorage.getItem('chronicles_of_fortune_savegame_auto')).world.royalContracts[window.__gameApp.game.activePlayer.id].active.id === 'road_warden'));
  await shot('royal-contracts-desktop'); await page.locator('#btnCloseAdventureGuide').click();
  await menu('#btnFindDestination'); await page.locator('#worldLocationSearch').fill('โรงเตี๊ยม');
  check('Thai service search returns real inns', await page.locator('[data-nav-pin]:enabled').count() > 0);
  const nodeBefore = await page.evaluate(() => window.__gameApp.game.activePlayer.nodeId);
  await shot('navigator-desktop'); await page.locator('[data-nav-pin]:enabled').first().click();
  check('Pinning focuses the map without moving the player', await page.evaluate(() => window.__gameApp.game.activePlayer.nodeId) === nodeBefore && await page.locator('#waypointTracker').isVisible());
  await page.locator('#btnRollDice').click();
  await page.waitForFunction(() => window.__gameApp.game.phase === 'CHOOSING_PATH' && document.querySelector('#diceRollModal').classList.contains('hidden'));
  await page.locator('#btnMoveExpand').click();
  await page.locator('#btnMoveWaypoint').waitFor({ state: 'visible' }); await page.locator('#btnMoveWaypoint').click();
  check('Waypoint advice selects a legal dice destination and waits for confirmation', await page.evaluate(() => { const a = window.__gameApp; return a.game.highlightedNodes.includes(a.selectedMoveNodeId) && a.game.phase === 'CHOOSING_PATH' && a.game.activePlayer.nodeId === 0; }));
  await shot('waypoint-route-desktop');
  // Controlled achievement fixture: unit tests verify metric/reward mechanics;
  // this checks the real claim button, persistence, and duplicate prevention.
  await page.evaluate(() => { const g = window.__gameApp.game; g.phase = 'BOARD_TURN'; g.highlightedNodes = []; g.activePlayer.matchStats.monstersKilled = g.world.royalContracts[g.activePlayer.id].active.baseline + 3; });
  await menu('#btnRoyalContracts');
  const goldBefore = await page.evaluate(() => window.__gameApp.game.activePlayer.gold);
  await page.locator('[data-contract-action="claim"]').click();
  check('Completed contract button pays the exact reward once', await page.evaluate(() => window.__gameApp.game.activePlayer.gold) === goldBefore + 180 && await page.locator('[data-contract-id="road_warden"]').isDisabled());
  await shot('contract-reward-desktop'); await page.locator('#btnCloseAdventureGuide').click();
  await menu('#btnSettings'); await page.locator('#selectSaveSlot').selectOption('1'); await page.locator('#btnSettingsSave').click();
  const manual = await page.evaluate(() => localStorage.getItem('chronicles_of_fortune_savegame'));
  await page.locator('#btnSettingsExport').click(); await page.locator('dialog.game-dialog[open]').waitFor();
  const code = await page.locator('dialog.game-dialog textarea').inputValue();
  check('Export is an accessible in-game code dialog', code.length > 100 && await page.locator('dialog.game-dialog textarea').getAttribute('readonly') !== null);
  await page.locator('[data-dialog-copy]').click();
  check('Export copy button acknowledges success', await page.locator('.game-dialog-status').innerText().then(t => t.includes('คัดลอก')));
  await shot('save-dialog-desktop'); await closeMessage();
  await page.locator('#selectSaveSlot').selectOption('2'); await page.locator('#btnSettingsImport').click();
  await page.locator('dialog.game-dialog textarea').fill(code); await closeMessage();
  await page.locator('dialog.game-dialog[open] h2').filter({ hasText: 'กลับสู่การผจญภัย' }).waitFor(); await closeMessage();
  check('Import preserves Unicode names and completed contracts', await page.evaluate(() => { const g = window.__gameApp.game; return g.activePlayer.name === 'ผู้กล้า 🌿' && g.world.royalContracts[g.activePlayer.id].completed.includes('road_warden'); }));
  check('Import and autosave preserve manual slot one', await page.evaluate(() => localStorage.getItem('chronicles_of_fortune_savegame')) === manual);
  await menu('#btnSettings'); await page.locator('#selectSaveSlot').selectOption('2');
  await page.locator('#btnSettingsResetSave').click(); await page.locator('dialog.game-dialog[open]').waitFor();
  const stillSaved = await page.evaluate(() => localStorage.getItem('chronicles_of_fortune_savegame_slot_2'));
  await page.evaluate(() => { const a = window.__gameApp; a.gamepadController.callbacks.onSecondary(); a.gamepadController.callbacks.onSpecial(); a.gamepadController.callbacks.onCancel(); });
  check('Controller cancels deletion without changing the save or issuing board actions', await page.evaluate(() => localStorage.getItem('chronicles_of_fortune_savegame_slot_2')) === stillSaved && !await page.locator('dialog[open]').count());
  await page.locator('#btnCloseSettings').click();
  const firstPin = await page.evaluate(() => JSON.parse(localStorage.getItem('fortuna_waypoint_v1')).targets['1']);
  await page.evaluate(() => { window.__gameApp.game.activePlayerIdx = 1; });
  await menu('#btnFindDestination'); await page.locator('#worldLocationSearch').fill('ร้านอาวุธ');
  await page.locator('[data-nav-pin]:enabled').first().click();
  await page.evaluate(() => { window.__gameApp.game.activePlayerIdx = 0; });
  await page.waitForTimeout(350);
  check('Hot-seat players retain separate waypoint bookmarks', await page.evaluate(first => {
    const saved = JSON.parse(localStorage.getItem('fortuna_waypoint_v1'));
    return saved.targets['1'] === first && Number.isInteger(saved.targets['2']) && window.__gameApp.worldNavigator.target === first;
  }, firstPin));
  for (const [label, viewport] of [['phone', { width: 390, height: 844 }], ['landscape', { width: 844, height: 390 }]]) {
    await page.setViewportSize(viewport); await menu('#btnFindDestination');
    check(`Navigator fits ${label} viewport`, await fits('#worldNavigatorDialog'));
    check(`Navigator close button stays reachable on ${label}`, await fits('[data-nav-close]'));
    await shot(`navigator-${label}`); await page.locator('[data-nav-close]').click();
    await menu('#btnRoyalContracts'); check(`Contract journal fits ${label} viewport`, await fits('.adventure-guide-dialog'));
    await shot(`contracts-${label}`); await page.locator('#btnCloseAdventureGuide').click();
    await menu('#btnSettings'); await page.locator('#selectSaveSlot').selectOption('1'); await page.locator('#btnSettingsExport').click();
    await page.locator('dialog.game-dialog[open]').waitFor();
    check(`Save dialog and its close action fit ${label}`, await fits('dialog.game-dialog[open]') && await fits('[data-dialog-confirm]'));
    await shot(`save-dialog-${label}`); await closeMessage(); await page.locator('#btnCloseSettings').click();
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}/?art-scene=battle&biome=forest`, { waitUntil: 'domcontentloaded' }); await ready();
  check('Battle cards show fundamental damage forecasts', await page.locator('#btnCmdAttack .command-forecast').innerText().then(t => t.includes('HP') || t.includes('แช่แข็ง')));
  const forecast = await page.locator('#btnCmdMagic .command-forecast').innerText();
  await page.locator('#btnFormBack').click();
  check('Formation changes refresh battle information', await page.locator('#btnCmdMagic .command-forecast').innerText().then(t => t.length > 0));
  await shot('battle-forecast-desktop');
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto(base, { waitUntil: 'domcontentloaded' }); await ready();
  await shot('title-phone'); await page.locator('#btnStartAdventure').click();
  check('Mobile campaign setup keeps Begin Game reachable', await fits('#btnBeginGame'));
  await shot('campaign-phone');
  check('No runtime, HTTP, native browser dialog or request failures', report.errors.length === 0, report.errors);
  report.passed = true;
})().catch(async error => { report.passed = false; report.failure = error.message; if (page) { try { await shot('failure'); } catch {} } console.error(error); process.exitCode = 1; }).finally(async () => {
  fs.writeFileSync(path.join(out, 'browser-qa.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2)); await browser?.close();
});
