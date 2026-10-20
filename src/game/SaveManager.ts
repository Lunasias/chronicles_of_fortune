import { WorldState, bindWorld } from './WorldState';
import { aiSystem } from './AISystem';
import { royalDecreeSystem, RoyalDecree } from './RoyalDecreeSystem';
import type { CombatMoveHistory } from './AISystem';
import { GameState } from './GameState';
import { Player, FoodBuff, GuildQuest, CompanionData, JOB_PROMOTIONS, TIER3_PROMOTIONS } from './Player';
import { TownData, HomeData } from './BoardMap';
import { EquipmentItem, PrankState } from '../engine/PixelSpriteGenerator';
import { dungeonSystem } from './DungeonSystem';
import { worldCalamitySystem } from './WorldCalamitySystem';

export interface SaveMetadata {
  saveVersion?: number;
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
  dungeonReturnNodeId?: number | null;
  gridX: number;
  gridY: number;
  gridZ: number;
  facing: string;
  activeSpinnerMultiplier: number;
  hasFlexibleMovement?: boolean;
  equipment: {
    weapon: EquipmentItem | null;
    shield: EquipmentItem | null;
    armor: EquipmentItem | null;
    accessory: EquipmentItem | null;
  };
  inventory: EquipmentItem[];
  fieldSpells: string[];
  rustTurns: number;
  poisonTurns?: number;
  freezeTurns?: number;
  blindTurns?: number;
  curseTurns?: number;
  sleepTurns?: number;
  squidInkTurns?: number;
  downerTurns?: number;
  bountyReward?: number;
  foodBuff: FoodBuff | null;
  activeGuildQuest: GuildQuest | null;
  guildRank: string;
  completedQuestsCount: number;
  isDarkling: boolean;
  darklingTurnsLeft: number;
  backupNormalStats: { maxHp: number; atk: number; def: number; mag: number; spd: number } | null;
  prank: PrankState;
  color: string;
  className: string;
  avatar: string;
  skillName?: string;
  homeNodeId: number | null;
  companion: CompanionData | null;
  originalClassKey?: string;
  isPromoted?: boolean;
  promotionTier?: number;
  aiPersonality?: 'balanced' | 'economist' | 'hunter' | 'tactician';
  matchStats?: {
    monstersKilled: number;
    pvpWins: number;
    goldEarnedTotal: number;
    townsCapturedTotal: number;
    pranksGiven: number;
    pranksReceived: number;
  };
  burstGauge?: number;
  relics?: string[];
  weaponUpgradeLevel?: number;
  weaponRune?: 'fire' | 'ice' | 'thunder' | 'poison' | null;
  polymorphTurns?: number;
  polymorphType?: 'pig' | 'mole' | null;
  mockeryTitle?: string;
  cursedBoxTurns?: number;
  darklingSpecialization?: 'destroyer' | 'reaper' | 'tormentor' | null;
}

export interface SaveGameData {
  world: WorldState;
  gameMode?: GameState['gameMode'];
  calamityState?: {
    chaosMeter: number;
    maxChaos: number;
    corruptedNodes: number[];
    calamityCount: number;
  };
  allowDarkling: boolean;
  blitzDayLimit: number;
  coopRaidDayLimit: number;
  aiState: { grudgeMatrix: Record<number, Record<number, number>>; moveHistory: Record<number, CombatMoveHistory> };
  decree: { activeDecree: RoyalDecree; bountyClaimed: boolean; activeWantedBounty: typeof royalDecreeSystem.activeWantedBounty };

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
  homeStates?: Array<{ nodeId: number; homeData: HomeData; type: string }>;
  logs: Array<{ text: string; type: 'info' | 'gold' | 'battle' | 'level' | 'darkling' }>;
  bossCurrentHp?: number;
  bossMaxHp?: number;
  aiDifficulty?: 'casual' | 'tactical' | 'ruthless';
  placedTraps?: Array<{ nodeId: number; ownerId: number; damage: number; type?: 'damage' | 'pitfall' | 'greed' | 'rust' }>;
}

