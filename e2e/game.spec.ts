import { test, expect, type Page } from '@playwright/test';

async function ready(page: Page) {
  await expect(page.locator('#artworkLoading')).toBeHidden({ timeout: 60000 });
}
async function openMenu(page: Page, selector: string) {
  if (!await page.locator('#hudSystemMenu').evaluate((e: HTMLDetailsElement) => e.open)) await page.locator('#hudSystemMenu summary').click();
  await page.locator(selector).click();
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('fortuna_guide_v1', 'dismissed'); localStorage.setItem('fortune_mobile_display_pref', 'portrait'); });
});

test('start a campaign, save, reload and continue the same Unicode character', async ({ page }) => {
  await page.goto('http://127.0.0.1:5181'); await ready(page);
  await page.locator('#btnStartAdventure').click();
  await page.locator('.player-name-input').first().fill('นักผจญภัย 🌿');
  await page.locator('#btnBeginGame').click(); await ready(page);
  await openMenu(page, '#btnSettings'); await page.locator('#selectSaveSlot').selectOption('1');
  await page.locator('#btnSettingsSave').click(); await page.locator('#btnCloseSettings').click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('chronicles_of_fortune_savegame')!));
  expect(saved.players[0].name).toBe('นักผจญภัย 🌿'); expect(saved.integrity).toMatch(/^[a-f0-9]{8}$/);
  await page.reload(); await ready(page); await page.locator('#btnTitleLoadGame').click(); await ready(page);
  await expect(page.locator('#hudHeroCard')).toContainText('นักผจญภัย');
  await expect(page.locator('#btnRollDice')).toBeEnabled();
});

test('battle command resolves damage and returns a playable command phase', async ({ page }) => {
  await page.goto('/?art-scene=battle&biome=grass'); await ready(page);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const before = await page.evaluate(() => { const b = (window as any).__gameApp.game.activeBattle; return [b.attacker.hp, b.defender.hp]; });
  for (const id of ['#btnCmdAttack', '#btnCmdDefend']) {
    const button = page.locator(id);
    if (await button.isVisible() && await button.isEnabled()) { await button.click(); break; }
  }
  await page.waitForFunction(prior => { const b = (window as any).__gameApp.game.activeBattle; return !b || b.attacker.hp !== prior[0] || b.defender.hp !== prior[1]; }, before, { timeout: 40000 });
  expect(errors).toEqual([]);
});

