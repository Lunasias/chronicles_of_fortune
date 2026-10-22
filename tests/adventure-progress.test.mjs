import './_browser-stubs.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../.test-build/game/GameState.js';
import { adventureProgress, nearbyServices, adventureNextAction } from '../.test-build/ui/AdventureProgress.js';

function campaign() {
  const game = new GameState();
  game.initGame([{ name: 'First', classKey: 'warrior', isAI: false }, { name: 'Second', classKey: 'magician', isAI: false }]);
  return game;
}

test('journal matches mode goals and counts remaining playable days without advancing world RNG', () => {
  const game = campaign(), before = game.world.rng;
  game.dayCounter = 3; game.winGoal = 'gold'; game.activePlayer.gold = 6000;
  assert.deepEqual([adventureProgress(game).value, adventureProgress(game).maximum, adventureProgress(game).daysRemaining], [6000, 12000, 40]);
  game.winGoal = 'towns'; game.activePlayer.townsControlled = 3;
  assert.equal(adventureProgress(game).value, 3); assert.equal(adventureProgress(game).maximum, 8);
  game.gameMode = 'blitz'; game.blitzDayLimit = 20;
  assert.equal(adventureProgress(game).daysRemaining, 18); assert.equal(adventureProgress(game).maximum, 20);
  game.gameMode = 'roguelike_draft'; assert.equal(adventureProgress(game).maximum, 28);
  game.gameMode = 'endless_spire'; game.world.spireFloor = 7;
  assert.equal(adventureProgress(game).value, 7); assert.equal(adventureProgress(game).daysRemaining, null);
  assert.equal(game.world.rng, before);
});

test('journal distinguishes cooperative guardian progress from a single campaign boss', () => {
  const game = campaign(); game.gameMode = 'coop_raid';
  game.world.raidTargets = [10, 20, 30]; game.world.defeatedBosses = [10, 99];
  assert.equal(adventureProgress(game).value, 1); assert.equal(adventureProgress(game).maximum, 3);
  game.gameMode = 'standard'; game.winGoal = 'boss'; game.world.campaignBossId = 30;
  assert.equal(adventureProgress(game).value, 0);
  game.world.defeatedBosses.push(30); assert.equal(adventureProgress(game).value, 1);
});

test('nearest services use reachable road steps, ignore disconnected services and keep one per type', () => {
  const game = campaign(), node = (id, type, neighbors) => ({ id, type, neighbors, gx: 0, gy: 0, gz: 0, realmName: 'test', subRegionName: 'test' });
  game.activePlayer.nodeId = 0;
  game.allNodes = [node(0, 'empty', [1]), node(1, 'shop_item', [0, 2]), node(2, 'tavern', [1, 3]), node(3, 'shop_item', [2]), node(9, 'church', [])];
  assert.deepEqual(nearbyServices(game).map(s => [s.node.id, s.distance]), [[1, 1], [2, 2]]);
});

test('journal leaderboard uses net worth and match tie breaks while guidance respects low HP and turns', () => {
  const game = campaign();
  game.players.forEach(p => { p.gold = 500; });
  game.players[1].matchStats.monstersKilled = 2;
  assert.equal(adventureProgress(game).standings[0].id, game.players[1].id);
  game.phase = 'BOARD_TURN'; game.activePlayer.hp = 1;
  assert.match(adventureNextAction(game).title, /ฟื้นตัว/);
  game.phase = 'CHOOSING_PATH'; game.remainingMoves = 4;
  assert.match(adventureNextAction(game).title, /4/);
  game.activePlayer.isAI = true; assert.match(adventureNextAction(game).title, /เทิร์น/);
  game.players = []; assert.equal(nearbyServices(game).length, 0);
  assert.match(adventureNextAction(game).title, /เริ่ม/);
});
