// Save/load round-trip rules.
//
// The hero carries both a node id and interpolated grid coordinates. Those two can disagree
// in a persisted save, because a walk animation commits p.nodeId to the destination at the
// start of a step while p.gridX/p.gridY are still moving. If the mismatch survives a reload,
// every facing and screen-position calculation is made from the wrong origin.
import './_browser-stubs.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../.test-build/game/GameState.js';
import { SaveManager } from '../.test-build/game/SaveManager.js';
import { DOKAPON_NODES } from '../.test-build/game/BoardMap.js';

const SAVE_KEY = 'chronicles_of_fortune_savegame';

const nodeById = id => DOKAPON_NODES.find(n => n.id === id);

function freshGame() {
  const game = new GameState();
  game.initGame([{ name: 'Tester', classKey: 'warrior', isAI: false }]);
  return game;
}

const readSave = () => JSON.parse(localStorage.getItem(SAVE_KEY));
const writeSave = data => localStorage.setItem(SAVE_KEY, JSON.stringify(data));

test.beforeEach(() => {
  localStorage.clear();
});

test('a save taken mid-walk restores the hero onto its node', () => {
  const game = freshGame();
  const hero = game.activePlayer;

  const from = nodeById(0);
  const to = nodeById(1);

  // Reproduce executeSingleStep part-way through a step.
  hero.nodeId = to.id;
  hero.gridX = from.gx + (to.gx - from.gx) * 0.4;
  hero.gridY = from.gy + (to.gy - from.gy) * 0.4;
  hero.gridZ = from.gz;
  hero.facing = 'NE';

  assert.equal(SaveManager.save(game), true);

  const restored = new GameState();
  const res = SaveManager.load(restored);
  assert.equal(res.success, true, res.error || '');

  const lp = restored.activePlayer;
  assert.equal(lp.nodeId, to.id);
  assert.equal(lp.gridX, to.gx, 'gridX must belong to the node the hero occupies');
  assert.equal(lp.gridY, to.gy, 'gridY must belong to the node the hero occupies');
  assert.equal(lp.gridZ, to.gz, 'gridZ must belong to the node the hero occupies');
  assert.equal(lp.facing, 'NE', 'the saved facing is preserved');

  // The mismatch must also be gone from what was written to disk.
  const stored = readSave();
  const sp = stored.players[0];
  assert.equal(sp.gridX, to.gx);
  assert.equal(sp.gridY, to.gy);
});

test('every stored hero position belongs to its stored node', () => {
  const game = freshGame();
  const nodes = [nodeById(0), nodeById(1), nodeById(2)];
  game.players.forEach((hero, index) => {
    const node = nodes[index % nodes.length];
    hero.nodeId = node.id;
    // Deliberately wrong coordinates, as an interrupted animation would leave behind.
    hero.gridX = node.gx + 0.37;
    hero.gridY = node.gy - 0.11;
    hero.gridZ = node.gz;
  });

  assert.equal(SaveManager.save(game), true);

  for (const sp of readSave().players) {
    const node = nodeById(sp.nodeId);
    assert.equal(sp.gridX, node.gx, `player ${sp.id}`);
    assert.equal(sp.gridY, node.gy, `player ${sp.id}`);
    assert.equal(sp.gridZ, node.gz, `player ${sp.id}`);
  }
});

test('load rejects a save written by a newer format version', () => {
  assert.equal(SaveManager.save(freshGame()), true);
  const stored = readSave();
  stored.version = 999;
  writeSave(stored);

  const res = SaveManager.load(new GameState());
  assert.equal(res.success, false);
  assert.match(res.error, /เวอร์ชัน/);
});

test('load rejects malformed JSON instead of throwing', () => {
  localStorage.setItem(SAVE_KEY, '{ this is not json');
  const res = SaveManager.load(new GameState());
  assert.equal(res.success, false);
  assert.ok(res.error);
});

test('load rejects a save with no players', () => {
  writeSave({ version: 1, players: [] });
  const res = SaveManager.load(new GameState());
  assert.equal(res.success, false);
  assert.match(res.error, /ผู้เล่น/);
});

test('missing or corrupt numbers fall back to sane values', () => {
  assert.equal(SaveManager.save(freshGame()), true);
  const stored = readSave();
  delete stored.players[0].level;
  stored.players[0].hp = null;
  stored.players[0].gold = 'not-a-number';
  stored.dayCounter = null;
  writeSave(stored);

  const restored = new GameState();
  const res = SaveManager.load(restored);
  assert.equal(res.success, true, res.error || '');

  const hero = restored.activePlayer;
  assert.ok(Number.isFinite(hero.level) && hero.level >= 1, 'level must stay a positive number');
  assert.ok(Number.isFinite(hero.hp), 'hp must stay a number');
  assert.ok(Number.isFinite(hero.gold) && hero.gold >= 0, 'gold must stay a non-negative number');
  assert.ok(hero.hp <= hero.maxHp, 'hp must not exceed maxHp');
  assert.equal(restored.dayCounter, 1);
});

test('a restored hero always has all four equipment slots', () => {
  assert.equal(SaveManager.save(freshGame()), true);
  const stored = readSave();
  // Simulates a save written before the shield slot existed.
  stored.players[0].equipment = { weapon: null, armor: null, accessory: null };
  writeSave(stored);

  const restored = new GameState();
  assert.equal(SaveManager.load(restored).success, true);
  const equipment = restored.activePlayer.equipment;
  for (const slot of ['weapon', 'shield', 'armor', 'accessory']) {
    assert.ok(slot in equipment, `equipment.${slot} must exist`);
  }
});

test('town deeds pointing at nodes that no longer exist are dropped', () => {
  const game = freshGame();
  game.activePlayer.townDeeds = [0, 99999];
  assert.equal(SaveManager.save(game), true);
  assert.deepEqual(readSave().players[0].townDeeds, [0, 99999], 'save stores what it was given');

  const restored = new GameState();
  assert.equal(SaveManager.load(restored).success, true);
  assert.deepEqual(restored.activePlayer.townDeeds, [0]);
  assert.equal(restored.activePlayer.townsControlled, 1, 'the counter is re-derived');
});

test('starting a new game resets the board instead of inheriting the previous one', () => {
  const game = freshGame();
  const town = game.allNodes.find(n => n.townData);
  assert.ok(town, 'the board should contain at least one town');

  town.townData.ownerId = 1;
  town.townData.isOccupiedByMonster = false;
  town.townData.level = 4;
  town.townData.monsterHp = 1;

  game.initGame([{ name: 'Tester', classKey: 'warrior', isAI: false }]);

  const after = game.allNodes.find(n => n.id === town.id);
  assert.notEqual(after, town, 'the new game must use fresh node objects');
  assert.equal(after.townData.ownerId, null, 'town ownership must not leak between games');
  assert.equal(after.townData.isOccupiedByMonster, true, 'town monsters must be restored');
  assert.equal(after.townData.level, 1, 'town upgrades must not leak between games');
  assert.equal(after.townData.monsterHp, after.townData.monsterMaxHp, 'monster HP must be full');
});

test('starting a new game clears leftover transient state', () => {
  const game = freshGame();
  game.remainingMoves = 5;
  game.highlightedNodes = [1, 2, 3];
  game.pendingTileNode = game.allNodes[0];

  game.initGame([{ name: 'Tester', classKey: 'warrior', isAI: false }]);

  assert.equal(game.remainingMoves, 0);
  assert.deepEqual(game.highlightedNodes, []);
  assert.equal(game.pendingTileNode, null);
  assert.equal(game.activeBattle, null);
});