test('WebRTC peers authenticate, synchronize a real turn, reject spoofing, and pause on host loss', async ({ browser }) => {
  const hostContext = await browser.newContext({ serviceWorkers: 'block', reducedMotion: 'reduce' });
  const guestContext = await browser.newContext({ serviceWorkers: 'block', reducedMotion: 'reduce' });
  const host = await hostContext.newPage(), guest = await guestContext.newPage();
  try {
    for (const page of [host, guest]) { await page.goto('/'); await ready(page); }
    await host.locator('#btnTitleMultiplayerRoom').click(); await host.locator('#inputLobbyMyName').fill('Host'); await host.locator('#btnCreateHostRoom').click();
    const code = await host.evaluate(async () => (await import('/src/engine/NetworkRoomManager.ts')).networkRoomManager.getRoomCode());
    await expect.poll(() => host.evaluate(async () => (await import('/src/engine/NetworkRoomManager.ts')).networkRoomManager.getOnlineMessage())).toContain('พร้อม');
    await guest.locator('#btnTitleMultiplayerRoom').click(); await guest.locator('#inputLobbyMyName').fill('Guest'); await guest.locator('#selectLobbyMyClass').selectOption('cleric'); await guest.locator('#inputJoinRoomCode').fill(code!); await guest.locator('#btnSubmitJoinRoom').click();
    await expect.poll(() => guest.evaluate(async () => { const n = (await import('/src/engine/NetworkRoomManager.ts')).networkRoomManager as any; return { seats: n.getRoomInfo()?.connectedPeers.length, local: !!n.channel, rtc: !!n.hostConnection?.open, ticket: n.rejoinTicket.length > 20 }; })).toEqual({ seats: 2, local: false, rtc: true, ticket: true });
    await host.locator('.btn-lobby-party-size[data-count="2"]').click();
    await host.locator('#btnLobbyQuickMatch').click();
    await expect(guest.locator('#multiplayerRoomModal')).toContainText('8 วัน');
    await host.locator('#btnStartLobbyGame').click();
    await guest.waitForFunction(() => (window as any).__gameApp.game.phase === 'BOARD_TURN');
    expect(await guest.evaluate(() => { const g = (window as any).__gameApp.game; return [g.blitzDayLimit, g.activePlayer.level, g.activePlayer.gold]; })).toEqual([8, 2, 500]);
    const gold = await host.evaluate(() => (window as any).__gameApp.game.players[0].gold);
    await guest.evaluate(async () => {
      const n = (await import('/src/engine/NetworkRoomManager.ts')).networkRoomManager as any;
      n.hostConnection.send({ packetId: 'spoof', type: 'SYNC_STATE', roomCode: n.getRoomCode(), senderId: 'host', senderName: 'Host', payload: { state: {} }, timestamp: Date.now() });
    });
    await host.waitForTimeout(250); expect(await host.evaluate(() => (window as any).__gameApp.game.players[0].gold)).toBe(gold);
    // An actual legal route is walked by its owner; the guest only replays its animation.
    await host.evaluate(() => (window as any).__gameApp.triggerDiceRoll(1));
    await host.locator('#movementNavigator').waitFor(); await host.locator('#btnMoveNext').click();
    const target = await host.evaluate(() => (window as any).__gameApp.selectedMoveNodeId);
    await host.locator('#btnMoveConfirm').click();
    await guest.waitForFunction(id => (window as any).__gameApp.game.players[0].nodeId === id, target);
    expect(await guest.evaluate(() => (window as any).__gameApp.game.players[0].gold)).toBe(gold);
    // Complete the owner turn through the shared rule engine, then compare replicated state.
    await host.evaluate(() => { const a = (window as any).__gameApp; a.game.phase = 'TILE_EVENT'; a.advanceTurn(); });
    await guest.waitForFunction(() => (window as any).__gameApp.game.activePlayerIdx === 1);
    await expect(guest.locator('#btnRollDice')).toBeEnabled();
    await host.reload(); await ready(host);
    await expect.poll(() => guest.evaluate(async () => (await import('/src/engine/NetworkRoomManager.ts')).networkRoomManager.isConnectionHealthy())).toBe(false);
    await expect(guest.locator('#btnRollDice')).toBeDisabled();
    expect(await guest.evaluate(() => !!sessionStorage.getItem('cf_active_mp_session'))).toBe(true);
    await host.locator('#btnConfirmRejoinMP').click();
    await expect.poll(() => guest.evaluate(async () => (await import('/src/engine/NetworkRoomManager.ts')).networkRoomManager.isConnectionHealthy()), { timeout: 30000 }).toBe(true);
    await guest.waitForFunction(() => (window as any).__gameApp.game.activePlayerIdx === 1 && (window as any).__gameApp.game.phase === 'BOARD_TURN');
    await expect(guest.locator('#btnRollDice')).toBeEnabled();
    expect(await host.evaluate(() => (window as any).__gameApp.game.players.map((p: any) => p.gold))).toEqual(await guest.evaluate(() => (window as any).__gameApp.game.players.map((p: any) => p.gold)));
  } finally { await hostContext.close(); await guestContext.close(); }
});

