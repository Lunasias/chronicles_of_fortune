import './_browser-stubs.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../.test-build/game/GameState.js';
import { WorldState, bindWorld } from '../.test-build/game/WorldState.js';
import { FantasyEventManager } from '../.test-build/game/EventDirector.js';
import { getNodeEncounterPreview } from '../.test-build/game/MonsterDatabase.js';
import { encounterChance, RULES } from '../.test-build/game/Rules.js';
import { prepareCombatant } from '../.test-build/game/CombatRules.js';
import { BattleEngine } from '../.test-build/game/BattleEngine.js';
import { dungeonSystem } from '../.test-build/game/DungeonSystem.js';
import { townManager } from '../.test-build/game/TownManager.js';
import { worldCalamitySystem } from '../.test-build/game/WorldCalamitySystem.js';
import { isekaiEventManager } from '../.test-build/game/IsekaiEventManager.js';
import { SaveManager } from '../.test-build/game/SaveManager.js';
import { offerWeeklyDraft } from '../.test-build/ui/JourneyUI.js';
import { darklingSystem } from '../.test-build/game/DarklingSystem.js';
import { aiSystem } from '../.test-build/game/AISystem.js';
import { monsterRewards } from '../.test-build/game/Rules.js';

function fresh(mode = 'standard', count = 2) {
  const g = new GameState(); g.gameMode = mode;
  g.initGame(Array.from({ length: count }, (_, i) => ({ name: 'Hero ' + i, classKey: 'warrior', isAI: false })));
  g.world.rng = 321; return g;
}
const actor = (name = 'Hero') => ({ name, hp: 500, maxHp: 500, mp: 100, maxMp: 100, atk: 20, def: 10, mag: 25, spd: 10, luk: 1 });
function singleEvent(id) {
  const director = new FantasyEventManager();
  director.events = [director.events.find(e => e.id === id), director.events.find(e => e.id === 'quiet_camp')];
  return director;
}

test('time advances once per complete round regardless of party size; statuses tick once', () => {
  for (const size of [2, 3, 4]) {
    const game = fresh('standard', size); const player = game.players[0]; player.rustTurns = 3;
    const hour = game.world.hour;
    for (let i = 0; i < size - 1; i++) { game.endTurn(); assert.equal(game.world.hour, hour); }
    game.endTurn(); assert.equal(game.dayCounter, 2); assert.equal(game.world.hour, 14); assert.equal(player.rustTurns, 2);
  }
});

test('regional weather, forecast and rules RNG replay from the same seed', () => {
  const first = new WorldState(7), second = new WorldState(7);
  for (let day = 2; day < 30; day++) {
    first.advanceRound(day); second.advanceRound(day);
    assert.deepEqual(first.weather, second.weather); assert.equal(first.random(), second.random());
  }
});

test('scouting is read-only and shares encounter chances, habitat and prepared stats with battle', () => {
  const game = fresh(); const node = game.allNodes.find(n => n.type === 'red' && n.biome === 'snow');
  const rng = game.world.rng;
  const preview = getNodeEncounterPreview(node, game.activePlayer);
  assert.equal(game.world.rng, rng);
  assert.equal(preview.encounterChancePercent, encounterChance(node, game.world));
  assert.ok(preview.roster.every(m => m.realmId !== 'solaria'), 'snow must not fall back to a grassland roster');
  const selected = preview.roster[0];
  assert.strictEqual(prepareCombatant(selected, node, game.world, true), selected, 'battle does not apply weather twice');
  assert.ok(selected.element && selected.weaknessElement);
  game.world.hour = 2;
  assert.ok(getNodeEncounterPreview(node, game.activePlayer).encounterChancePercent > preview.encounterChancePercent);
});

test('sheltered services and defeated bosses do not promise random combat', () => {
  const game = fresh();
  for (const type of ['church', 'guild', 'fishing', 'dark_gate', 'shop_weapon', 'blue']) {
    const node = game.allNodes.find(n => n.type === type);
    assert.equal(getNodeEncounterPreview(node, game.activePlayer).encounterChancePercent, 0);
  }
  const boss = game.allNodes.find(n => n.type === 'boss'); game.world.defeatedBosses.push(boss.id);
  assert.equal(encounterChance(boss, game.world), 0);
});

