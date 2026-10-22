import './_browser-stubs.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../.test-build/game/GameState.js';
import { SaveManager } from '../.test-build/game/SaveManager.js';
import { migrateSaveData, saveChecksum } from '../.test-build/game/SaveMigration.js';
import { configureMatch, normalizeMatchConfig } from '../.test-build/game/MatchConfig.js';
import { canLearnTalent, learnTalent, talentPoints } from '../.test-build/game/TalentTree.js';
import { acceptStory, recordStoryVisit, claimStory, storyProgress, recordMatchMoment } from '../.test-build/game/CampaignStories.js';
import { tutorialHint, recordTutorialAction } from '../.test-build/game/Tutorial.js';
import { townManager } from '../.test-build/game/TownManager.js';
import { assignTown } from '../.test-build/game/Rules.js';
import { CanvasBudget } from '../.test-build/engine/PerformanceBudget.js';
import { validNetworkPacket, validTurnSnapshot, networkTurnId } from '../.test-build/engine/NetworkProtocol.js';
import { aiSystem } from '../.test-build/game/AISystem.js';
import { BattleEngine } from '../.test-build/game/BattleEngine.js';

const fresh = () => { const game = new GameState(); game.initGame([{ name: 'Host', classKey: 'warrior', isAI: false }, { name: 'Guest', classKey: 'cleric', isAI: false }]); return game; };

test('v2 migration preserves a campaign, remains idempotent, and never edits its source', () => {
  const game = fresh(), source = SaveManager.serializeGameState(game); source.version = 2;
  source.players[0].gold = 777; source.world.royalContracts = { 1: { active: null, completed: ['road_warden'] } };
  const before = JSON.stringify(source), migrated = migrateSaveData(source);
  assert.equal(migrated.data.version, 3); assert.equal(migrated.data.players[0].gold, 777);
  assert.deepEqual(migrated.data.world.royalContracts, source.world.royalContracts);
  assert.equal(JSON.stringify(source), before); assert.deepEqual(migrateSaveData(migrated.data).data, migrated.data);
  assert.equal(SaveManager.applySaveData(game, source).success, true); assert.equal(game.activePlayer.gold, 777);
});

test('checksum damage selects a good backup and never silently loads over a future save', () => {
  localStorage.clear(); const game = fresh(); game.activePlayer.gold = 400; SaveManager.save(game);
  game.activePlayer.gold = 600; SaveManager.save(game);
  const key = 'chronicles_of_fortune_savegame', encoded = JSON.parse(localStorage.getItem(key)); encoded.players[0].gold = 999;
  localStorage.setItem(key, JSON.stringify(encoded));
  const result = SaveManager.load(game); assert.equal(result.recoveredFromBackup, true); assert.equal(game.activePlayer.gold, 400);
  encoded.version = 999; localStorage.setItem(key, JSON.stringify(encoded));
  assert.equal(SaveManager.load(game).success, false); assert.equal(game.activePlayer.gold, 400);
});

test('a fully staged crash checkpoint can recover an absent primary; migration does not rewrite old bytes', () => {
  localStorage.clear(); const game = fresh(), key = 'chronicles_of_fortune_savegame';
  const data = SaveManager.serializeGameState(game); data.players[0].gold = 888; data.integrity = saveChecksum(data);
  localStorage.setItem(`${key}_pending`, JSON.stringify(data));
  assert.equal(SaveManager.load(game).recoveredFromBackup, true); assert.equal(game.activePlayer.gold, 888);
  delete data.integrity; data.version = 2; const raw = JSON.stringify(data); localStorage.setItem(key, raw);
  assert.equal(SaveManager.load(game).success, true); assert.equal(localStorage.getItem(key), raw);
});

test('quick match finishes after its configured days and custom goals persist in v3', () => {
  const game = fresh(); game.gameMode = 'blitz'; configureMatch(game, { days: 8, startingGold: 500, rewardRate: 1.5, townGoal: 3 });
  assert.equal(game.players[1].gold, 500); assert.equal(game.blitzDayLimit, 8);
  game.dayCounter = 8; game.checkWinConditions(); assert.equal(game.world.result, null);
  game.dayCounter = 9; game.checkWinConditions(); assert.equal(game.phase, 'VICTORY');
  const loaded = fresh(); assert.equal(SaveManager.applySaveData(loaded, SaveManager.serializeGameState(game)).success, true);
  assert.equal(loaded.world.matchConfig.rewardRate, 1.5); assert.equal(loaded.world.matchConfig.townGoal, 3);
  assert.deepEqual(normalizeMatchConfig({ days: Infinity, startingGold: -5, goldGoal: 1 }), { days: 42, startingGold: 100, startingLevel: 1, goldGoal: 2000, townGoal: 8, rewardRate: 1 });
});

