import './_browser-stubs.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Player } from '../.test-build/game/Player.js';
import { WorldState, bindWorld } from '../.test-build/game/WorldState.js';
import { createPlayerCombatant, prepareCombatant } from '../.test-build/game/CombatRules.js';
import { BattleEngine } from '../.test-build/game/BattleEngine.js';
import { physicalDamage, strikeDamage, magicDamage, previewCombatDamage } from '../.test-build/game/CombatDamage.js';

const node = { id: 39, realmId: 'frostpeak', biome: 'snow', type: 'town' };
function equippedCleric() {
  const p = new Player(0,'Valeria','cleric');
  Object.assign(p,{atk:12,def:19,mag:22,spd:10,luk:10,hp:146,maxHp:146,mp:91,maxMp:91,level:4});
  p.equipment.weapon={id:'blade',type:'weapon',atk:65,mag:8,spd:15,luk:15};
  p.equipment.shield={id:'shield',type:'shield',def:24};
  return p;
}
test('scouting and battle snapshots include the screenshot equipment bonuses exactly once', () => {
  const p=equippedCleric(), world=new WorldState(1);world.weather.frostpeak='sunny';
  const snapshot=createPlayerCombatant(p);
  for(const [stat,expected] of Object.entries({atk:77,def:43,mag:30,spd:25,luk:25})) {
    assert.equal(snapshot[stat],expected);assert.equal(snapshot[stat],p.getTotalStat(stat));
  }
  const battle=prepareCombatant(snapshot,node,world);
  assert.equal(battle.atk,77);assert.equal(battle.def,43);
  assert.equal(p.atk,12,'preview never overwrites base stats');
  assert.equal(p.equipment.weapon.atk,65);
});
test('field bonuses are applied once and are distinct from the equipment totals', () => {
  const p=equippedCleric(),world=new WorldState(1);world.weather.frostpeak='snow';
  const total=createPlayerCombatant(p),battle=prepareCombatant(total,node,world);
  assert.equal(total.def,43);assert.equal(battle.def,47);
  assert.equal(total.spd,25);assert.equal(battle.spd,23);
  assert.deepEqual(prepareCombatant(battle,node,world),battle);
  p.rustTurns=2;
  assert.equal(createPlayerCombatant(p).atk,p.getTotalStat('atk'));
  assert.ok(createPlayerCombatant(p).atk<77);
});
test('opening projection and real resolution share equipment, formation and damage formulas', () => {
  const world=new WorldState(1);world.random=()=>.5;bindWorld(world);
  const hero={name:'Cleric',hp:1000,maxHp:1000,mp:100,maxMp:100,atk:77,def:43,mag:30,spd:15,luk:0,classKey:'cleric'};
  const enemy={name:'Yeti',hp:1000,maxHp:1000,mp:30,maxMp:30,atk:25,def:14,mag:18,spd:15,luk:0};
  for(const [action,variation,formula] of [['attack',0,physicalDamage],['strike',6,strikeDamage],['magic',3,magicDamage]]) {
    const battle=new BattleEngine({...hero},{...enemy});
    const expected=formula(battle.attacker,battle.defender,variation);
    const result=battle.resolveRound(action,action==='attack'?'counter':'defend');
    assert.equal(result.damageToDefender,action==='attack'?Math.round(expected*1.25):expected,action);
  }
  const preview=previewCombatDamage(hero,enemy);
  assert.ok(preview.physical>100,'T5 weapon is reflected in the estimate');
  assert.ok(preview.strike>180);
});
