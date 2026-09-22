import { GameState } from './GameState';
import { Player } from './Player';
import { TownData } from './BoardMap';

export interface SaveMetadata {
  savedAt: number;
  dateStr: string;
  day: number;
  week: number;
  activeHeroName: string;
  activeHeroClass: string;
  activeHeroLevel: number;
  activeHeroGold: number;
  totalPlayers: number;
}

export interface SerializedPlayer {
  id: number;
  name: string;
  classKey: string;
  isAI: boolean;
  skinVariant: number;
  level: number;
  xp: number;
  xpNeeded: number;
  maxHp: number;
  hp: number;
  maxMp: number;
  mp: number;
  atk: number;
  def: number;
  mag: number;
  spd: number;
  luk: number;
  gold: number;
  townsControlled: number;
  townDeeds: number[];
  nodeId: number;
  prevNodeId: number | null;
  gridX: number;
  gridY: number;
  gridZ: number;
  facing: string;
  activeSpinnerMultiplier: number;
  equipment: any;
  inventory: any[];
  fieldSpells: string[];
  rustTurns: number;
  foodBuff: any;
  activeGuildQuest: any;
  guildRank: string;
  completedQuestsCount: number;
  isDarkling: boolean;
  darklingTurnsLeft: number;
  backupNormalStats: any;
  prank: any;
  color: string;
  className: string;
  avatar: string;
  skillName: string;
  homeNodeId: number | null;
  companion: any;
}

export interface SaveGameData {
  version: number;
  savedAt: number;
  dateStr: string;
  dayCounter: number;
  weekCounter: number;
  winGoal: string;
  activePlayerIdx: number;
  phase: string;
  players: SerializedPlayer[];
  townStates: Array<{ nodeId: number; townData: TownData }>;
  homeStates?: Array<{ nodeId: number; homeData: any; type: string }>;
  logs: Array<{ text: string; type: 'info' | 'gold' | 'battle' | 'level' | 'darkling' }>;
  bossCurrentHp?: number;
  bossMaxHp?: number;
}

const STORAGE_KEY = 'chronicles_of_fortune_savegame';
const META_KEY = 'chronicles_of_fortune_savemeta';

export class SaveManager {
  public static save(game: GameState, bossState?: { currentHp: number; maxHp: number }): boolean {
    try {
      if (!game || game.players.length === 0) return false;
      const now = new Date();
      const dateStr = now.toLocaleDateString('th-TH', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
      });

      const serializedPlayers: SerializedPlayer[] = game.players.map(p => ({
        id: p.id, name: p.name, classKey: p.classKey, isAI: p.isAI,
        skinVariant: p.skinVariant || 0, level: p.level, xp: p.xp, xpNeeded: p.xpNeeded,
        maxHp: p.maxHp, hp: p.hp, maxMp: p.maxMp, mp: p.mp,
        atk: p.atk, def: p.def, mag: p.mag, spd: p.spd, luk: p.luk, gold: p.gold,
        townsControlled: p.townsControlled, townDeeds: [...p.townDeeds],
        nodeId: p.nodeId, prevNodeId: p.prevNodeId, gridX: p.gridX, gridY: p.gridY, gridZ: p.gridZ,
        facing: p.facing, activeSpinnerMultiplier: p.activeSpinnerMultiplier,
        equipment: JSON.parse(JSON.stringify(p.equipment)),
        inventory: JSON.parse(JSON.stringify(p.inventory)),
        fieldSpells: [...p.fieldSpells], rustTurns: p.rustTurns,
        foodBuff: p.foodBuff ? JSON.parse(JSON.stringify(p.foodBuff)) : null,
        activeGuildQuest: p.activeGuildQuest ? JSON.parse(JSON.stringify(p.activeGuildQuest)) : null,
        guildRank: p.guildRank, completedQuestsCount: p.completedQuestsCount,
        isDarkling: p.isDarkling, darklingTurnsLeft: p.darklingTurnsLeft,
        backupNormalStats: p.backupNormalStats ? JSON.parse(JSON.stringify(p.backupNormalStats)) : null,
        prank: JSON.parse(JSON.stringify(p.prank)),
        color: p.color, className: p.className, avatar: p.avatar, skillName: p.skillName,
        homeNodeId: p.homeNodeId,
        companion: p.companion ? JSON.parse(JSON.stringify(p.companion)) : null
      }));

      const townStates: Array<{ nodeId: number; townData: TownData }> = [];
      const homeStates: Array<{ nodeId: number; homeData: any; type: string }> = [];
      game.allNodes.forEach(n => {
        if (n.townData) {
          townStates.push({ nodeId: n.id, townData: JSON.parse(JSON.stringify(n.townData)) });
        }
        if (n.homeData) {
          homeStates.push({ nodeId: n.id, homeData: JSON.parse(JSON.stringify(n.homeData)), type: n.type });
        }
      });

      const saveData: SaveGameData = {
        version: 1, savedAt: Date.now(), dateStr,
        dayCounter: game.dayCounter, weekCounter: game.weekCounter,
        winGoal: game.winGoal, activePlayerIdx: game.activePlayerIdx,
        phase: (game.phase as string) === 'BATTLE' || (game.phase as string) === 'PVP_CHOICE' ? 'BOARD_TURN' : game.phase,
        players: serializedPlayers, townStates, homeStates,
        logs: JSON.parse(JSON.stringify(game.logs.slice(0, 30))),
        bossCurrentHp: bossState?.currentHp,
        bossMaxHp: bossState?.maxHp
      };

      const hero = game.activePlayer;
      const meta: SaveMetadata = {
        savedAt: saveData.savedAt, dateStr, day: game.dayCounter, week: game.weekCounter,
        activeHeroName: hero ? hero.name : 'Unknown Hero',
        activeHeroClass: hero ? hero.className : 'Warrior',
        activeHeroLevel: hero ? hero.level : 1,
        activeHeroGold: hero ? hero.gold : 300,
        totalPlayers: game.players.length
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
      localStorage.setItem(META_KEY, JSON.stringify(meta));
      return true;
    } catch (err) {
      console.error('Failed to save game:', err);
      return false;
    }
  }