test('talent forks enforce prerequisites, point caps, and distinct low-HP combat effects', () => {
  const game = fresh(), p = game.activePlayer; p.level = 4;
  assert.equal(learnTalent(p, 'fury'), false); assert.equal(learnTalent(p, 'blade'), true);
  assert.equal(p.getTotalStat('atk'), p.atk + 2); assert.equal(learnTalent(p, 'fury'), true);
  p.hp = 1; assert.equal(p.getTotalStat('atk'), p.atk + 6); assert.equal(canLearnTalent(p, 'vampiric'), false);
  assert.equal(talentPoints(p), 0); p.level = 20; assert.equal(talentPoints(p), 2);
  const saved = SaveManager.serializeGameState(game); assert.equal(SaveManager.applySaveData(fresh(), saved).success, true);
  saved.players[0].talents.push('vampiric'); assert.equal(SaveManager.applySaveData(fresh(), saved).success, false);
});

test('town projects require ownership, spend once, produce income and defend against takeover', () => {
  const game = fresh(), p = game.activePlayer, node = game.allNodes.find(n => n.townData);
  node.townData.isOccupiedByMonster = false; node.townData.level = 2; p.gold = 1000;
  assert.equal(townManager.developTown(node, p, 'market'), false); assignTown(node, p, game.players);
  const baseline = townManager.collectTurnRevenue(p, game.allNodes);
  assert.equal(townManager.developTown(node, p, 'market'), true); const gold = p.gold;
  assert.equal(townManager.developTown(node, p, 'market'), false); assert.equal(p.gold, gold);
  assert.equal(townManager.collectTurnRevenue(p, game.allNodes), baseline + 15);
  node.townData.project = 'watchtower'; assert.equal(townManager.takeoverCost(node, p, game.allNodes), Math.round(node.townData.baseValue * 2 * 1.3));
  node.townData.project = 'sanctuary'; p.hp = 1; p.mp = 0; townManager.collectTurnRevenue(p, game.allNodes); assert.equal(p.hp, 4); assert.equal(p.mp, 2);
});

test('NPC jobs count new achievements, require an actual return, and pay once', () => {
  const game = fresh(), p = game.activePlayer; p.matchStats.monstersKilled = 20;
  assert.equal(acceptStory(game, p, 'mira', 'help'), true); assert.equal(acceptStory(game, p, 'mira', 'trade'), false);
  assert.equal(storyProgress(game, p, 'mira'), 0); p.matchStats.monstersKilled += 2;
  assert.equal(claimStory(game, p, 'mira'), false); p.nodeId = game.allNodes.find(n => n.type === 'guild').id;
  const before = p.gold; assert.equal(claimStory(game, p, 'mira'), true); assert.equal(p.gold, before + 160);
  assert.equal(claimStory(game, p, 'mira'), false); assert.equal(game.world.storylines[p.id].mira.relationship, 3);
  acceptStory(game, p, 'elowen', 'trade');
  const services = game.allNodes.filter(n => n.type === 'shop_item').slice(0, 3);
  for (const node of services) { recordStoryVisit(game, p, node); recordStoryVisit(game, p, node); }
  assert.equal(storyProgress(game, p, 'elowen'), 3);
});

test('three-turn tutorial responds to real phases and persists completion across reload', () => {
  const game = fresh(); game.world.tutorial[1] = { enabled: true, turns: 0, actions: [] };
  assert.equal(tutorialHint(game).target, '#btnRollDice'); game.phase = 'CHOOSING_PATH'; assert.equal(tutorialHint(game).target, '#btnMoveNext');
  recordTutorialAction(game, 'travel'); game.endTurn(); game.endTurn();
  assert.match(tutorialHint(game).text, /เทิร์นที่ 2/); recordTutorialAction(game, 'stats'); assert.equal(tutorialHint(game).target, '#btnRollDice');
  game.endTurn(); game.endTurn(); assert.match(tutorialHint(game).text, /เทิร์นที่ 3/);
  game.endTurn(); game.endTurn(); assert.equal(tutorialHint(game), null);
  const loaded = fresh(); SaveManager.applySaveData(loaded, SaveManager.serializeGameState(game)); assert.equal(loaded.world.tutorial[1].turns, 3);
});