test('weather changes real battle stats and elemental weakness changes actual damage', () => {
  const game = fresh(); const node = game.allNodes.find(n => n.biome === 'grass');
  game.world.weather.solaria = 'rain';
  const prepared = prepareCombatant(actor(), node, game.world);
  assert.equal(prepared.mag, 29); assert.equal(prepared.isWet, true);
  function damage(weak) {
    game.world.rng = 123;
    const a = { ...actor(), element: 'fire' }, d = { ...actor('Enemy'), weaknessElement: weak };
    const battle = new BattleEngine(a, d); return battle.resolveRound('magic', 'counter').damageToDefender;
  }
  assert.ok(damage('fire') > damage('water'));
});

test('magic costs MP, exhausted actors fall back and class skills cannot be repeated', () => {
  fresh(); const a = actor(), d = actor('Enemy'); const battle = new BattleEngine(a, d);
  battle.resolveRound('magic', 'defend'); assert.equal(a.mp, 90);
  a.mp = 0; assert.equal(battle.resolveRound('magic', 'defend').attackerAction, 'attack');
  a.mp = 100; battle.resolveRound('skill', 'defend');
  assert.equal(battle.resolveRound('skill', 'defend').attackerAction, 'attack');
});

test('events reject unaffordable choices without resolving or changing stats', () => {
  const game = fresh(); const p = game.activePlayer; const church = game.allNodes.find(n => n.type === 'church');
  const director = singleEvent('church_sanctuary'); game.world.random = () => 0;
  p.gold = 0; p.hp = 5;
  const event = director.getRandomEvent(church, p, game.world);
  event.choices[0].resolve(p, church); assert.equal(p.hp, 5); assert.equal(p.gold, 0);
  p.gold = 35; event.choices[0].resolve(p, church); assert.equal(p.hp, p.maxHp); assert.equal(p.gold, 0);
  p.hp = 5; event.choices[0].resolve(p, church); assert.equal(p.hp, 5, 'double click cannot repeat effects');
});

test('environmental events require the right weather and have separate per-player history', () => {
  const game = fresh(); const node = game.allNodes.find(n => n.type === 'empty' && n.realmId === 'solaria');
  const director = singleEvent('rain_rescue'); game.world.random = () => 0;
  game.world.weather.solaria = 'sunny'; assert.equal(director.getRandomEvent(node, game.players[0]).id, 'quiet_camp');
  game.world.weather.solaria = 'rain';
  const event = director.getRandomEvent(node, game.players[0]); assert.equal(event.id, 'rain_rescue');
  event.choices[0].resolve(game.players[0], node);
  assert.equal(director.getRandomEvent(node, game.players[0]).id, 'quiet_camp');
  assert.equal(director.getRandomEvent(node, game.players[1]).id, 'rain_rescue');
});

test('helping a traveler unlocks a later follow-up and permanent landmarks resolve once', () => {
  const game = fresh(); const node = game.allNodes.find(n => n.biome === 'grass' && n.type === 'empty');
  const director = new FantasyEventManager(); const p = game.activePlayer;
  director.events.find(e => e.id === 'grass_traveler').choices[0].resolve(p, node);
  const followup = director.events.find(e => e.id === 'grass_return');
  assert.equal(followup.condition({ player: p, node, world: game.world }), false);
  game.world.advanceRound(3); assert.equal(followup.condition({ player: p, node, world: game.world }), true);
  const landmark = singleEvent('landmark_grass'); game.world.random = () => 0;
  landmark.getRandomEvent(node, p).choices[0].resolve(p, node);
  game.world.advanceRound(15); assert.equal(landmark.getRandomEvent(node, p).id, 'quiet_camp');
});

test('dungeon chests are single-use, retreat is unpaid, and guardian completion gates descent', () => {
  const game = fresh(); const p = game.activePlayer;
  dungeonSystem.enterDungeon(p, game);
  const chest = game.allNodes.find(n => n.type === 'vault' && n.id >= 1000 && n.id < 1100);
  const before = p.gold; assert.ok(dungeonSystem.claimChest(p, chest.id) > 0);
  const after = p.gold; assert.equal(dungeonSystem.claimChest(p, chest.id), 0); assert.equal(p.gold, after);
  assert.equal(dungeonSystem.descendDeeper(p, game).success, false);
  dungeonSystem.exitDungeon(p, game); assert.equal(p.gold, after); assert.ok(after > before);
});

