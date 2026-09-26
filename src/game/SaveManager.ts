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

/**
 * Current on-disk save format. Bump this whenever the shape of SaveGameData changes and
 * add the corresponding migration in `load` - before this existed the field was written
 * but never read, so an incompatible save silently produced NaN stats instead of failing.
 */
const SAVE_VERSION = 1;

/** Reads a finite number out of untrusted JSON, falling back when it is missing or NaN. */
function numOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** Equipment slots that always exist on a Player. */
const DEFAULT_EQUIPMENT = { weapon: null, shield: null, armor: null, accessory: null };

export class SaveManager {
  public static save(game: GameState, bossState?: { currentHp: number; maxHp: number }): boolean {
    try {
      if (!game || game.players.length === 0) return false;
      const now = new Date();
      const dateStr = now.toLocaleDateString('th-TH', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
      });

      const nodeById = new Map(game.allNodes.map(n => [n.id, n]));

      const serializedPlayers: SerializedPlayer[] = game.players.map(p => {
        // The hero's node is authoritative for where it is. A save can be triggered while a
        // walk animation is still interpolating, and executeSingleStep sets p.nodeId to the
        // destination immediately while p.gridX/p.gridY are still between the two tiles.
        // Persisting those interpolated values restores a hero whose coordinates belong to no
        // node, which then corrupts every facing and screen-position calculation made from
        // them - the sprite keeps using the wrong origin and stops tracking the walk.
        const here = nodeById.get(p.nodeId);
        return {
          id: p.id, name: p.name, classKey: p.classKey, isAI: p.isAI,
          skinVariant: p.skinVariant || 0, level: p.level, xp: p.xp, xpNeeded: p.xpNeeded,
          maxHp: p.maxHp, hp: p.hp, maxMp: p.maxMp, mp: p.mp,
          atk: p.atk, def: p.def, mag: p.mag, spd: p.spd, luk: p.luk, gold: p.gold,
          townsControlled: p.townsControlled, townDeeds: [...p.townDeeds],
          nodeId: p.nodeId, prevNodeId: p.prevNodeId,
          gridX: here ? here.gx : p.gridX,
          gridY: here ? here.gy : p.gridY,
          gridZ: here ? here.gz : p.gridZ,
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
        };
      });

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
        version: SAVE_VERSION, savedAt: Date.now(), dateStr,
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

  public static load(game: GameState): { success: boolean; error?: string; bossState?: { currentHp: number; maxHp: number } } {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { success: false, error: 'ไม่พบข้อมูลบันทึกในเครื่องนี้' };

      let data: SaveGameData;
      try {
        data = JSON.parse(raw) as SaveGameData;
      } catch {
        return { success: false, error: 'ไฟล์บันทึกเสียหาย (อ่านรูปแบบข้อมูลไม่ได้)' };
      }
      if (!data || typeof data !== 'object') {
        return { success: false, error: 'ไฟล์บันทึกเสียหาย (โครงสร้างไม่ถูกต้อง)' };
      }

      const version = numOr(data.version, 0);
      if (version < 1) {
        return { success: false, error: 'ไฟล์บันทึกไม่มีเลขเวอร์ชันหรือเก่าเกินกว่าจะโหลดได้' };
      }
      if (version > SAVE_VERSION) {
        return {
          success: false,
          error: `ไฟล์บันทึกเป็นเวอร์ชัน ${version} ซึ่งใหม่กว่าที่เกมนี้รองรับ (สูงสุด v${SAVE_VERSION})`
        };
      }
      if (!Array.isArray(data.players) || data.players.length === 0) {
        return { success: false, error: 'ไฟล์บันทึกไม่มีข้อมูลผู้เล่น' };
      }

      const nodesById = new Map(game.allNodes.map(n => [n.id, n]));

      game.players = data.players.map(sp => {
        const p = new Player(numOr(sp.id, 1), sp.name, sp.classKey, sp.isAI, numOr(sp.nodeId, 0), numOr(sp.skinVariant, 0));
        p.level = Math.max(1, numOr(sp.level, 1));
        p.xp = Math.max(0, numOr(sp.xp, 0));
        p.xpNeeded = Math.max(1, numOr(sp.xpNeeded, 100));
        p.maxHp = Math.max(1, numOr(sp.maxHp, 100));
        p.hp = Math.min(p.maxHp, Math.max(0, numOr(sp.hp, p.maxHp)));
        p.maxMp = Math.max(0, numOr(sp.maxMp, 0));
        p.mp = Math.min(p.maxMp, Math.max(0, numOr(sp.mp, p.maxMp)));
        p.atk = Math.max(0, numOr(sp.atk, 10));
        p.def = Math.max(0, numOr(sp.def, 10));
        p.mag = Math.max(0, numOr(sp.mag, 10));
        p.spd = Math.max(0, numOr(sp.spd, 10));
        p.luk = Math.max(0, numOr(sp.luk, 10));
        p.gold = Math.max(0, numOr(sp.gold, 300));
        p.townDeeds = Array.isArray(sp.townDeeds) ? sp.townDeeds.filter(d => nodesById.has(d)) : [];
        p.townsControlled = p.townDeeds.length;
        p.prevNodeId = numOr(sp.prevNodeId, -1) >= 0 ? numOr(sp.prevNodeId, -1) : null;
        // Re-derive the on-screen position from the node rather than trusting the stored
        // numbers. Old saves (and any save taken mid-walk) can carry coordinates that do not
        // belong to p.nodeId, which makes calculateIsoDirection compute every facing from the
        // wrong origin.
        const here = nodesById.get(p.nodeId);
        p.gridX = here ? here.gx : numOr(sp.gridX, 0);
        p.gridY = here ? here.gy : numOr(sp.gridY, 0);
        p.gridZ = here ? here.gz : numOr(sp.gridZ, 0);
        p.facing = (sp.facing as any) || 'SE';
        p.activeSpinnerMultiplier = Math.max(1, numOr(sp.activeSpinnerMultiplier, 1));
        // Merge over the full slot list so saves written before a slot existed still get it.
        p.equipment = { ...DEFAULT_EQUIPMENT, ...(sp.equipment || {}) };
        p.inventory = Array.isArray(sp.inventory) ? sp.inventory : [];
        p.fieldSpells = Array.isArray(sp.fieldSpells) ? sp.fieldSpells : [];
        p.rustTurns = Math.max(0, numOr(sp.rustTurns, 0));
        p.foodBuff = sp.foodBuff || null;
        p.activeGuildQuest = sp.activeGuildQuest || null;
        p.guildRank = (sp.guildRank as any) || 'F';
        p.completedQuestsCount = Math.max(0, numOr(sp.completedQuestsCount, 0));
        p.isDarkling = !!sp.isDarkling;
        p.darklingTurnsLeft = Math.max(0, numOr(sp.darklingTurnsLeft, 0));
        p.backupNormalStats = sp.backupNormalStats || null;
        p.prank = sp.prank || { hasGraffiti: false, turnsRemaining: 0 };
        p.color = sp.color || p.color;
        p.className = sp.className || p.className;
        p.avatar = sp.avatar || p.avatar;
        p.skillName = sp.skillName || p.skillName;
        p.homeNodeId = nodesById.has(numOr(sp.homeNodeId, -1)) ? numOr(sp.homeNodeId, -1) : null;
        p.companion = sp.companion ?? null;
        return p;
      });

      if (Array.isArray(data.townStates)) {
        data.townStates.forEach(ts => {
          const node = nodesById.get(numOr(ts?.nodeId, -1));
          if (node?.townData && ts?.townData) {
            node.townData = ts.townData;
          }
        });
      }

      if (Array.isArray(data.homeStates)) {
        data.homeStates.forEach(hs => {
          const node = nodesById.get(numOr(hs?.nodeId, -1));
          if (node && hs?.homeData) {
            node.homeData = hs.homeData;
            if (hs.type) node.type = hs.type as any;
          }
        });
      }

      game.dayCounter = Math.max(1, numOr(data.dayCounter, 1));
      game.weekCounter = Math.max(1, numOr(data.weekCounter, 1));
      game.winGoal = data.winGoal || 'networth';
      game.activePlayerIdx = Math.min(Math.max(0, numOr(data.activePlayerIdx, 0)), game.players.length - 1);
      game.phase = 'BOARD_TURN';
      game.remainingMoves = 0;
      game.highlightedNodes = [];
      game.activePreviewPath = [];
      game.activeBattle = null;
      game.activeBattleEnemyCombatant = null;
      game.pendingTileNode = null;
      game.pendingPvPVictim = null;
      game.logs = Array.isArray(data.logs) ? data.logs : [];
      game.addLog(`📂 โหลดบันทึกสำเร็จ! (วันที่ ${game.dayCounter}, สัปดาห์ที่ ${game.weekCounter})`, 'info');
      return {
        success: true,
        bossState: numOr(data.bossCurrentHp, 0) > 0
          ? { currentHp: numOr(data.bossCurrentHp, 0), maxHp: numOr(data.bossMaxHp, 380) }
          : undefined
      };
    } catch (err) {
      console.error('Failed to load game:', err);
      return { success: false, error: 'เกิดข้อผิดพลาดขณะโหลดข้อมูลบันทึก' };
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
      const meta = JSON.parse(raw) as SaveMetadata;
      if (!meta || typeof meta !== 'object') return null;
      return {
        savedAt: numOr(meta.savedAt, 0),
        dateStr: meta.dateStr || '',
        day: numOr(meta.day, 1),
        week: numOr(meta.week, 1),
        activeHeroName: meta.activeHeroName || 'Unknown Hero',
        activeHeroClass: meta.activeHeroClass || 'Warrior',
        activeHeroLevel: numOr(meta.activeHeroLevel, 1),
        activeHeroGold: numOr(meta.activeHeroGold, 0),
        totalPlayers: numOr(meta.totalPlayers, 0)
      };
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