test('replay checkpoints are bounded, deduplicate a turn, and never advance RNG', () => {
  const game = fresh(), rng = game.world.rng;
  for (let day = 1; day <= 400; day++) { game.dayCounter = day; recordMatchMoment(game); recordMatchMoment(game); }
  assert.equal(game.world.matchHistory.length, 336); assert.equal(game.world.matchHistory.at(-1).day, 400); assert.equal(game.world.rng, rng);
});

test('decoded canvas cache uses LRU bytes, handles replacement, and refuses oversize items', () => {
  const cache = new CanvasBudget(800); cache.set('a', { width: 10, height: 10 }); cache.set('b', { width: 10, height: 10 });
  cache.get('a'); cache.set('c', { width: 10, height: 10 }); assert.equal(cache.has('b'), false); assert.equal(cache.bytes, 800);
  cache.set('c', { width: 5, height: 5 }); assert.equal(cache.bytes, 500); cache.set('huge', { width: 100, height: 100 }); assert.equal(cache.has('huge'), false);
  cache.clear(); assert.equal(cache.bytes, 0);
});

test('network protocol rejects oversized, malformed and prototype packets', () => {
  const packet = { type: 'CHAT_MSG', packetId: 'one', senderId: 'guest', roomCode: 'CF-1234', timestamp: 1, payload: { text: 'hello' } };
  assert.equal(validNetworkPacket(packet), true); assert.equal(validNetworkPacket({ ...packet, type: 'INJECT' }), false);
  assert.equal(validNetworkPacket({ ...packet, payload: { text: 'x'.repeat(600000) } }), false);
  assert.equal(validNetworkPacket(JSON.parse(JSON.stringify(packet).replace('"hello"', '{"__proto__":{"admin":true}}'))), false);
});

test('turn snapshot rejects stolen roster, impossible stats, day jumps and rewinds', () => {
  const game = fresh(), payload = { state: SaveManager.serializeGameState(game) };
  assert.equal(validTurnSnapshot(game, payload), true); assert.ok(networkTurnId(game).endsWith(':1:0'));
  const changed = () => structuredClone(payload);
  let bad = changed(); bad.state.players[1].isAI = true; assert.equal(validTurnSnapshot(game, bad), false);
  bad = changed(); bad.state.players[0].gold = 1e12; assert.equal(validTurnSnapshot(game, bad), false);
  bad = changed(); bad.state.dayCounter += 2; assert.equal(validTurnSnapshot(game, bad), false);
  bad = changed(); bad.state.players[0].level += 20; assert.equal(validTurnSnapshot(game, bad), false);
});

test('a handoff that skips a sleeping rival retains the original authority turn stamp', () => {
  const game = fresh(); game.players[1].sleepTurns = 1;
  const previous = fresh(); SaveManager.applySaveData(previous, SaveManager.serializeGameState(game));
  const stamp = networkTurnId(game); game.endTurn();
  assert.equal(game.activePlayerIdx, 0); assert.equal(game.dayCounter, 2);
  assert.notEqual(networkTurnId(game), stamp); assert.equal(stamp, networkTurnId(previous));
  assert.equal(validTurnSnapshot(previous, { state: SaveManager.serializeGameState(game) }), true);
});

test('AI uses class-specific skill costs, conserves lethal sacrifice, and seeks recovery when out of MP', () => {
  const game = fresh(), p = game.activePlayer;
  p.classKey = 'cleric'; p.mp = BattleEngine.actionCost({ playerRef: p }, 'skill') - 1; p.aiPersonality = 'hunter';
  const opponent = { hp: 50, maxHp: 50, atk: 5, mag: 5, def: 5 };
  for (let i = 0; i < 100; i++) assert.notEqual(aiSystem.chooseAttackerAction(p, opponent), 'skill');
  p.classKey = 'magician'; p.mag = 30; p.atk = 6; p.mp = 70; p.hp = 1;
  for (let i = 0; i < 100; i++) assert.notEqual(aiSystem.chooseAttackerAction(p, opponent), 'skill');
  p.hp = p.maxHp; p.mp = 0;
  const inn = game.allNodes.find(n => n.type === 'tavern');
  const danger = game.allNodes.find(n => n.type === 'red');
  assert.equal(aiSystem.chooseRoute([danger.id, inn.id], p, game.allNodes, game.players), inn.id);
});