test('guardian floors pay once and each deeper floor actually strengthens enemies', () => {
  const game = fresh(); const p = game.activePlayer; dungeonSystem.enterDungeon(p, game);
  const boss = game.allNodes.find(n => n.type === 'boss' && n.id >= 1000 && n.id < 1100);
  const first = getNodeEncounterPreview(boss, p).featuredMonster;
  dungeonSystem.defeatGuardian(p, boss.id);
  assert.ok(dungeonSystem.claimFloor(p) > 0); assert.equal(dungeonSystem.claimFloor(p), 0);
  assert.equal(dungeonSystem.descendDeeper(p, game).success, true);
  const deeper = getNodeEncounterPreview(boss, p).featuredMonster;
  assert.ok(deeper.hp > first.hp); assert.ok(deeper.atk > first.atk);
  assert.equal(dungeonSystem.claimFloor(p), 0);
});

test('invasion reclamation repairs ownership and a multi-city crisis survives the first liberation', () => {
  const game = fresh(); const [old, next] = game.players;
  const towns = game.allNodes.filter(n => n.type === 'town').slice(0, 3);
  towns.forEach(n => { n.townData.ownerId = old.id; old.townDeeds.push(n.id); }); old.townsControlled = 3;
  worldCalamitySystem.activeCalamity = { id: 'test', type: 'monster_stampede', headline: 'Invasion', loreDescription: '', bannerIcon: '', affectedTownNames: towns.map(n => n.name), remainingTownIds: towns.map(n => n.id), bountyReward: 100 };
  const before = next.gold;
  townManager.liberateTown(towns[0], next, game.players);
  assert.equal(old.townDeeds.includes(towns[0].id), false); assert.equal(next.townsControlled, 1);
  assert.equal(towns[0].townData.ownerId, next.id); assert.ok(next.gold >= before + 100);
  assert.equal(worldCalamitySystem.activeCalamity.remainingTownIds.length, 2);
  townManager.liberateTown(towns[1], next, game.players); townManager.liberateTown(towns[2], next, game.players);
  assert.equal(worldCalamitySystem.activeCalamity, null); assert.equal(old.townsControlled, 0);
});

test('an active crisis cannot be overwritten by a later trigger', () => {
  const game = fresh(); const event = worldCalamitySystem.triggerApexDragonBoss(game.allNodes);
  game.world.threat.abyss = 100;
  assert.equal(worldCalamitySystem.checkCalamityTriggers(2, 1, game.allNodes, game.players), null);
  assert.strictEqual(worldCalamitySystem.activeCalamity, event);
});

test('quests validate target realm, rank, deadline and actual PvP target', () => {
  const game = fresh(); const p = game.activePlayer;
  const available = isekaiEventManager.getAvailableGuildQuests(p);
  assert.ok(available.every(q => q.rank === 'F'));
  const quest = available[0]; isekaiEventManager.acceptQuest(p, quest);
  const wrong = game.allNodes.find(n => n.realmId !== quest.targetRealm);
  isekaiEventManager.onGameAction(p, 'monster', { node: wrong }); assert.equal(p.activeGuildQuest.currentProgress, 0);
  const right = game.allNodes.find(n => n.realmId === quest.targetRealm);
  isekaiEventManager.onGameAction(p, 'monster', { node: right });
  assert.equal(isekaiEventManager.onGameAction(p, 'monster', { node: right }).completed, true);
  p.activeGuildQuest = { ...quest, targetType: 'boss', targetRealm: undefined, targetPlayerId: 2, targetCount: 1, currentProgress: 0 };
  assert.equal(isekaiEventManager.onGameAction(p, 'boss', { targetPlayerId: 3 }).completed, false);
  assert.equal(isekaiEventManager.onGameAction(p, 'boss', { targetPlayerId: 2 }).completed, true);
});