  public static load(game: GameState): { success: boolean; bossState?: { currentHp: number; maxHp: number } } {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { success: false };
      const data = JSON.parse(raw) as SaveGameData;
      if (!data || !data.players || data.players.length === 0) return { success: false };

      game.players = data.players.map(sp => {
        const p = new Player(sp.id, sp.name, sp.classKey, sp.isAI, sp.nodeId, sp.skinVariant || 0);
        p.level = sp.level; p.xp = sp.xp; p.xpNeeded = sp.xpNeeded;
        p.maxHp = sp.maxHp; p.hp = sp.hp; p.maxMp = sp.maxMp; p.mp = sp.mp;
        p.atk = sp.atk; p.def = sp.def; p.mag = sp.mag; p.spd = sp.spd; p.luk = sp.luk;
        p.gold = sp.gold; p.townsControlled = sp.townsControlled; p.townDeeds = sp.townDeeds || [];
        p.nodeId = sp.nodeId; p.prevNodeId = sp.prevNodeId;
        p.gridX = sp.gridX; p.gridY = sp.gridY; p.gridZ = sp.gridZ;
        p.facing = (sp.facing as any) || 'SE';
        p.activeSpinnerMultiplier = sp.activeSpinnerMultiplier || 1;
        p.equipment = sp.equipment || { weapon: null, armor: null, accessory: null };
        p.inventory = sp.inventory || [];
        p.fieldSpells = sp.fieldSpells || [];
        p.rustTurns = sp.rustTurns || 0;
        p.foodBuff = sp.foodBuff || null;
        p.activeGuildQuest = sp.activeGuildQuest || null;
        p.guildRank = (sp.guildRank as any) || 'F';
        p.completedQuestsCount = sp.completedQuestsCount || 0;
        p.isDarkling = !!sp.isDarkling;
        p.darklingTurnsLeft = sp.darklingTurnsLeft || 0;
        p.backupNormalStats = sp.backupNormalStats || null;
        p.prank = sp.prank || { hasGraffiti: false, turnsRemaining: 0 };
        p.color = sp.color || p.color;
        p.className = sp.className || p.className;
        p.avatar = sp.avatar || p.avatar;
        p.skillName = sp.skillName || p.skillName;
        p.homeNodeId = sp.homeNodeId ?? null;
        p.companion = sp.companion ?? null;
        return p;
      });

      if (data.townStates && Array.isArray(data.townStates)) {
        const townMap = new Map<number, TownData>();
        data.townStates.forEach(ts => townMap.set(ts.nodeId, ts.townData));
        game.allNodes.forEach(node => {
          if (townMap.has(node.id)) {
            node.townData = townMap.get(node.id);
          }
        });
      }

      if (data.homeStates && Array.isArray(data.homeStates)) {
        const homeMap = new Map<number, { homeData: any; type: string }>();
        data.homeStates.forEach(hs => homeMap.set(hs.nodeId, hs));
        game.allNodes.forEach(node => {
          if (homeMap.has(node.id)) {
            const hs = homeMap.get(node.id)!;
            node.homeData = hs.homeData;
            node.type = hs.type as any;
          }
        });
      }

      game.dayCounter = data.dayCounter || 1;
      game.weekCounter = data.weekCounter || 1;
      game.winGoal = data.winGoal || 'networth';
      game.activePlayerIdx = Math.min(data.activePlayerIdx || 0, game.players.length - 1);
      game.phase = 'BOARD_TURN';
      game.remainingMoves = 0;
      game.highlightedNodes = [];
      game.activePreviewPath = [];
      game.activeBattle = null;
      game.activeBattleEnemyCombatant = null;
      game.pendingTileNode = null;
      game.pendingPvPVictim = null;
      if (data.logs && Array.isArray(data.logs)) {
        game.logs = data.logs;
      }
      game.addLog(`📂 โหลดบันทึกสำเร็จ! (วันที่ ${game.dayCounter}, สัปดาห์ที่ ${game.weekCounter})`, 'info');
      return {
        success: true,
        bossState: data.bossCurrentHp ? { currentHp: data.bossCurrentHp, maxHp: data.bossMaxHp || 380 } : undefined
      };
    } catch (err) {
      console.error('Failed to load game:', err);
      return { success: false };
    }
  }

  public static hasSave(): boolean {
    try {
      return !!localStorage.getItem(STORAGE_KEY);
    } catch {
      return false;
    }
  }

  public static getSaveMetadata(): SaveMetadata | null {
    try {
      const raw = localStorage.getItem(META_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as SaveMetadata;
    } catch {
      return null;
    }
  }

  public static clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(META_KEY);
    } catch (err) {
      console.error('Failed to clear savegame:', err);
    }
  }
}