const STORAGE_KEY = 'chronicles_of_fortune_savegame';
const META_KEY = 'chronicles_of_fortune_savemeta';

/**
 * Current on-disk save format. Bump this whenever the shape of SaveGameData changes and
 * add the corresponding migration in `load` - before this existed the field was written
 * but never read, so an incompatible save silently produced NaN stats instead of failing.
 */
const SAVE_VERSION = 2;

/** Reads a finite number out of untrusted JSON, falling back when it is missing or NaN. */
function numOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** Equipment slots that always exist on a Player. */
const DEFAULT_EQUIPMENT = { weapon: null, shield: null, armor: null, accessory: null };

export class SaveManager {
  private static getStorageKeys(slot: number = 1): { saveKey: string; metaKey: string } {
    if (slot === 0) {
      return { saveKey: `${STORAGE_KEY}_auto`, metaKey: `${META_KEY}_auto` };
    }
    if (slot <= 1) {
      return { saveKey: STORAGE_KEY, metaKey: META_KEY };
    }
    return { saveKey: `${STORAGE_KEY}_slot_${slot}`, metaKey: `${META_KEY}_slot_${slot}` };
  }

  public static getSlotMetas(): Array<{ slot: number; meta: SaveMetadata | null }> {
    return [0, 1, 2, 3].map(slot => ({ slot, meta: this.getSaveMetadata(slot) }));
  }

  public static autoSave(game: GameState, bossState?: { currentHp: number; maxHp: number }): boolean {
    return this.save(game, bossState, 0);
  }

  public static exportSaveData(slot: number = 1): string | null {
    try {
      const { saveKey } = this.getStorageKeys(slot);
      const raw = localStorage.getItem(saveKey);
      if (!raw) return null;
      const bytes = new TextEncoder().encode(raw);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    } catch (err) {
      console.error('Failed to export save data:', err);
      return null;
    }
  }

  public static importSaveData(game: GameState, encodedStr: string, slot: number = 1): { success: boolean; error?: string } {
    try {
      if (!encodedStr || typeof encodedStr !== 'string') {
        return { success: false, error: 'รหัสข้อมูลบันทึกไม่ถูกต้อง' };
      }
      let jsonStr = '';
      const trimmed = encodedStr.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        jsonStr = trimmed;
      } else {
        const binary = atob(trimmed);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        jsonStr = new TextDecoder().decode(bytes);
      }

      const data = JSON.parse(jsonStr) as SaveGameData;
      if (!data || typeof data !== 'object') {
        return { success: false, error: 'โครงสร้างข้อมูลบันทึกไม่ถูกต้อง' };
      }
      if (!Array.isArray(data.players) || data.players.length === 0) {
        return { success: false, error: 'ไม่พบข้อมูลผู้เล่นในไฟล์บันทึก' };
      }

      const { saveKey, metaKey } = this.getStorageKeys(slot);
      const now = new Date();
      const dateStr = now.toLocaleDateString('th-TH', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
      });
      const hero = data.players[data.activePlayerIdx || 0] || data.players[0];
      const meta: SaveMetadata = {
        saveVersion: data.version || SAVE_VERSION,
        savedAt: data.savedAt || Date.now(),
        dateStr: data.dateStr || dateStr,
        day: data.dayCounter || 1,
        week: data.weekCounter || 1,
        activeHeroName: hero ? hero.name : 'Unknown Hero',
        activeHeroClass: hero ? (hero.className || 'Hero') : 'Hero',
        activeHeroLevel: hero ? (hero.level || 1) : 1,
        activeHeroGold: hero ? (hero.gold || 300) : 300,
        totalPlayers: data.players.length
      };

      localStorage.setItem(saveKey, jsonStr);
      localStorage.setItem(metaKey, JSON.stringify(meta));

