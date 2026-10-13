import { Player } from './Player';
import { BoardNode } from './BoardMap';
import { AttackerAction, DefenderAction } from './BattleEngine';
import { EquipmentItem } from '../engine/PixelSpriteGenerator';

export interface CombatMoveHistory {
  [key: string]: number;
  attack: number;
  strike: number;
  magic: number;
  skill: number;
  defend: number;
  counter: number;
  magic_guard: number;
  give_up: number;
}

export class AISystem {
  // Grudge score: botPlayerId -> victimId -> score (0 - 100+)
  public grudgeMatrix: Record<number, Record<number, number>> = {};
  // Player combat history: playerId -> move counts
  public moveHistory: Record<number, CombatMoveHistory> = {};

  recordGrudge(botId: number, targetId: number, amount: number, reason = ''): void {
    if (botId === targetId) return;
    if (!this.grudgeMatrix[botId]) this.grudgeMatrix[botId] = {};
    this.grudgeMatrix[botId][targetId] = (this.grudgeMatrix[botId][targetId] || 0) + amount;
  }

  getGrudge(botId: number, targetId: number): number {
    return this.grudgeMatrix[botId]?.[targetId] || 0;
  }

  recordMove(playerId: number, move: string): void {
    if (!this.moveHistory[playerId]) {
      this.moveHistory[playerId] = { attack: 0, strike: 0, magic: 0, skill: 0, defend: 0, counter: 0, magic_guard: 0, give_up: 0 };
    }
    const hist = this.moveHistory[playerId] as Record<string, number>;
    if (hist[move] !== undefined) hist[move]++;
  }

  getMostFrequentMove(playerId: number, category: 'attacker' | 'defender'): string | null {
    const hist = this.moveHistory[playerId];
    if (!hist) return null;
    if (category === 'attacker') {
      const moves = [
        { move: 'attack', count: hist.attack },
        { move: 'strike', count: hist.strike },
        { move: 'magic', count: hist.magic },
        { move: 'skill', count: hist.skill }
      ];
      moves.sort((a, b) => b.count - a.count);
      return moves[0].count >= 2 ? moves[0].move : null;
    } else {
      const moves = [
        { move: 'defend', count: hist.defend },
        { move: 'counter', count: hist.counter },
        { move: 'magic_guard', count: hist.magic_guard }
      ];
      moves.sort((a, b) => b.count - a.count);
      return moves[0].count >= 2 ? moves[0].move : null;
    }
  }

