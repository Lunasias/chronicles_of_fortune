import './_browser-stubs.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../.test-build/game/GameState.js';
import { SaveManager } from '../.test-build/game/SaveManager.js';
import { royalContractViews, startRoyalContract, claimRoyalContract, abandonRoyalContract, recordRoyalBossVictory, validRoyalContractState } from '../.test-build/game/RoyalContracts.js';
import { roadDistances, waypointDestination, findLocations } from '../.test-build/game/WorldNavigation.js';
import { battleForecast } from '../.test-build/ui/BattleForecast.js';
import { actionHint } from '../.test-build/ui/BattlePresentation.js';
import { CAMPAIGN_PRESETS } from '../.test-build/ui/CampaignLauncher.js';

const campaign = () => { const game = new GameState(); game.initGame([{ name: 'Royal 🌿', classKey: 'warrior', isAI: false }, { name: 'Ally', classKey: 'cleric', isAI: false }]); return game; };

test('royal contract counts only new achievements, pays once and leaves previews read-only', () => {
  const game = campaign(), p = game.activePlayer;
  p.matchStats.monstersKilled = 8;
  const rng = game.world.rng;
  royalContractViews(game, p); assert.equal(game.world.rng, rng); assert.deepEqual(game.world.royalContracts, {});
  assert.equal(startRoyalContract(game, p, 'road_warden').success, true);
  assert.equal(royalContractViews(game, p).find(v => v.active).progress, 0);
  assert.equal(claimRoyalContract(game, p).success, false);
  p.matchStats.monstersKilled += 3;
  const gold = p.gold, xp = p.xp;
  assert.equal(claimRoyalContract(game, p).success, true);
  assert.equal(p.gold, gold + 180); assert.equal(p.xp, xp + 60);
  assert.equal(claimRoyalContract(game, p).success, false); assert.equal(p.gold, gold + 180);
  assert.equal(startRoyalContract(game, p, 'road_warden').success, false);
});

test('royal contract requires the active board turn, level and compatible game mode', () => {
  const game = campaign(), p = game.activePlayer;
  assert.equal(startRoyalContract(game, game.players[1], 'road_warden').success, false);
  assert.equal(startRoyalContract(game, p, 'guardian_slayer').success, false);
  game.phase = 'BATTLE'; assert.equal(startRoyalContract(game, p, 'road_warden').success, false);
  game.phase = 'BOARD_TURN'; p.level = 5; game.gameMode = 'coop_raid';
  assert.equal(startRoyalContract(game, p, 'duel_champion').success, false);
  assert.equal(startRoyalContract(game, p, 'town_liberator').success, true);
  assert.equal(startRoyalContract(game, p, 'trade_patron').success, false);
  assert.equal(abandonRoyalContract(game, p).success, true);
  assert.equal(startRoyalContract(game, p, 'trade_patron').success, true);
});

test('royal rewards resolve a gold-goal victory immediately instead of allowing another turn', () => {
  const game = campaign(), p = game.activePlayer; game.winGoal = 'gold';
  startRoyalContract(game, p, 'road_warden'); p.matchStats.monstersKilled = 3; p.gold = 11900;
  assert.equal(claimRoyalContract(game, p).success, true);
  assert.equal(game.world.result.winnerId, p.id); assert.equal(game.phase, 'VICTORY');
  assert.equal(claimRoyalContract(game, p).success, false); assert.equal(p.gold, 12080);
});

test('abandoning a contract resets the baseline and boss victories persist beyond dungeon visits', () => {
  const game = campaign(), p = game.activePlayer;
  startRoyalContract(game, p, 'road_warden'); p.matchStats.monstersKilled += 2;
  abandonRoyalContract(game, p); startRoyalContract(game, p, 'road_warden');
  assert.equal(royalContractViews(game, p).find(v => v.active).progress, 0);
  abandonRoyalContract(game, p); p.level = 4;
  startRoyalContract(game, p, 'guardian_slayer'); recordRoyalBossVictory(game, p);
  assert.equal(royalContractViews(game, p).find(v => v.active).ready, true);
  delete game.world.expeditions[p.id];
  assert.equal(claimRoyalContract(game, p).gold, 400);
});

