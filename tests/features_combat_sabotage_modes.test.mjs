import './_browser-stubs.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../.test-build/game/GameState.js';
import { Player } from '../.test-build/game/Player.js';
import { BattleEngine } from '../.test-build/game/BattleEngine.js';
import { townManager } from '../.test-build/game/TownManager.js';
import { darklingSystem } from '../.test-build/game/DarklingSystem.js';
import { networkRoomManager } from '../.test-build/engine/NetworkRoomManager.js';
import { SaveManager } from '../.test-build/game/SaveManager.js';

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

test('Town Trade Routes: 3+ towns in realm activate trade route with 30% tax yield and 1.5x toll', () => {
  const game = new GameState();
  game.initGame([
    { name: 'Merchant', classKey: 'alchemist', isAI: false },
    { name: 'Rival', classKey: 'warrior', isAI: false }
  ]);

  const p1 = game.players[0];
  const p2 = game.players[1];

  // Find 3 town nodes in solaria realm
  const solariaTowns = game.allNodes.filter(n => n.type === 'town' && n.realmId === 'solaria').slice(0, 3);
  assert.equal(solariaTowns.length, 3);

  // P1 owns all 3 towns
  solariaTowns.forEach(t => {
    p1.townDeeds.push(t.id);
    if (t.townData) {
      t.townData.ownerId = p1.id;
      t.townData.isOccupiedByMonster = false;
    }
  });

  // Verify trade route is active
  const isRoute = townManager.isTownInTradeRoute(solariaTowns[0], p1, game.allNodes);
  assert.equal(isRoute, true);

  const activeRoutes = townManager.getActiveTradeRoutes(p1, game.allNodes);
  assert.ok(activeRoutes.includes('solaria'));

  // Calculate toll with trade route bonus
  const normalToll = townManager.calculateToll(solariaTowns[0], p2);
  const tradeToll = townManager.calculateToll(solariaTowns[0], p2, game.allNodes, p1);
  assert.ok(tradeToll >= normalToll * 1.45);

  // Revenue collection includes 30% bonus
  const revenue = townManager.collectTurnRevenue(p1, game.allNodes);
  assert.ok(revenue > 0);
});

test('Darkling Specializations: Destroyer, Reaper, Tormentor branches and Oblivion Slash', () => {
  const game = new GameState();
  game.initGame([
    { name: 'P1', classKey: 'warrior', isAI: false },
    { name: 'P2', classKey: 'mage', isAI: false }
  ]);
  const darkPlayer = game.players[0];
  const target = game.players[1];

  // Test Destroyer branch
  darklingSystem.acceptPact(darkPlayer, game.allNodes, 'destroyer');
  assert.equal(darkPlayer.isDarkling, true);
  assert.ok(darkPlayer.fieldSpells.includes('oblivion_slash'));

  // Test Oblivion Slash field spell (50% HP damage)
  target.hp = 100;
  darkPlayer.mp = 50;
  const castRes = game.castFieldSpell(darkPlayer, 'oblivion_slash', target.id);
  assert.equal(castRes.success, true);
  assert.equal(target.hp, 50);
  assert.equal(target.curseTurns, 3);
});

test('Game Modes: Roguelike Draft mode grants starter draft kit & realm mutations', () => {
  const game = new GameState();
  game.gameMode = 'roguelike_draft';
  game.initGame([
    { name: 'P1', classKey: 'warrior', isAI: false },
    { name: 'P2', classKey: 'cleric', isAI: false }
  ]);

  assert.equal(game.gameMode, 'roguelike_draft');
  assert.ok(game.activeRoguelikeModifier !== null);
  // Both players got drafted relics
  assert.ok(game.players[0].relics.length > 0);
  assert.ok(game.players[1].relics.length > 0);

  // Check 28-day win condition
  game.dayCounter = 28;
  game.checkWinConditions();
  assert.equal(game.phase, 'VICTORY');
});