  // Select best route when choosing at an intersection
  chooseRoute(
    candidateNodeIds: number[],
    aiPlayer: Player,
    allNodes: BoardNode[],
    allPlayers: Player[],
    difficulty: 'casual' | 'tactical' | 'ruthless' = 'tactical'
  ): number {
    if (candidateNodeIds.length === 1) return candidateNodeIds[0];

    const personality = aiPlayer.aiPersonality || 'balanced';
    const leader = this.getLeader(allPlayers);

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
            const snipeBonus = difficulty === 'ruthless' ? 240 : difficulty === 'casual' ? 60 : 140;
            score += (personality === 'economist' ? 160 : 130) + snipeBonus;
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

      // Check for rival on tile (PvP opportunity & Grudge Revenge!)
      const rivalOnNode = allPlayers.find(p => p.id !== aiPlayer.id && p.nodeId === id);
      if (rivalOnNode) {
        const grudge = this.getGrudge(aiPlayer.id, rivalOnNode.id);
        const ruthlessness = difficulty === 'ruthless' ? 100 : difficulty === 'casual' ? -30 : 0;
        const isTargetLeader = leader && rivalOnNode.id === leader.id && rivalOnNode.id !== aiPlayer.id;
        const leaderBonus = isTargetLeader ? (difficulty === 'ruthless' ? 60 : 35) : 0;

        if (aiPlayer.isDarkling) {
          score += 180 + grudge + ruthlessness + leaderBonus;
        } else if (personality === 'hunter') {
          score += 130 + grudge * 1.5 + ruthlessness + leaderBonus; // PK Hunter loves seeking duels and revenge!
        } else if (personality === 'tactician') {
          score += aiPlayer.hp > rivalOnNode.hp + 25 ? (100 + grudge + ruthlessness + leaderBonus) : -20; // Smart risk assessment
        } else if (personality === 'economist') {
          score += aiPlayer.hp > rivalOnNode.hp + 40 ? (50 + grudge + ruthlessness + leaderBonus) : -30;
        } else if (aiPlayer.hp > rivalOnNode.hp + 20) {
          score += 90 + grudge + ruthlessness + leaderBonus; // Ambush weakened rival!
        } else {
          score += 45 + grudge * 0.8 + leaderBonus * 0.5;
        }
      }

      // Add a bit of unpredictability
      score += Math.random() * (difficulty === 'casual' ? 25 : 8);

      if (score > bestScore) {
        bestScore = score;
        bestId = id;
      }
    });

    return bestId;
  }

  // Combat Attacker Decision with Psychological Mind-Reading
  chooseAttackerAction(
    ai: Player,
    opponent: { hp: number; maxHp: number; def: number; mag: number; playerRef?: Player },
    difficulty: 'casual' | 'tactical' | 'ruthless' = 'tactical'
  ): AttackerAction {
    const roll = Math.random();
    if (difficulty === 'casual' && roll < 0.50) {
      const actions: AttackerAction[] = ['attack', 'attack', 'strike', 'magic'];
      return actions[Math.floor(Math.random() * actions.length)];
    }

    const personality = ai.aiPersonality || 'balanced';
    const opponentId = opponent.playerRef?.id;

    // Mind-reading: if opponent frequently Counters, avoid Strike!
    if (opponentId !== undefined && difficulty !== 'casual') {
      const frequentDef = this.getMostFrequentMove(opponentId, 'defender');
      const readRate = difficulty === 'ruthless' ? 0.90 : 0.70;
      if (frequentDef === 'counter') {
        // Punish counter with regular attack or magic!
        if (ai.mp >= 14 && ai.mag > 10 && roll < 0.6) return 'magic';
        return 'attack';
      }
      if (frequentDef === 'defend') {
        // Punish defend with devastating Strike!
        if (roll < readRate) return 'strike';
      }
      if (frequentDef === 'magic_guard') {
        // Punish magic guard with strike or attack!
        if (roll < (difficulty === 'ruthless' ? 0.65 : 0.45)) return 'strike';
        return 'attack';
      }
    }

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

  // Combat Defender Decision with Psychological Reading
  chooseDefenderAction(
    ai: Player,
    attacker: { atk: number; mag: number; classKey?: string; playerRef?: Player },
    difficulty: 'casual' | 'tactical' | 'ruthless' = 'tactical'
  ): DefenderAction {
    const roll = Math.random();
    if (difficulty === 'casual' && roll < 0.50) {
      const actions: DefenderAction[] = ['defend', 'defend', 'counter', 'magic_guard'];
      return actions[Math.floor(Math.random() * actions.length)];
    }

    const personality = ai.aiPersonality || 'balanced';
    const attackerId = attacker.playerRef?.id;

    // Mind-reading: if attacker has a clear habit, exploit it!
    if (attackerId !== undefined && difficulty !== 'casual') {
      const frequentAtk = this.getMostFrequentMove(attackerId, 'attacker');
      const readRate = difficulty === 'ruthless' ? 0.90 : 0.75;
      if (frequentAtk === 'strike' && roll < readRate) {
        return 'counter';
      }
      if (frequentAtk === 'magic' && roll < readRate) {
        return 'magic_guard';
      }
      if (frequentAtk === 'attack' && roll < (difficulty === 'ruthless' ? 0.85 : 0.70)) {
        return 'defend';
      }
    }

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

  // Estimate a player's net worth for strategic ranking
  getEstimatedNetWorth(player: Player): number {
    let worth = player.gold || 0;
    worth += (player.townsControlled || 0) * 450;
    if (player.equipment) {
      if (player.equipment.weapon) worth += player.equipment.weapon.cost || 150;
      if (player.equipment.armor) worth += player.equipment.armor.cost || 120;
      if (player.equipment.shield) worth += player.equipment.shield.cost || 80;
      if (player.equipment.accessory) worth += player.equipment.accessory.cost || 100;
    }
    return worth;
  }

  // Identify who is leading the game to direct strategic counter-attacks
  getLeader(players: Player[]): Player | null {
    if (!players || players.length === 0) return null;
    let leader = players[0];
    let maxWorth = this.getEstimatedNetWorth(leader);
    for (let i = 1; i < players.length; i++) {
      const worth = this.getEstimatedNetWorth(players[i]);
      if (worth > maxWorth) {
        maxWorth = worth;
        leader = players[i];
      }
    }
    return leader;
  }

  // Strategic decision: should the AI invest gold to upgrade an owned town?
  shouldInvestInTown(ai: Player, townData: { level: number; baseValue: number }): boolean {
    const cost = Math.round(townData.baseValue * (0.4 + townData.level * 0.2));
    const safetyReserve = ai.aiPersonality === 'economist' ? 80 : 150;
    if (ai.gold < cost + safetyReserve) return false;
    if (townData.level >= 5) return false;
    if (ai.aiPersonality === 'economist') return true;
    if (ai.aiPersonality === 'tactician' && ai.gold >= cost * 2) return true;
    return Math.random() < 0.6;
  }

  // Strategic decision: select the most beneficial equipment to purchase from a shop
  chooseShopItem(ai: Player, availableItems: EquipmentItem[]): EquipmentItem | null {
    const affordable = availableItems.filter(item => (item.cost || 0) <= ai.gold - 50);
    if (affordable.length === 0) return null;

    // Sort by most effective upgrade for current stats
    affordable.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;
      if (a.type === 'weapon') scoreA += (a.atk || 0) * 2 + (a.mag || 0) * 1.5;
      if (b.type === 'weapon') scoreB += (b.atk || 0) * 2 + (b.mag || 0) * 1.5;
      if (a.type === 'armor' || a.type === 'shield') scoreA += (a.def || 0) * 2;
      if (b.type === 'armor' || b.type === 'shield') scoreB += (b.def || 0) * 2;
      return scoreB - scoreA;
    });

    return affordable[0] || null;
  }

  // Choose revenge/prime target for offensive field spells based on grudge and threat
  chooseFieldSpellTarget(ai: Player, opponents: Player[]): Player | null {
    if (opponents.length === 0) return null;
    const leader = this.getLeader(opponents);
    let highestScore = -999;
    let bestTarget = opponents[0];

    opponents.forEach(op => {
      const grudge = this.getGrudge(ai.id, op.id);
      let score = grudge * 2.5;
      if (op.gold >= 300) score += 30;
      if (op.townsControlled >= 2) score += 40;
      if (op.isDarkling) score += 80;
      // High-priority sabotage against the current match leader!
      if (leader && op.id === leader.id && op.id !== ai.id) {
        score += 55;
      }

      if (score > highestScore) {
        highestScore = score;
        bestTarget = op;
      }
    });

    return bestTarget;
  }

  // AI Strategic Field Trap placement
  chooseTrapPlacement(
    ai: Player,
    allNodes: BoardNode[],
    allPlayers: Player[],
    existingTraps: Array<{ nodeId: number; ownerId: number }>
  ): { nodeId: number; type: 'damage' | 'pitfall' | 'greed' | 'rust' } | null {
    if (ai.gold < 150) return null;

    const trappedNodeIds = new Set(existingTraps.map(t => t.nodeId));
    const opponents = allPlayers.filter(p => p.id !== ai.id);
    if (opponents.length === 0) return null;

    const candidateNodeIds: number[] = [];
    const castleNode = allNodes.find(n => n.id === 0);
    if (castleNode) {
      candidateNodeIds.push(...castleNode.neighbors);
    }

    // Towns owned by AI
    const myTowns = allNodes.filter(n => n.type === 'town' && n.townData?.ownerId === ai.id);
    myTowns.forEach(t => candidateNodeIds.push(...t.neighbors));

    // Filter valid candidates
    const validCandidates = candidateNodeIds.filter(id => !trappedNodeIds.has(id));
    if (validCandidates.length === 0) return null;

    const chosenNodeId = validCandidates[Math.floor(Math.random() * validCandidates.length)];
    const types: Array<'damage' | 'pitfall' | 'greed' | 'rust'> = ['damage', 'greed', 'pitfall', 'rust'];
    const chosenType = ai.aiPersonality === 'economist' ? 'greed' : (ai.aiPersonality === 'hunter' ? 'damage' : types[Math.floor(Math.random() * types.length)]);

    return { nodeId: chosenNodeId, type: chosenType };
  }
}

export const aiSystem = new AISystem();
