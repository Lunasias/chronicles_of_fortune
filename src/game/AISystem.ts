import { Player } from './Player';
import { BoardNode } from './BoardMap';
import { AttackerAction, DefenderAction } from './BattleEngine';

export class AISystem {
  // Select best route when choosing at an intersection
  chooseRoute(candidateNodeIds: number[], aiPlayer: Player, allNodes: BoardNode[], allPlayers: Player[]): number {
    if (candidateNodeIds.length === 1) return candidateNodeIds[0];

    // If Darkling: seek closest opponent!
    if (aiPlayer.isDarkling) {
      const opponents = allPlayers.filter(p => p.id !== aiPlayer.id);
      for (const id of candidateNodeIds) {
        if (opponents.some(op => op.nodeId === id)) return id;
      }
    }

    // Score each candidate
    let bestId = candidateNodeIds[0];
    let bestScore = -999;

    candidateNodeIds.forEach(id => {
      const node = allNodes.find(n => n.id === id);
      if (!node) return;

      let score = 0;
      if (node.type === 'town') {
        if (node.townData?.isOccupiedByMonster) score += 50; // Town to liberate!
        else if (node.townData?.ownerId === aiPlayer.id) score += 30; // Owned town to rest/invest
        else score -= 15; // Rival's town with toll
      } else if (node.type === 'blue') {
        score += 25;
      } else if (node.type === 'church') {
        if (aiPlayer.hp < aiPlayer.maxHp * 0.5) score += 60;
        else score += 10;
      } else if (node.type === 'shop_item' || node.type === 'shop_weapon') {
        score += 20;
      } else if (node.type === 'red') {
        score -= 30;
      } else if (node.type === 'dark_gate') {
        score += aiPlayer.isDarkling ? 0 : 40;
      }

      // Add a bit of unpredictability
      score += Math.random() * 10;

      if (score > bestScore) {
        bestScore = score;
        bestId = id;
      }
    });

    return bestId;
  }

  // Combat Attacker Decision
  chooseAttackerAction(ai: Player, opponent: { hp: number; maxHp: number; def: number; mag: number }): AttackerAction {
    const roll = Math.random();

    // If AI has lots of MP and good MAG
    if (ai.mp >= 16 && ai.mag > 10 && roll < 0.35) {
      return 'magic';
    }

    // Class skill usage
    if (ai.mp >= 12 && roll < 0.3) {
      return 'skill';
    }

    // Risky Strike (40% if opponent has high defense to pierce it)
    if (opponent.def > 12 && roll < 0.45) {
      return 'strike';
    } else if (roll < 0.3) {
      return 'strike';
    }

    // Default physical attack
    return 'attack';
  }

  // Combat Defender Decision
  chooseDefenderAction(ai: Player, attacker: { atk: number; mag: number; classKey?: string }): DefenderAction {
    const roll = Math.random();

    // If low HP, evaluate surrender to avoid dying or defend
    if (ai.hp < 15 && roll < 0.25) {
      return 'give_up';
    }

    // If attacker is a pure mage
    if (attacker.classKey === 'magician' || attacker.mag > attacker.atk) {
      if (roll < 0.5) return 'magic_guard';
    }

    // If attacker is Warrior or likely to Strike -> Counter!
    if (attacker.classKey === 'warrior' || roll < 0.35) {
      return 'counter';
    }

    // Magic Guard against spells
    if (roll < 0.25) {
      return 'magic_guard';
    }

    // Standard Defend
    return 'defend';
  }

  // Choose PvP Spoils of War
  chooseSpoilsOption(ai: Player, victim: Player): 'gold' | 'town' | 'prank' {
    if (victim.townDeeds.length > 0) {
      return 'town';
    }
    if (victim.gold >= 100) {
      return 'gold';
    }
    return 'prank';
  }
}

export const aiSystem = new AISystem();
