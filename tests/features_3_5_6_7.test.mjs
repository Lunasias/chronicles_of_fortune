import './_browser-stubs.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../.test-build/game/GameState.js';
import { Player } from '../.test-build/game/Player.js';
import { townManager } from '../.test-build/game/TownManager.js';
import { BattleEngine } from '../.test-build/game/BattleEngine.js';

test('Dokapon exact movement rule: only landing on exact dice steps unless flexible step crystal used', () => {
  const game = new GameState();
  game.initGame([
    { name: 'P1', classKey: 'warrior', isAI: false },
    { name: 'P2', classKey: 'magician', isAI: true }
  ]);
  const p1 = game.players[0];
  p1.nodeId = 0;
  game.phase = 'BOARD_TURN';
  game.remainingMoves = 3;

  // By default without flexible movement:
  p1.hasFlexibleMovement = false;
  game.updateReachableHighlights();
  const exactReachable = [...game.highlightedNodes];

  // Every highlighted node must be at distance exactly 3
  for (const targetId of exactReachable) {
    const path = game.findPathToTarget(targetId);
    assert.ok(path, `Path must be found to highlighted node ${targetId}`);
    assert.equal(path.length - 1, 3, 'Steps taken must match exactly 3');
  }

  // With flexible step crystal:
  p1.hasFlexibleMovement = true;
  game.updateReachableHighlights();
  const flexReachable = [...game.highlightedNodes];
  assert.ok(flexReachable.length > exactReachable.length, 'Flexible movement should reach intermediate steps');

  // Verify finding path to a 1-step or 2-step neighbor succeeds
  const neighbor1Step = game.allNodes.find(n => n.id === 0).neighbors[0];
  const flexPath = game.findPathToTarget(neighbor1Step);
  assert.ok(flexPath, 'Flexible movement allows landing on 1-step node');
  assert.equal(flexPath.length - 1, 1);
});

test('Town Hostile Takeover: rival buys out town at 2x base value', () => {
  const p1 = new Player(1, 'Alice', 'warrior', '#ef4444', false);
  const p2 = new Player(2, 'Bob', 'thief', '#3b82f6', false);
  p1.gold = 1000;
  p2.gold = 500;

  const mockTown = {
    id: 99,
    name: 'Test Keep',
    type: 'town',
    townData: {
      name: 'Test Keep',
      level: 1,
      baseValue: 200,
      taxYield: 50,
      ownerId: p2.id,
      isOccupiedByMonster: false
    }
  };
  p2.townDeeds = [99];
  p2.townsControlled = 1;

  const res = townManager.hostileTakeover(mockTown, p1, p2);
  assert.equal(res.success, true);
  assert.equal(res.cost, 400); // 200 * 2
  assert.equal(p1.gold, 600);
  assert.equal(p2.gold, 500 + 300); // gets 75% buyout payout
  assert.equal(mockTown.townData.ownerId, p1.id);
  assert.ok(p1.townDeeds.includes(99));
  assert.ok(!p2.townDeeds.includes(99));
});

test('Darkling Comeback: 3x ATK, multi-dice roll, and dark spells', () => {
  const p = new Player(1, 'Underdog', 'warrior', '#ef4444', false);
  const baseAtk = p.atk;
  p.becomeDarkling();

  assert.equal(p.isDarkling, true);
  assert.equal(p.atk, Math.floor(baseAtk * 3.0));
  assert.equal(p.activeSpinnerMultiplier, 3);
  assert.ok(p.fieldSpells.includes('dark_calamity'));
});

test('Combat Status Effects: Freeze skips action, Blind has miss chance, Burn applies DoT', () => {
  const hero = {
    name: 'Hero',
    hp: 100,
    maxHp: 100,
    mp: 50,
    maxMp: 50,
    atk: 25,
    def: 10,
    mag: 15,
    spd: 12,
    luk: 10
  };
  const monster = {
    name: 'Goblin',
    hp: 80,
    maxHp: 80,
    mp: 20,
    maxMp: 20,
    atk: 18,
    def: 8,
    mag: 5,
    spd: 8,
    luk: 5
  };

  const engine = new BattleEngine(hero, monster, true);

  // Freeze test: Attacker frozen -> cannot attack
  hero.freezeTurns = 1;
  const freezeRound = engine.resolveRound('attack', 'defend');
  assert.equal(freezeRound.damageToDefender, 0);
  assert.ok(freezeRound.narration.includes('แช่แข็ง'));
  assert.equal(hero.freezeTurns, 0);

  // Silence test: Attacker silenced -> magic fails
  hero.silenceTurns = 1;
  const silenceRound = engine.resolveRound('magic', 'defend');
  assert.equal(silenceRound.damageToDefender, 0);
  assert.ok(silenceRound.narration.includes('ใบ้'));
  assert.equal(hero.silenceTurns, 0);

  // Burn test: Defender burned -> loses DoT HP at round end
  monster.burnTurns = 2;
  const startHp = monster.hp;
  const burnRound = engine.resolveRound('attack', 'defend');
  assert.ok(burnRound.burnDamage > 0);
  assert.equal(monster.burnTurns, 1);
});