test('all modes use their own completion rules, including team failure and endless continuation', () => {
  const coop = fresh('coop_raid'); coop.players[0].gold = RULES.goldGoal * 2; coop.checkWinConditions(); assert.equal(coop.world.result, null);
  coop.dayCounter = coop.coopRaidDayLimit + 1; coop.checkWinConditions(); assert.equal(coop.world.result.teamVictory, false);
  const endless = fresh('endless_spire'); endless.dayCounter = 500; endless.checkWinConditions(); assert.equal(endless.world.result, null);
  const blitz = fresh('blitz'); blitz.players[0].gold = RULES.goldGoal * 2; blitz.checkWinConditions(); assert.equal(blitz.world.result, null);
  blitz.dayCounter = blitz.blitzDayLimit + 1; blitz.checkWinConditions(); assert.equal(blitz.world.result.winnerId, blitz.players[0].id);
});

test('weekly drafts are a decision once per player per week and never duplicate owned relics', () => {
  const game = fresh('roguelike_draft'); const p = game.activePlayer; p.isAI = true;
  offerWeeklyDraft(game); const first = [...p.relics]; assert.equal(first.length, 1);
  offerWeeklyDraft(game); assert.deepEqual(p.relics, first);
  game.weekCounter = 2; offerWeeklyDraft(game); assert.equal(new Set(p.relics).size, p.relics.length);
});

test('new rules snapshots preserve weather, objectives, event memory, expedition and RNG continuation', () => {
  const game = fresh('roguelike_draft'); const p = game.activePlayer;
  dungeonSystem.enterDungeon(p, game); dungeonSystem.recordStep(p, 1001);
  game.world.memory(p.id).flags.helped_grass = 1; game.world.weather.abyss = 'blood_moon';
  const snapshot = SaveManager.serializeGameState(game);
  const expected = game.world.random();
  const restored = new GameState(); const result = SaveManager.applySaveData(restored, snapshot, false);
  assert.equal(result.success, true); assert.equal(restored.world.random(), expected);
  assert.equal(restored.gameMode, 'roguelike_draft'); assert.equal(restored.world.weather.abyss, 'blood_moon');
  assert.equal(restored.world.expeditions[p.id].torch, 96);
  assert.equal(restored.world.memory(p.id).flags.helped_grass, 1);
});

test('new game resets campaign history, invasions, traps and expeditions', () => {
  const game = fresh(); game.world.defeatedBosses.push(46); game.placedTraps.push({ nodeId: 1, ownerId: 1, damage: 5 });
  dungeonSystem.enterDungeon(game.activePlayer, game); worldCalamitySystem.triggerApexDragonBoss(game.allNodes);
  game.initGame([{ name: 'New', classKey: 'warrior', isAI: false }]);
  assert.deepEqual(game.world.defeatedBosses, []); assert.deepEqual(game.placedTraps, []);
  assert.deepEqual(game.world.expeditions, {}); assert.equal(worldCalamitySystem.activeCalamity, null);
});

test('class growth has distinct strengths and promotions are reachable during a campaign', () => {
  const warrior = fresh().activePlayer; const atk = warrior.atk, mag = warrior.mag;
  warrior.gainXP(3200);
  assert.ok(warrior.level >= 10); assert.ok(warrior.atk - atk > warrior.mag - mag);
});

test('Darkling power is temporary, applied once, and retains earned progression on reversion', () => {
  const game = fresh(); const p = game.activePlayer;
  p.fieldSpells = ['zap']; const baseAtk = p.atk, baseHp = p.maxHp;
  darklingSystem.acceptPact(p, game.allNodes, 'destroyer');
  assert.equal(p.atk, baseAtk); assert.equal(p.getTotalStat('atk'), baseAtk * 2 + 20);
  p.gainXP(100); const earnedAtk = p.atk; p.revertDarkling();
  assert.equal(p.atk, earnedAtk); assert.ok(p.atk > baseAtk); assert.ok(p.maxHp > baseHp);
  assert.deepEqual(p.fieldSpells, ['zap']); assert.equal(p.darklingSpecialization, null);
  assert.equal(darklingSystem.canTransform(p, game.players, game.allNodes), false);
});

test('the endless spire allows another guardian fight and applies the next floor strength', () => {
  const game = fresh('endless_spire'); const p = game.activePlayer;
  const boss = game.allNodes.find(n => n.type === 'boss');
  const first = getNodeEncounterPreview(boss, p).featuredMonster;
  game.world.defeatedBosses.push(boss.id); game.world.spireFloor++;
  assert.equal(encounterChance(boss, game.world), 100);
  assert.ok(getNodeEncounterPreview(boss, p).featuredMonster.maxHp > first.maxHp);
});