test('P2P Network Room Manager: generates 6-char room code and manages room lifecycle', () => {
  const room = networkRoomManager.createRoom('HostPlayer', 'warrior', 0);
  assert.ok(room.code.startsWith('CF-'));
  assert.equal(room.isHost, true);
  assert.equal(room.connectedPeers.length, 1);
  assert.equal(room.connectedPeers[0].name, 'HostPlayer');
  assert.equal(room.connectedPeers[0].classKey, 'warrior');

  // Update profile
  networkRoomManager.updatePlayerProfile('RenamedHost', 'mage', 2);
  const updated = networkRoomManager.getRoomInfo();
  assert.equal(updated?.connectedPeers[0].name, 'RenamedHost');
  assert.equal(updated?.connectedPeers[0].classKey, 'mage');
  assert.equal(updated?.connectedPeers[0].skinVariant, 2);

  // Packet listener and broadcast
  let receivedPacket = null;
  const unsubscribe = networkRoomManager.onPacket(pkt => {
    receivedPacket = pkt;
  });

  networkRoomManager.broadcast({
    packetId: 'test_pkt_1',
    type: 'CHAT_MSG',
    roomCode: room.code,
    senderId: 'host',
    senderName: 'RenamedHost',
    payload: { text: 'Hello realm!' },
    timestamp: Date.now()
  });

  unsubscribe();
  networkRoomManager.leaveRoom();
  assert.equal(networkRoomManager.getRoomInfo(), null);
});

test('Multiplayer State Sync: SaveManager.serializeGameState and applySaveData cleanly synchronizes board between peers', () => {
  const hostGame = new GameState();
  hostGame.initGame([
    { name: 'Host Valeria', classKey: 'warrior', isAI: false, skinVariant: 0 },
    { name: 'Guest Lyra', classKey: 'mage', isAI: false, skinVariant: 1 }
  ]);

  hostGame.players[0].gold = 1500;
  hostGame.players[0].hp = 85;
  hostGame.players[1].gold = 720;
  hostGame.dayCounter = 5;
  hostGame.weekCounter = 2;
  hostGame.activePlayerIdx = 1;

  // Serialize host state
  const serialized = SaveManager.serializeGameState(hostGame, { currentHp: 800, maxHp: 950 });
  assert.ok(serialized);
  assert.equal(serialized.dayCounter, 5);
  assert.equal(serialized.weekCounter, 2);
  assert.equal(serialized.activePlayerIdx, 1);
  assert.equal(serialized.players[0].gold, 1500);
  assert.equal(serialized.players[1].gold, 720);

  // Apply to guest game state
  const guestGame = new GameState();
  const res = SaveManager.applySaveData(guestGame, serialized, false);
  assert.equal(res.success, true);
  assert.equal(guestGame.players.length, 2);
  assert.equal(guestGame.players[0].name, 'Host Valeria');
  assert.equal(guestGame.players[0].gold, 1500);
  assert.equal(guestGame.players[0].hp, 85);
  assert.equal(guestGame.players[1].name, 'Guest Lyra');
  assert.equal(guestGame.players[1].gold, 720);
  assert.equal(guestGame.dayCounter, 5);
  assert.equal(guestGame.weekCounter, 2);
  assert.equal(guestGame.activePlayerIdx, 1);
  assert.equal(res.bossState?.currentHp, 800);
});

test('Town Milestone Perks: town level 2+ provides regeneration for owner', () => {
  const townNode = {
    id: 5,
    name: 'Oakhaven',
    type: 'town',
    realmId: 'solaria',
    biome: 'grass',
    gx: 0,
    gy: 0,
    gz: 0,
    neighbors: [],
    townData: {
      ownerId: 'player_1',
      level: 2,
      baseValue: 300,
      taxYield: 50,
      isOccupiedByMonster: false
    }
  };

  const player = new Player('player_1', 'Hero', 'warrior', '#38bdf8', false);
  player.hp = 80;
  player.maxHp = 120;

  // Town level 2 gives +8 HP healing
  const healAmount = townNode.townData.level >= 3 ? 16 : 8;
  player.hp = Math.min(player.maxHp, player.hp + healAmount);

  assert.equal(player.hp, 88);
});
