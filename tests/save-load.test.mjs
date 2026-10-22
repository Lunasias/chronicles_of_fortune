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
import { getWorld } from '../.test-build/game/WorldState.js';

const SAVE_KEY = 'chronicles_of_fortune_savegame';
const META_KEY = 'chronicles_of_fortune_savemeta';

const nodeById = id => DOKAPON_NODES.find(n => n.id === id);

function freshGame() {
  const game = new GameState();
  game.initGame([{ name: 'Tester', classKey: 'warrior', isAI: false }]);
  return game;
}

// Mutation fixtures deliberately omit the optional disk checksum. Dedicated recovery
// tests below damage the encoded primary to exercise checksum verification itself.
const readSave = () => { const data = JSON.parse(localStorage.getItem(SAVE_KEY)); delete data.integrity; return data; };
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
  writeSave({ version: 2, players: [] });
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
  game.allNodes.find(n => n.id === 0).townData.ownerId = game.activePlayer.id;
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

test('an incompatible import preserves the good slot and active game', () => {
  const game = freshGame();
  game.activePlayer.gold = 740;
  assert.equal(SaveManager.save(game), true);
  const original = localStorage.getItem(SAVE_KEY), originalMeta = localStorage.getItem(META_KEY);
  const world = game.world, players = game.players, nodes = game.allNodes;
  const incompatible = readSave();incompatible.version = 999;incompatible.players[0].gold = 99999;
  const result = SaveManager.importSaveData(game, JSON.stringify(incompatible));
  assert.equal(result.success, false);assert.match(result.error, /เวอร์ชัน/);
  assert.equal(localStorage.getItem(SAVE_KEY), original);assert.equal(localStorage.getItem(META_KEY), originalMeta);
  assert.equal(game.world, world);assert.equal(getWorld(), world);assert.equal(game.players, players);assert.equal(game.allNodes, nodes);
  assert.equal(game.activePlayer.gold, 740);
});

test('malformed player and world structures fail without partially replacing an active world', () => {
  const game = freshGame(), snapshot = SaveManager.serializeGameState(game);
  const world = game.world, players = game.players, nodes = game.allNodes;
  for (const damage of [
    data => {data.players.push(null);},
    data => {data.players.push(structuredClone(data.players[0]));},
    data => {data.world.weather = null;},
    data => {data.world.events = {1: {recent: null, flags: {}, lastSeen: {}}};},
    data => {data.world.random = {};},
    data => {data.players[0].inventory = [null];}
  ]) {
    const data = structuredClone(snapshot);damage(data);
    assert.equal(SaveManager.applySaveData(game, data).success, false);
    assert.equal(game.world, world);assert.equal(getWorld(), world);assert.equal(game.players, players);assert.equal(game.allNodes, nodes);
  }
});

test('a quota failure during import leaves the slot and running game intact', () => {
  const game = freshGame();game.activePlayer.gold = 125;
  assert.equal(SaveManager.save(game), true);
  const original = localStorage.getItem(SAVE_KEY), world = game.world;
  const incoming = readSave();incoming.players[0].gold = 8888;
  const setItem = localStorage.setItem;
  localStorage.setItem = (key, value) => {if (key === SAVE_KEY) throw new Error('QuotaExceededError');return setItem(key, value);};
  try {
    const result = SaveManager.importSaveData(game, JSON.stringify(incoming));
    assert.equal(result.success, false);assert.match(result.error, /จัดเก็บ/);
    assert.equal(localStorage.getItem(SAVE_KEY), original);assert.equal(game.world, world);assert.equal(getWorld(), world);assert.equal(game.activePlayer.gold, 125);
  } finally {localStorage.setItem = setItem;}
});

test('committed saves stay discoverable with accurate metadata when the metadata write fails', () => {
  const game = freshGame();assert.equal(SaveManager.save(game), true);
  game.activePlayer.name = 'เจ้าหญิงฟอร์จูน';game.activePlayer.gold = 0;game.dayCounter = 7;
  const setItem = localStorage.setItem;
  localStorage.setItem = (key, value) => {if (key === META_KEY) throw new Error('metadata denied');return setItem(key, value);};
  try {assert.equal(SaveManager.saveWithResult(game).success, true);}
  finally {localStorage.setItem = setItem;}
  assert.equal(SaveManager.hasSave(), true);
  assert.equal(SaveManager.getSaveMetadata().activeHeroGold, 0);assert.equal(SaveManager.getSaveMetadata().activeHeroName, 'เจ้าหญิงฟอร์จูน');assert.equal(SaveManager.getSaveMetadata().day, 7);
  localStorage.removeItem(META_KEY);assert.equal(SaveManager.hasSave(), true);assert.ok(SaveManager.getSaveMetadata());
});