test('promoted Tier-2 and Tier-3 classes execute distinct skills, upgrade passives, and survive save/load', () => {
  const game = fresh();
  const p = game.activePlayer;
  p.level = 5;
  assert.equal(p.promote('paladin'), true);
  assert.equal(p.classKey, 'paladin');
  const paladinSkill = p.skillName;

  const snap = SaveManager.serializeGameState(game);
  const restored = new GameState();
  SaveManager.applySaveData(restored, snap, false);
  assert.equal(restored.activePlayer.skillName, paladinSkill);

  p.level = 10;
  assert.equal(p.promote('crusader'), true);
  assert.equal(p.classKey, 'crusader');

  const crusaderCombatant = { ...actor('Crusader'), hp: 200, maxHp: 500, classKey: 'crusader', playerRef: p };
  const enemy = actor('Fiend');
  const battle = new BattleEngine(crusaderCombatant, enemy, 'grass');
  const res = battle.resolveRound('skill', 'defend');
  assert.ok(res.damageToDefender > 0);
  assert.ok(crusaderCombatant.hp > 200, 'Crusader skill heals the caster');
  assert.ok((crusaderCombatant.barrierHp || 0) > 0, 'Crusader skill grants a holy barrier');
});

test('AI players auto-promote at Level 5 and Level 10 and use pot_hp when injured', () => {
  const game = fresh();
  const ai = game.players[1];
  ai.isAI = true;
  ai.level = 5;
  const tier2Msg = aiSystem.autoPromoteIfEligible(ai);
  assert.ok(tier2Msg && ai.isPromoted && ai.promotionTier === 2);

  ai.level = 10;
  const tier3Msg = aiSystem.autoPromoteIfEligible(ai);
  assert.ok(tier3Msg && ai.promotionTier === 3);

  ai.hp = Math.floor(ai.maxHp * 0.25);
  const preRoll = aiSystem.choosePreRollAction(ai, game.players, game.allNodes);
  assert.equal(preRoll.type, 'item');
  assert.equal(preRoll.itemId, 'pot_hp');
});

test('Darkling calamities are limited to once per turn and summon invaders cleans town ownership', () => {
  const game = fresh();
  const darkling = game.players[0];
  const rival = game.players[1];
  const town = game.allNodes.find(n => n.type === 'town');
  town.townData.isOccupiedByMonster = false;
  town.townData.ownerId = rival.id;
  town.townData.monsterHp = 0;
  rival.townDeeds = [town.id];
  rival.townsControlled = 1;

  darklingSystem.acceptPact(darkling, game.allNodes, 'destroyer');
  const firstMsg = darklingSystem.castSummonInvaders(darkling, game.allNodes, game.players);
  assert.equal(town.townData.isOccupiedByMonster, true);
  assert.equal(town.townData.ownerId, null);
  assert.equal(town.townData.monsterHp, town.townData.monsterMaxHp);
  assert.deepEqual(rival.townDeeds, []);
  assert.equal(rival.townsControlled, 0);
  assert.equal(darklingSystem.calamityUsedThisTurn, true);

  const goldBefore = rival.gold;
  const secondMsg = darklingSystem.castGlobalPlague(darkling, game.players);
  assert.ok(firstMsg.length > 0 && secondMsg.includes('เพียงเทิร์นละ 1 ครั้ง'));
  assert.equal(rival.gold, goldBefore, 'second calamity in the same turn must be blocked');
});

test('dragon_heart grants +30 Max HP and Burn/Freeze immunity, and midas_touch boosts monster gold by 30%', () => {
  const game = fresh();
  const p = game.activePlayer;
  const baseMaxHp = p.maxHp;
  p.freezeTurns = 2;
  p.grantRelic('dragon_heart');
  assert.equal(p.maxHp, baseMaxHp + 30);
  assert.equal(p.freezeTurns, 0);

  const baseReward = monsterRewards(2, game.world, game.allNodes[0], false, p);
  p.grantRelic('midas_touch');
  const boostedReward = monsterRewards(2, game.world, game.allNodes[0], false, p);
  assert.equal(boostedReward.gold, Math.round(baseReward.gold * 1.3));
});