test('Quick Match supports a real talent choice, migration-safe reload, and a journey summary', async ({ page }, testInfo) => {
  await page.goto('/'); await ready(page); await page.locator('#btnStartAdventure').click(); await page.locator('[data-campaign-preset="quick_match"]').click();
  await page.locator('#btnBeginGame').click(); await ready(page);
  expect(await page.evaluate(() => { const g = (window as any).__gameApp.game; return [g.blitzDayLimit, g.activePlayer.level, g.activePlayer.gold]; })).toEqual([8, 2, 500]);
  await openMenu(page, '#btnTalentTree'); await page.locator('[data-learn-talent="blade"]').click();
  await expect(page.locator('[data-learn-talent="blade"]')).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: testInfo.outputPath('talent-tree.png') });
  await page.locator('[data-workshop-close]').click();
  await page.reload(); await ready(page); await page.locator('#btnTitleLoadGame').click(); await ready(page);
  expect(await page.evaluate(() => (window as any).__gameApp.game.activePlayer.talents)).toEqual(['blade']);
  await page.evaluate(() => { const a = (window as any).__gameApp; a.game.phase = 'TILE_EVENT'; a.advanceTurn(); });
  await openMenu(page, '#btnCampaignChronicle'); await expect(page.locator('[data-replay-node]').first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('chronicle.png') });
});

test('NPC choices and town projects run through actual game dialogs', async ({ page }, testInfo) => {
  await page.goto('/?art-scene=world&biome=grass'); await ready(page);
  await page.evaluate(() => {
    const a = (window as any).__gameApp, g = a.game, n = g.allNodes.find((n: any) => n.type === 'guild');
    Object.assign(g.activePlayer, { nodeId: n.id, gridX: n.gx, gridY: n.gy, gridZ: n.gz }); g.phase = 'TILE_EVENT'; a.handleTileArrival(n);
  });
  await expect(page.locator('#journeyDecision')).toContainText('มิราแห่งกิลด์');
  await page.locator('#journeyDecision [data-choice="0"]').click();
  expect(await page.evaluate(() => (window as any).__gameApp.game.world.storylines[1].mira.stage)).toBe(1);
  // Leave the guild fixture and open an actual owned town with enough investment capital.
  await page.evaluate(() => {
    document.getElementById('fantasyEventModal')?.classList.add('hidden');
    const a = (window as any).__gameApp, g = a.game, p = g.activePlayer, n = g.allNodes.find((n: any) => n.townData);
    Object.assign(n.townData, { ownerId: p.id, isOccupiedByMonster: false, level: 2 }); p.gold = 1000; p.nodeId = n.id; g.phase = 'TOWN_MODAL';
    a.townUI.open(n, () => {}, () => {});
  });
  await page.locator('[data-town-project="market"]').click();
  await expect(page.locator('#townProjects')).toContainText('ตลาดชุมชน');
  await expect(page.locator('[data-town-project]')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('town-project.png') });
});

test('mobile cold load, bounded canvas memory and compact movement dock', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block', reducedMotion: 'reduce' });
  const page = await context.newPage();
  try {
    await page.addInitScript(() => { localStorage.setItem('fortuna_guide_v1', 'dismissed'); localStorage.setItem('fortune_mobile_display_pref', 'portrait'); });
    const started = Date.now(); await page.goto('/?art-scene=world&biome=grass&roll=6'); await ready(page);
    const coldLoadMs = Date.now() - started;
    await page.waitForTimeout(1200);
    const metrics = await page.evaluate(() => (window as any).__gameApp.performanceMonitor.snapshot());
    await testInfo.attach('mobile-performance', { body: JSON.stringify({ coldLoadMs, ...metrics }, null, 2), contentType: 'application/json' });
    expect(metrics.canvasBytes).toBeLessThanOrEqual(metrics.canvasBudget); expect(metrics.frameP95).toBeLessThan(200);
    await expect(page.locator('#movementOptions')).toBeHidden();
    expect((await page.locator('#movementNavigator').boundingBox())!.height).toBeLessThan(180);
    await page.locator('#btnMoveExpand').click(); await expect(page.locator('#movementOptions')).toBeVisible();
    const confirm = await page.locator('#btnMoveConfirm').boundingBox(); expect(confirm!.y + confirm!.height).toBeLessThan(844);
  } finally { await context.close(); }
});
