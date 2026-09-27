import { Player } from './Player';
import { BoardNode } from './BoardMap';
import { AttackerAction, DefenderAction } from './BattleEngine';

export class AISystem {
  // Select best route when choosing at an intersection
  chooseRoute(candidateNodeIds: number[], aiPlayer: Player, allNodes: BoardNode[], allPlayers: Player[]): number {
    if (candidateNodeIds.length === 1) return candidateNodeIds[0];

    const personality = aiPlayer.aiPersonality || 'balanced';

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
        if (node.townData?.isOccupiedByMonster) {
          const maxHp = node.townData.monsterMaxHp || node.townData.monsterHp;
          // Monster is low on HP: PRIME TARGET TO LAST-HIT
          if (node.townData.monsterHp <= maxHp * 0.5) {
            score += personality === 'economist' ? 160 : 130;
          } else {
            score += personality === 'economist' ? 95 : 60; // Town to liberate!
          }
        } else if (node.townData?.ownerId === aiPlayer.id) {
          score += personality === 'economist' ? 55 : 35; // Owned town to rest/invest
        } else {
          score -= personality === 'hunter' ? 5 : 20; // Rival's town with toll
        }
      } else if (node.type === 'blue') {
        score += personality === 'economist' ? 40 : 25;
      } else if (node.type === 'church') {
        const hpThreshold = personality === 'tactician' ? 0.6 : 0.45;
        if (aiPlayer.hp < aiPlayer.maxHp * hpThreshold) score += personality === 'tactician' ? 100 : 70;
        else score += 10;
      } else if (node.type === 'shop_item' || node.type === 'shop_weapon') {
        score += personality === 'economist' ? 45 : 25;
      } else if (node.type === 'red') {
        score -= personality === 'tactician' ? 50 : 30;
      } else if (node.type === 'dark_gate') {
        score += aiPlayer.isDarkling ? 0 : (personality === 'hunter' ? 50 : 30);
      }

      // Check for rival on tile (PvP opportunity!)
      const rivalOnNode = allPlayers.find(p => p.id !== aiPlayer.id && p.nodeId === id);
      if (rivalOnNode) {
        if (aiPlayer.isDarkling) {
          score += 180;
        } else if (personality === 'hunter') {
          score += 130; // PK Hunter loves seeking duels!
        } else if (personality === 'tactician') {
          score += aiPlayer.hp > rivalOnNode.hp + 25 ? 100 : -20; // Smart risk assessment
        } else if (personality === 'economist') {
          score += aiPlayer.hp > rivalOnNode.hp + 40 ? 50 : -30; // Avoids fighting unless guaranteed win
        } else if (aiPlayer.hp > rivalOnNode.hp + 20) {
          score += 90; // Ambush weakened rival!
        } else {
          score += 45; // Dokapon duel!
        }
      }

      // Add a bit of unpredictability
      score += Math.random() * 8;

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
    const personality = ai.aiPersonality || 'balanced';

    // PK Hunter is hyper-aggressive with Strike and Skills
    if (personality === 'hunter') {
      if (ai.mp >= 12 && roll < 0.45) return 'skill';
      if (roll < 0.42) return 'strike';
      if (ai.mp >= 14 && ai.mag > 10 && roll < 0.7) return 'magic';
      return 'attack';
    }

    // Tactician analyzes defenses and weaknesses
    if (personality === 'tactician') {
      if (opponent.def > 18 && roll < 0.55) return 'strike';
      if (ai.mp >= 14 && ai.mag > 12 && roll < 0.45) return 'magic';
      if (ai.mp >= 12 && roll < 0.35) return 'skill';
      return 'attack';
    }

    // Economist prefers low-risk attacks
    if (personality === 'economist') {
      if (ai.mp >= 12 && roll < 0.25) return 'skill';
      if (roll < 0.20) return 'strike';
      return 'attack';
    }

    // Default Balanced AI
    if (ai.mp >= 16 && ai.mag > 10 && roll < 0.35) return 'magic';
    if (ai.mp >= 12 && roll < 0.3) return 'skill';
    if (opponent.def > 12 && roll < 0.45) return 'strike';
    if (roll < 0.3) return 'strike';
    return 'attack';
  }

  // Combat Defender Decision
  chooseDefenderAction(ai: Player, attacker: { atk: number; mag: number; classKey?: string }): DefenderAction {
    const roll = Math.random();
    const personality = ai.aiPersonality || 'balanced';

    // If low HP, evaluate surrender to avoid dying or defend
    if (ai.hp < (personality === 'economist' ? 25 : 15) && roll < 0.3) {
      return 'give_up';
    }

    // Tactician reads attacker class and tendencies accurately
    if (personality === 'tactician') {
      if (attacker.classKey === 'magician' || attacker.mag > attacker.atk * 1.2) {
        if (roll < 0.70) return 'magic_guard';
      }
      if (attacker.classKey === 'warrior' || attacker.classKey === 'berserker' || roll < 0.45) {
        return 'counter';
      }
      return roll < 0.4 ? 'defend' : 'counter';
    }

    // Hunter loves high-risk high-reward Counters
    if (personality === 'hunter') {
      if (roll < 0.50) return 'counter';
      if (attacker.classKey === 'magician' && roll < 0.8) return 'magic_guard';
      return 'defend';
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
    const personality = ai.aiPersonality || 'balanced';

    if (personality === 'hunter') {
      // Hunter loves humiliating rivals or taking their prized towns!
      if (victim.townDeeds.length > 0 && Math.random() < 0.6) return 'town';
      return 'prank';
    }

    if (personality === 'economist') {
      if (victim.townDeeds.length > 0) return 'town';
      return 'gold';
    }

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
