const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.FORTUNA_REVIEW_URL || 'http://localhost:5173';
const out = path.resolve(__dirname, '../docs/quality-v3');
const report = { base, checks: [], errors: [], performance: [], publicWebRTC: null };
const check = (name, passed, detail) => { report.checks.push({ name, passed: !!passed, detail }); if (!passed) throw new Error(name); };
async function ready(page) { await page.waitForFunction(() => document.querySelector('#artworkLoading')?.hidden, null, { timeout: 60000 }); }
let browser;
(async () => {
  fs.mkdirSync(out, { recursive: true }); browser = await chromium.launch({ headless: true });
  for (const [label, viewport, mobile] of [['desktop', { width: 1280, height: 720 }, false], ['phone', { width: 390, height: 844 }, true], ['landscape', { width: 844, height: 390 }, true]]) {
    const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, serviceWorkers: 'block', reducedMotion: 'reduce' });
    await context.addInitScript(() => { localStorage.setItem('fortuna_guide_v1', 'dismissed'); localStorage.setItem('fortune_mobile_display_pref', 'portrait'); });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) report.errors.push(`${response.status()} ${response.url()}`); });
    const started = Date.now(); await page.goto(`${base}/?art-scene=world&biome=grass&roll=6`); await ready(page); const coldLoadMs = Date.now() - started;
    await page.waitForTimeout(1800);
    const metrics = await page.evaluate(() => window.__gameApp.performanceMonitor.snapshot());
    report.performance.push({ label, viewport, coldLoadMs, ...metrics });
    check(`Decoded canvas budget respected on ${label}`, metrics.canvasBytes <= metrics.canvasBudget, metrics);
    await page.evaluate(() => { const a = window.__gameApp; a.game.phase = 'BOARD_TURN'; a.game.activePlayer.level = 4; a.workshop.open(); });
    const fits = await page.locator('#campaignWorkshop').evaluate(e => { const r = e.getBoundingClientRect(); return r.x >= 0 && r.y >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; });
    check(`Talent tree fits ${label}`, fits);
    await page.locator('[data-learn-talent="blade"]').click(); await page.locator('[data-learn-talent="vampiric"]').click();
    check(`Talent fork spends actual character points on ${label}`, await page.evaluate(() => window.__gameApp.game.activePlayer.talents.join(',') === 'blade,vampiric'));
    await page.locator('#campaignWorkshop').evaluate(e => e.scrollTop = 0);
    await page.screenshot({ path: path.join(out, `talents-${label}.png`) });
    await page.locator('[data-workshop-close]').click();
    await page.evaluate(() => { const a = window.__gameApp, g = a.game; g.world.tutorial[g.activePlayer.id] = { enabled: true, turns: 0, actions: [] }; a.visualReviewActive = false; });
    await page.locator('#interactiveTutorial').waitFor();
    const tutorialFits = await page.locator('#interactiveTutorial').evaluate(e => { const r = e.getBoundingClientRect(); return r.x >= 0 && r.y >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; });
    check(`Live tutorial stays inside ${label}`, tutorialFits);
    await page.screenshot({ path: path.join(out, `tutorial-${label}.png`) });
    await page.locator('#interactiveTutorial button').click(); await context.close();
  }
  // Public broker + two isolated browser contexts, with the local channel unavailable.
  // This exercises external signaling/STUN; both physical endpoints still run on this host.
  const contexts = await Promise.all([browser.newContext({ serviceWorkers: 'block' }), browser.newContext({ serviceWorkers: 'block' })]);
  try {
    for (const context of contexts) await context.addInitScript(() => { window.BroadcastChannel = undefined; });
    const host = await contexts[0].newPage(), guest = await contexts[1].newPage();
    for (const page of [host, guest]) { await page.goto(base); await ready(page); }
    const code = await host.evaluate(async () => (await import('/src/engine/NetworkRoomManager.ts')).networkRoomManager.createRoom('Network QA Host').code);
    const started = Date.now();
    let connected = false;
    for (let i = 0; i < 30; i++) {
      if (await host.evaluate(async () => (await import('/src/engine/NetworkRoomManager.ts')).networkRoomManager.getOnlineMessage().includes('พร้อม'))) { connected = true; break; }
      await host.waitForTimeout(1000);
    }
    if (!connected) throw new Error('Public signaling unavailable');
    await guest.evaluate(async code => (await import('/src/engine/NetworkRoomManager.ts')).networkRoomManager.joinRoom(code, 'Network QA Guest'), code);
    connected = false;
    for (let i = 0; i < 30; i++) {
      const status = await guest.evaluate(async () => { const n = (await import('/src/engine/NetworkRoomManager.ts')).networkRoomManager; return { rtc: !!n.hostConnection?.open, token: n.rejoinTicket.length > 20, local: !!n.channel }; });
      if (status.rtc && status.token && !status.local) { connected = true; break; }
      await guest.waitForTimeout(1000);
    }
    if (!connected) throw new Error('Public WebRTC admission unavailable');
    report.publicWebRTC = { success: true, connectMs: Date.now() - started, broadcastChannel: false, physicalDevices: 1, note: 'Public PeerJS signaling and browser WebRTC; separate-device NAT/TURN not verified' };
  } catch (error) { report.publicWebRTC = { success: false, reason: error.message, physicalDevices: 1 }; }
  finally { for (const context of contexts) { for (const page of context.pages()) { try { await page.evaluate(async () => (await import('/src/engine/NetworkRoomManager.ts')).networkRoomManager.leaveRoom()); } catch {} } await context.close(); } }
  check('No runtime or asset failures', report.errors.length === 0, report.errors);
  report.passed = true;
})().catch(error => { report.passed = false; report.failure = error.message; process.exitCode = 1; }).finally(async () => {
  await browser?.close(); fs.writeFileSync(path.join(out, 'browser-qa.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
});
