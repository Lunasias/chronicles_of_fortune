// Deterministic headless integration model. Uses production roads, AI, combat,
// rewards, XP, town income and victory rules; shops/events use the policies below.
import '../tests/_browser-stubs.mjs';
import fs from 'node:fs';
import { GameState } from '../.test-build/game/GameState.js';
import { WorldState, bindWorld } from '../.test-build/game/WorldState.js';
import { configureMatch } from '../.test-build/game/MatchConfig.js';
import { movementRoutes } from '../.test-build/game/Movement.js';
import { aiSystem } from '../.test-build/game/AISystem.js';
import { BattleEngine } from '../.test-build/game/BattleEngine.js';
import { getNodeEncounterPreview } from '../.test-build/game/MonsterDatabase.js';
import { createPlayerCombatant, prepareCombatant } from '../.test-build/game/CombatRules.js';
import { monsterRewards } from '../.test-build/game/Rules.js';
import { townManager } from '../.test-build/game/TownManager.js';
import { SHOP_CATALOG } from '../.test-build/ui/ShopUI.js';

const classes = ['warrior', 'magician', 'thief', 'cleric', 'spellblade'];
const count = Number(process.env.BALANCE_MATCHES || 100);
const report = { model: 'production rules with instant road movement, simplified shop/event policy; no PvP, dungeons or Darkling', seeds: count, modes: {}, classResults: {}, stalledBattles: 0, invalidStates: 0 };
for (const key of classes) report.classResults[key] = { played: 0, wins: 0, deaths: 0, kills: 0, totalWorth: 0, levels: 0 };
function shop(p, node) {
  if (!node.type.startsWith('shop_')) return;
  const items = SHOP_CATALOG.filter(item => item.cost <= p.gold - 60 && (node.type === 'shop_weapon' ? ['weapon', 'armor', 'shield'].includes(item.type) : false));
  const score = item => (item.atk || 0) + (item.def || 0) + (item.mag || 0) + (item.spd || 0);
  const item = items.sort((a, b) => score(b) - score(a))[0];
  if (item && score(item) > score(p.equipment[item.type] || {})) { p.gold -= item.cost; p.equipment[item.type] = { ...item }; }
}
function fight(game, p, node, monster, summary) {
  const hero = prepareCombatant(createPlayerCombatant(p), node, game.world);
  const enemy = prepareCombatant({ ...monster }, node, game.world, true);
  const battle = new BattleEngine(hero, enemy, node.biome);
  let rounds = 0;
  while (hero.hp > 0 && enemy.hp > 0 && rounds++ < 100) {
    const a = battle.attacker, d = battle.defender;
    const attack = a.playerRef ? aiSystem.chooseAttackerAction(p, d, game.aiDifficulty, !!a.skillUsed) : a.mp >= 10 && a.mag > a.atk ? 'magic' : game.world.random() < .2 ? 'strike' : 'attack';
    const defend = d.playerRef ? aiSystem.chooseDefenderAction(p, a, game.aiDifficulty) : game.world.pick(['defend', 'defend', 'counter', 'magic_guard']);
    battle.resolveRound(attack, defend); p.hp = hero.hp; p.mp = hero.mp;
    if (hero.hp > 0 && enemy.hp > 0) battle.swapTurns();
  }
  if (rounds >= 100) report.stalledBattles++;
  if (hero.hp <= 0 || rounds >= 100) {
    summary.deaths++; p.gold = Math.floor(p.gold * .9); p.hp = Math.ceil(p.maxHp * .5); p.nodeId = 0; return;
  }
  summary.kills++; p.matchStats.monstersKilled++;
  if (node.townData?.isOccupiedByMonster) townManager.liberateTown(node, p, game.players);
  else { const reward = monsterRewards(monster.tier || 1, game.world, node, node.type === 'boss', p); p.gold += reward.gold; p.matchStats.goldEarnedTotal += reward.gold; p.gainXP(reward.xp); }
}
for (let seed = 1; seed <= count; seed++) {
  const quick = seed % 2 === 1, days = quick ? 8 : 42, mode = quick ? 'quick8' : 'standard42';
  const game = new GameState();
  game.gameMode = quick ? 'blitz' : 'standard';
  game.initGame([0, 1].map(seat => ({ name: `Bot${seat}`, classKey: classes[(Math.floor((seed - 1) / 2) + seat * 2) % classes.length], isAI: true })));
  game.world = new WorldState(seed * 7919); game.world.mode = quick ? 'blitz' : 'standard'; bindWorld(game.world);
  game.aiDifficulty = 'tactical'; game.allowDarkling = false;
  configureMatch(game, { days, startingGold: quick ? 500 : 300, startingLevel: quick ? 2 : 1, rewardRate: quick ? 1.5 : 1 });
  const summary = game.players.map(() => ({ deaths: 0, kills: 0 }));
  let turns = 0;
  while (!game.world.result && turns < days * game.players.length + 4) {
    turns++; const p = game.activePlayer, stats = summary[game.activePlayerIdx];
    const roll = game.rollMovementDice(), routes = movementRoutes(game.allNodes, p.nodeId, roll, false);
    const ids = [...routes.keys()].filter(id => id !== p.nodeId);
    if (ids.length) {
      const target = aiSystem.chooseRoute(ids, p, game.allNodes, game.players, game.aiDifficulty), node = game.allNodes.find(n => n.id === target);
      Object.assign(p, { prevNodeId: p.nodeId, nodeId: node.id, gridX: node.gx, gridY: node.gy, gridZ: node.gz });
      const preview = getNodeEncounterPreview(node, p);
      if (preview.featuredMonster && game.world.random() * 100 < preview.encounterChancePercent) fight(game, p, node, preview.featuredMonster, stats);
      else if (node.type === 'church' || node.type === 'tavern') { p.gold = Math.max(0, p.gold - 30); p.hp = p.maxHp; p.mp = p.maxMp; }
      else if (node.type === 'blue') p.gold += 40 + Math.floor(game.world.random() * 80);
      else if (node.townData?.ownerId === p.id && p.gold > 200 * node.townData.level + 100 && game.dayCounter < days - 3) townManager.investInTown(node, p);
      shop(p, node);
    }
    game.phase = 'TILE_EVENT'; game.endTurn();
    if (game.phase === 'WEEKLY_REPORT') game.startTurn();
    if (game.players.some(p => !Number.isFinite(p.gold) || p.gold < 0 || !Number.isFinite(p.hp))) report.invalidStates++;
  }
  const result = report.modes[mode] ??= { matches: 0, finished: 0, turns: 0, avgFinalWorth: 0, avgLevel: 0 };
  result.matches++; result.finished += !!game.world.result; result.turns += turns;
  game.players.forEach((p, seat) => {
    const row = report.classResults[p.originalClassKey]; row.played++; row.wins += game.world.result?.winnerId === p.id ? 1 : 0;
    row.deaths += summary[seat].deaths; row.kills += summary[seat].kills; row.totalWorth += p.getNetWorth(game.allNodes); row.levels += p.level;
    result.avgFinalWorth += p.getNetWorth(game.allNodes); result.avgLevel += p.level;
  });
}
for (const row of Object.values(report.classResults)) { row.winRate = +(row.wins / row.played).toFixed(3); row.avgWorth = Math.round(row.totalWorth / row.played); row.avgLevel = +(row.levels / row.played).toFixed(2); }
for (const row of Object.values(report.modes)) { row.avgTurns = +(row.turns / row.matches).toFixed(1); row.avgFinalWorth = Math.round(row.avgFinalWorth / row.matches / 2); row.avgLevel = +(row.avgLevel / row.matches / 2).toFixed(2); }
fs.mkdirSync('docs/quality-v3', { recursive: true }); fs.writeFileSync('docs/quality-v3/balance-report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.invalidStates || report.stalledBattles || Object.values(report.modes).some(m => m.finished !== m.matches)) process.exitCode = 1;
