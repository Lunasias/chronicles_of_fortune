import './_browser-stubs.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../.test-build/game/GameState.js';
import { Player } from '../.test-build/game/Player.js';
import { BattleEngine } from '../.test-build/game/BattleEngine.js';

test('Combat Depth: Shatter reaction deals critical bonus damage and clears freeze', () => {
  const hero = {
    name: 'Hero',
    hp: 120,
    maxHp: 120,
    mp: 50,
    maxMp: 50,
    atk: 30,
    def: 12,
    mag: 15,
    spd: 12,
    luk: 10
  };
  const monster = {
    name: 'Frozen Beast',
    hp: 150,
    maxHp: 150,
    mp: 20,
    maxMp: 20,
    atk: 20,
    def: 10,
    mag: 5,
    spd: 8,
    luk: 5,
    freezeTurns: 1
  };

  const engine = new BattleEngine(hero, monster, true);
  const result = engine.resolveRound('strike', 'defend');

  assert.equal(result.isShatter, true);
  assert.equal(monster.freezeTurns, 0);
  assert.ok(result.narration.includes('SHATTER'));
  assert.ok(result.damageToDefender > 30);
});

test('Combat Depth: Chain Shock reaction deals 75% bonus damage on wet or shocked enemy', () => {
  const hero = {
    name: 'Mage',
    hp: 90,
    maxHp: 90,
    mp: 60,
    maxMp: 60,
    atk: 10,
    def: 8,
    mag: 35,
    spd: 14,
    luk: 10
  };
  const monster = {
    name: 'Wet Golem',
    hp: 180,
    maxHp: 180,
    mp: 10,
    maxMp: 10,
    atk: 15,
    def: 12,
    mag: 5,
    spd: 5,
    luk: 5,
    isWet: true
  };

  const engine = new BattleEngine(hero, monster, true);
  const result = engine.resolveRound('magic', 'defend');

  assert.equal(result.isChainShock, true);
  assert.ok(result.narration.includes('CHAIN SHOCK'));
});

test('Combat Depth: Knockback pushes defender into tactical grid trap hazard', () => {
  const hero = {
    name: 'Warrior',
    hp: 150,
    maxHp: 150,
    mp: 20,
    maxMp: 20,
    atk: 35,
    def: 15,
    mag: 5,
    spd: 10,
    luk: 10,
    gridPos: 'mid'
  };
  const monster = {
    name: 'Goblin Scout',
    hp: 100,
    maxHp: 100,
    mp: 10,
    maxMp: 10,
    atk: 15,
    def: 8,
    mag: 5,
    spd: 6,
    luk: 5,
    gridPos: 'mid'
  };

  const engine = new BattleEngine(hero, monster, true);
  engine.enemyHazards.back = 'spike_trap';

  const result = engine.resolveRound('strike', 'defend');
  assert.equal(monster.gridPos, 'back');
  assert.equal(result.knockbackRow, 'back');
  assert.equal(result.hazardTriggered, 'spike_trap');
  assert.ok(result.narration.includes('กับดักหนามเหล็ก'));
});

test('Board Sabotage: Field spells (Sleepy, Squid Ink, Downer, Banish, Bounty)', () => {
  const game = new GameState();
  game.initGame([
    { name: 'Caster', classKey: 'magician', isAI: false },
    { name: 'Target', classKey: 'warrior', isAI: true }
  ]);
  const caster = game.players[0];
  const target = game.players[1];
  target.nodeId = 15;
  target.gold = 500;
  caster.mp = 100;

  // 1. Sleepy Slumber
  const sleepRes = game.castFieldSpell(caster, 'sleepy', target.id);
  assert.equal(sleepRes.success, true);
  assert.equal(target.sleepTurns, 1);

  // 2. Squid Ink
  const inkRes = game.castFieldSpell(caster, 'squid_ink', target.id);
  assert.equal(inkRes.success, true);
  assert.equal(target.squidInkTurns, 1);

  // 3. Downer Curse (-25% stats)
  const baseAtk = target.getTotalStat('atk');
  const downerRes = game.castFieldSpell(caster, 'downer', target.id);
  assert.equal(downerRes.success, true);
  assert.equal(target.downerTurns, 3);
  const debuffedAtk = target.getTotalStat('atk');
  assert.ok(debuffedAtk < baseAtk, 'Downer curse must reduce total stat');

  // 4. Banish (warps target far away from current node)
  const banishRes = game.castFieldSpell(caster, 'banish', target.id);
  assert.equal(banishRes.success, true);
  assert.notEqual(target.nodeId, 15);

  // 5. Bounty Hunt (places gold bounty)
  const bountyRes = game.castFieldSpell(caster, 'bounty_hunt', target.id);
  assert.equal(bountyRes.success, true);
  assert.equal(target.bountyReward, 350);
});

test('Companions: Bond levels up and triggers Duo EX Burst', () => {
  const player = new Player(1, 'Hero', 'warrior', false);
  player.companion = {
    id: 'companion_slime',
    name: 'Slime Princess',
    avatar: '👑',
    skillName: 'Slime Splash',
    skillDesc: 'Splashes slime',
    modelId: 'slime_princess',
    color: '#06b6d4',
    personality: 'cheerful',
    bondLevel: 2,
    bondExp: 50
  };

  // Gain bond EXP to level up
  const res = player.gainCompanionBond(20);
  assert.equal(res?.leveledUp, true);
  assert.equal(player.companion.bondLevel, 3);

  // In battle, level >= 3 allows Duo EX Burst
  const heroCombatant = {
    name: player.displayName,
    hp: 100,
    maxHp: 100,
    mp: 50,
    maxMp: 50,
    atk: 30,
    def: 15,
    mag: 15,
    spd: 12,
    luk: 10,
    playerRef: player
  };
  const monster = {
    name: 'Dark Knight',
    hp: 200,
    maxHp: 200,
    mp: 20,
    maxMp: 20,
    atk: 25,
    def: 15,
    mag: 10,
    spd: 8,
    luk: 5
  };

  const engine = new BattleEngine(heroCombatant, monster, true);
  const burstResult = engine.resolveRound('burst', 'defend');
  assert.equal(burstResult.isDuoBurst, true);
  assert.ok(burstResult.narration.includes('DUO EX'));
});

test('Game Modes: Co-op Demon Lord Raid concludes when boss nodes are defeated or day limit reached', () => {
  const game = new GameState();
  game.gameMode = 'coop_raid';
  game.initGame([
    { name: 'P1', classKey: 'warrior', isAI: false },
    { name: 'P2', classKey: 'cleric', isAI: false }
  ]);

  assert.equal(game.gameMode, 'coop_raid');

  // Liberate all boss nodes
  game.allNodes.filter(n => n.type === 'boss').forEach(b => {
    if (b.townData) {
      b.townData.isOccupiedByMonster = false;
    }
  });

  game.checkWinConditions();
  assert.equal(game.phase, 'VICTORY');
});