      return this.load(game, slot);
    } catch (err) {
      console.error('Failed to import save data:', err);
      return { success: false, error: 'ถอดรหัสข้อมูลบันทึกไม่สำเร็จ โปรดตรวจสอบรหัสที่คัดลอกมา' };
    }
  }

  public static clearSave(slot: number = 1) {
    const { saveKey, metaKey } = this.getStorageKeys(slot);
    localStorage.removeItem(saveKey);
    localStorage.removeItem(metaKey);
  }

  public static serializeGameState(game: GameState, bossState?: { currentHp: number; maxHp: number }): SaveGameData {
    const now = new Date();
    const dateStr = now.toLocaleDateString('th-TH', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });

    const nodeById = new Map(game.allNodes.map(n => [n.id, n]));

    const serializedPlayers: SerializedPlayer[] = game.players.map(p => {
      const here = nodeById.get(p.nodeId);
      return {
        id: p.id, name: p.name, classKey: p.classKey, isAI: p.isAI,
        skinVariant: p.skinVariant || 0, level: p.level, xp: p.xp, xpNeeded: p.xpNeeded,
        maxHp: p.maxHp, hp: p.hp, maxMp: p.maxMp, mp: p.mp,
        atk: p.atk, def: p.def, mag: p.mag, spd: p.spd, luk: p.luk, gold: p.gold,
        townsControlled: p.townsControlled, townDeeds: [...p.townDeeds],
        nodeId: p.nodeId, prevNodeId: p.prevNodeId, dungeonReturnNodeId: p.dungeonReturnNodeId,
        gridX: here ? here.gx : p.gridX,
        gridY: here ? here.gy : p.gridY,
        gridZ: here ? here.gz : p.gridZ,
        facing: p.facing, activeSpinnerMultiplier: p.activeSpinnerMultiplier,
        hasFlexibleMovement: p.hasFlexibleMovement,
        equipment: JSON.parse(JSON.stringify(p.equipment)),
        inventory: JSON.parse(JSON.stringify(p.inventory)),
        fieldSpells: [...p.fieldSpells],
        sleepTurns: p.sleepTurns, squidInkTurns: p.squidInkTurns, downerTurns: p.downerTurns, bountyReward: p.bountyReward,
        rustTurns: p.rustTurns,
        poisonTurns: p.poisonTurns,
        freezeTurns: p.freezeTurns,
        blindTurns: p.blindTurns,
        curseTurns: p.curseTurns,
        foodBuff: p.foodBuff ? JSON.parse(JSON.stringify(p.foodBuff)) : null,
        activeGuildQuest: p.activeGuildQuest ? JSON.parse(JSON.stringify(p.activeGuildQuest)) : null,
        guildRank: p.guildRank, completedQuestsCount: p.completedQuestsCount,
        isDarkling: p.isDarkling, darklingTurnsLeft: p.darklingTurnsLeft,
        backupNormalStats: p.backupNormalStats ? JSON.parse(JSON.stringify(p.backupNormalStats)) : null,
        prank: JSON.parse(JSON.stringify(p.prank)),
        color: p.color, className: p.className, avatar: p.avatar, skillName: p.skillName,
        homeNodeId: p.homeNodeId,
        companion: p.companion ? JSON.parse(JSON.stringify(p.companion)) : null,
        originalClassKey: p.originalClassKey,
        isPromoted: p.isPromoted,
        promotionTier: p.promotionTier,
        aiPersonality: p.aiPersonality,
        matchStats: JSON.parse(JSON.stringify(p.matchStats)),
        burstGauge: p.burstGauge,
        relics: [...p.relics],
        weaponUpgradeLevel: p.weaponUpgradeLevel,
        weaponRune: p.weaponRune,
        polymorphTurns: p.polymorphTurns,
        polymorphType: p.polymorphType,
        mockeryTitle: p.mockeryTitle,
        cursedBoxTurns: p.cursedBoxTurns,
        darklingSpecialization: p.darklingSpecialization
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

    return {
      world: JSON.parse(JSON.stringify(game.world)),
      gameMode: game.gameMode,
      calamityState: {
        chaosMeter: worldCalamitySystem.chaosMeter,
        maxChaos: worldCalamitySystem.maxChaos,
        corruptedNodes: [...worldCalamitySystem.corruptedNodes],
        calamityCount: worldCalamitySystem.calamityCount
      },
      allowDarkling: game.allowDarkling, blitzDayLimit: game.blitzDayLimit, coopRaidDayLimit: game.coopRaidDayLimit,
      aiState: JSON.parse(JSON.stringify({ grudgeMatrix: aiSystem.grudgeMatrix, moveHistory: aiSystem.moveHistory })),
      decree: JSON.parse(JSON.stringify({ activeDecree: royalDecreeSystem.activeDecree, bountyClaimed: royalDecreeSystem.bountyClaimed, activeWantedBounty: royalDecreeSystem.activeWantedBounty })),
      version: SAVE_VERSION, savedAt: Date.now(), dateStr,
      dayCounter: game.dayCounter, weekCounter: game.weekCounter,
      winGoal: game.winGoal, activePlayerIdx: game.activePlayerIdx,
      phase: (game.phase as string) === 'BATTLE' || (game.phase as string) === 'PVP_CHOICE' ? 'BOARD_TURN' : game.phase,
      players: serializedPlayers, townStates, homeStates,
      logs: JSON.parse(JSON.stringify(game.logs.slice(0, 30))),
      bossCurrentHp: bossState?.currentHp,
      bossMaxHp: bossState?.maxHp,
      aiDifficulty: game.aiDifficulty || 'tactical',
      placedTraps: JSON.parse(JSON.stringify(game.placedTraps || []))
    };
  }

  public static applySaveData(game: GameState, data: SaveGameData, announceLog: boolean = true): { success: boolean; error?: string; bossState?: { currentHp: number; maxHp: number } } {
    try {
      if (!data || typeof data !== 'object') {
        return { success: false, error: 'ข้อมูลบันทึกเสียหาย (โครงสร้างไม่ถูกต้อง)' };
      }

      const version = numOr(data.version, 0);
      if (version < SAVE_VERSION) {
        return { success: false, error: 'เซฟนี้เป็นกติกาเดิม กรุณาเริ่มการเดินทางใหม่' };
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

      if (!data.world || data.world.rulesVersion !== 2) return { success: false, error: 'ไม่พบสถานะโลกของกติกาใหม่' };
      game.world = WorldState.restore(data.world); bindWorld(game.world);
      if (data.gameMode) game.gameMode = data.gameMode;
      if (data.calamityState) {
        worldCalamitySystem.chaosMeter = numOr(data.calamityState.chaosMeter, 0);
        worldCalamitySystem.maxChaos = numOr(data.calamityState.maxChaos, 100);
        worldCalamitySystem.corruptedNodes = Array.isArray(data.calamityState.corruptedNodes) ? [...data.calamityState.corruptedNodes] : [];
        worldCalamitySystem.calamityCount = numOr(data.calamityState.calamityCount, 0);
      }
      game.allowDarkling = data.allowDarkling;
      game.blitzDayLimit = data.blitzDayLimit; game.coopRaidDayLimit = data.coopRaidDayLimit;
      aiSystem.grudgeMatrix = data.aiState?.grudgeMatrix ?? {}; aiSystem.moveHistory = data.aiState?.moveHistory ?? {};
      if (data.decree) { royalDecreeSystem.activeDecree = data.decree.activeDecree; royalDecreeSystem.bountyClaimed = data.decree.bountyClaimed; royalDecreeSystem.activeWantedBounty = data.decree.activeWantedBounty; }
      game.resetBoard();
      if (data.players.some(p => dungeonSystem.isInDungeon(p.nodeId))) dungeonSystem.ensureDungeonLoaded(game);
      const nodesById = new Map(game.allNodes.map(n => [n.id, n]));

      const savedRandomState = game.world.rng;
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
        p.dungeonReturnNodeId = nodesById.has(numOr(sp.dungeonReturnNodeId, -1)) ? numOr(sp.dungeonReturnNodeId, -1) : null;
        const here = nodesById.get(p.nodeId);
        p.gridX = here ? here.gx : numOr(sp.gridX, 0);
        p.gridY = here ? here.gy : numOr(sp.gridY, 0);
        p.gridZ = here ? here.gz : numOr(sp.gridZ, 0);
        p.facing = (sp.facing as any) || 'SE';
        p.activeSpinnerMultiplier = Math.max(1, numOr(sp.activeSpinnerMultiplier, 1));
        p.hasFlexibleMovement = Boolean(sp.hasFlexibleMovement);
        p.equipment = { ...DEFAULT_EQUIPMENT, ...(sp.equipment || {}) };
        p.inventory = Array.isArray(sp.inventory) ? sp.inventory : [];
        p.fieldSpells = Array.isArray(sp.fieldSpells) ? sp.fieldSpells : [];
        p.sleepTurns = Math.max(0, numOr(sp.sleepTurns, 0)); p.squidInkTurns = Math.max(0, numOr(sp.squidInkTurns, 0)); p.downerTurns = Math.max(0, numOr(sp.downerTurns, 0)); p.bountyReward = Math.max(0, numOr(sp.bountyReward, 0));
        p.rustTurns = Math.max(0, numOr(sp.rustTurns, 0));
        p.poisonTurns = Math.max(0, numOr(sp.poisonTurns, 0));
        p.freezeTurns = Math.max(0, numOr(sp.freezeTurns, 0));
        p.blindTurns = Math.max(0, numOr(sp.blindTurns, 0));
        p.curseTurns = Math.max(0, numOr(sp.curseTurns, 0));
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
        p.originalClassKey = sp.originalClassKey || sp.classKey || 'warrior';
        p.isPromoted = Boolean(sp.isPromoted);
        p.promotionTier = Math.max(1, Math.min(3, numOr(sp.promotionTier, p.isPromoted ? 2 : 1)));
        if (p.isPromoted && !sp.skillName) {
          const allPromos = [...Object.values(JOB_PROMOTIONS), ...Object.values(TIER3_PROMOTIONS)].flat();
          const matchedPromo = allPromos.find(pr => pr.tier2Key === p.classKey);
          if (matchedPromo) p.skillName = matchedPromo.skillName;
        }
        p.aiPersonality = (sp.aiPersonality as any) || 'balanced';
        p.matchStats = {
          monstersKilled: numOr(sp.matchStats?.monstersKilled, 0),
          pvpWins: numOr(sp.matchStats?.pvpWins, 0),
          goldEarnedTotal: numOr(sp.matchStats?.goldEarnedTotal, p.gold),
          townsCapturedTotal: numOr(sp.matchStats?.townsCapturedTotal, p.townsControlled),
          pranksGiven: numOr(sp.matchStats?.pranksGiven, 0),
          pranksReceived: numOr(sp.matchStats?.pranksReceived, 0)
        };
        p.burstGauge = Math.max(0, Math.min(100, numOr(sp.burstGauge, 0)));
        p.relics = Array.isArray(sp.relics) ? [...sp.relics] : [];
        p.dragonHeartBonusApplied = p.relics.includes('dragon_heart');
        p.weaponUpgradeLevel = Math.max(0, Math.min(9, numOr(sp.weaponUpgradeLevel, 0)));
        p.weaponRune = sp.weaponRune || null;
        p.polymorphTurns = Math.max(0, numOr(sp.polymorphTurns, 0));
        p.polymorphType = sp.polymorphType || null;
        p.mockeryTitle = sp.mockeryTitle || '';
        p.cursedBoxTurns = Math.max(0, numOr(sp.cursedBoxTurns, 0));
        p.darklingSpecialization = sp.darklingSpecialization || null;
        return p;
      });

      game.world.rng = savedRandomState;
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

      for (const player of game.players) {
        player.townDeeds = game.allNodes.filter(n => n.townData?.ownerId === player.id).map(n => n.id);
        player.townsControlled = player.townDeeds.length;
      }
      game.dayCounter = Math.max(1, numOr(data.dayCounter, 1));
      game.weekCounter = Math.max(1, numOr(data.weekCounter, 1));
      game.winGoal = data.winGoal || 'networth';
      if (data.aiDifficulty) {
        game.aiDifficulty = data.aiDifficulty;
      }
      if (Array.isArray(data.placedTraps)) {
        game.placedTraps = data.placedTraps;
      }
      game.activePlayerIdx = Math.min(Math.max(0, numOr(data.activePlayerIdx, 0)), game.players.length - 1);
      game.phase = game.world.result ? 'VICTORY' : 'BOARD_TURN';
      game.remainingMoves = 0;
      game.highlightedNodes = [];
      game.activePreviewPath = [];
      game.activeBattle = null;
      game.activeBattleEnemyCombatant = null;
      game.pendingTileNode = null;
      game.pendingPvPVictim = null;
      if (Array.isArray(data.logs)) {
        game.logs = data.logs;
      }
      if (announceLog) {
        game.addLog(`📂 โหลดบันทึกสำเร็จ! (วันที่ ${game.dayCounter}, สัปดาห์ที่ ${game.weekCounter})`, 'info');
      }
      return {
        success: true,
        bossState: numOr(data.bossCurrentHp, 0) > 0
          ? { currentHp: numOr(data.bossCurrentHp, 0), maxHp: numOr(data.bossMaxHp, 380) }
          : undefined
      };
    } catch (err) {
      console.error('Failed to apply save data:', err);
      return { success: false, error: 'เกิดข้อผิดพลาดขณะโหลดข้อมูลบันทึก' };
    }
  }

  public static save(game: GameState, bossState?: { currentHp: number; maxHp: number }, slot: number = 1): boolean {
    try {
      if (!game || game.players.length === 0) return false;
      const { saveKey, metaKey } = this.getStorageKeys(slot);
      const saveData = this.serializeGameState(game, bossState);

      const hero = game.activePlayer;
      const meta: SaveMetadata = {
        saveVersion: SAVE_VERSION,
        savedAt: saveData.savedAt,
        dateStr: saveData.dateStr || '',
        day: game.dayCounter,
        week: game.weekCounter,
        activeHeroName: hero ? hero.name : 'Unknown Hero',
        activeHeroClass: hero ? hero.className : 'Warrior',
        activeHeroLevel: hero ? hero.level : 1,
        activeHeroGold: hero ? hero.gold : 300,
        totalPlayers: game.players.length
      };

      localStorage.setItem(saveKey, JSON.stringify(saveData));
      localStorage.setItem(metaKey, JSON.stringify(meta));
      return true;
    } catch (err) {
      console.error('Failed to save game:', err);
      return false;
    }
  }

  public static load(game: GameState, slot: number = 1): { success: boolean; error?: string; bossState?: { currentHp: number; maxHp: number } } {
    try {
      const { saveKey } = this.getStorageKeys(slot);
      const raw = localStorage.getItem(saveKey);
      if (!raw) return { success: false, error: `ไม่พบข้อมูลบันทึกในช่องที่ ${slot}` };

      let data: SaveGameData;
      try {
        data = JSON.parse(raw) as SaveGameData;
      } catch {
        return { success: false, error: 'ไฟล์บันทึกเสียหาย (อ่านรูปแบบข้อมูลไม่ได้)' };
      }
      return this.applySaveData(game, data);
    } catch (err) {
      console.error('Failed to load game:', err);
      return { success: false, error: 'เกิดข้อผิดพลาดในการโหลดข้อมูลบันทึก' };
    }
  }

  public static hasSave(slot: number = 1): boolean {
    try {
      const { metaKey } = this.getStorageKeys(slot);
      return !!localStorage.getItem(metaKey);
    } catch {
      return false;
    }
  }

  public static getSaveMetadata(slot: number = 1): SaveMetadata | null {
    try {
      const { metaKey } = this.getStorageKeys(slot);
      const raw = localStorage.getItem(metaKey);
      if (!raw) return null;
      const meta = JSON.parse(raw) as SaveMetadata;
      if (!meta || typeof meta !== 'object') return null;
      return {
        saveVersion: numOr(meta.saveVersion, 1),
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

  public static clear(slot: number = 1): void {
    try {
      const { saveKey, metaKey } = this.getStorageKeys(slot);
      localStorage.removeItem(saveKey);
      localStorage.removeItem(metaKey);
    } catch (err) {
      console.error('Failed to clear savegame:', err);
    }
  }
}