test('royal contracts survive v2 saves and reject malformed ledgers without replacing a good save', () => {
  localStorage.clear(); const game = campaign(), p = game.activePlayer;
  startRoyalContract(game, p, 'road_warden'); p.matchStats.monstersKilled += 2;
  assert.equal(SaveManager.save(game, undefined, 1), true);
  const loaded = campaign(); assert.equal(SaveManager.load(loaded, 1).success, true);
  assert.equal(royalContractViews(loaded, loaded.activePlayer).find(v => v.active).progress, 2);
  const raw = localStorage.getItem('chronicles_of_fortune_savegame');
  const bad = JSON.parse(raw); bad.world.royalContracts[p.id].active.baseline = -1;
  assert.equal(SaveManager.importSaveData(loaded, JSON.stringify(bad), 1).success, false);
  assert.equal(localStorage.getItem('chronicles_of_fortune_savegame'), raw);
  assert.equal(validRoyalContractState(undefined), true);
  assert.equal(validRoyalContractState({ 1: { completed: ['unknown'], active: null } }), false);
  assert.equal(validRoyalContractState({ 1: { completed: ['road_warden', 'road_warden'], active: null } }), false);
  const legacy = JSON.parse(raw); delete legacy.world.royalContracts; delete legacy.integrity; legacy.version = 2;
  assert.equal(SaveManager.applySaveData(loaded, legacy).success, true);
  assert.deepEqual(loaded.world.royalContracts, {});
});

test('world navigation uses connected roads, preserves valid dice destinations and stable ties', () => {
  const n = (id, neighbors, type = 'empty', name = `node${id}`, biome = 'forest') => ({ id, neighbors, type, name, biome, subRegionName: 'ป่าทดสอบ', realmName: 'Forest kingdom' });
  const nodes = [n(0, [1]), n(1, [0, 2]), n(2, [1, 3], 'tavern', 'Willow Inn'), n(3, [2], 'shop_weapon', 'Old Forge'), n(8, [], 'tavern', 'Lonely Inn')];
  assert.equal(roadDistances(nodes, 0).get(3), 3); assert.equal(roadDistances(nodes, 0).has(8), false);
  assert.equal(waypointDestination(nodes, 3, [0, 1]), 1);
  assert.equal(waypointDestination(nodes, 3, [8]), null);
  assert.equal(waypointDestination(nodes, 3, []), null);
  assert.deepEqual(findLocations(nodes, 'โรงเตี๊ยม', 'services', roadDistances(nodes, 0)).map(n => n.id), [2, 8]);
  assert.deepEqual(findLocations(nodes, 'FOREST forge').map(n => n.id), [3]);
  assert.deepEqual(findLocations(nodes, '<script>'), []);
});

test('battle forecast includes formation/element ranges and never mutates combatants or RNG', () => {
  const game = campaign();
  const a = { name: 'Mage', classKey: 'magician', hp: 70, maxHp: 70, mp: 20, atk: 10, def: 8, mag: 24, spd: 10, luk: 5, element: 'fire', gridPos: 'front' };
  const d = { ...a, name: 'Ice', mag: 9, weaknessElement: 'fire', gridPos: 'mid' };
  const before = JSON.stringify([a, d]), rng = game.world.rng;
  for (const action of ['attack', 'strike', 'magic']) { const f = battleForecast(a, d, action); assert.ok(f.high >= f.low && f.low > 0); }
  assert.ok(battleForecast({ ...a, gridPos: 'back' }, d, 'magic').low > battleForecast(a, d, 'magic').low);
  assert.equal(battleForecast({ ...a, freezeTurns: 1 }, d, 'attack').high, 0);
  assert.equal(battleForecast({ ...a, silenceTurns: 1 }, d, 'magic').high, 0);
  assert.equal(battleForecast(a, d, 'skill').high, null);
  assert.equal(actionHint({ ...a, mp: 0, freezeTurns: 1 }, 'magic').blocked, false);
  assert.equal(actionHint({ ...a, mp: 0, silenceTurns: 1 }, 'magic').blocked, false);
  assert.equal(JSON.stringify([a, d]), before); assert.equal(game.world.rng, rng);
});

test('campaign presets expose playable rules and a gentle two-player first adventure', () => {
  assert.equal(new Set(CAMPAIGN_PRESETS.map(p => p.id)).size, CAMPAIGN_PRESETS.length);
  const first = CAMPAIGN_PRESETS[0];
  assert.deepEqual([first.players, first.difficulty, first.darkling], [2, 'casual', false]);
  for (const preset of CAMPAIGN_PRESETS) { assert.ok(preset.players >= 2 && preset.players <= 4); assert.ok(['standard', 'blitz', 'coop_raid', 'endless_spire', 'roguelike_draft'].includes(preset.mode)); }
});