test('autosave retains one previous good run and recovers it when its primary is damaged', () => {
  const game = freshGame();
  for (const day of [1, 2, 3]) {game.dayCounter = day;game.activePlayer.gold = day * 100;assert.equal(SaveManager.autoSave(game), true);}
  assert.equal(JSON.parse(localStorage.getItem(`${SAVE_KEY}_auto_backup`)).dayCounter, 2);
  localStorage.setItem(`${SAVE_KEY}_auto`, '{interrupted');
  const restored = new GameState(), result = SaveManager.load(restored, 0);
  assert.equal(result.success, true);assert.equal(result.recoveredFromBackup, true);assert.equal(restored.dayCounter, 2);assert.equal(restored.activePlayer.gold, 200);
  assert.equal(SaveManager.getSaveMetadata(0).day, 2);
  game.dayCounter = 4;assert.equal(SaveManager.autoSave(game), true);
  assert.equal(JSON.parse(localStorage.getItem(`${SAVE_KEY}_auto_backup`)).dayCounter, 2,'a damaged primary must never replace the good recovery copy');
});

test('unwritable autosaves preserve their previous primary and can recover after its deletion', () => {
  const game = freshGame();game.activePlayer.gold = 400;assert.equal(SaveManager.autoSave(game), true);
  const original = localStorage.getItem(`${SAVE_KEY}_auto`), setItem = localStorage.setItem;
  game.activePlayer.gold = 900;
  localStorage.setItem = (key, value) => {if (key === `${SAVE_KEY}_auto`) throw new Error('QuotaExceededError');return setItem(key, value);};
  try {assert.equal(SaveManager.autoSave(game), false);assert.equal(localStorage.getItem(`${SAVE_KEY}_auto`), original);}
  finally {localStorage.setItem = setItem;}
  localStorage.removeItem(`${SAVE_KEY}_auto`);assert.equal(SaveManager.hasSave(0), true);
  const restored = new GameState();assert.equal(SaveManager.load(restored, 0).recoveredFromBackup, true);assert.equal(restored.activePlayer.gold, 400);
});

test('a newer primary is rejected even if an older recovery copy exists', () => {
  const game = freshGame();assert.equal(SaveManager.save(game), true);assert.equal(SaveManager.save(game), true);
  const data = readSave();data.version = 999;writeSave(data);
  const result = SaveManager.load(new GameState());
  assert.equal(result.success, false);assert.equal(result.recoveredFromBackup, undefined);assert.match(result.error, /เวอร์ชัน/);
  assert.equal(readSave().version, 999);
});

test('UTF-8 exports import safely into another slot and retain boss state and zero gold', () => {
  const game = freshGame();game.activePlayer.name = 'ฟอร์จูน 🌿';game.activePlayer.gold = 0;
  assert.equal(SaveManager.save(game, {currentHp: 321, maxHp: 950}, 2), true);
  const encoded = SaveManager.exportSaveData(2), target = new GameState();
  const result = SaveManager.importSaveData(target, encoded, 3);
  assert.equal(result.success, true);assert.deepEqual(result.bossState, {currentHp: 321, maxHp: 950});assert.equal(target.activePlayer.name, 'ฟอร์จูน 🌿');assert.equal(SaveManager.getSaveMetadata(3).activeHeroGold, 0);
  assert.equal(SaveManager.hasSave(1), false);assert.equal(SaveManager.hasSave(2), true);assert.equal(SaveManager.hasSave(3), true);
});

test('clearing a slot removes its recovery copy and stale metadata cannot resurrect it', () => {
  const game = freshGame();assert.equal(SaveManager.save(game), true);assert.equal(SaveManager.save(game), true);assert.equal(SaveManager.autoSave(game), true);
  SaveManager.clear(1);
  assert.equal(localStorage.getItem(`${SAVE_KEY}_backup`), null);assert.equal(SaveManager.hasSave(1), false);assert.equal(SaveManager.hasSave(0), true);
  localStorage.setItem(META_KEY, JSON.stringify({day: 20}));assert.equal(SaveManager.hasSave(1), false);assert.equal(SaveManager.getSaveMetadata(1), null);
});
